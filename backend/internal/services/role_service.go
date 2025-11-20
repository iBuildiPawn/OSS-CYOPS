package services

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/pkg/database"
	"github.com/cyops/cyops-backend/pkg/utils"
	"gorm.io/gorm"
)

// RoleService handles role and permission operations
type RoleService struct {
	db *gorm.DB
}

// NewRoleService creates a new role service
func NewRoleService() *RoleService {
	return &RoleService{
		db: database.GetDB(),
	}
}

// CreateRole creates a new role
func (s *RoleService) CreateRole(name, displayName, description string, level int, permissions models.PermissionMap) (*models.Role, error) {
	// Check if role already exists
	var existing models.Role
	if err := s.db.Where("name = ?", name).First(&existing).Error; err == nil {
		return nil, fmt.Errorf("role '%s' already exists", name)
	}

	role := &models.Role{
		Name:        name,
		DisplayName: displayName,
		Description: description,
		Level:       level,
		IsDefault:   false,
		IsSystem:    false,
	}

	if err := role.SetPermissions(permissions); err != nil {
		return nil, fmt.Errorf("failed to set permissions: %w", err)
	}

	if err := s.db.Create(role).Error; err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	utils.Logger.Info().
		Str("role_name", name).
		Int("level", level).
		Msg("Role created successfully")

	return role, nil
}

// GetRoleByID retrieves a role by ID
func (s *RoleService) GetRoleByID(id uuid.UUID) (*models.Role, error) {
	var role models.Role
	if err := s.db.Where("id = ?", id).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("role not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &role, nil
}

// GetRoleByName retrieves a role by name
func (s *RoleService) GetRoleByName(name string) (*models.Role, error) {
	var role models.Role
	if err := s.db.Where("name = ?", name).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("role not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &role, nil
}

// GetAllRoles retrieves all roles
func (s *RoleService) GetAllRoles() ([]models.Role, error) {
	var roles []models.Role
	if err := s.db.Order("level DESC").Find(&roles).Error; err != nil {
		return nil, fmt.Errorf("failed to get roles: %w", err)
	}
	return roles, nil
}

// UpdateRole updates an existing role
func (s *RoleService) UpdateRole(id uuid.UUID, displayName, description string, level int, permissions models.PermissionMap) (*models.Role, error) {
	var role models.Role
	if err := s.db.Where("id = ?", id).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("role not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Prevent modification of system roles
	if role.IsSystem {
		return nil, fmt.Errorf("cannot modify system role")
	}

	role.DisplayName = displayName
	role.Description = description
	role.Level = level

	if err := role.SetPermissions(permissions); err != nil {
		return nil, fmt.Errorf("failed to set permissions: %w", err)
	}

	if err := s.db.Save(&role).Error; err != nil {
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	utils.Logger.Info().
		Str("role_id", id.String()).
		Str("role_name", role.Name).
		Msg("Role updated successfully")

	return &role, nil
}

// DeleteRole deletes a role
func (s *RoleService) DeleteRole(id uuid.UUID) error {
	var role models.Role
	if err := s.db.Where("id = ?", id).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("role not found")
		}
		return fmt.Errorf("database error: %w", err)
	}

	// Prevent deletion of system roles
	if role.IsSystem {
		return fmt.Errorf("cannot delete system role")
	}

	// Check if any users have this role
	var userCount int64
	if err := s.db.Model(&models.User{}).Where("role_id = ?", id.String()).Count(&userCount).Error; err != nil {
		return fmt.Errorf("failed to check role usage: %w", err)
	}

	if userCount > 0 {
		return fmt.Errorf("cannot delete role: %d users are assigned to this role", userCount)
	}

	if err := s.db.Delete(&role).Error; err != nil {
		return fmt.Errorf("failed to delete role: %w", err)
	}

	utils.Logger.Info().
		Str("role_id", id.String()).
		Str("role_name", role.Name).
		Msg("Role deleted successfully")

	return nil
}

// AssignRoleToUser assigns a role to a user
func (s *RoleService) AssignRoleToUser(userID, roleID uuid.UUID) error {
	// Verify role exists
	var role models.Role
	if err := s.db.Where("id = ?", roleID).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("role not found")
		}
		return fmt.Errorf("database error: %w", err)
	}

	// Verify user exists and update role
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("database error: %w", err)
	}

	roleIDStr := roleID.String()
	user.RoleID = &roleIDStr

	if err := s.db.Save(&user).Error; err != nil {
		return fmt.Errorf("failed to assign role: %w", err)
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Str("role_id", roleID.String()).
		Str("role_name", role.Name).
		Msg("Role assigned to user")

	return nil
}

// CheckPermission checks if a user has a specific permission
func (s *RoleService) CheckPermission(userID uuid.UUID, resource, action string) (bool, error) {
	var user models.User
	if err := s.db.Preload("Role").Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, fmt.Errorf("user not found")
		}
		return false, fmt.Errorf("database error: %w", err)
	}

	// No role assigned - no permissions
	if user.Role == nil {
		return false, nil
	}

	// Check if role has the permission
	return user.Role.HasPermission(resource, action), nil
}

// GetDefaultRole returns the default role for new users
func (s *RoleService) GetDefaultRole() (*models.Role, error) {
	var role models.Role
	if err := s.db.Where("is_default = ?", true).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("no default role configured")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &role, nil
}
