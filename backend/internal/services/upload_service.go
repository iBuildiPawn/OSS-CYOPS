package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// UploadService handles file uploads
type UploadService struct {
	maxFileSize   int64
	allowedTypes  map[string]bool
	uploadBaseURL string
}

// NewUploadService creates a new upload service
func NewUploadService() *UploadService {
	return &UploadService{
		maxFileSize: 5 * 1024 * 1024, // 5MB
		allowedTypes: map[string]bool{
			".jpg":  true,
			".jpeg": true,
			".png":  true,
			".gif":  true,
			".webp": true,
		},
		uploadBaseURL: "http://localhost:8080/uploads", // TODO: Get from config
	}
}

// UploadProfilePicture handles profile picture upload
func (s *UploadService) UploadProfilePicture(file *multipart.FileHeader, userID uuid.UUID) (string, error) {
	// Validate file size
	if file.Size > s.maxFileSize {
		return "", fmt.Errorf("file size exceeds maximum allowed size of 5MB")
	}

	// Validate file type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !s.allowedTypes[ext] {
		return "", fmt.Errorf("invalid file type. Allowed types: jpg, jpeg, png, gif, webp")
	}

	// Open the file
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Read file header to verify it's actually an image
	header := make([]byte, 512)
	if _, err := src.Read(header); err != nil {
		return "", fmt.Errorf("failed to read file header: %w", err)
	}

	// Reset file pointer
	if _, err := src.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("failed to reset file pointer: %w", err)
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// TODO: Implement actual file storage
	// For now, we'll just return a placeholder URL
	// In production, you would:
	// 1. Save to local filesystem
	// 2. Upload to S3/Google Cloud Storage/Azure Blob
	// 3. Use a CDN

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Str("filename", filename).
		Int64("size", file.Size).
		Msg("Profile picture upload (placeholder)")

	// Return placeholder URL
	fileURL := fmt.Sprintf("%s/profile-pictures/%s", s.uploadBaseURL, filename)

	return fileURL, nil
}

// DeleteProfilePicture deletes a profile picture
func (s *UploadService) DeleteProfilePicture(pictureURL string, userID uuid.UUID) error {
	// TODO: Implement actual file deletion
	// For now, just log the action

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Str("picture_url", pictureURL).
		Msg("Profile picture deletion (placeholder)")

	return nil
}

// ValidateImageFile validates an image file
func (s *UploadService) ValidateImageFile(file *multipart.FileHeader) error {
	if file.Size > s.maxFileSize {
		return fmt.Errorf("file size exceeds maximum allowed size of 5MB")
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !s.allowedTypes[ext] {
		return fmt.Errorf("invalid file type. Allowed types: jpg, jpeg, png, gif, webp")
	}

	return nil
}
