package services

import (
	"fmt"
	"time"

	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/pkg/auth"
	"github.com/cyops/cyops-backend/pkg/database"
	"github.com/cyops/cyops-backend/pkg/utils"
	"gorm.io/gorm"
)

// PasswordService handles password reset operations
type PasswordService struct {
	db *gorm.DB
}

// NewPasswordService creates a new password service
func NewPasswordService() *PasswordService {
	return &PasswordService{
		db: database.GetDB(),
	}
}

// RequestPasswordReset creates a password reset token for a user
func (s *PasswordService) RequestPasswordReset(email, ipAddress, userAgent string) (*models.User, *models.VerificationToken, error) {
	// Normalize and validate email
	email = utils.NormalizeEmail(email)
	if err := utils.ValidateEmail(email); err != nil {
		return nil, nil, fmt.Errorf("invalid email: %w", err)
	}

	// Find user by email
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Don't reveal if email exists - return success but don't send email
			// This prevents email enumeration attacks
			utils.Logger.Warn().
				Str("email", email).
				Str("ip", ipAddress).
				Msg("Password reset requested for non-existent email")
			return nil, nil, nil
		}
		return nil, nil, fmt.Errorf("database error: %w", err)
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Invalidate any existing password reset tokens for this user
	if err := tx.Model(&models.VerificationToken{}).
		Where("user_id = ? AND type = ? AND used_at IS NULL", user.ID, models.TokenTypePasswordReset).
		Update("used_at", time.Now()).Error; err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to invalidate existing tokens: %w", err)
	}

	// Generate reset token
	token, err := auth.GenerateVerificationToken()
	if err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to generate reset token: %w", err)
	}

	// Create verification token (expires in 1 hour)
	verificationToken := &models.VerificationToken{
		UserID:    user.ID,
		Token:     token,
		Type:      models.TokenTypePasswordReset,
		ExpiresAt: time.Now().Add(1 * time.Hour),
		IPAddress: ipAddress,
	}

	if err := tx.Create(verificationToken).Error; err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to create reset token: %w", err)
	}

	// Log password reset request event
	event := models.NewAuthEvent(&user.ID, models.EventTypePasswordResetRequest, ipAddress, userAgent)
	if err := tx.Create(event).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to log password reset request event")
		// Don't fail the request if event logging fails
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	utils.Logger.Info().
		Str("user_id", user.ID.String()).
		Str("email", user.Email).
		Str("ip", ipAddress).
		Msg("Password reset requested")

	return &user, verificationToken, nil
}

// ResetPassword validates the reset token and updates the user's password
func (s *PasswordService) ResetPassword(token, newPassword, ipAddress, userAgent string) (*models.User, error) {
	// Validate password strength
	if err := auth.ValidatePasswordStrength(newPassword); err != nil {
		return nil, fmt.Errorf("weak password: %w", err)
	}

	// Find and validate reset token
	var verificationToken models.VerificationToken
	if err := s.db.Where("token = ? AND type = ?", token, models.TokenTypePasswordReset).
		Preload("User").
		First(&verificationToken).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("invalid or expired reset token")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check if token is valid
	if !verificationToken.IsValid() {
		if verificationToken.IsExpired() {
			return nil, fmt.Errorf("reset token has expired")
		}
		if verificationToken.IsUsed() {
			return nil, fmt.Errorf("reset token has already been used")
		}
		return nil, fmt.Errorf("invalid reset token")
	}

	user := verificationToken.User
	if user == nil {
		return nil, fmt.Errorf("user not found")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update password
	if err := user.HashPassword(newPassword); err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	if err := tx.Save(user).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update password: %w", err)
	}

	// Mark token as used
	verificationToken.MarkAsUsed()
	if err := tx.Save(&verificationToken).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to mark token as used: %w", err)
	}

	// Invalidate all active sessions for security
	if err := tx.Model(&models.Session{}).
		Where("user_id = ? AND is_active = ?", user.ID, true).
		Updates(map[string]interface{}{
			"is_active":  false,
			"revoked_at": time.Now(),
		}).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to revoke sessions after password reset")
		// Don't fail the reset if session revocation fails
	}

	// Log password reset event
	event := models.NewAuthEvent(&user.ID, models.EventTypePasswordReset, ipAddress, userAgent)
	if err := tx.Create(event).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to log password reset event")
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	utils.Logger.Info().
		Str("user_id", user.ID.String()).
		Str("email", user.Email).
		Str("ip", ipAddress).
		Msg("Password reset successfully")

	return user, nil
}

// ValidateResetToken validates a password reset token without using it
func (s *PasswordService) ValidateResetToken(token string) (*models.User, error) {
	var verificationToken models.VerificationToken
	if err := s.db.Where("token = ? AND type = ?", token, models.TokenTypePasswordReset).
		Preload("User").
		First(&verificationToken).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("invalid or expired reset token")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	if !verificationToken.IsValid() {
		if verificationToken.IsExpired() {
			return nil, fmt.Errorf("reset token has expired")
		}
		if verificationToken.IsUsed() {
			return nil, fmt.Errorf("reset token has already been used")
		}
		return nil, fmt.Errorf("invalid reset token")
	}

	return verificationToken.User, nil
}
