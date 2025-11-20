package models

import (
	"time"

	"github.com/google/uuid"
)

// TokenType represents the type of verification token
type TokenType string

const (
	TokenTypeEmailVerification TokenType = "email_verification"
	TokenTypePasswordReset     TokenType = "password_reset"
	TokenTypeTwoFactorSetup    TokenType = "two_factor_setup"
)

// VerificationToken represents a token for email verification or password reset
type VerificationToken struct {
	BaseModel
	UserID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	User      *User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Token     string     `gorm:"uniqueIndex;not null;type:varchar(255)" json:"token"`
	Type      TokenType  `gorm:"type:varchar(50);not null;index" json:"type"`
	ExpiresAt time.Time  `gorm:"not null;index" json:"expires_at"`
	UsedAt    *time.Time `gorm:"index" json:"used_at,omitempty"`
	IPAddress string     `gorm:"type:varchar(45)" json:"ip_address,omitempty"`
}

// TableName specifies the table name for VerificationToken model
func (VerificationToken) TableName() string {
	return "verification_tokens"
}

// IsExpired checks if the token has expired
func (vt *VerificationToken) IsExpired() bool {
	return time.Now().After(vt.ExpiresAt)
}

// IsUsed checks if the token has been used
func (vt *VerificationToken) IsUsed() bool {
	return vt.UsedAt != nil
}

// IsValid checks if the token is valid (not expired and not used)
func (vt *VerificationToken) IsValid() bool {
	return !vt.IsExpired() && !vt.IsUsed()
}

// MarkAsUsed marks the token as used
func (vt *VerificationToken) MarkAsUsed() {
	now := time.Now()
	vt.UsedAt = &now
}
