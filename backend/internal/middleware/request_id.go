package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// RequestID middleware adds a unique request ID to each request
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check if request ID already exists (from client)
		requestID := c.Get("X-Request-ID")

		// Generate new request ID if not provided
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Store request ID in context
		c.Locals("requestID", requestID)

		// Add request ID to response header
		c.Set("X-Request-ID", requestID)

		// Log request with ID
		utils.Logger.Info().
			Str("request_id", requestID).
			Str("method", c.Method()).
			Str("path", c.Path()).
			Str("ip", c.IP()).
			Str("user_agent", c.Get("User-Agent")).
			Msg("Incoming request")

		// Continue to next handler
		err := c.Next()

		// Log response with ID
		utils.Logger.Info().
			Str("request_id", requestID).
			Int("status", c.Response().StatusCode()).
			Str("method", c.Method()).
			Str("path", c.Path()).
			Msg("Request completed")

		return err
	}
}

// GetRequestID retrieves the request ID from the context
func GetRequestID(c *fiber.Ctx) string {
	requestID := c.Locals("requestID")
	if requestID == nil {
		return ""
	}
	return requestID.(string)
}
