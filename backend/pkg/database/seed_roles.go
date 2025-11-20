package database

import (
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/pkg/utils"
	"gorm.io/gorm"
)

// SeedRoles creates the default system roles
func SeedRoles(db *gorm.DB) error {
	// Define default roles
	roles := []models.Role{
		{
			Name:        "admin",
			DisplayName: "Administrator",
			Description: "Full system access with all permissions",
			Level:       100,
			IsDefault:   false,
			IsSystem:    true,
		},
		{
			Name:        "security_manager",
			DisplayName: "Security Manager",
			Description: "Manage vulnerabilities, assessments, and team assignments",
			Level:       80,
			IsDefault:   false,
			IsSystem:    true,
		},
		{
			Name:        "security_analyst",
			DisplayName: "Security Analyst",
			Description: "Create and manage vulnerabilities, findings, and assessments",
			Level:       60,
			IsDefault:   false,
			IsSystem:    true,
		},
		{
			Name:        "asset_manager",
			DisplayName: "Asset Manager",
			Description: "Manage assets and affected systems",
			Level:       40,
			IsDefault:   false,
			IsSystem:    true,
		},
		{
			Name:        "auditor",
			DisplayName: "Auditor/Viewer",
			Description: "Read-only access with report generation capabilities",
			Level:       20,
			IsDefault:   true,
			IsSystem:    true,
		},
		{
			Name:        "scanner",
			DisplayName: "Scanner/API",
			Description: "Automated scanner integration with limited API access",
			Level:       5,
			IsDefault:   false,
			IsSystem:    true,
		},
	}

	// Set permissions for each role
	adminPerms := models.PermissionMap{
		"users":         {"read", "create", "update", "delete"},
		"roles":         {"read", "create", "update", "delete"},
		"admin":         {"access"},
		"profile":       {"read", "update"},
		"vulnerability": {"read", "write", "delete", "assign", "import", "export", "status_change"},
		"finding":       {"read", "mark_fixed", "verify", "accept_risk", "upload_attachment"},
		"asset":         {"read", "write", "delete"},
		"assessment":    {"read", "create", "update", "delete", "link_vulnerability", "upload_report"},
		"report":        {"read", "generate", "export"},
		"integration":   {"read", "configure", "test", "execute"},
	}

	securityManagerPerms := models.PermissionMap{
		"users":         {"read"},
		"profile":       {"read", "update"},
		"vulnerability": {"read", "write", "delete", "assign", "import", "export", "status_change"},
		"finding":       {"read", "mark_fixed", "verify", "accept_risk", "upload_attachment"},
		"asset":         {"read"},
		"assessment":    {"read", "create", "update", "delete", "link_vulnerability", "upload_report"},
		"report":        {"read", "generate", "export"},
		"integration":   {"read", "configure", "execute"},
	}

	securityAnalystPerms := models.PermissionMap{
		"profile":       {"read", "update"},
		"vulnerability": {"read", "write", "import", "export"},
		"finding":       {"read", "mark_fixed", "upload_attachment"},
		"asset":         {"read"},
		"assessment":    {"read", "create", "update", "link_vulnerability", "upload_report"},
		"report":        {"read", "generate", "export"},
		"integration":   {"read", "execute"},
	}

	assetManagerPerms := models.PermissionMap{
		"profile":       {"read", "update"},
		"vulnerability": {"read"},
		"finding":       {"read"},
		"asset":         {"read", "write", "delete"},
		"assessment":    {"read"},
		"report":        {"read", "generate", "export"},
	}

	auditorPerms := models.PermissionMap{
		"profile":       {"read", "update"},
		"vulnerability": {"read", "export"},
		"finding":       {"read"},
		"asset":         {"read"},
		"assessment":    {"read"},
		"report":        {"read", "generate", "export"},
	}

	scannerPerms := models.PermissionMap{
		"profile":       {"read", "update"},
		"vulnerability": {"import"},
		"finding":       {"read"},
		"asset":         {"write"}, // Note: Includes create and update. For scanner accounts, consider additional handler-level validation
		"integration":   {"execute"},
	}

	permsList := []models.PermissionMap{
		adminPerms,
		securityManagerPerms,
		securityAnalystPerms,
		assetManagerPerms,
		auditorPerms,
		scannerPerms,
	}

	// Create or update roles
	for i, role := range roles {
		// Set permissions
		if err := role.SetPermissions(permsList[i]); err != nil {
			utils.Logger.Error().Err(err).Str("role", role.Name).Msg("Failed to set permissions")
			continue
		}

		// Check if role exists
		var existing models.Role
		result := db.Where("name = ?", role.Name).First(&existing)

		if result.Error == gorm.ErrRecordNotFound {
			// Create new role
			if err := db.Create(&role).Error; err != nil {
				utils.Logger.Error().Err(err).Str("role", role.Name).Msg("Failed to create role")
				return err
			}
			utils.Logger.Info().Str("role", role.Name).Msg("Default role created")
		} else if result.Error == nil {
			// Update existing system role
			if existing.IsSystem {
				existing.DisplayName = role.DisplayName
				existing.Description = role.Description
				existing.Level = role.Level
				existing.Permissions = role.Permissions
				existing.IsDefault = role.IsDefault

				if err := db.Save(&existing).Error; err != nil {
					utils.Logger.Error().Err(err).Str("role", role.Name).Msg("Failed to update role")
					return err
				}
				utils.Logger.Info().Str("role", role.Name).Msg("Default role updated")
			}
		} else {
			utils.Logger.Error().Err(result.Error).Str("role", role.Name).Msg("Error checking role")
			return result.Error
		}
	}

	utils.Logger.Info().Msg("Role seeding completed")
	return nil
}
