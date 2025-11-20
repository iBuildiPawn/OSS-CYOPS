package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// AuthMiddleware validates session tokens or API keys and attaches user info to context
func AuthMiddleware() fiber.Handler {
	sessionService := services.NewSessionService()
	apiKeyService := services.NewAPIKeyService()

	return func(c *fiber.Ctx) error {
		// Extract token from Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authorization header required",
			})
		}

		// Check Bearer token format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization format. Use: Bearer <token>",
			})
		}

		token := parts[1]

		// Check if it's an API key (starts with kfm_)
		if strings.HasPrefix(token, "kfm_") {
			return authenticateAPIKey(c, token, apiKeyService)
		}

		// Otherwise, treat as JWT session token
		return authenticateSession(c, token, sessionService)
	}
}

// authenticateSession validates a JWT session token
func authenticateSession(c *fiber.Ctx, token string, sessionService *services.SessionService) error {
	session, err := sessionService.ValidateSession(token)
	if err != nil {
		utils.Logger.Debug().
			Err(err).
			Str("ip", c.IP()).
			Msg("Session validation failed")

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid or expired session",
		})
	}

	// Attach user and session to context
	c.Locals("user", session.User)
	c.Locals("user_id", session.UserID)
	c.Locals("session", session)
	c.Locals("session_id", session.ID)
	c.Locals("auth_method", "session")

	utils.Logger.Debug().
		Str("user_id", session.UserID.String()).
		Str("session_id", session.ID.String()).
		Str("path", c.Path()).
		Msg("Request authenticated via session")

	return c.Next()
}

// authenticateAPIKey validates an API key
func authenticateAPIKey(c *fiber.Ctx, key string, apiKeyService *services.APIKeyService) error {
	apiKey, user, err := apiKeyService.ValidateAndGet(key)
	if err != nil {
		utils.Logger.Warn().
			Err(err).
			Str("ip", c.IP()).
			Str("key_prefix", extractKeyPrefix(key)).
			Msg("API key validation failed")

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid API key",
		})
	}

	// Additional validation
	if apiKey.Status != models.APIKeyStatusActive {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "API key is not active",
		})
	}

	if apiKey.ExpiresAt != nil && time.Now().After(*apiKey.ExpiresAt) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "API key has expired",
		})
	}

	// Attach user and API key info to context
	c.Locals("user", user)
	c.Locals("user_id", user.ID)
	c.Locals("api_key", apiKey)
	c.Locals("api_key_id", apiKey.ID)
	c.Locals("api_key_scopes", apiKey.GetScopes())
	c.Locals("auth_method", "api_key")

	// Update last used timestamp (async to avoid blocking the request)
	go func() {
		if err := apiKeyService.UpdateLastUsed(apiKey.ID); err != nil {
			utils.Logger.Error().
				Err(err).
				Str("api_key_id", apiKey.ID.String()).
				Msg("Failed to update API key last_used_at")
		}
	}()

	utils.Logger.Debug().
		Str("user_id", user.ID.String()).
		Str("api_key_id", apiKey.ID.String()).
		Str("api_key_name", apiKey.Name).
		Str("path", c.Path()).
		Msg("Request authenticated via API key")

	return c.Next()
}

// extractKeyPrefix extracts the prefix from an API key for logging (without exposing the full key)
func extractKeyPrefix(key string) string {
	parts := strings.Split(key, "_")
	if len(parts) >= 2 {
		return parts[0] + "_" + parts[1] + "_***"
	}
	return "***"
}

// OptionalAuthMiddleware attempts to authenticate but doesn't fail if no token
func OptionalAuthMiddleware() fiber.Handler {
	sessionService := services.NewSessionService()

	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next() // Continue without auth
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Next() // Continue without auth
		}

		token := parts[1]
		session, err := sessionService.ValidateSession(token)
		if err != nil {
			return c.Next() // Continue without auth
		}

		// Attach user and session to context if valid
		c.Locals("user", session.User)
		c.Locals("user_id", session.UserID)
		c.Locals("session", session)
		c.Locals("session_id", session.ID)

		return c.Next()
	}
}
