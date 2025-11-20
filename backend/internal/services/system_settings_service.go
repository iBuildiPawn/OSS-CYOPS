package services

import (
	"errors"

	"github.com/cyops/cyops-backend/internal/models"
	"gorm.io/gorm"
)

// SystemSettingsService handles system settings business logic
type SystemSettingsService struct {
	db *gorm.DB
}

// NewSystemSettingsService creates a new system settings service
func NewSystemSettingsService(db *gorm.DB) *SystemSettingsService {
	return &SystemSettingsService{db: db}
}

// GetSetting retrieves a system setting by key
func (s *SystemSettingsService) GetSetting(key string) (*models.SystemSetting, error) {
	var setting models.SystemSetting
	result := s.db.Where("key = ?", key).First(&setting)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, errors.New("setting not found")
		}
		return nil, result.Error
	}
	return &setting, nil
}

// GetAllSettings retrieves all system settings
func (s *SystemSettingsService) GetAllSettings() ([]models.SystemSetting, error) {
	var settings []models.SystemSetting
	result := s.db.Order("key ASC").Find(&settings)
	if result.Error != nil {
		return nil, result.Error
	}
	return settings, nil
}

// UpdateSetting updates or creates a system setting
func (s *SystemSettingsService) UpdateSetting(key, value, description, updatedBy string) (*models.SystemSetting, error) {
	var setting models.SystemSetting

	// Try to find existing setting
	result := s.db.Where("key = ?", key).First(&setting)

	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// Create new setting
		setting = models.SystemSetting{
			Key:         key,
			Value:       value,
			Description: description,
			UpdatedBy:   updatedBy,
		}
		if err := s.db.Create(&setting).Error; err != nil {
			return nil, err
		}
		return &setting, nil
	}

	if result.Error != nil {
		return nil, result.Error
	}

	// Update existing setting
	setting.Value = value
	if description != "" {
		setting.Description = description
	}
	setting.UpdatedBy = updatedBy

	if err := s.db.Save(&setting).Error; err != nil {
		return nil, err
	}

	return &setting, nil
}

// IsMCPServerEnabled checks if MCP server is enabled
func (s *SystemSettingsService) IsMCPServerEnabled() bool {
	setting, err := s.GetSetting(string(models.SystemSettingMCPEnabled))
	if err != nil {
		// Default to enabled if setting doesn't exist
		return true
	}
	return setting.GetBoolValue()
}

// SetMCPServerEnabled enables or disables the MCP server
func (s *SystemSettingsService) SetMCPServerEnabled(enabled bool, updatedBy string) error {
	value := "false"
	if enabled {
		value = "true"
	}

	_, err := s.UpdateSetting(
		string(models.SystemSettingMCPEnabled),
		value,
		"Enable or disable the MCP (Model Context Protocol) server for AI assistant integrations",
		updatedBy,
	)
	return err
}

// InitializeDefaultSettings creates default system settings if they don't exist
func (s *SystemSettingsService) InitializeDefaultSettings() error {
	defaults := []models.SystemSetting{
		{
			Key:         string(models.SystemSettingMCPEnabled),
			Value:       "true",
			Description: "Enable or disable the MCP (Model Context Protocol) server for AI assistant integrations",
			UpdatedBy:   "system",
		},
	}

	for _, setting := range defaults {
		var existing models.SystemSetting
		result := s.db.Where("key = ?", setting.Key).First(&existing)

		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// Setting doesn't exist, create it
			if err := s.db.Create(&setting).Error; err != nil {
				return err
			}
		}
	}

	return nil
}
