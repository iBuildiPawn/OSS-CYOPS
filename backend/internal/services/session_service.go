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

// SessionService handles session-related operations
type SessionService struct {
	db *gorm.DB
}

// NewSessionService creates a new session service
func NewSessionService() *SessionService {
	return &SessionService{
		db: database.GetDB(),
	}
}

// CreateSession creates a new session for a user
func (s *SessionService) CreateSession(userID uuid.UUID, ipAddress, userAgent string) (*models.Session, error) {
	session, err := auth.CreateSession(userID, ipAddress, userAgent, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	if err := s.db.Create(session).Error; err != nil {
		return nil, fmt.Errorf("failed to save session: %w", err)
	}

	utils.Logger.Info().
		Str("session_id", session.ID.String()).
		Str("user_id", userID.String()).
		Msg("Session created")

	return session, nil
}

// GetSessionByToken retrieves a session by token
func (s *SessionService) GetSessionByToken(token string) (*models.Session, error) {
	if err := auth.ValidateSessionToken(token); err != nil {
		return nil, err
	}

	var session models.Session
	if err := s.db.Where("token = ?", token).Preload("User.Role").First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("session not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	return &session, nil
}

// ValidateSession validates a session token and returns the session if valid
func (s *SessionService) ValidateSession(token string) (*models.Session, error) {
	session, err := s.GetSessionByToken(token)
	if err != nil {
		return nil, err
	}

	if !session.IsValid() {
		if session.IsExpired() {
			return nil, fmt.Errorf("session has expired")
		}
		if session.RevokedAt != nil {
			return nil, fmt.Errorf("session has been revoked")
		}
		return nil, fmt.Errorf("session is not active")
	}

	// Update last used timestamp
	session.UpdateLastUsed()
	if err := s.db.Save(session).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to update session last used timestamp")
		// Don't fail validation if update fails
	}

	return session, nil
}

// RevokeSession revokes a session by token
func (s *SessionService) RevokeSession(token string) error {
	session, err := s.GetSessionByToken(token)
	if err != nil {
		return err
	}

	session.Revoke()
	if err := s.db.Save(session).Error; err != nil {
		return fmt.Errorf("failed to revoke session: %w", err)
	}

	utils.Logger.Info().
		Str("session_id", session.ID.String()).
		Str("user_id", session.UserID.String()).
		Msg("Session revoked")

	return nil
}

// RevokeSessionByID revokes a session by its ID
func (s *SessionService) RevokeSessionByID(sessionID uuid.UUID, userID uuid.UUID) error {
	var session models.Session
	if err := s.db.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("session not found")
		}
		return fmt.Errorf("database error: %w", err)
	}

	session.Revoke()
	if err := s.db.Save(&session).Error; err != nil {
		return fmt.Errorf("failed to revoke session: %w", err)
	}

	utils.Logger.Info().
		Str("session_id", session.ID.String()).
		Str("user_id", userID.String()).
		Msg("Session revoked by ID")

	return nil
}

// RevokeAllUserSessions revokes all sessions for a user
func (s *SessionService) RevokeAllUserSessions(userID uuid.UUID) error {
	now := time.Now()
	result := s.db.Model(&models.Session{}).
		Where("user_id = ? AND is_active = ?", userID, true).
		Updates(map[string]interface{}{
			"is_active":  false,
			"revoked_at": now,
		})

	if result.Error != nil {
		return fmt.Errorf("failed to revoke sessions: %w", result.Error)
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Int64("count", result.RowsAffected).
		Msg("All user sessions revoked")

	return nil
}

// GetUserSessions retrieves all active sessions for a user
func (s *SessionService) GetUserSessions(userID uuid.UUID) ([]models.Session, error) {
	var sessions []models.Session
	if err := s.db.Where("user_id = ? AND is_active = ?", userID, true).
		Order("created_at DESC").
		Find(&sessions).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve sessions: %w", err)
	}

	return sessions, nil
}

// CleanupExpiredSessions removes expired sessions from the database
func (s *SessionService) CleanupExpiredSessions() (int64, error) {
	result := s.db.Where("expires_at < ? OR (is_active = ? AND revoked_at < ?)",
		time.Now(),
		false,
		time.Now().Add(-7*24*time.Hour), // Keep revoked sessions for 7 days
	).Delete(&models.Session{})

	if result.Error != nil {
		return 0, fmt.Errorf("failed to cleanup sessions: %w", result.Error)
	}

	if result.RowsAffected > 0 {
		utils.Logger.Info().
			Int64("count", result.RowsAffected).
			Msg("Expired sessions cleaned up")
	}

	return result.RowsAffected, nil
}
