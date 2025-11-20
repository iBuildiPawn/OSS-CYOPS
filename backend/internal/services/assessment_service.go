package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/pkg/utils"
	"gorm.io/gorm"
)

// AssessmentService handles assessment-related business logic
type AssessmentService struct {
	db *gorm.DB
}

// NewAssessmentService creates a new assessment service
func NewAssessmentService(db *gorm.DB) *AssessmentService {
	return &AssessmentService{db: db}
}

// CreateAssessmentRequest represents a request to create an assessment
type CreateAssessmentRequest struct {
	Name                 string
	Description          string
	AssessmentType       models.AssessmentType
	AssessorName         string
	AssessorOrganization string
	StartDate            time.Time
	EndDate              *time.Time
	VulnerabilityIDs     []uuid.UUID
	AssetIDs             []uuid.UUID
}

// UpdateAssessmentRequest represents a request to update an assessment
type UpdateAssessmentRequest struct {
	Name                 *string
	Description          *string
	Status               *models.AssessmentStatus
	AssessorName         *string
	AssessorOrganization *string
	StartDate            *time.Time
	EndDate              *time.Time
	ReportURL            *string
	ExecutiveSummary     *string
	FindingsSummary      *string
	Recommendations      *string
	Score                *int
}

// CreateAssessment creates a new assessment
func (s *AssessmentService) CreateAssessment(req CreateAssessmentRequest, createdByID uuid.UUID) (*models.Assessment, error) {
	// Create assessment
	assessment := &models.Assessment{
		Name:                 req.Name,
		Description:          req.Description,
		AssessmentType:       req.AssessmentType,
		Status:               models.AssessmentPlanned,
		AssessorName:         req.AssessorName,
		AssessorOrganization: req.AssessorOrganization,
		StartDate:            req.StartDate,
		EndDate:              req.EndDate,
		CreatedByID:          createdByID,
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Save assessment
	if err := tx.Create(assessment).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to create assessment")
		return nil, fmt.Errorf("failed to create assessment: %w", err)
	}

	// Link vulnerabilities if provided
	for _, vulnID := range req.VulnerabilityIDs {
		link := &models.AssessmentVulnerability{
			AssessmentID:    assessment.ID.String(),
			VulnerabilityID: vulnID.String(),
		}
		if err := tx.Create(link).Error; err != nil {
			tx.Rollback()
			utils.Logger.Error().Err(err).Str("vuln_id", vulnID.String()).Msg("Failed to link vulnerability")
			return nil, fmt.Errorf("failed to link vulnerability: %w", err)
		}
	}

	// Link assets if provided
	for _, assetID := range req.AssetIDs {
		link := &models.AssessmentAsset{
			AssessmentID: assessment.ID.String(),
			AssetID:      assetID.String(),
		}
		if err := tx.Create(link).Error; err != nil {
			tx.Rollback()
			utils.Logger.Error().Err(err).Str("asset_id", assetID.String()).Msg("Failed to link asset")
			return nil, fmt.Errorf("failed to link asset: %w", err)
		}
	}

	if err := tx.Commit().Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to commit assessment transaction")
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Load relationships
	if err := s.db.Preload("CreatedBy").Preload("Vulnerabilities").Preload("Assets").First(assessment, assessment.ID).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to reload assessment with relationships")
		return nil, fmt.Errorf("failed to load assessment: %w", err)
	}

	return assessment, nil
}

// GetAssessment retrieves an assessment by ID
func (s *AssessmentService) GetAssessment(id uuid.UUID) (*models.Assessment, error) {
	var assessment models.Assessment
	if err := s.db.Preload("CreatedBy").
		Preload("Vulnerabilities").
		Preload("Assets").
		First(&assessment, id).Error; err != nil {
		return nil, err
	}
	return &assessment, nil
}

// ListAssessments retrieves a list of assessments with pagination and filters
func (s *AssessmentService) ListAssessments(page, limit int, status *models.AssessmentStatus, assessmentType *models.AssessmentType) ([]models.Assessment, int64, error) {
	var assessments []models.Assessment
	var total int64

	query := s.db.Model(&models.Assessment{})

	// Apply filters
	if status != nil {
		query = query.Where("status = ?", *status)
	}
	if assessmentType != nil {
		query = query.Where("assessment_type = ?", *assessmentType)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * limit
	if err := query.
		Preload("CreatedBy").
		Order("start_date DESC").
		Offset(offset).
		Limit(limit).
		Find(&assessments).Error; err != nil {
		return nil, 0, err
	}

	return assessments, total, nil
}

// UpdateAssessment updates an existing assessment
func (s *AssessmentService) UpdateAssessment(id uuid.UUID, req UpdateAssessmentRequest) (*models.Assessment, error) {
	var assessment models.Assessment
	if err := s.db.First(&assessment, id).Error; err != nil {
		return nil, err
	}

	// Update fields if provided
	if req.Name != nil {
		assessment.Name = *req.Name
	}
	if req.Description != nil {
		assessment.Description = *req.Description
	}
	if req.Status != nil {
		assessment.Status = *req.Status
	}
	if req.AssessorName != nil {
		assessment.AssessorName = *req.AssessorName
	}
	if req.AssessorOrganization != nil {
		assessment.AssessorOrganization = *req.AssessorOrganization
	}
	if req.StartDate != nil {
		assessment.StartDate = *req.StartDate
	}
	if req.EndDate != nil {
		assessment.EndDate = req.EndDate
	}
	if req.ReportURL != nil {
		assessment.ReportURL = *req.ReportURL
	}
	if req.ExecutiveSummary != nil {
		assessment.ExecutiveSummary = *req.ExecutiveSummary
	}
	if req.FindingsSummary != nil {
		assessment.FindingsSummary = *req.FindingsSummary
	}
	if req.Recommendations != nil {
		assessment.Recommendations = *req.Recommendations
	}
	if req.Score != nil {
		assessment.Score = req.Score
	}

	if err := s.db.Save(&assessment).Error; err != nil {
		return nil, err
	}

	// Reload with relationships
	if err := s.db.Preload("CreatedBy").
		Preload("Vulnerabilities").
		Preload("Assets").
		First(&assessment, id).Error; err != nil {
		return nil, err
	}

	return &assessment, nil
}

// DeleteAssessment soft deletes an assessment
func (s *AssessmentService) DeleteAssessment(id uuid.UUID) error {
	return s.db.Delete(&models.Assessment{}, id).Error
}

// LinkVulnerability adds a vulnerability to an assessment
func (s *AssessmentService) LinkVulnerability(assessmentID, vulnerabilityID uuid.UUID, findingNotes string) error {
	link := &models.AssessmentVulnerability{
		AssessmentID:    assessmentID.String(),
		VulnerabilityID: vulnerabilityID.String(),
		FindingNotes:    findingNotes,
	}
	return s.db.Create(link).Error
}

// UnlinkVulnerability removes a vulnerability from an assessment
func (s *AssessmentService) UnlinkVulnerability(assessmentID, vulnerabilityID uuid.UUID) error {
	return s.db.Where("assessment_id = ? AND vulnerability_id = ?", assessmentID.String(), vulnerabilityID.String()).
		Delete(&models.AssessmentVulnerability{}).Error
}

// LinkAsset adds an asset to an assessment
func (s *AssessmentService) LinkAsset(assessmentID, assetID uuid.UUID, assessmentNotes string) error {
	link := &models.AssessmentAsset{
		AssessmentID:    assessmentID.String(),
		AssetID:         assetID.String(),
		AssessmentNotes: assessmentNotes,
	}
	return s.db.Create(link).Error
}

// UnlinkAsset removes an asset from an assessment
func (s *AssessmentService) UnlinkAsset(assessmentID, assetID uuid.UUID) error {
	return s.db.Where("assessment_id = ? AND asset_id = ?", assessmentID.String(), assetID.String()).
		Delete(&models.AssessmentAsset{}).Error
}

// GetAssessmentStats returns statistics about assessments
func (s *AssessmentService) GetAssessmentStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Count by status
	var statusCounts []struct {
		Status string
		Count  int64
	}
	if err := s.db.Model(&models.Assessment{}).
		Select("status, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("status").
		Scan(&statusCounts).Error; err != nil {
		return nil, err
	}
	stats["by_status"] = statusCounts

	// Count by type
	var typeCounts []struct {
		Type  string
		Count int64
	}
	if err := s.db.Model(&models.Assessment{}).
		Select("assessment_type as type, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("assessment_type").
		Scan(&typeCounts).Error; err != nil {
		return nil, err
	}
	stats["by_type"] = typeCounts

	// Total assessments
	var total int64
	if err := s.db.Model(&models.Assessment{}).Where("deleted_at IS NULL").Count(&total).Error; err != nil {
		return nil, err
	}
	stats["total"] = total

	return stats, nil
}
