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

// ProfileService handles user profile operations
type ProfileService struct {
	db *gorm.DB
}

// NewProfileService creates a new profile service
func NewProfileService() *ProfileService {
	return &ProfileService{
		db: database.GetDB(),
	}
}

// UpdateProfileRequest represents a profile update request
type UpdateProfileRequest struct {
	Name              *string `json:"name,omitempty"`
	Email             *string `json:"email,omitempty"`
	ProfilePictureURL *string `json:"profile_picture_url,omitempty"`
}

// UpdateProfile updates user profile information
func (s *ProfileService) UpdateProfile(userID uuid.UUID, req UpdateProfileRequest, ipAddress, userAgent string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	updates := make(map[string]interface{})

	// Update name if provided
	if req.Name != nil && *req.Name != "" {
		if err := utils.ValidateName(*req.Name); err != nil {
			return nil, fmt.Errorf("invalid name: %w", err)
		}
		updates["name"] = *req.Name
	}

	// Update email if provided
	if req.Email != nil && *req.Email != "" {
		email := utils.NormalizeEmail(*req.Email)
		if err := utils.ValidateEmail(email); err != nil {
			return nil, fmt.Errorf("invalid email: %w", err)
		}

		// Check if email is already taken by another user
		var existingUser models.User
		if err := s.db.Where("email = ? AND id != ?", email, userID).First(&existingUser).Error; err == nil {
			return nil, fmt.Errorf("email already in use")
		}

		updates["email"] = email
		// If email changed, require re-verification
		if email != user.Email {
			updates["email_verified"] = false
			updates["email_verified_at"] = nil
		}
	}

	// Update profile picture URL if provided
	if req.ProfilePictureURL != nil {
		updates["profile_picture_url"] = *req.ProfilePictureURL
	}

	if len(updates) == 0 {
		return nil, fmt.Errorf("no updates provided")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update user
	if err := tx.Model(&user).Updates(updates).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	// Log profile update event
	event := models.NewAuthEvent(&userID, models.EventTypeProfileUpdate, ipAddress, userAgent)
	if err := tx.Create(event).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to log profile update event")
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Fetch updated user
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch updated user: %w", err)
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Msg("Profile updated successfully")

	return &user, nil
}

// ChangePasswordRequest represents a password change request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// ChangePassword changes user's password
func (s *ProfileService) ChangePassword(userID uuid.UUID, req ChangePasswordRequest, ipAddress, userAgent string) error {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("database error: %w", err)
	}

	// Verify current password
	if !user.CheckPassword(req.CurrentPassword) {
		return fmt.Errorf("current password is incorrect")
	}

	// Validate new password strength
	if err := auth.ValidatePasswordStrength(req.NewPassword); err != nil {
		return fmt.Errorf("weak password: %w", err)
	}

	// Check if new password is same as current
	if user.CheckPassword(req.NewPassword) {
		return fmt.Errorf("new password must be different from current password")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update password
	if err := user.HashPassword(req.NewPassword); err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to hash password: %w", err)
	}

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Revoke all active sessions except current one for security
	// Note: We don't have session token here, so we revoke all sessions
	// The user will need to log in again
	if err := tx.Model(&models.Session{}).
		Where("user_id = ? AND is_active = ?", userID, true).
		Updates(map[string]interface{}{
			"is_active":  false,
			"revoked_at": time.Now(),
		}).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to revoke sessions after password change")
	}

	// Log password change event
	event := models.NewAuthEvent(&userID, models.EventTypePasswordChange, ipAddress, userAgent)
	if err := tx.Create(event).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to log password change event")
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Msg("Password changed successfully")

	return nil
}

// GetProfile retrieves user profile
func (s *ProfileService) GetProfile(userID uuid.UUID) (*models.User, error) {
	var user models.User
	if err := s.db.Preload("Role").Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &user, nil
}

// GetActiveSessions retrieves all active sessions for a user
func (s *ProfileService) GetActiveSessions(userID uuid.UUID) ([]models.Session, error) {
	sessionService := NewSessionService()
	return sessionService.GetUserSessions(userID)
}

// RevokeSession revokes a specific session for a user
func (s *ProfileService) RevokeSession(userID, sessionID uuid.UUID) error {
	sessionService := NewSessionService()
	return sessionService.RevokeSessionByID(sessionID, userID)
}

// RevokeAllSessions revokes all sessions except the current one
func (s *ProfileService) RevokeAllSessions(userID uuid.UUID, exceptSessionID *uuid.UUID) error {
	query := s.db.Model(&models.Session{}).
		Where("user_id = ? AND is_active = ?", userID, true)

	if exceptSessionID != nil {
		query = query.Where("id != ?", *exceptSessionID)
	}

	result := query.Updates(map[string]interface{}{
		"is_active":  false,
		"revoked_at": time.Now(),
	})

	if result.Error != nil {
		return fmt.Errorf("failed to revoke sessions: %w", result.Error)
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Int64("count", result.RowsAffected).
		Msg("Sessions revoked")

	return nil
}
