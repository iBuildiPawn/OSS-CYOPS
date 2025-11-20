package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/pkg/imageutil"
	"github.com/cyops/cyops-backend/pkg/utils"
	"gorm.io/gorm"
)

type FindingAttachmentService struct {
	db             *gorm.DB
	imageProcessor *imageutil.ImageProcessor
	uploadDir      string
	maxFileSize    int64 // in bytes
}

func NewFindingAttachmentService(db *gorm.DB) *FindingAttachmentService {
	// Create uploads directory if it doesn't exist
	uploadDir := "./uploads/finding-attachments"
	os.MkdirAll(uploadDir, 0755)
	os.MkdirAll(filepath.Join(uploadDir, "thumbnails"), 0755)

	return &FindingAttachmentService{
		db:             db,
		imageProcessor: imageutil.NewImageProcessor(),
		uploadDir:      uploadDir,
		maxFileSize:    10 * 1024 * 1024, // 10MB default
	}
}

// UploadAttachment uploads and processes a file attachment for a finding
func (s *FindingAttachmentService) UploadAttachment(
	findingID uuid.UUID,
	file *multipart.FileHeader,
	attachmentType, description string,
	uploadedBy uuid.UUID,
) (*models.FindingAttachment, error) {
	// Validate finding exists
	var finding models.VulnerabilityFinding
	if err := s.db.First(&finding, "id = ?", findingID).Error; err != nil {
		return nil, fmt.Errorf("finding not found: %w", err)
	}

	// Validate file size
	if file.Size > s.maxFileSize {
		return nil, fmt.Errorf("file size exceeds maximum allowed size of %d MB", s.maxFileSize/1024/1024)
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

	// Detect MIME type
	mimeType := file.Header.Get("Content-Type")
	isImage := imageutil.IsImage(mimeType)

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	uniqueName := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	storagePath := filepath.Join(findingID.String(), uniqueName)
	fullPath := filepath.Join(s.uploadDir, storagePath)

	// Create directory for this finding
	findingDir := filepath.Join(s.uploadDir, findingID.String())
	if err := os.MkdirAll(findingDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	var width, height int
	var normalized bool
	var thumbnailPath string

	// Process image if it's an image file
	if isImage {
		processed, err := s.imageProcessor.ProcessImage(fileData, file.Filename)
		if err != nil {
			utils.Logger.Warn().Err(err).Msg("Failed to process image, saving original")
			// Save original if processing fails
			if err := os.WriteFile(fullPath, fileData, 0644); err != nil {
				return nil, fmt.Errorf("failed to save file: %w", err)
			}
		} else {
			// Save processed (normalized) image
			if err := os.WriteFile(fullPath, processed.Data, 0644); err != nil {
				return nil, fmt.Errorf("failed to save processed image: %w", err)
			}

			width = processed.Width
			height = processed.Height
			normalized = true

			// Save thumbnail
			thumbnailName := fmt.Sprintf("thumb_%s", uniqueName)
			thumbnailPath = filepath.Join("thumbnails", findingID.String(), thumbnailName)
			thumbnailFullPath := filepath.Join(s.uploadDir, thumbnailPath)

			// Create thumbnail directory
			thumbnailDir := filepath.Join(s.uploadDir, "thumbnails", findingID.String())
			if err := os.MkdirAll(thumbnailDir, 0755); err != nil {
				utils.Logger.Warn().Err(err).Msg("Failed to create thumbnail directory")
			} else {
				if err := os.WriteFile(thumbnailFullPath, processed.Thumbnail, 0644); err != nil {
					utils.Logger.Warn().Err(err).Msg("Failed to save thumbnail")
					thumbnailPath = ""
				}
			}

			utils.Logger.Info().
				Str("finding_id", findingID.String()).
				Int("original_width", width).
				Int("original_height", height).
				Int("normalized_width", processed.Width).
				Int("normalized_height", processed.Height).
				Msg("Image normalized for reporting")
		}
	} else {
		// Save non-image file as-is
		if err := os.WriteFile(fullPath, fileData, 0644); err != nil {
			return nil, fmt.Errorf("failed to save file: %w", err)
		}
	}

	// Create attachment record
	attachment := &models.FindingAttachment{
		FindingID:      findingID,
		Filename:       uniqueName,
		OriginalName:   file.Filename,
		MimeType:       mimeType,
		FileSize:       file.Size,
		StoragePath:    storagePath,
		IsImage:        isImage,
		Width:          width,
		Height:         height,
		Normalized:     normalized,
		ThumbnailPath:  thumbnailPath,
		AttachmentType: attachmentType,
		Description:    description,
		UploadedBy:     uploadedBy,
	}

	if err := s.db.Create(attachment).Error; err != nil {
		// Clean up uploaded files on database error
		os.Remove(fullPath)
		if thumbnailPath != "" {
			os.Remove(filepath.Join(s.uploadDir, thumbnailPath))
		}
		return nil, fmt.Errorf("failed to save attachment record: %w", err)
	}

	utils.Logger.Info().
		Str("attachment_id", attachment.ID.String()).
		Str("finding_id", findingID.String()).
		Str("filename", file.Filename).
		Bool("is_image", isImage).
		Bool("normalized", normalized).
		Msg("Attachment uploaded successfully")

	return attachment, nil
}

// GetAttachment retrieves an attachment by ID
func (s *FindingAttachmentService) GetAttachment(id uuid.UUID) (*models.FindingAttachment, error) {
	var attachment models.FindingAttachment
	if err := s.db.Preload("UploadedByUser").First(&attachment, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("attachment not found: %w", err)
	}
	return &attachment, nil
}

// GetFindingAttachments retrieves all attachments for a finding
func (s *FindingAttachmentService) GetFindingAttachments(findingID uuid.UUID) ([]models.FindingAttachment, error) {
	var attachments []models.FindingAttachment
	err := s.db.
		Preload("UploadedByUser").
		Where("finding_id = ?", findingID).
		Order("created_at DESC").
		Find(&attachments).Error

	return attachments, err
}

// GetAttachmentFile retrieves the file data for an attachment
func (s *FindingAttachmentService) GetAttachmentFile(attachment *models.FindingAttachment, thumbnail bool) ([]byte, error) {
	var filePath string
	if thumbnail && attachment.ThumbnailPath != "" {
		filePath = filepath.Join(s.uploadDir, attachment.ThumbnailPath)
	} else {
		filePath = filepath.Join(s.uploadDir, attachment.StoragePath)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	return data, nil
}

// DeleteAttachment deletes an attachment (soft delete)
func (s *FindingAttachmentService) DeleteAttachment(id uuid.UUID) error {
	var attachment models.FindingAttachment
	if err := s.db.First(&attachment, "id = ?", id).Error; err != nil {
		return fmt.Errorf("attachment not found: %w", err)
	}

	// Soft delete
	if err := s.db.Delete(&attachment).Error; err != nil {
		return fmt.Errorf("failed to delete attachment: %w", err)
	}

	// Note: We keep the files on disk even after soft delete for audit purposes
	// Hard delete cleanup should be done by a separate cleanup job

	utils.Logger.Info().
		Str("attachment_id", id.String()).
		Str("finding_id", attachment.FindingID.String()).
		Msg("Attachment deleted")

	return nil
}

// GetAttachmentStats returns statistics about attachments
func (s *FindingAttachmentService) GetAttachmentStats(findingID *uuid.UUID) (map[string]interface{}, error) {
	query := s.db.Model(&models.FindingAttachment{})
	if findingID != nil {
		query = query.Where("finding_id = ?", *findingID)
	}

	var stats struct {
		TotalCount    int64
		TotalSize     int64
		ImageCount    int64
		ProofCount    int64
		VerifiedCount int64
	}

	// Get total count and size
	query.Count(&stats.TotalCount)
	query.Select("COALESCE(SUM(file_size), 0) as total_size").Scan(&stats.TotalSize)

	// Count by type
	s.db.Model(&models.FindingAttachment{}).
		Where("finding_id = ? AND is_image = ?", findingID, true).
		Count(&stats.ImageCount)

	s.db.Model(&models.FindingAttachment{}).
		Where("finding_id = ? AND attachment_type = ?", findingID, models.AttachmentTypeProof).
		Count(&stats.ProofCount)

	s.db.Model(&models.FindingAttachment{}).
		Where("finding_id = ? AND attachment_type = ?", findingID, models.AttachmentTypeVerification).
		Count(&stats.VerifiedCount)

	return map[string]interface{}{
		"total_count":        stats.TotalCount,
		"total_size_bytes":   stats.TotalSize,
		"total_size_mb":      float64(stats.TotalSize) / 1024 / 1024,
		"image_count":        stats.ImageCount,
		"proof_count":        stats.ProofCount,
		"verification_count": stats.VerifiedCount,
	}, nil
}
