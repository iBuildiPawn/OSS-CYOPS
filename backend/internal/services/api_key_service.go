package services

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/lib/pq"
	"github.com/cyops/cyops-backend/pkg/auth"
	"github.com/cyops/cyops-backend/pkg/database"
	"gorm.io/gorm"
)

var (
	ErrAPIKeyNotFound     = errors.New("API key not found")
	ErrAPIKeyInvalid      = errors.New("API key is invalid")
	ErrAPIKeyExpired      = errors.New("API key has expired")
	ErrAPIKeyRevoked      = errors.New("API key has been revoked")
	ErrAPIKeyInactive     = errors.New("API key is inactive")
	ErrInvalidKeyFormat   = errors.New("invalid API key format")
	ErrDuplicateKeyName   = errors.New("API key with this name already exists")
)

const (
	// API key format: kfm_<type>_<random32chars>
	APIKeyPrefix       = "kfm_"
	APIKeyRandomLength = 32
)

type APIKeyService struct {
	db *gorm.DB
}

func NewAPIKeyService() *APIKeyService {
	return &APIKeyService{
		db: database.GetDB(),
	}
}

// CreateAPIKeyInput represents the input for creating an API key
type CreateAPIKeyInput struct {
	UserID             uuid.UUID
	Name               string
	Type               models.APIKeyType
	Scopes             []string
	ExpiresAt          *time.Time
	Description        string
	RateLimitPerMinute int
}

// CreateAPIKeyResult represents the result of creating an API key
type CreateAPIKeyResult struct {
	APIKey   *models.APIKey
	PlainKey string // Only returned once, never stored
}

// Create generates a new API key
func (s *APIKeyService) Create(input CreateAPIKeyInput) (*CreateAPIKeyResult, error) {
	// Validate input
	if input.Name == "" {
		return nil, errors.New("API key name is required")
	}
	if len(input.Scopes) == 0 {
		return nil, errors.New("at least one scope is required")
	}

	// Check for duplicate name for this user
	var existingKey models.APIKey
	if err := s.db.Where("user_id = ? AND name = ? AND deleted_at IS NULL", input.UserID, input.Name).First(&existingKey).Error; err == nil {
		return nil, ErrDuplicateKeyName
	}

	// Generate random key
	plainKey, keyHash, keyPrefix, err := s.generateAPIKey(input.Type)
	if err != nil {
		return nil, fmt.Errorf("failed to generate API key: %w", err)
	}

	// Set default rate limit if not specified
	if input.RateLimitPerMinute <= 0 {
		input.RateLimitPerMinute = 60 // Default: 60 requests per minute
	}

	// Create API key record
	apiKey := &models.APIKey{
		UserID:             input.UserID,
		Name:               input.Name,
		Type:               input.Type,
		Status:             models.APIKeyStatusActive,
		KeyHash:            keyHash,
		KeyPrefix:          keyPrefix,
		Scopes:             pq.StringArray(input.Scopes),
		ExpiresAt:          input.ExpiresAt,
		Description:        input.Description,
		RateLimitPerMinute: input.RateLimitPerMinute,
	}

	if err := s.db.Create(apiKey).Error; err != nil {
		return nil, fmt.Errorf("failed to create API key: %w", err)
	}

	return &CreateAPIKeyResult{
		APIKey:   apiKey,
		PlainKey: plainKey,
	}, nil
}

// ValidateAndGet validates an API key and returns the key and associated user
func (s *APIKeyService) ValidateAndGet(plainKey string) (*models.APIKey, *models.User, error) {
	// Validate format
	if !strings.HasPrefix(plainKey, APIKeyPrefix) {
		return nil, nil, ErrInvalidKeyFormat
	}

	// Extract prefix for faster lookup
	parts := strings.Split(plainKey, "_")
	if len(parts) < 3 {
		return nil, nil, ErrInvalidKeyFormat
	}
	keyPrefix := fmt.Sprintf("%s_%s_", parts[0], parts[1])

	// Find API key by prefix first (faster than checking all hashes)
	var apiKeys []models.APIKey
	if err := s.db.Where("key_prefix = ? AND status = ? AND deleted_at IS NULL", keyPrefix, models.APIKeyStatusActive).
		Preload("User").
		Find(&apiKeys).Error; err != nil {
		return nil, nil, ErrAPIKeyNotFound
	}

	// Check each key's hash
	for _, apiKey := range apiKeys {
		if auth.CheckPasswordHash(plainKey, apiKey.KeyHash) {
			// Validate status and expiration
			if !apiKey.IsValid() {
				if apiKey.Status == models.APIKeyStatusRevoked {
					return nil, nil, ErrAPIKeyRevoked
				}
				if apiKey.Status == models.APIKeyStatusInactive {
					return nil, nil, ErrAPIKeyInactive
				}
				if apiKey.ExpiresAt != nil && time.Now().After(*apiKey.ExpiresAt) {
					return nil, nil, ErrAPIKeyExpired
				}
			}

			// Return API key and user
			return &apiKey, apiKey.User, nil
		}
	}

	return nil, nil, ErrAPIKeyInvalid
}

// UpdateLastUsed updates the last_used_at timestamp
func (s *APIKeyService) UpdateLastUsed(keyID uuid.UUID) error {
	now := time.Now()
	return s.db.Model(&models.APIKey{}).
		Where("id = ?", keyID).
		Update("last_used_at", now).Error
}

// List returns all API keys for a user
func (s *APIKeyService) List(userID uuid.UUID) ([]models.APIKey, error) {
	var apiKeys []models.APIKey
	if err := s.db.Where("user_id = ? AND deleted_at IS NULL", userID).
		Order("created_at DESC").
		Find(&apiKeys).Error; err != nil {
		return nil, err
	}
	return apiKeys, nil
}

// GetByID returns an API key by ID
func (s *APIKeyService) GetByID(keyID, userID uuid.UUID) (*models.APIKey, error) {
	var apiKey models.APIKey
	if err := s.db.Where("id = ? AND user_id = ? AND deleted_at IS NULL", keyID, userID).
		First(&apiKey).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAPIKeyNotFound
		}
		return nil, err
	}
	return &apiKey, nil
}

// Revoke revokes an API key
func (s *APIKeyService) Revoke(keyID, userID uuid.UUID) error {
	result := s.db.Model(&models.APIKey{}).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", keyID, userID).
		Update("status", models.APIKeyStatusRevoked)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrAPIKeyNotFound
	}
	return nil
}

// Delete soft-deletes an API key
func (s *APIKeyService) Delete(keyID, userID uuid.UUID) error {
	result := s.db.Where("id = ? AND user_id = ?", keyID, userID).
		Delete(&models.APIKey{})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrAPIKeyNotFound
	}
	return nil
}

// UpdateStatus updates the status of an API key
func (s *APIKeyService) UpdateStatus(keyID, userID uuid.UUID, status models.APIKeyStatus) error {
	result := s.db.Model(&models.APIKey{}).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", keyID, userID).
		Update("status", status)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrAPIKeyNotFound
	}
	return nil
}

// generateAPIKey generates a new API key with the format: kfm_<type>_<random32chars>
func (s *APIKeyService) generateAPIKey(keyType models.APIKeyType) (plainKey, hash, prefix string, err error) {
	// Generate random bytes
	randomBytes := make([]byte, 24) // 24 bytes = 32 base64 characters
	if _, err := rand.Read(randomBytes); err != nil {
		return "", "", "", err
	}

	// Encode to base64 URL-safe format
	randomStr := base64.URLEncoding.EncodeToString(randomBytes)
	randomStr = strings.TrimRight(randomStr, "=") // Remove padding

	// Format: kfm_<type>_<random>
	plainKey = fmt.Sprintf("%s%s_%s", APIKeyPrefix, keyType, randomStr)
	prefix = fmt.Sprintf("%s%s_", APIKeyPrefix, keyType)

	// Hash the key for storage
	hash, err = auth.HashPassword(plainKey)
	if err != nil {
		return "", "", "", err
	}

	return plainKey, hash, prefix, nil
}

// CleanupExpiredKeys removes expired API keys (soft delete)
func (s *APIKeyService) CleanupExpiredKeys() (int64, error) {
	now := time.Now()
	result := s.db.Where("expires_at IS NOT NULL AND expires_at < ? AND deleted_at IS NULL", now).
		Delete(&models.APIKey{})
	return result.RowsAffected, result.Error
}
