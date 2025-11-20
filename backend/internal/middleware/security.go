package middleware

import (
	"github.com/gofiber/fiber/v2"
)

// SecurityHeaders adds security-related HTTP headers to responses
func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Prevent MIME type sniffing
		c.Set("X-Content-Type-Options", "nosniff")

		// Enable browser XSS protection
		c.Set("X-XSS-Protection", "1; mode=block")

		// Prevent clickjacking attacks
		c.Set("X-Frame-Options", "DENY")

		// Control referrer information
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Content Security Policy
		// Adjust this based on your actual requirements
		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
			"style-src 'self' 'unsafe-inline'; " +
			"img-src 'self' data: https:; " +
			"font-src 'self' data:; " +
			"connect-src 'self'; " +
			"frame-ancestors 'none'; " +
			"base-uri 'self'; " +
			"form-action 'self'"
		c.Set("Content-Security-Policy", csp)

		// Strict Transport Security (HTTPS only)
		// Only enable in production with HTTPS
		if c.Protocol() == "https" {
			c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		// Permissions Policy (formerly Feature Policy)
		permissions := "camera=(), " +
			"microphone=(), " +
			"geolocation=(), " +
			"interest-cohort=(), " +
			"payment=()"
		c.Set("Permissions-Policy", permissions)

		// Remove server header for security
		c.Set("Server", "")

		return c.Next()
	}
}
