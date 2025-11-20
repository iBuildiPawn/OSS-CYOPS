package services

import (
	"fmt"

	"github.com/cyops/cyops-backend/pkg/database"
	"github.com/cyops/cyops-backend/pkg/utils"
	"gorm.io/gorm"
)

// CleanupService handles database cleanup operations
type CleanupService struct {
	db *gorm.DB
}

// NewCleanupService creates a new cleanup service
func NewCleanupService() *CleanupService {
	return &CleanupService{
		db: database.GetDB(),
	}
}

// CleanupResult represents the result of a cleanup operation
type CleanupResult struct {
	DeletedCount int64 `json:"deleted_count"`
	Message      string `json:"message"`
}

// CleanupAssets performs hard delete of all soft-deleted assets
// This permanently removes assets marked as deleted along with their relationships
func (s *CleanupService) CleanupAssets() (*CleanupResult, error) {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Count soft-deleted assets
	var count int64
	if err := tx.Unscoped().
		Where("deleted_at IS NOT NULL").
		Table("affected_systems").
		Count(&count).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to count soft-deleted assets")
		return nil, fmt.Errorf("failed to count soft-deleted assets: %w", err)
	}

	if count == 0 {
		tx.Rollback()
		return &CleanupResult{
			DeletedCount: 0,
			Message:      "No soft-deleted assets found to cleanup",
		}, nil
	}

	// Step 1: Delete asset tags
	if err := tx.Exec(`
		DELETE FROM asset_tags
		WHERE asset_id IN (
			SELECT id FROM affected_systems WHERE deleted_at IS NOT NULL
		)
	`).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete asset tags")
		return nil, fmt.Errorf("failed to delete asset tags: %w", err)
	}

	// Step 2: Delete relationships in vulnerability_affected_systems
	if err := tx.Exec(`
		DELETE FROM vulnerability_affected_systems
		WHERE affected_system_id IN (
			SELECT id FROM affected_systems WHERE deleted_at IS NOT NULL
		)
	`).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete asset relationships")
		return nil, fmt.Errorf("failed to delete asset relationships: %w", err)
	}

	// Step 3: Delete vulnerability findings (note: this has CASCADE, but explicit is better)
	if err := tx.Exec(`
		DELETE FROM vulnerability_findings
		WHERE affected_system_id IN (
			SELECT id FROM affected_systems WHERE deleted_at IS NOT NULL
		)
	`).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete vulnerability findings for assets")
		return nil, fmt.Errorf("failed to delete vulnerability findings: %w", err)
	}

	// Now permanently delete the soft-deleted assets
	if err := tx.Unscoped().
		Table("affected_systems").
		Where("deleted_at IS NOT NULL").
		Delete(nil).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to hard delete assets")
		return nil, fmt.Errorf("failed to permanently delete assets: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to commit asset cleanup transaction")
		return nil, fmt.Errorf("failed to commit cleanup transaction: %w", err)
	}

	utils.Logger.Info().Int64("count", count).Msg("Assets permanently deleted")

	return &CleanupResult{
		DeletedCount: count,
		Message:      fmt.Sprintf("Successfully deleted %d asset(s) permanently", count),
	}, nil
}

// CleanupVulnerabilities performs hard delete of all soft-deleted vulnerabilities
// This permanently removes vulnerabilities marked as deleted along with their relationships
func (s *CleanupService) CleanupVulnerabilities() (*CleanupResult, error) {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Count soft-deleted vulnerabilities
	var count int64
	if err := tx.Unscoped().
		Where("deleted_at IS NOT NULL").
		Table("vulnerabilities").
		Count(&count).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to count soft-deleted vulnerabilities")
		return nil, fmt.Errorf("failed to count soft-deleted vulnerabilities: %w", err)
	}

	if count == 0 {
		tx.Rollback()
		return &CleanupResult{
			DeletedCount: 0,
			Message:      "No soft-deleted vulnerabilities found to cleanup",
		}, nil
	}

	// Step 1: Delete vulnerability findings (note: this has CASCADE, but explicit is better)
	if err := tx.Exec(`
		DELETE FROM vulnerability_findings
		WHERE vulnerability_id IN (
			SELECT id FROM vulnerabilities WHERE deleted_at IS NOT NULL
		)
	`).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete vulnerability findings")
		return nil, fmt.Errorf("failed to delete vulnerability findings: %w", err)
	}

	// Step 2: Delete status history entries
	if err := tx.Exec(`
		DELETE FROM vulnerability_status_history
		WHERE vulnerability_id IN (
			SELECT id FROM vulnerabilities WHERE deleted_at IS NOT NULL
		)
	`).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete vulnerability status history")
		return nil, fmt.Errorf("failed to delete vulnerability status history: %w", err)
	}

	// Step 3: Delete relationships in vulnerability_affected_systems
	if err := tx.Exec(`
		DELETE FROM vulnerability_affected_systems
		WHERE vulnerability_id IN (
			SELECT id FROM vulnerabilities WHERE deleted_at IS NOT NULL
		)
	`).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete vulnerability relationships")
		return nil, fmt.Errorf("failed to delete vulnerability relationships: %w", err)
	}

	// Now permanently delete the soft-deleted vulnerabilities
	if err := tx.Unscoped().
		Table("vulnerabilities").
		Where("deleted_at IS NOT NULL").
		Delete(nil).Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to hard delete vulnerabilities")
		return nil, fmt.Errorf("failed to permanently delete vulnerabilities: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to commit vulnerability cleanup transaction")
		return nil, fmt.Errorf("failed to commit cleanup transaction: %w", err)
	}

	utils.Logger.Info().Int64("count", count).Msg("Vulnerabilities permanently deleted")

	return &CleanupResult{
		DeletedCount: count,
		Message:      fmt.Sprintf("Successfully deleted %d vulnerability/vulnerabilities permanently", count),
	}, nil
}

// CleanupAllData performs a complete cleanup of all vulnerability and asset data
// This removes ALL data including non-soft-deleted items, but preserves users, sessions, and auth
func (s *CleanupService) CleanupAllData() (*CleanupResult, error) {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Count existing data for reporting
	var assetCount, vulnCount, findingCount, assessmentCount int64
	tx.Table("affected_systems").Count(&assetCount)
	tx.Table("vulnerabilities").Count(&vulnCount)
	tx.Table("vulnerability_findings").Count(&findingCount)
	tx.Table("assessments").Count(&assessmentCount)

	// Step 1: Delete all finding attachments (has foreign keys to findings)
	if err := tx.Exec("TRUNCATE TABLE finding_attachments CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete finding attachments")
		return nil, fmt.Errorf("failed to delete finding attachments: %w", err)
	}

	// Step 2: Delete all finding status history
	if err := tx.Exec("TRUNCATE TABLE finding_status_history CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete finding status history")
		return nil, fmt.Errorf("failed to delete finding status history: %w", err)
	}

	// Step 3: Delete all vulnerability findings (links vulnerabilities to assets)
	if err := tx.Exec("TRUNCATE TABLE vulnerability_findings CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete vulnerability findings")
		return nil, fmt.Errorf("failed to delete vulnerability findings: %w", err)
	}

	// Step 4: Delete all vulnerability attachments
	if err := tx.Exec("TRUNCATE TABLE vulnerability_attachments CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete vulnerability attachments")
		return nil, fmt.Errorf("failed to delete vulnerability attachments: %w", err)
	}

	// Step 5: Delete all vulnerability status history
	if err := tx.Exec("TRUNCATE TABLE vulnerability_status_history CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete vulnerability status history")
		return nil, fmt.Errorf("failed to delete vulnerability status history: %w", err)
	}

	// Step 6: Delete all vulnerability-affected system relationships
	if err := tx.Exec("TRUNCATE TABLE vulnerability_affected_systems CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete vulnerability-affected system relationships")
		return nil, fmt.Errorf("failed to delete vulnerability-affected system relationships: %w", err)
	}

	// Step 7: Delete all vulnerabilities (including soft-deleted ones)
	if err := tx.Exec("TRUNCATE TABLE vulnerabilities CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete all vulnerabilities")
		return nil, fmt.Errorf("failed to delete all vulnerabilities: %w", err)
	}

	// Step 8: Delete all assessment relationships
	if err := tx.Exec("TRUNCATE TABLE assessment_assets CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete assessment assets")
		return nil, fmt.Errorf("failed to delete assessment assets: %w", err)
	}

	if err := tx.Exec("TRUNCATE TABLE assessment_vulnerabilities CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete assessment vulnerabilities")
		return nil, fmt.Errorf("failed to delete assessment vulnerabilities: %w", err)
	}

	if err := tx.Exec("TRUNCATE TABLE assessment_reports CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete assessment reports")
		return nil, fmt.Errorf("failed to delete assessment reports: %w", err)
	}

	// Step 9: Delete all assessments
	if err := tx.Exec("TRUNCATE TABLE assessments CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete all assessments")
		return nil, fmt.Errorf("failed to delete all assessments: %w", err)
	}

	// Step 10: Delete all affected systems (assets) (including soft-deleted ones)
	if err := tx.Exec("TRUNCATE TABLE affected_systems CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete all assets")
		return nil, fmt.Errorf("failed to delete all assets: %w", err)
	}

	// Step 11: Delete all asset tags
	if err := tx.Exec("TRUNCATE TABLE asset_tags CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete asset tags")
		return nil, fmt.Errorf("failed to delete asset tags: %w", err)
	}

	// Step 12: Delete integration configs (may contain API keys for scanners)
	if err := tx.Exec("TRUNCATE TABLE integration_configs CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete integration configs")
		return nil, fmt.Errorf("failed to delete integration configs: %w", err)
	}

	// Step 13: Clean up verification tokens (old email verification tokens)
	if err := tx.Exec("TRUNCATE TABLE verification_tokens CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete verification tokens")
		return nil, fmt.Errorf("failed to delete verification tokens: %w", err)
	}

	// Step 14: Clean up auth events
	if err := tx.Exec("TRUNCATE TABLE auth_events CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete auth events")
		return nil, fmt.Errorf("failed to delete auth events: %w", err)
	}

	// Step 15: Clean up API keys
	if err := tx.Exec("TRUNCATE TABLE api_keys CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete API keys")
		return nil, fmt.Errorf("failed to delete API keys: %w", err)
	}

	// Step 16: Clean up system settings
	if err := tx.Exec("TRUNCATE TABLE system_settings CASCADE").Error; err != nil {
		tx.Rollback()
		utils.Logger.Error().Err(err).Msg("Failed to delete system settings")
		return nil, fmt.Errorf("failed to delete system settings: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to commit complete cleanup transaction")
		return nil, fmt.Errorf("failed to commit cleanup transaction: %w", err)
	}

	totalCount := assetCount + vulnCount + findingCount + assessmentCount

	utils.Logger.Warn().
		Int64("assets", assetCount).
		Int64("vulnerabilities", vulnCount).
		Int64("findings", findingCount).
		Int64("assessments", assessmentCount).
		Msg("Complete database cleanup performed - all vulnerability, asset, and related data removed")

	return &CleanupResult{
		DeletedCount: totalCount,
		Message:      fmt.Sprintf("Successfully deleted all data: %d asset(s), %d vulnerability/vulnerabilities, %d finding(s), and %d assessment(s). User accounts, roles, and sessions preserved.", assetCount, vulnCount, findingCount, assessmentCount),
	}, nil
}

// GetCleanupStats returns statistics about soft-deleted items
func (s *CleanupService) GetCleanupStats() (map[string]int64, error) {
	stats := make(map[string]int64)

	// Count soft-deleted assets
	var assetCount int64
	if err := s.db.Unscoped().
		Where("deleted_at IS NOT NULL").
		Table("affected_systems").
		Count(&assetCount).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to count soft-deleted assets")
		return nil, fmt.Errorf("failed to count assets: %w", err)
	}
	stats["assets"] = assetCount

	// Count soft-deleted vulnerabilities
	var vulnCount int64
	if err := s.db.Unscoped().
		Where("deleted_at IS NOT NULL").
		Table("vulnerabilities").
		Count(&vulnCount).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to count soft-deleted vulnerabilities")
		return nil, fmt.Errorf("failed to count vulnerabilities: %w", err)
	}
	stats["vulnerabilities"] = vulnCount

	return stats, nil
}
