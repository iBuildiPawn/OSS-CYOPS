package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/pkg/auth"
	"github.com/cyops/cyops-backend/pkg/database"
	"github.com/cyops/cyops-backend/pkg/utils"
	"gorm.io/gorm"
)

// UserService handles user-related operations
type UserService struct {
	db *gorm.DB
}

// NewUserService creates a new user service
func NewUserService() *UserService {
	return &UserService{
		db: database.GetDB(),
	}
}

// GetDB returns the database instance
func (s *UserService) GetDB() *gorm.DB {
	return s.db
}

// RegisterRequest represents a user registration request
type RegisterRequest struct {
	Email    string
	Password string
	Name     string
}

// RegisterUser creates a new user account
func (s *UserService) RegisterUser(req RegisterRequest, ipAddress, userAgent string) (*models.User, *models.VerificationToken, error) {
	// Normalize and validate email
	email := utils.NormalizeEmail(req.Email)
	if err := utils.ValidateEmail(email); err != nil {
		return nil, nil, fmt.Errorf("invalid email: %w", err)
	}

	// Validate password strength
	if err := auth.ValidatePasswordStrength(req.Password); err != nil {
		return nil, nil, fmt.Errorf("weak password: %w", err)
	}

	// Validate name if provided
	if req.Name != "" {
		if err := utils.ValidateName(req.Name); err != nil {
			return nil, nil, fmt.Errorf("invalid name: %w", err)
		}
	}

	// Check if user already exists
	var existingUser models.User
	if err := s.db.Where("email = ?", email).First(&existingUser).Error; err == nil {
		return nil, nil, fmt.Errorf("user with this email already exists")
	} else if err != gorm.ErrRecordNotFound {
		return nil, nil, fmt.Errorf("database error: %w", err)
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &models.User{
		Email:         email,
		Password:      hashedPassword,
		Name:          utils.SanitizeName(req.Name),
		EmailVerified: false,
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Save user
	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate verification token
	tokenString, err := auth.GenerateVerificationToken()
	if err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to generate verification token: %w", err)
	}

	// Create verification token
	token := &models.VerificationToken{
		UserID:    user.ID,
		Token:     tokenString,
		Type:      models.TokenTypeEmailVerification,
		ExpiresAt: time.Now().Add(24 * time.Hour), // 24 hours expiry
		IPAddress: ipAddress,
	}

	if err := tx.Create(token).Error; err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to create verification token: %w", err)
	}

	// Log registration event
	event := models.NewAuthEvent(&user.ID, models.EventTypeRegister, ipAddress, userAgent)
	if err := tx.Create(event).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to log registration event")
		// Don't fail registration if event logging fails
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	utils.Logger.Info().
		Str("user_id", user.ID.String()).
		Str("email", email).
		Msg("User registered successfully")

	return user, token, nil
}

// GetUserByEmail retrieves a user by email
func (s *UserService) GetUserByEmail(email string) (*models.User, error) {
	email = utils.NormalizeEmail(email)

	var user models.User
	if err := s.db.Preload("Role").Where("email = ?", email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &user, nil
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(userID uuid.UUID) (*models.User, error) {
	var user models.User
	if err := s.db.Preload("Role").Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &user, nil
}

// VerifyEmail verifies a user's email using a verification token
func (s *UserService) VerifyEmail(tokenString string, ipAddress, userAgent string) (*models.User, error) {
	// Find token
	var token models.VerificationToken
	if err := s.db.Where("token = ? AND type = ?", tokenString, models.TokenTypeEmailVerification).
		Preload("User").First(&token).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("invalid or expired verification token")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Validate token
	if !token.IsValid() {
		if token.IsExpired() {
			return nil, fmt.Errorf("verification token has expired")
		}
		if token.IsUsed() {
			return nil, fmt.Errorf("verification token has already been used")
		}
		return nil, fmt.Errorf("invalid verification token")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Mark token as used
	token.MarkAsUsed()
	if err := tx.Save(&token).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update token: %w", err)
	}

	// Mark user email as verified
	user := token.User
	user.MarkEmailVerified()
	if err := tx.Save(user).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to verify user email: %w", err)
	}

	// Log verification event
	event := models.NewAuthEvent(&user.ID, models.EventTypeEmailVerification, ipAddress, userAgent)
	if err := tx.Create(event).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to log verification event")
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	utils.Logger.Info().
		Str("user_id", user.ID.String()).
		Str("email", user.Email).
		Msg("Email verified successfully")

	return user, nil
}

// UpdateLastLogin updates the user's last login timestamp
func (s *UserService) UpdateLastLogin(userID uuid.UUID) error {
	now := time.Now()
	if err := s.db.Model(&models.User{}).Where("id = ?", userID).Update("last_login_at", now).Error; err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}
	return nil
}
