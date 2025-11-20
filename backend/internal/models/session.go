package models

import (
	"time"

	"github.com/google/uuid"
)

// Session represents an active user session
type Session struct {
	BaseModel
	UserID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	User       *User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Token      string     `gorm:"uniqueIndex;not null;type:varchar(255)" json:"token"`
	ExpiresAt  time.Time  `gorm:"not null;index" json:"expires_at"`
	IPAddress  string     `gorm:"type:varchar(45)" json:"ip_address,omitempty"`
	UserAgent  string     `gorm:"type:text" json:"user_agent,omitempty"`
	IsActive   bool       `gorm:"default:true;index" json:"is_active"`
	LastUsedAt *time.Time `gorm:"index" json:"last_used_at,omitempty"`
	RevokedAt  *time.Time `gorm:"index" json:"revoked_at,omitempty"`
}

// TableName specifies the table name for Session model
func (Session) TableName() string {
	return "sessions"
}

// IsExpired checks if the session has expired
func (s *Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// IsValid checks if the session is valid (not expired, active, not revoked)
func (s *Session) IsValid() bool {
	return s.IsActive && !s.IsExpired() && s.RevokedAt == nil
}

// Revoke marks the session as revoked
func (s *Session) Revoke() {
	now := time.Now()
	s.IsActive = false
	s.RevokedAt = &now
}

// UpdateLastUsed updates the last used timestamp
func (s *Session) UpdateLastUsed() {
	now := time.Now()
	s.LastUsedAt = &now
}

// PublicSession represents the public-facing session data
type PublicSession struct {
	ID         string     `json:"id"`
	UserID     string     `json:"user_id"`
	ExpiresAt  time.Time  `json:"expires_at"`
	IPAddress  string     `json:"ip_address,omitempty"`
	UserAgent  string     `json:"user_agent,omitempty"`
	IsActive   bool       `json:"is_active"`
	CreatedAt  time.Time  `json:"created_at"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
}

// ToPublic converts a Session to PublicSession
func (s *Session) ToPublic() PublicSession {
	return PublicSession{
		ID:         s.ID.String(),
		UserID:     s.UserID.String(),
		ExpiresAt:  s.ExpiresAt,
		IPAddress:  s.IPAddress,
		UserAgent:  s.UserAgent,
		IsActive:   s.IsActive,
		CreatedAt:  s.CreatedAt,
		LastUsedAt: s.LastUsedAt,
	}
}
