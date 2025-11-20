package models

import (
	"time"

	"github.com/google/uuid"
)

// AssessmentType represents the type of security assessment
type AssessmentType string

const (
	AssessmentInternal       AssessmentType = "INTERNAL_AUDIT"
	AssessmentExternal       AssessmentType = "EXTERNAL_AUDIT"
	AssessmentPenTest        AssessmentType = "PENETRATION_TEST"
	AssessmentVulnScan       AssessmentType = "VULNERABILITY_SCAN"
	AssessmentCodeReview     AssessmentType = "CODE_REVIEW"
	AssessmentSecurityReview AssessmentType = "SECURITY_REVIEW"
	AssessmentCompliance     AssessmentType = "COMPLIANCE_AUDIT"
	AssessmentThirdParty     AssessmentType = "THIRD_PARTY_ASSESSMENT"
)

// AssessmentStatus represents the current status of an assessment
type AssessmentStatus string

const (
	AssessmentPlanned    AssessmentStatus = "PLANNED"
	AssessmentInProgress AssessmentStatus = "IN_PROGRESS"
	AssessmentCompleted  AssessmentStatus = "COMPLETED"
	AssessmentCancelled  AssessmentStatus = "CANCELLED"
	AssessmentArchived   AssessmentStatus = "ARCHIVED"
)

// Assessment represents a security assessment or audit
type Assessment struct {
	BaseModel
	Name                  string           `gorm:"type:varchar(255);not null" json:"name"`
	Description           string           `gorm:"type:text" json:"description,omitempty"`
	AssessmentType        AssessmentType   `gorm:"type:varchar(50);not null" json:"assessment_type"`
	Status                AssessmentStatus `gorm:"type:varchar(20);not null;default:'PLANNED'" json:"status"`
	AssessorName          string           `gorm:"type:varchar(255);not null" json:"assessor_name"`
	AssessorOrganization  string           `gorm:"type:varchar(255)" json:"assessor_organization,omitempty"`
	StartDate             time.Time        `gorm:"type:date;not null" json:"start_date"`
	EndDate               *time.Time       `gorm:"type:date" json:"end_date,omitempty"`
	ReportURL             string           `gorm:"type:text" json:"report_url,omitempty"`
	ExecutiveSummary      string           `gorm:"type:text" json:"executive_summary,omitempty"`
	FindingsSummary       string           `gorm:"type:text" json:"findings_summary,omitempty"`
	Recommendations       string           `gorm:"type:text" json:"recommendations,omitempty"`
	Score                 *int             `gorm:"type:integer;check:score >= 0 AND score <= 100" json:"score,omitempty"`
	CreatedByID           uuid.UUID        `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy             *User            `gorm:"foreignKey:CreatedByID;constraint:OnDelete:RESTRICT" json:"created_by,omitempty"`
	Vulnerabilities       []Vulnerability  `gorm:"many2many:assessment_vulnerabilities" json:"vulnerabilities,omitempty"`
	Assets                []AffectedSystem `gorm:"many2many:assessment_assets" json:"assets,omitempty"`
}

// TableName specifies the table name for Assessment model
func (Assessment) TableName() string {
	return "assessments"
}

// AssessmentVulnerability represents the junction table between assessments and vulnerabilities
type AssessmentVulnerability struct {
	AssessmentID    string    `gorm:"type:uuid;primaryKey;not null" json:"assessment_id"`
	VulnerabilityID string    `gorm:"type:uuid;primaryKey;not null" json:"vulnerability_id"`
	FindingNotes    string    `gorm:"type:text" json:"finding_notes,omitempty"`
	CreatedAt       time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
}

// TableName specifies the table name for AssessmentVulnerability model
func (AssessmentVulnerability) TableName() string {
	return "assessment_vulnerabilities"
}

// AssessmentAsset represents the junction table between assessments and assets
type AssessmentAsset struct {
	AssessmentID    string    `gorm:"type:uuid;primaryKey;not null" json:"assessment_id"`
	AssetID         string    `gorm:"type:uuid;primaryKey;not null" json:"asset_id"`
	AssessmentNotes string    `gorm:"type:text" json:"assessment_notes,omitempty"`
	CreatedAt       time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
}

// TableName specifies the table name for AssessmentAsset model
func (AssessmentAsset) TableName() string {
	return "assessment_assets"
}
