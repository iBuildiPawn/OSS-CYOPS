package auth

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
)

const (
	// DefaultSessionDuration is the default session duration (24 hours)
	DefaultSessionDuration = 24 * time.Hour
	// SessionTokenLength is the length of session tokens in bytes
	SessionTokenLength = 32
)

// GenerateSessionToken generates a cryptographically secure session token
func GenerateSessionToken() (string, error) {
	bytes := make([]byte, SessionTokenLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate session token: %w", err)
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// CreateSession creates a new session for a user
func CreateSession(userID uuid.UUID, ipAddress, userAgent string, duration time.Duration) (*models.Session, error) {
	if duration == 0 {
		duration = DefaultSessionDuration
	}

	token, err := GenerateSessionToken()
	if err != nil {
		return nil, err
	}

	session := &models.Session{
		UserID:    userID,
		Token:     token,
		ExpiresAt: time.Now().Add(duration),
		IPAddress: ipAddress,
		UserAgent: userAgent,
		IsActive:  true,
	}

	return session, nil
}

// ValidateSessionToken validates that a token meets security requirements
func ValidateSessionToken(token string) error {
	if token == "" {
		return fmt.Errorf("session token is required")
	}

	// Decode to ensure it's valid base64
	decoded, err := base64.URLEncoding.DecodeString(token)
	if err != nil {
		return fmt.Errorf("invalid session token format")
	}

	// Check length
	if len(decoded) != SessionTokenLength {
		return fmt.Errorf("invalid session token length")
	}

	return nil
}
