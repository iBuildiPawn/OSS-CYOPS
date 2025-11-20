package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// IntegrationType represents the type of external integration
type IntegrationType string

const (
	IntegrationTypeNessus  IntegrationType = "nessus"
	IntegrationTypeQualys  IntegrationType = "qualys"
	IntegrationTypeOpenVAS IntegrationType = "openvas"
	IntegrationTypeRapid7  IntegrationType = "rapid7"
)

// IntegrationConfig stores configuration for external vulnerability scanner integrations
type IntegrationConfig struct {
	ID        uuid.UUID       `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name      string          `gorm:"not null" json:"name"`                           // User-friendly name for this config
	Type      IntegrationType `gorm:"type:varchar(50);not null" json:"type"`          // Type of integration (nessus, qualys, etc.)
	Active    bool            `gorm:"default:true" json:"active"`                     // Whether this integration is active

	// Connection details
	BaseURL       string `gorm:"type:text" json:"base_url"`                  // API base URL
	AccessKey     string `gorm:"type:text" json:"-"`                         // API access key (encrypted, not in JSON)
	SecretKey     string `gorm:"type:text" json:"-"`                         // API secret key (encrypted, not in JSON)

	// Additional configuration (stored as JSONB for flexibility)
	Config map[string]interface{} `gorm:"type:jsonb" json:"config,omitempty"`

	// Sync settings
	AutoSync         bool  `gorm:"default:false" json:"auto_sync"`          // Enable automatic syncing
	SyncIntervalMins int   `gorm:"default:60" json:"sync_interval_mins"`    // Sync interval in minutes
	LastSyncAt       *time.Time `json:"last_sync_at,omitempty"`             // Last successful sync

	// Metadata
	CreatedBy uuid.UUID      `gorm:"type:uuid;not null" json:"created_by"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	CreatedByUser *User `gorm:"foreignKey:CreatedBy" json:"created_by_user,omitempty"`
}

// TableName specifies the table name for IntegrationConfig
func (IntegrationConfig) TableName() string {
	return "integration_configs"
}

// BeforeCreate hook to set UUID if not provided
func (i *IntegrationConfig) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

// PublicIntegrationConfig represents the safe public view of integration config
type PublicIntegrationConfig struct {
	ID               uuid.UUID              `json:"id"`
	Name             string                 `json:"name"`
	Type             IntegrationType        `json:"type"`
	Active           bool                   `json:"active"`
	BaseURL          string                 `json:"base_url"`
	HasCredentials   bool                   `json:"has_credentials"`    // Indicates if credentials are configured
	Config           map[string]interface{} `json:"config,omitempty"`
	AutoSync         bool                   `json:"auto_sync"`
	SyncIntervalMins int                    `json:"sync_interval_mins"`
	LastSyncAt       *time.Time             `json:"last_sync_at,omitempty"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
}

// ToPublic converts IntegrationConfig to PublicIntegrationConfig (hides sensitive data)
func (i *IntegrationConfig) ToPublic() PublicIntegrationConfig {
	return PublicIntegrationConfig{
		ID:               i.ID,
		Name:             i.Name,
		Type:             i.Type,
		Active:           i.Active,
		BaseURL:          i.BaseURL,
		HasCredentials:   i.AccessKey != "" && i.SecretKey != "",
		Config:           i.Config,
		AutoSync:         i.AutoSync,
		SyncIntervalMins: i.SyncIntervalMins,
		LastSyncAt:       i.LastSyncAt,
		CreatedAt:        i.CreatedAt,
		UpdatedAt:        i.UpdatedAt,
	}
}
