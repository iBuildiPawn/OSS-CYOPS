package models

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AssetTag represents a tag applied to an asset for categorization
type AssetTag struct {
	AssetID   uuid.UUID `gorm:"type:uuid;primaryKey;not null" json:"asset_id"`
	Tag       string    `gorm:"type:varchar(50);primaryKey;not null" json:"tag"`
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
}

// TableName specifies the table name for AssetTag model
func (AssetTag) TableName() string {
	return "asset_tags"
}

// BeforeCreate hook to normalize and validate tag
func (at *AssetTag) BeforeCreate(tx *gorm.DB) error {
	// Normalize tag to lowercase
	at.Tag = strings.ToLower(strings.TrimSpace(at.Tag))

	// Validate tag length
	if len(at.Tag) < 1 || len(at.Tag) > 50 {
		return errors.New("tag must be 1-50 characters")
	}

	// Validate tag format (alphanumeric + dash/underscore)
	matched, _ := regexp.MatchString(`^[a-z0-9_-]+$`, at.Tag)
	if !matched {
		return errors.New("tag must contain only lowercase letters, numbers, dash, and underscore")
	}

	return nil
}
