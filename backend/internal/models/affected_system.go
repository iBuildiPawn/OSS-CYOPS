package models

import (
	"errors"
	"net"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SystemType represents the type of system or asset
type SystemType string

const (
	SystemTypeServer        SystemType = "SERVER"
	SystemTypeWorkstation   SystemType = "WORKSTATION"
	SystemTypeNetworkDevice SystemType = "NETWORK_DEVICE"
	SystemTypeApplication   SystemType = "APPLICATION"
	SystemTypeContainer     SystemType = "CONTAINER"
	SystemTypeCloudService  SystemType = "CLOUD_SERVICE"
	SystemTypeOther         SystemType = "OTHER"
)

// Environment represents the deployment environment
type Environment string

const (
	EnvProduction  Environment = "PRODUCTION"
	EnvStaging     Environment = "STAGING"
	EnvDevelopment Environment = "DEVELOPMENT"
	EnvTest        Environment = "TEST"
)

// AssetCriticality represents business importance of an asset
type AssetCriticality string

const (
	CriticalityCritical AssetCriticality = "CRITICAL"
	CriticalityHigh     AssetCriticality = "HIGH"
	CriticalityMedium   AssetCriticality = "MEDIUM"
	CriticalityLow      AssetCriticality = "LOW"
)

// AssetStatus represents asset lifecycle state
type AssetStatus string

const (
	StatusActive           AssetStatus = "ACTIVE"
	StatusInactive         AssetStatus = "INACTIVE"
	StatusDecommissioned   AssetStatus = "DECOMMISSIONED"
	StatusUnderMaintenance AssetStatus = "UNDER_MAINTENANCE"
)

// AffectedSystem represents a system or asset that can be affected by vulnerabilities
type AffectedSystem struct {
	BaseModel

	// Existing fields (from 002-vulnerability-management)
	Hostname    string      `gorm:"type:varchar(255)" json:"hostname,omitempty"`
	IPAddress   string      `gorm:"type:varchar(45)" json:"ip_address,omitempty"`
	AssetID     string      `gorm:"type:varchar(100)" json:"asset_id,omitempty"`
	SystemType  SystemType  `gorm:"type:varchar(50);not null" json:"system_type"`
	Description string      `gorm:"type:text" json:"description,omitempty"`
	Environment Environment `gorm:"type:varchar(50);not null;default:PRODUCTION" json:"environment"`

	// New fields (003-asset-management)
	Criticality  *AssetCriticality `gorm:"type:varchar(20)" json:"criticality,omitempty"`
	Status       AssetStatus       `gorm:"type:varchar(30);not null;default:ACTIVE" json:"status"`
	OwnerID      *uuid.UUID        `gorm:"type:uuid" json:"owner_id,omitempty"`
	Owner        *User             `gorm:"foreignKey:OwnerID;constraint:OnDelete:SET NULL" json:"owner,omitempty"`
	Department   string            `gorm:"type:varchar(100)" json:"department,omitempty"`
	Location     string            `gorm:"type:varchar(255)" json:"location,omitempty"`
	LastScanDate *time.Time        `gorm:"type:timestamp" json:"last_scan_date,omitempty"`

	// Relationships
	Tags []AssetTag `gorm:"foreignKey:AssetID" json:"tags,omitempty"`
}

// TableName specifies the table name for AffectedSystem model
func (AffectedSystem) TableName() string {
	return "affected_systems"
}

// BeforeCreate validation hook
func (a *AffectedSystem) BeforeCreate(tx *gorm.DB) error {
	// At least one identifier required
	if a.Hostname == "" && a.IPAddress == "" && a.AssetID == "" {
		return errors.New("at least one of hostname, ip_address, or asset_id must be provided")
	}

	// Validate IP address format if provided
	if a.IPAddress != "" {
		if net.ParseIP(a.IPAddress) == nil {
			return errors.New("invalid ip_address format")
		}
	}

	return nil
}

// GetVulnerabilityStats returns vulnerability count and severity breakdown
func (a *AffectedSystem) GetVulnerabilityStats(db *gorm.DB) (map[string]int, error) {
	var results []struct {
		Severity string
		Count    int
	}

	err := db.Table("vulnerabilities v").
		Select("v.severity, COUNT(*) as count").
		Joins("JOIN vulnerability_affected_systems vas ON v.id = vas.vulnerability_id").
		Where("vas.affected_system_id = ? AND v.deleted_at IS NULL", a.ID).
		Group("v.severity").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	stats := make(map[string]int)
	for _, r := range results {
		stats[r.Severity] = r.Count
	}

	return stats, nil
}

// VulnerabilityAffectedSystem is the junction table for many-to-many relationship
type VulnerabilityAffectedSystem struct {
	VulnerabilityID  string     `gorm:"primaryKey;type:uuid;not null" json:"vulnerability_id"`
	AffectedSystemID string     `gorm:"primaryKey;type:uuid;not null" json:"affected_system_id"`
	DetectedAt       time.Time  `gorm:"not null;default:CURRENT_TIMESTAMP" json:"detected_at"`
	PatchedAt        *time.Time `gorm:"" json:"patched_at,omitempty"`
	Notes            string     `gorm:"type:text" json:"notes,omitempty"`
}

// TableName specifies the table name for the junction table
func (VulnerabilityAffectedSystem) TableName() string {
	return "vulnerability_affected_systems"
}
