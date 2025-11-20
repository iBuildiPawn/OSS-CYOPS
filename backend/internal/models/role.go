package models

import "encoding/json"

// Role represents a user role for RBAC
type Role struct {
	BaseModel
	Name        string `gorm:"uniqueIndex;not null;type:varchar(50)" json:"name"`
	DisplayName string `gorm:"not null;type:varchar(100)" json:"display_name"`
	Description string `gorm:"type:varchar(255)" json:"description,omitempty"`

	// Permission Data stored as JSON
	Permissions string `gorm:"type:jsonb" json:"permissions,omitempty"`

	// Hierarchy
	Level     int  `gorm:"not null;default:0" json:"level"`
	IsDefault bool `gorm:"default:false" json:"is_default"`
	IsSystem  bool `gorm:"default:false" json:"is_system"`
}

// TableName specifies the table name for Role model
func (Role) TableName() string {
	return "roles"
}

// PermissionMap represents the structure of permissions
type PermissionMap map[string][]string

// GetPermissions parses the JSON permissions into a map
func (r *Role) GetPermissions() (PermissionMap, error) {
	if r.Permissions == "" {
		return PermissionMap{}, nil
	}

	var perms PermissionMap
	if err := json.Unmarshal([]byte(r.Permissions), &perms); err != nil {
		return nil, err
	}
	return perms, nil
}

// SetPermissions converts a permission map to JSON string
func (r *Role) SetPermissions(perms PermissionMap) error {
	data, err := json.Marshal(perms)
	if err != nil {
		return err
	}
	r.Permissions = string(data)
	return nil
}

// HasPermission checks if the role has a specific permission
func (r *Role) HasPermission(resource, action string) bool {
	perms, err := r.GetPermissions()
	if err != nil {
		return false
	}

	actions, ok := perms[resource]
	if !ok {
		return false
	}

	for _, a := range actions {
		if a == action || a == "*" {
			return true
		}
	}

	return false
}
