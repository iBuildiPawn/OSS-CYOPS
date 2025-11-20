package models

import (
	"github.com/google/uuid"
)

// EventType represents the type of authentication event
type EventType string

const (
	EventTypeRegister             EventType = "register"
	EventTypeLogin                EventType = "login"
	EventTypeLoginFailed          EventType = "login_failed"
	EventTypeLogout               EventType = "logout"
	EventTypeEmailVerification    EventType = "email_verification"
	EventTypePasswordResetRequest EventType = "password_reset_request"
	EventTypePasswordReset        EventType = "password_reset"
	EventTypePasswordChange       EventType = "password_change"
	EventTypeTwoFactorEnabled     EventType = "two_factor_enabled"
	EventTypeTwoFactorDisabled    EventType = "two_factor_disabled"
	EventTypeTwoFactorVerified    EventType = "two_factor_verified"
	EventTypeProfileUpdate        EventType = "profile_update"
	EventTypeSessionRevoked       EventType = "session_revoked"
	EventTypeAccountLocked        EventType = "account_locked"
	EventTypeAccountUnlocked      EventType = "account_unlocked"
)

// AuthEvent represents an authentication or security event
type AuthEvent struct {
	BaseModel
	UserID     *uuid.UUID `gorm:"type:uuid;index" json:"user_id,omitempty"`
	User       *User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	EventType  EventType  `gorm:"type:varchar(50);not null;index" json:"event_type"`
	IPAddress  string     `gorm:"type:varchar(45);index" json:"ip_address,omitempty"`
	UserAgent  string     `gorm:"type:text" json:"user_agent,omitempty"`
	Success    bool       `gorm:"default:true;index" json:"success"`
	FailReason string     `gorm:"type:text" json:"fail_reason,omitempty"`
	Metadata   string     `gorm:"type:jsonb" json:"metadata,omitempty"` // Additional event data as JSON
	RequestID  string     `gorm:"type:varchar(100);index" json:"request_id,omitempty"`
}

// TableName specifies the table name for AuthEvent model
func (AuthEvent) TableName() string {
	return "auth_events"
}

// NewAuthEvent creates a new authentication event
func NewAuthEvent(userID *uuid.UUID, eventType EventType, ipAddress, userAgent string) *AuthEvent {
	return &AuthEvent{
		UserID:    userID,
		EventType: eventType,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Success:   true,
		Metadata:  "{}",
	}
}

// NewFailedAuthEvent creates a new failed authentication event
func NewFailedAuthEvent(userID *uuid.UUID, eventType EventType, ipAddress, userAgent, reason string) *AuthEvent {
	return &AuthEvent{
		UserID:     userID,
		EventType:  eventType,
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		Success:    false,
		FailReason: reason,
		Metadata:   "{}",
	}
}
