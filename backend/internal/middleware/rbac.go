package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// RequirePermission middleware checks if the authenticated user has a specific permission
func RequirePermission(resource, action string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get user ID from context (set by AuthMiddleware)
		userIDVal := c.Locals("user_id")
		if userIDVal == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication required",
			})
		}

		userID, ok := userIDVal.(uuid.UUID)
		if !ok {
			utils.Logger.Error().
				Interface("user_id_value", userIDVal).
				Msg("Invalid user_id type in context")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Internal authentication error",
			})
		}

		// Check permission
		roleService := services.NewRoleService()
		hasPermission, err := roleService.CheckPermission(userID, resource, action)
		if err != nil {
			utils.Logger.Error().
				Err(err).
				Str("user_id", userID.String()).
				Str("resource", resource).
				Str("action", action).
				Msg("Permission check failed")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Permission check failed",
			})
		}

		if !hasPermission {
			utils.Logger.Warn().
				Str("user_id", userID.String()).
				Str("resource", resource).
				Str("action", action).
				Msg("Permission denied")
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You do not have permission to perform this action",
			})
		}

		return c.Next()
	}
}

// RequireRole middleware checks if the authenticated user has a specific role
func RequireRole(roleName string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get user ID from context
		userIDVal := c.Locals("user_id")
		if userIDVal == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication required",
			})
		}

		userID, ok := userIDVal.(uuid.UUID)
		if !ok {
			utils.Logger.Error().
				Interface("user_id_value", userIDVal).
				Msg("Invalid user_id type in context")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Internal authentication error",
			})
		}

		// Get user with role
		userService := services.NewUserService()
		user, err := userService.GetUserByID(userID)
		if err != nil {
			utils.Logger.Error().
				Err(err).
				Str("user_id", userID.String()).
				Msg("Failed to get user")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to verify role",
			})
		}

		// Check if user has role
		if user.Role == nil || user.Role.Name != roleName {
			utils.Logger.Warn().
				Str("user_id", userID.String()).
				Str("required_role", roleName).
				Str("actual_role", func() string {
					if user.Role != nil {
						return user.Role.Name
					}
					return "none"
				}()).
				Msg("Role check failed")
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "You do not have the required role to access this resource",
			})
		}

		return c.Next()
	}
}

// RequireMinLevel middleware checks if the authenticated user has at least a minimum role level
func RequireMinLevel(minLevel int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get user ID from context
		userIDVal := c.Locals("user_id")
		if userIDVal == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authentication required",
			})
		}

		userID, ok := userIDVal.(uuid.UUID)
		if !ok {
			utils.Logger.Error().
				Interface("user_id_value", userIDVal).
				Msg("Invalid user_id type in context")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Internal authentication error",
			})
		}

		// Get user with role
		userService := services.NewUserService()
		user, err := userService.GetUserByID(userID)
		if err != nil {
			utils.Logger.Error().
				Err(err).
				Str("user_id", userID.String()).
				Msg("Failed to get user")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to verify access level",
			})
		}

		// Check if user has sufficient level
		if user.Role == nil || user.Role.Level < minLevel {
			utils.Logger.Warn().
				Str("user_id", userID.String()).
				Int("required_level", minLevel).
				Int("actual_level", func() int {
					if user.Role != nil {
						return user.Role.Level
					}
					return 0
				}()).
				Msg("Access level check failed")
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Your access level is insufficient for this action",
			})
		}

		return c.Next()
	}
}

// RequireAdmin middleware checks if the user is an admin (convenience wrapper)
func RequireAdmin() fiber.Handler {
	return RequireRole("admin")
}
