package models

import (
	"time"

	"github.com/google/uuid"
)

// FindingAttachment represents a file attachment for a vulnerability finding
// Used for storing screenshots, proof of fix, verification evidence, etc.
type FindingAttachment struct {
	ID          uuid.UUID              `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`

	// Link to finding
	FindingID   uuid.UUID              `gorm:"type:uuid;not null;index:idx_attachment_finding" json:"finding_id"`
	Finding     *VulnerabilityFinding  `gorm:"foreignKey:FindingID;constraint:OnDelete:CASCADE" json:"finding,omitempty"`

	// File metadata
	Filename    string                 `gorm:"type:varchar(255);not null" json:"filename"`
	OriginalName string                `gorm:"type:varchar(255);not null" json:"original_name"`
	MimeType    string                 `gorm:"type:varchar(100);not null" json:"mime_type"`
	FileSize    int64                  `gorm:"not null" json:"file_size"` // in bytes

	// Storage information
	StoragePath string                 `gorm:"type:varchar(500);not null" json:"storage_path"` // relative path in storage
	StorageURL  string                 `gorm:"type:varchar(500)" json:"storage_url,omitempty"` // public URL if applicable

	// Image-specific metadata (for screenshots)
	IsImage     bool                   `gorm:"default:false" json:"is_image"`
	Width       int                    `gorm:"type:int" json:"width,omitempty"`
	Height      int                    `gorm:"type:int" json:"height,omitempty"`
	Normalized  bool                   `gorm:"default:false" json:"normalized"` // true if image was processed

	// Thumbnail information (for images)
	ThumbnailPath string               `gorm:"type:varchar(500)" json:"thumbnail_path,omitempty"`
	ThumbnailURL  string               `gorm:"type:varchar(500)" json:"thumbnail_url,omitempty"`

	// Categorization
	AttachmentType string              `gorm:"type:varchar(50);not null;default:'PROOF'" json:"attachment_type"` // PROOF, VERIFICATION, REMEDIATION, OTHER
	Description string                 `gorm:"type:text" json:"description,omitempty"`

	// Metadata
	UploadedBy  uuid.UUID              `gorm:"type:uuid;not null" json:"uploaded_by"`
	UploadedByUser *User               `gorm:"foreignKey:UploadedBy;constraint:OnDelete:RESTRICT" json:"uploaded_by_user,omitempty"`
	CreatedAt   time.Time              `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt   time.Time              `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt   *time.Time             `gorm:"type:timestamp;index" json:"deleted_at,omitempty"`
}

// TableName specifies the table name
func (FindingAttachment) TableName() string {
	return "finding_attachments"
}

// AttachmentType constants
const (
	AttachmentTypeProof        = "PROOF"        // Proof of vulnerability
	AttachmentTypeRemediation  = "REMEDIATION"  // Screenshots showing fix applied
	AttachmentTypeVerification = "VERIFICATION" // Verification/testing results
	AttachmentTypeOther        = "OTHER"        // Other supporting documents
)
