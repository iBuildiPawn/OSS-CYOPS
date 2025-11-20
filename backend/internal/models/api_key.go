package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// APIKeyType represents the type of API key
type APIKeyType string

const (
	APIKeyTypeMCP      APIKeyType = "mcp"
	APIKeyTypeService  APIKeyType = "service"
	APIKeyTypePersonal APIKeyType = "personal"
)

// APIKeyStatus represents the status of an API key
type APIKeyStatus string

const (
	APIKeyStatusActive   APIKeyStatus = "active"
	APIKeyStatusInactive APIKeyStatus = "inactive"
	APIKeyStatusRevoked  APIKeyStatus = "revoked"
)

// Scopes is a type alias for string slice stored as JSONB
type Scopes []string

// APIKey represents an API key for programmatic access
type APIKey struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID             uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Name               string         `gorm:"not null" json:"name"`
	Type               APIKeyType     `gorm:"type:varchar(20);not null" json:"type"`
	Status             APIKeyStatus   `gorm:"type:varchar(20);not null;default:'active'" json:"status"`
	KeyHash            string         `gorm:"type:text;not null;uniqueIndex" json:"-"`
	KeyPrefix          string         `gorm:"type:varchar(20);not null" json:"key_prefix"`
	Scopes             pq.StringArray `gorm:"type:text[];not null" json:"scopes"`
	ExpiresAt          *time.Time     `json:"expires_at,omitempty"`
	LastUsedAt         *time.Time     `json:"last_used_at,omitempty"`
	RateLimitPerMinute int            `gorm:"default:60" json:"rate_limit_per_minute"`
	Description        string         `json:"description"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
	User               *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName specifies the table name for APIKey
func (APIKey) TableName() string {
	return "api_keys"
}

// IsValid checks if the API key is valid for use
func (a *APIKey) IsValid() bool {
	if a.Status != APIKeyStatusActive {
		return false
	}
	if a.ExpiresAt != nil && time.Now().After(*a.ExpiresAt) {
		return false
	}
	return true
}

// HasScope checks if the API key has a specific scope
func (a *APIKey) HasScope(scope string) bool {
	// Check for wildcard permission
	for _, s := range a.Scopes {
		if s == "*:*" || s == scope {
			return true
		}
	}
	return false
}

// GetScopes returns the scopes as a string slice
func (a *APIKey) GetScopes() []string {
	return []string(a.Scopes)
}
