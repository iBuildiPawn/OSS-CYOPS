package database

import (
	"time"

	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/pkg/utils"
	"gorm.io/gorm"
)

// AdminSeedConfig holds configuration for seeding admin user
type AdminSeedConfig struct {
	Email    string
	Password string
	Name     string
}

// SeedAdminUser creates or updates the default admin user
func SeedAdminUser(db *gorm.DB, config AdminSeedConfig) error {
	// Validate config
	if config.Email == "" || config.Password == "" {
		utils.Logger.Info().Msg("Admin seed credentials not provided, skipping admin user creation")
		return nil
	}

	// Get admin role
	var adminRole models.Role
	if err := db.Where("name = ?", "admin").First(&adminRole).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Admin role not found, cannot create admin user")
		return err
	}

	// Check if admin user already exists
	var existingUser models.User
	result := db.Where("email = ?", config.Email).First(&existingUser)

	if result.Error == gorm.ErrRecordNotFound {
		// Create new admin user
		now := time.Now()
		roleIDStr := adminRole.ID.String() // Convert UUID to string
		adminUser := models.User{
			Email:           config.Email,
			Name:            config.Name,
			EmailVerified:   true,
			EmailVerifiedAt: &now,
			RoleID:          &roleIDStr,
		}

		// Hash password
		if err := adminUser.HashPassword(config.Password); err != nil {
			utils.Logger.Error().Err(err).Msg("Failed to hash admin password")
			return err
		}

		// Create user
		if err := db.Create(&adminUser).Error; err != nil {
			utils.Logger.Error().Err(err).Msg("Failed to create admin user")
			return err
		}

		utils.Logger.Info().
			Str("email", config.Email).
			Str("name", config.Name).
			Msg("Admin user created successfully")
	} else if result.Error == nil {
		// Admin user already exists
		utils.Logger.Info().
			Str("email", config.Email).
			Str("user_id", existingUser.ID.String()).
			Msg("Admin user already exists, skipping creation")

		// Optionally update role to admin if not already
		adminRoleIDStr := adminRole.ID.String()
		if existingUser.RoleID == nil || *existingUser.RoleID != adminRoleIDStr {
			existingUser.RoleID = &adminRoleIDStr
			if err := db.Save(&existingUser).Error; err != nil {
				utils.Logger.Error().Err(err).Msg("Failed to update user role to admin")
				return err
			}
			utils.Logger.Info().
				Str("email", config.Email).
				Msg("Updated existing user to admin role")
		}
	} else {
		utils.Logger.Error().Err(result.Error).Msg("Error checking for existing admin user")
		return result.Error
	}

	return nil
}
