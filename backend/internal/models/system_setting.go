package models

import (
	"time"

	"gorm.io/gorm"
)

// SystemSettingKey represents available system-wide settings
type SystemSettingKey string

const (
	// MCP Server settings
	SystemSettingMCPEnabled SystemSettingKey = "mcp_server_enabled"

	// Future settings can be added here
	// SystemSettingMaintenanceMode SystemSettingKey = "maintenance_mode"
	// SystemSettingAutoBackup SystemSettingKey = "auto_backup_enabled"
)

// SystemSetting stores system-wide configuration settings
type SystemSetting struct {
	Key         string    `gorm:"primaryKey;type:varchar(100)" json:"key"`
	Value       string    `gorm:"type:text;not null" json:"value"`
	Description string    `gorm:"type:text" json:"description"`
	UpdatedBy   string    `gorm:"type:varchar(255)" json:"updated_by"` // Email of user who last updated
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName specifies the table name for SystemSetting
func (SystemSetting) TableName() string {
	return "system_settings"
}

// GetBoolValue parses the value as a boolean
func (s *SystemSetting) GetBoolValue() bool {
	return s.Value == "true" || s.Value == "1"
}

// SetBoolValue sets the value from a boolean
func (s *SystemSetting) SetBoolValue(value bool) {
	if value {
		s.Value = "true"
	} else {
		s.Value = "false"
	}
}

// BeforeCreate hook to set default values
func (s *SystemSetting) BeforeCreate(tx *gorm.DB) error {
	if s.Key == string(SystemSettingMCPEnabled) && s.Description == "" {
		s.Description = "Enable or disable the MCP (Model Context Protocol) server for AI assistant integrations"
	}
	return nil
}
