package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"gorm.io/gorm"
)

type IntegrationConfigService struct {
	db            *gorm.DB
	encryptionKey []byte // 32-byte key for AES-256
}

func NewIntegrationConfigService(db *gorm.DB, encryptionKey string) *IntegrationConfigService {
	// Ensure encryption key is exactly 32 bytes for AES-256
	key := []byte(encryptionKey)
	if len(key) < 32 {
		// Pad with zeros if too short
		padded := make([]byte, 32)
		copy(padded, key)
		key = padded
	} else if len(key) > 32 {
		// Truncate if too long
		key = key[:32]
	}

	return &IntegrationConfigService{
		db:            db,
		encryptionKey: key,
	}
}

// CreateConfig creates a new integration configuration
func (s *IntegrationConfigService) CreateConfig(config *models.IntegrationConfig) error {
	// Check for duplicate base_url for the same type
	var existing models.IntegrationConfig
	err := s.db.Where("type = ? AND base_url = ? AND deleted_at IS NULL", config.Type, config.BaseURL).First(&existing).Error
	if err == nil {
		return fmt.Errorf("an integration with this URL already exists: %s", existing.Name)
	} else if err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to check for duplicates: %w", err)
	}

	// Encrypt sensitive fields
	if config.AccessKey != "" {
		encrypted, err := s.encrypt(config.AccessKey)
		if err != nil {
			return fmt.Errorf("failed to encrypt access key: %w", err)
		}
		config.AccessKey = encrypted
	}

	if config.SecretKey != "" {
		encrypted, err := s.encrypt(config.SecretKey)
		if err != nil {
			return fmt.Errorf("failed to encrypt secret key: %w", err)
		}
		config.SecretKey = encrypted
	}

	return s.db.Create(config).Error
}

// GetConfig retrieves an integration configuration by ID
func (s *IntegrationConfigService) GetConfig(id uuid.UUID) (*models.IntegrationConfig, error) {
	var config models.IntegrationConfig
	err := s.db.Preload("CreatedByUser").Where("id = ?", id).First(&config).Error
	if err != nil {
		return nil, err
	}

	// Decrypt sensitive fields (for internal use only, not exposed via API)
	if config.AccessKey != "" {
		decrypted, err := s.decrypt(config.AccessKey)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt access key: %w", err)
		}
		config.AccessKey = decrypted
	}

	if config.SecretKey != "" {
		decrypted, err := s.decrypt(config.SecretKey)
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt secret key: %w", err)
		}
		config.SecretKey = decrypted
	}

	return &config, nil
}

// ListConfigs retrieves all integration configurations for a user
func (s *IntegrationConfigService) ListConfigs(userID uuid.UUID, integrationType *models.IntegrationType) ([]models.IntegrationConfig, error) {
	var configs []models.IntegrationConfig
	query := s.db.Where("created_by = ?", userID)

	if integrationType != nil {
		query = query.Where("type = ?", *integrationType)
	}

	err := query.Order("created_at DESC").Find(&configs).Error
	return configs, err
}

// UpdateConfig updates an existing integration configuration
func (s *IntegrationConfigService) UpdateConfig(id uuid.UUID, updates map[string]interface{}) error {
	// If updating credentials, encrypt them
	if accessKey, ok := updates["access_key"].(string); ok && accessKey != "" {
		encrypted, err := s.encrypt(accessKey)
		if err != nil {
			return fmt.Errorf("failed to encrypt access key: %w", err)
		}
		updates["access_key"] = encrypted
	}

	if secretKey, ok := updates["secret_key"].(string); ok && secretKey != "" {
		encrypted, err := s.encrypt(secretKey)
		if err != nil {
			return fmt.Errorf("failed to encrypt secret key: %w", err)
		}
		updates["secret_key"] = encrypted
	}

	return s.db.Model(&models.IntegrationConfig{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteConfig soft deletes an integration configuration
func (s *IntegrationConfigService) DeleteConfig(id uuid.UUID) error {
	return s.db.Delete(&models.IntegrationConfig{}, id).Error
}

// TestConnection tests the connection to the external API
func (s *IntegrationConfigService) TestConnection(id uuid.UUID) error {
	config, err := s.GetConfig(id)
	if err != nil {
		return err
	}

	// TODO: Implement actual connection testing based on integration type
	// For now, just validate that required fields are present
	if config.BaseURL == "" {
		return errors.New("base URL is required")
	}

	if config.AccessKey == "" || config.SecretKey == "" {
		return errors.New("credentials are required")
	}

	return nil
}

// UpdateLastSync updates the last sync timestamp
func (s *IntegrationConfigService) UpdateLastSync(id uuid.UUID) error {
	now := time.Now()
	return s.db.Model(&models.IntegrationConfig{}).Where("id = ?", id).Update("last_sync_at", now).Error
}

// encrypt encrypts a string using AES-256-GCM
func (s *IntegrationConfigService) encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// decrypt decrypts a string using AES-256-GCM
func (s *IntegrationConfigService) decrypt(ciphertext string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], string(data[nonceSize:])
	plaintext, err := gcm.Open(nil, nonce, []byte(ciphertext), nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
