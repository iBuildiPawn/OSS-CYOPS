package services

import (
	"fmt"
	"net"

	"github.com/cyops/cyops-backend/internal/models"
	"gorm.io/gorm"
)

// AssetValidationService handles asset validation logic
type AssetValidationService struct {
	db *gorm.DB
}

// NewAssetValidationService creates a new asset validation service
func NewAssetValidationService(db *gorm.DB) *AssetValidationService {
	return &AssetValidationService{db: db}
}

// DuplicateCheckResult represents the result of a duplicate check
type DuplicateCheckResult struct {
	IsDuplicate     bool                    `json:"is_duplicate"`
	Matches         []models.AffectedSystem `json:"matches,omitempty"`
	SimilarityScore float64                 `json:"similarity_score,omitempty"`
}

// ValidateCreate validates asset data for creation
func (s *AssetValidationService) ValidateCreate(asset *models.AffectedSystem) error {
	// At least one identifier required
	if asset.Hostname == "" && asset.IPAddress == "" && asset.AssetID == "" {
		return fmt.Errorf("at least one of hostname, ip_address, or asset_id must be provided")
	}

	// Validate IP address format if provided
	if asset.IPAddress != "" {
		if net.ParseIP(asset.IPAddress) == nil {
			return fmt.Errorf("invalid ip_address format")
		}
	}

	// Validate criticality enum if provided
	if asset.Criticality != nil {
		validCriticality := map[models.AssetCriticality]bool{
			models.CriticalityCritical: true,
			models.CriticalityHigh:     true,
			models.CriticalityMedium:   true,
			models.CriticalityLow:      true,
		}
		if !validCriticality[*asset.Criticality] {
			return fmt.Errorf("invalid criticality value")
		}
	}

	// Validate status enum (if provided, otherwise will default to ACTIVE)
	if asset.Status != "" {
		validStatus := map[models.AssetStatus]bool{
			models.StatusActive:           true,
			models.StatusInactive:         true,
			models.StatusDecommissioned:   true,
			models.StatusUnderMaintenance: true,
		}
		if !validStatus[asset.Status] {
			return fmt.Errorf("invalid status value")
		}
	}

	return nil
}

// ValidateUpdate validates asset data for updates
func (s *AssetValidationService) ValidateUpdate(asset *models.AffectedSystem, updates map[string]interface{}) error {
	// Validate IP address format if being updated
	if ipAddress, ok := updates["ip_address"].(string); ok && ipAddress != "" {
		if net.ParseIP(ipAddress) == nil {
			return fmt.Errorf("invalid ip_address format")
		}
	}

	// Validate criticality enum if being updated
	if criticality, ok := updates["criticality"].(string); ok {
		crit := models.AssetCriticality(criticality)
		validCriticality := map[models.AssetCriticality]bool{
			models.CriticalityCritical: true,
			models.CriticalityHigh:     true,
			models.CriticalityMedium:   true,
			models.CriticalityLow:      true,
		}
		if !validCriticality[crit] {
			return fmt.Errorf("invalid criticality value")
		}
	}

	// Validate status enum if being updated
	if status, ok := updates["status"].(string); ok {
		stat := models.AssetStatus(status)
		validStatus := map[models.AssetStatus]bool{
			models.StatusActive:           true,
			models.StatusInactive:         true,
			models.StatusDecommissioned:   true,
			models.StatusUnderMaintenance: true,
		}
		if !validStatus[stat] {
			return fmt.Errorf("invalid status value")
		}
	}

	return nil
}

// CheckDuplicate checks for duplicate assets based on hostname, IP, and environment
func (s *AssetValidationService) CheckDuplicate(hostname, ipAddress string, environment models.Environment) (*DuplicateCheckResult, error) {
	var matches []models.AffectedSystem
	result := &DuplicateCheckResult{
		IsDuplicate: false,
		Matches:     []models.AffectedSystem{},
	}

	// Check for exact hostname match in same environment
	if hostname != "" {
		var hostMatches []models.AffectedSystem
		err := s.db.Where("hostname = ? AND environment = ? AND deleted_at IS NULL", hostname, environment).
			Find(&hostMatches).Error
		if err != nil {
			return nil, fmt.Errorf("failed to check hostname duplicates: %w", err)
		}
		matches = append(matches, hostMatches...)
	}

	// Check for exact IP match in same environment
	if ipAddress != "" {
		var ipMatches []models.AffectedSystem
		err := s.db.Where("ip_address = ? AND environment = ? AND deleted_at IS NULL", ipAddress, environment).
			Find(&ipMatches).Error
		if err != nil {
			return nil, fmt.Errorf("failed to check IP duplicates: %w", err)
		}
		matches = append(matches, ipMatches...)
	}

	if len(matches) > 0 {
		result.IsDuplicate = true
		result.Matches = matches
		result.SimilarityScore = 1.0 // Exact match
	}

	return result, nil
}
