package models

import (
	"time"

	"github.com/google/uuid"
)

// AssessmentReport represents a PDF report attachment for an assessment
// Supports multiple reports per assessment with version history
type AssessmentReport struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`

	// Link to assessment
	AssessmentID uuid.UUID   `gorm:"type:uuid;not null;index:idx_report_assessment" json:"assessment_id"`
	Assessment   *Assessment `gorm:"foreignKey:AssessmentID;constraint:OnDelete:CASCADE" json:"assessment,omitempty"`

	// File metadata
	Filename     string `gorm:"type:varchar(255);not null" json:"filename"`
	OriginalName string `gorm:"type:varchar(255);not null" json:"original_name"`
	MimeType     string `gorm:"type:varchar(100);not null" json:"mime_type"`
	FileSize     int64  `gorm:"not null" json:"file_size"` // in bytes

	// Storage information
	StoragePath string `gorm:"type:varchar(500);not null" json:"storage_path"` // relative path in storage

	// Report metadata
	Title       string `gorm:"type:varchar(255);not null" json:"title"` // e.g., "Main Report", "Executive Summary"
	Description string `gorm:"type:text" json:"description,omitempty"`

	// Version control
	Version  int  `gorm:"not null;default:1" json:"version"`          // Version number for this title
	IsLatest bool `gorm:"not null;default:true" json:"is_latest"`     // Only one latest per title
	ParentID *uuid.UUID `gorm:"type:uuid;index:idx_report_parent" json:"parent_id,omitempty"` // Previous version

	// Audit information
	UploadedBy     uuid.UUID `gorm:"type:uuid;not null" json:"uploaded_by"`
	UploadedByUser *User     `gorm:"foreignKey:UploadedBy;constraint:OnDelete:RESTRICT" json:"uploaded_by_user,omitempty"`
	CreatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt      *time.Time `gorm:"type:timestamp;index" json:"deleted_at,omitempty"`
}

// TableName specifies the table name
func (AssessmentReport) TableName() string {
	return "assessment_reports"
}
