package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// RequireScope checks if API key has required scope
// For session-based auth (JWT), this middleware is bypassed (uses RBAC instead)
func RequireScope(scope string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authMethod := c.Locals("auth_method")

		// JWT users bypass scope check (use RBAC permission middleware instead)
		if authMethod != "api_key" {
			utils.Logger.Debug().
				Str("auth_method", authMethod.(string)).
				Str("required_scope", scope).
				Msg("Bypassing scope check for non-API-key auth")
			return c.Next()
		}

		// Check API key scopes
		scopesInterface := c.Locals("api_key_scopes")
		if scopesInterface == nil {
			utils.Logger.Warn().
				Str("path", c.Path()).
				Msg("No scopes found for API key auth")
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "No scopes found",
			})
		}

		scopes, ok := scopesInterface.([]string)
		if !ok {
			utils.Logger.Error().
				Str("path", c.Path()).
				Msg("Invalid scopes type")
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Invalid scopes configuration",
			})
		}

		// Check for wildcard permission
		if contains(scopes, "*:*") {
			utils.Logger.Debug().
				Str("required_scope", scope).
				Msg("API key has wildcard permission")
			return c.Next()
		}

		// Check specific scope
		if !contains(scopes, scope) {
			utils.Logger.Warn().
				Str("required_scope", scope).
				Strs("available_scopes", scopes).
				Str("path", c.Path()).
				Msg("API key missing required scope")

			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":    "Insufficient permissions",
				"required": scope,
			})
		}

		utils.Logger.Debug().
			Str("required_scope", scope).
			Msg("API key scope check passed")

		return c.Next()
	}
}

// RequireAnyScope checks if API key has any of the specified scopes
func RequireAnyScope(scopes ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authMethod := c.Locals("auth_method")

		// JWT users bypass scope check
		if authMethod != "api_key" {
			return c.Next()
		}

		// Check API key scopes
		scopesInterface := c.Locals("api_key_scopes")
		if scopesInterface == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "No scopes found",
			})
		}

		apiKeyScopes, ok := scopesInterface.([]string)
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Invalid scopes configuration",
			})
		}

		// Check for wildcard permission
		if contains(apiKeyScopes, "*:*") {
			return c.Next()
		}

		// Check if any of the required scopes are present
		for _, requiredScope := range scopes {
			if contains(apiKeyScopes, requiredScope) {
				utils.Logger.Debug().
					Str("matched_scope", requiredScope).
					Msg("API key has one of the required scopes")
				return c.Next()
			}
		}

		utils.Logger.Warn().
			Strs("required_scopes", scopes).
			Strs("available_scopes", apiKeyScopes).
			Str("path", c.Path()).
			Msg("API key missing all required scopes")

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":    "Insufficient permissions",
			"required": "one of: " + joinStrings(scopes, ", "),
		})
	}
}

// RequireAllScopes checks if API key has all of the specified scopes
func RequireAllScopes(scopes ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authMethod := c.Locals("auth_method")

		// JWT users bypass scope check
		if authMethod != "api_key" {
			return c.Next()
		}

		// Check API key scopes
		scopesInterface := c.Locals("api_key_scopes")
		if scopesInterface == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "No scopes found",
			})
		}

		apiKeyScopes, ok := scopesInterface.([]string)
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Invalid scopes configuration",
			})
		}

		// Check for wildcard permission
		if contains(apiKeyScopes, "*:*") {
			return c.Next()
		}

		// Check if all required scopes are present
		for _, requiredScope := range scopes {
			if !contains(apiKeyScopes, requiredScope) {
				utils.Logger.Warn().
					Strs("required_scopes", scopes).
					Strs("available_scopes", apiKeyScopes).
					Str("missing_scope", requiredScope).
					Str("path", c.Path()).
					Msg("API key missing required scope")

				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error":   "Insufficient permissions",
					"required": "all of: " + joinStrings(scopes, ", "),
					"missing":  requiredScope,
				})
			}
		}

		utils.Logger.Debug().
			Strs("required_scopes", scopes).
			Msg("API key has all required scopes")

		return c.Next()
	}
}

// contains checks if a slice contains a specific string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// joinStrings joins strings with a separator
func joinStrings(slice []string, sep string) string {
	result := ""
	for i, s := range slice {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}
