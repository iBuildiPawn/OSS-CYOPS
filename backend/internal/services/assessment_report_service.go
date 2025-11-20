package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/pkg/utils"
	"gorm.io/gorm"
)

type AssessmentReportService struct {
	db          *gorm.DB
	uploadDir   string
	maxFileSize int64 // in bytes
}

func NewAssessmentReportService(db *gorm.DB) *AssessmentReportService {
	// Create uploads directory if it doesn't exist
	uploadDir := "./uploads/assessment-reports"
	os.MkdirAll(uploadDir, 0755)

	return &AssessmentReportService{
		db:          db,
		uploadDir:   uploadDir,
		maxFileSize: 100 * 1024 * 1024, // 100MB
	}
}

// UploadReport uploads a PDF report for an assessment
func (s *AssessmentReportService) UploadReport(
	assessmentID uuid.UUID,
	file *multipart.FileHeader,
	title, description string,
	uploadedBy uuid.UUID,
) (*models.AssessmentReport, error) {
	// Validate assessment exists
	var assessment models.Assessment
	if err := s.db.First(&assessment, "id = ?", assessmentID).Error; err != nil {
		return nil, fmt.Errorf("assessment not found: %w", err)
	}

	// Validate file size
	if file.Size > s.maxFileSize {
		return nil, fmt.Errorf("file size exceeds maximum allowed size of %d MB", s.maxFileSize/1024/1024)
	}

	// Validate PDF file type
	mimeType := file.Header.Get("Content-Type")
	if mimeType != "application/pdf" && !strings.HasSuffix(strings.ToLower(file.Filename), ".pdf") {
		return nil, fmt.Errorf("only PDF files are allowed")
	}

	// Normalize MIME type
	if mimeType == "" {
		mimeType = "application/pdf"
	}

	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Read file data
	fileData, err := io.ReadAll(src)
	if err != nil {
		return nil, fmt.Errorf("failed to read uploaded file: %w", err)
	}

	// Check for existing reports with the same title
	var previousReport *models.AssessmentReport
	var version int = 1
	var parentID *uuid.UUID = nil

	err = s.db.Where("assessment_id = ? AND title = ? AND is_latest = ?", assessmentID, title, true).
		First(&previousReport).Error

	if err == nil {
		// Found previous version - increment version and mark old as not latest
		version = previousReport.Version + 1
		parentID = &previousReport.ID
		previousReport.IsLatest = false
		if err := s.db.Save(previousReport).Error; err != nil {
			return nil, fmt.Errorf("failed to update previous version: %w", err)
		}
	} else if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("failed to check for existing reports: %w", err)
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	if ext == "" {
		ext = ".pdf"
	}
	uniqueName := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	storagePath := filepath.Join(assessmentID.String(), uniqueName)
	fullPath := filepath.Join(s.uploadDir, storagePath)

	// Create directory for this assessment
	assessmentDir := filepath.Join(s.uploadDir, assessmentID.String())
	if err := os.MkdirAll(assessmentDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Save PDF file
	if err := os.WriteFile(fullPath, fileData, 0644); err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Create report record
	report := &models.AssessmentReport{
		AssessmentID: assessmentID,
		Filename:     uniqueName,
		OriginalName: file.Filename,
		MimeType:     mimeType,
		FileSize:     file.Size,
		StoragePath:  storagePath,
		Title:        title,
		Description:  description,
		Version:      version,
		IsLatest:     true,
		ParentID:     parentID,
		UploadedBy:   uploadedBy,
	}

	if err := s.db.Create(report).Error; err != nil {
		// Clean up uploaded file on database error
		os.Remove(fullPath)
		return nil, fmt.Errorf("failed to save report record: %w", err)
	}

	utils.Logger.Info().
		Str("report_id", report.ID.String()).
		Str("assessment_id", assessmentID.String()).
		Str("title", title).
		Int("version", version).
		Str("filename", file.Filename).
		Msg("Assessment report uploaded successfully")

	return report, nil
}

// GetReport retrieves a report by ID
func (s *AssessmentReportService) GetReport(id uuid.UUID) (*models.AssessmentReport, error) {
	var report models.AssessmentReport
	if err := s.db.Preload("UploadedByUser").First(&report, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("report not found: %w", err)
	}
	return &report, nil
}

// GetAssessmentReports retrieves all latest reports for an assessment
func (s *AssessmentReportService) GetAssessmentReports(assessmentID uuid.UUID, includeAllVersions bool) ([]models.AssessmentReport, error) {
	var reports []models.AssessmentReport
	query := s.db.Preload("UploadedByUser").Where("assessment_id = ?", assessmentID)

	if !includeAllVersions {
		query = query.Where("is_latest = ?", true)
	}

	err := query.Order("created_at DESC").Find(&reports).Error
	return reports, err
}

// GetReportVersions retrieves all versions of a report by title
func (s *AssessmentReportService) GetReportVersions(assessmentID uuid.UUID, title string) ([]models.AssessmentReport, error) {
	var reports []models.AssessmentReport
	err := s.db.
		Preload("UploadedByUser").
		Where("assessment_id = ? AND title = ?", assessmentID, title).
		Order("version DESC").
		Find(&reports).Error

	return reports, err
}

// GetReportFile retrieves the file data for a report
func (s *AssessmentReportService) GetReportFile(report *models.AssessmentReport) ([]byte, error) {
	filePath := filepath.Join(s.uploadDir, report.StoragePath)

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	return data, nil
}

// DeleteReport deletes a report (soft delete)
func (s *AssessmentReportService) DeleteReport(id uuid.UUID) error {
	var report models.AssessmentReport
	if err := s.db.First(&report, "id = ?", id).Error; err != nil {
		return fmt.Errorf("report not found: %w", err)
	}

	// Soft delete
	if err := s.db.Delete(&report).Error; err != nil {
		return fmt.Errorf("failed to delete report: %w", err)
	}

	// Note: We keep the files on disk even after soft delete for audit purposes
	// Hard delete cleanup should be done by a separate cleanup job

	utils.Logger.Info().
		Str("report_id", id.String()).
		Str("assessment_id", report.AssessmentID.String()).
		Str("title", report.Title).
		Msg("Assessment report deleted")

	return nil
}

// GetReportStats returns statistics about reports
func (s *AssessmentReportService) GetReportStats(assessmentID *uuid.UUID) (map[string]interface{}, error) {
	query := s.db.Model(&models.AssessmentReport{})
	if assessmentID != nil {
		query = query.Where("assessment_id = ?", *assessmentID)
	}

	var stats struct {
		TotalCount   int64
		LatestCount  int64
		TotalSize    int64
		VersionCount int64
	}

	// Get total count and size
	query.Count(&stats.TotalCount)
	query.Select("COALESCE(SUM(file_size), 0) as total_size").Scan(&stats.TotalSize)

	// Count latest versions
	s.db.Model(&models.AssessmentReport{}).
		Where("assessment_id = ? AND is_latest = ?", assessmentID, true).
		Count(&stats.LatestCount)

	// Count total versions (all reports)
	stats.VersionCount = stats.TotalCount

	return map[string]interface{}{
		"total_count":      stats.TotalCount,
		"latest_count":     stats.LatestCount,
		"version_count":    stats.VersionCount,
		"total_size_bytes": stats.TotalSize,
		"total_size_mb":    float64(stats.TotalSize) / 1024 / 1024,
	}, nil
}
