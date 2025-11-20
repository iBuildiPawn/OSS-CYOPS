package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
)

// User represents a user account in the system
type User struct {
	BaseModel
	Email             string     `gorm:"uniqueIndex;not null" json:"email"`
	Password          string     `gorm:"not null" json:"-"` // Never expose password in JSON
	Name              string     `gorm:"type:varchar(255)" json:"name,omitempty"`
	EmailVerified     bool       `gorm:"default:false" json:"email_verified"`
	EmailVerifiedAt   *time.Time `gorm:"index" json:"email_verified_at,omitempty"`
	TwoFactorEnabled  bool       `gorm:"default:false" json:"two_factor_enabled"`
	TwoFactorSecret   string     `gorm:"type:varchar(255)" json:"-"` // Never expose secret
	BackupCodes       string     `gorm:"type:text" json:"-"`         // JSON array as string
	RoleID            *string    `gorm:"type:uuid;index" json:"role_id,omitempty"`
	Role              *Role      `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	LastLoginAt       *time.Time `gorm:"index" json:"last_login_at,omitempty"`
	LastLoginIP       string     `gorm:"type:varchar(45)" json:"-"` // IPv4/IPv6
	ProfilePictureURL string     `gorm:"type:varchar(500)" json:"profile_picture_url,omitempty"`
}

// TableName specifies the table name for User model
func (User) TableName() string {
	return "users"
}

// HashPassword hashes the user's password using bcrypt
func (u *User) HashPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword compares the provided password with the stored hash
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}

// MarkEmailVerified marks the user's email as verified
func (u *User) MarkEmailVerified() {
	now := time.Now()
	u.EmailVerified = true
	u.EmailVerifiedAt = &now
}

// UpdateLastLogin updates the last login timestamp and IP
func (u *User) UpdateLastLogin(ipAddress string) {
	now := time.Now()
	u.LastLoginAt = &now
	u.LastLoginIP = ipAddress
}

// PublicUser represents the public-facing user data (safe for API responses)
type PublicUser struct {
	ID                string     `json:"id"`
	Email             string     `json:"email"`
	Name              string     `json:"name,omitempty"`
	EmailVerified     bool       `json:"email_verified"`
	TwoFactorEnabled  bool       `json:"two_factor_enabled"`
	ProfilePictureURL string     `json:"profile_picture_url,omitempty"`
	Role              *Role      `json:"role,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	LastLoginAt       *time.Time `json:"last_login_at,omitempty"`
}

// ToPublic converts a User to PublicUser (safe for API responses)
func (u *User) ToPublic() PublicUser {
	return PublicUser{
		ID:                u.ID.String(),
		Email:             u.Email,
		Name:              u.Name,
		EmailVerified:     u.EmailVerified,
		TwoFactorEnabled:  u.TwoFactorEnabled,
		ProfilePictureURL: u.ProfilePictureURL,
		Role:              u.Role,
		CreatedAt:         u.CreatedAt,
		UpdatedAt:         u.UpdatedAt,
		LastLoginAt:       u.LastLoginAt,
	}
}
