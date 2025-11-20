package services

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/pkg/database"
	"github.com/cyops/cyops-backend/pkg/utils"
	"gorm.io/gorm"
)

// AffectedSystemService handles affected system operations
type AffectedSystemService struct {
	db *gorm.DB
}

// NewAffectedSystemService creates a new affected system service
func NewAffectedSystemService() *AffectedSystemService {
	return &AffectedSystemService{
		db: database.GetDB(),
	}
}

// CreateAffectedSystemRequest represents a request to create an affected system
type CreateAffectedSystemRequest struct {
	Hostname    string
	IPAddress   string
	AssetID     string
	SystemType  string
	Description string
	Environment string
}

// CreateAffectedSystem creates a new affected system
func (s *AffectedSystemService) CreateAffectedSystem(req CreateAffectedSystemRequest) (*models.AffectedSystem, error) {
	system := &models.AffectedSystem{
		Hostname:    req.Hostname,
		IPAddress:   req.IPAddress,
		AssetID:     req.AssetID,
		SystemType:  models.SystemType(req.SystemType),
		Description: req.Description,
		Environment: models.Environment(req.Environment),
	}

	if err := s.db.Create(system).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to create affected system")
		return nil, fmt.Errorf("failed to create affected system: %w", err)
	}

	utils.Logger.Info().
		Str("system_id", system.ID.String()).
		Str("hostname", system.Hostname).
		Msg("Affected system created successfully")

	return system, nil
}

// ListAffectedSystemsRequest represents a list request
type ListAffectedSystemsRequest struct {
	Page        int
	Limit       int
	SystemType  string
	Environment string
	Search      string
}

// ListAffectedSystems returns a paginated list of affected systems
func (s *AffectedSystemService) ListAffectedSystems(req ListAffectedSystemsRequest) ([]models.AffectedSystem, int64, error) {
	var systems []models.AffectedSystem
	var total int64

	query := s.db.Model(&models.AffectedSystem{})

	// Apply filters
	if req.SystemType != "" {
		query = query.Where("system_type = ?", req.SystemType)
	}

	if req.Environment != "" {
		query = query.Where("environment = ?", req.Environment)
	}

	if req.Search != "" {
		searchTerm := "%" + req.Search + "%"
		query = query.Where("hostname ILIKE ? OR ip_address ILIKE ? OR asset_id ILIKE ?", searchTerm, searchTerm, searchTerm)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to count affected systems")
		return nil, 0, fmt.Errorf("failed to count affected systems: %w", err)
	}

	// Apply pagination
	page := 1
	if req.Page > 0 {
		page = req.Page
	}
	limit := 50
	if req.Limit > 0 && req.Limit <= 10000 {
		limit = req.Limit
	}
	offset := (page - 1) * limit

	// Fetch systems
	if err := query.
		Order("hostname ASC").
		Offset(offset).
		Limit(limit).
		Find(&systems).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to list affected systems")
		return nil, 0, fmt.Errorf("failed to list affected systems: %w", err)
	}

	return systems, total, nil
}

// GetAffectedSystemByID retrieves an affected system by ID
func (s *AffectedSystemService) GetAffectedSystemByID(id uuid.UUID) (*models.AffectedSystem, error) {
	var system models.AffectedSystem

	if err := s.db.First(&system, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("affected system not found")
		}
		utils.Logger.Error().Err(err).Str("id", id.String()).Msg("Failed to get affected system")
		return nil, fmt.Errorf("failed to get affected system: %w", err)
	}

	return &system, nil
}

// UpdateAffectedSystemRequest represents an update request
type UpdateAffectedSystemRequest struct {
	Hostname    *string
	IPAddress   *string
	AssetID     *string
	SystemType  *string
	Description *string
	Environment *string
}

// UpdateAffectedSystem updates an affected system
func (s *AffectedSystemService) UpdateAffectedSystem(id uuid.UUID, req UpdateAffectedSystemRequest) (*models.AffectedSystem, error) {
	var system models.AffectedSystem

	if err := s.db.First(&system, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("affected system not found")
		}
		return nil, fmt.Errorf("failed to get affected system: %w", err)
	}

	updates := make(map[string]interface{})

	if req.Hostname != nil {
		updates["hostname"] = *req.Hostname
	}
	if req.IPAddress != nil {
		updates["ip_address"] = *req.IPAddress
	}
	if req.AssetID != nil {
		updates["asset_id"] = *req.AssetID
	}
	if req.SystemType != nil {
		updates["system_type"] = *req.SystemType
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Environment != nil {
		updates["environment"] = *req.Environment
	}

	if err := s.db.Model(&system).Updates(updates).Error; err != nil {
		utils.Logger.Error().Err(err).Str("id", id.String()).Msg("Failed to update affected system")
		return nil, fmt.Errorf("failed to update affected system: %w", err)
	}

	utils.Logger.Info().
		Str("system_id", id.String()).
		Msg("Affected system updated successfully")

	return &system, nil
}

// DeleteAffectedSystem soft deletes an affected system
func (s *AffectedSystemService) DeleteAffectedSystem(id uuid.UUID) error {
	result := s.db.Delete(&models.AffectedSystem{}, id)
	if result.Error != nil {
		utils.Logger.Error().Err(result.Error).Str("id", id.String()).Msg("Failed to delete affected system")
		return fmt.Errorf("failed to delete affected system: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("affected system not found")
	}

	utils.Logger.Info().
		Str("system_id", id.String()).
		Msg("Affected system deleted successfully")

	return nil
}

// GetSystemsForVulnerability returns all affected systems for a vulnerability
func (s *AffectedSystemService) GetSystemsForVulnerability(vulnerabilityID uuid.UUID) ([]models.AffectedSystem, error) {
	var systems []models.AffectedSystem

	err := s.db.
		Joins("JOIN vulnerability_affected_systems vas ON vas.affected_system_id = affected_systems.id").
		Where("vas.vulnerability_id = ?", vulnerabilityID).
		Find(&systems).Error

	if err != nil {
		utils.Logger.Error().Err(err).Str("vulnerability_id", vulnerabilityID.String()).Msg("Failed to get systems for vulnerability")
		return nil, fmt.Errorf("failed to get systems for vulnerability: %w", err)
	}

	return systems, nil
}
