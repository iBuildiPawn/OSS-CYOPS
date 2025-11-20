package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	Max        int
	Expiration time.Duration
}

// NewRateLimiter creates a new rate limiter middleware
func NewRateLimiter(config RateLimitConfig) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        config.Max,
		Expiration: config.Expiration,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(ErrorResponse{
				Error:   "rate_limit_exceeded",
				Message: "Too many requests. Please try again later.",
				Status:  fiber.StatusTooManyRequests,
			})
		},
	})
}

// AuthRateLimiter creates a rate limiter for authentication endpoints
func AuthRateLimiter() fiber.Handler {
	return NewRateLimiter(RateLimitConfig{
		Max:        50,              // 50 requests
		Expiration: 1 * time.Minute, // per minute
	})
}

// RegistrationRateLimiter creates a rate limiter for registration endpoints
func RegistrationRateLimiter() fiber.Handler {
	return NewRateLimiter(RateLimitConfig{
		Max:        20,              // 20 requests
		Expiration: 1 * time.Minute, // per minute
	})
}

// PasswordResetRateLimiter creates a rate limiter for password reset endpoints
func PasswordResetRateLimiter() fiber.Handler {
	return NewRateLimiter(RateLimitConfig{
		Max:        3,                // 3 requests
		Expiration: 60 * time.Minute, // per hour
	})
}

// StrictRateLimiter creates a strict rate limiter for sensitive operations
func StrictRateLimiter() fiber.Handler {
	return NewRateLimiter(RateLimitConfig{
		Max:        2,                // 2 requests
		Expiration: 60 * time.Minute, // per hour
	})
}

// VulnerabilityCreationRateLimiter creates a rate limiter for vulnerability creation
func VulnerabilityCreationRateLimiter() fiber.Handler {
	return NewRateLimiter(RateLimitConfig{
		Max:        10,              // 10 vulnerabilities
		Expiration: 1 * time.Minute, // per minute
	})
}
