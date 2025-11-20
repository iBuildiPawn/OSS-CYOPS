package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// ErrorResponse represents a standard error response
type ErrorResponse struct {
	Error     string                 `json:"error"`
	Message   string                 `json:"message"`
	Status    int                    `json:"status"`
	RequestID string                 `json:"request_id,omitempty"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// ErrorHandler is a custom error handler middleware
func ErrorHandler() fiber.ErrorHandler {
	return func(c *fiber.Ctx, err error) error {
		code := fiber.StatusInternalServerError
		message := "Internal Server Error"
		errorType := "internal_error"

		// Check if it's a Fiber error
		if e, ok := err.(*fiber.Error); ok {
			code = e.Code
			message = e.Message
			errorType = "http_error"
		}

		// Log the error
		requestID := c.Locals("requestid")
		requestIDStr := ""
		if requestID != nil {
			requestIDStr = requestID.(string)
		}

		utils.Logger.Error().
			Err(err).
			Str("request_id", requestIDStr).
			Str("path", c.Path()).
			Str("method", c.Method()).
			Int("status", code).
			Msg("Request error")

		// Send error response
		return c.Status(code).JSON(ErrorResponse{
			Error:     errorType,
			Message:   message,
			Status:    code,
			RequestID: requestIDStr,
		})
	}
}

// ValidationError creates a validation error response
func ValidationError(c *fiber.Ctx, message string, details map[string]interface{}) error {
	requestID := c.Locals("requestid")
	requestIDStr := ""
	if requestID != nil {
		requestIDStr = requestID.(string)
	}

	return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
		Error:     "validation_error",
		Message:   message,
		Status:    fiber.StatusBadRequest,
		RequestID: requestIDStr,
		Details:   details,
	})
}

// UnauthorizedError creates an unauthorized error response
func UnauthorizedError(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Unauthorized access"
	}

	requestID := c.Locals("requestid")
	requestIDStr := ""
	if requestID != nil {
		requestIDStr = requestID.(string)
	}

	return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
		Error:     "unauthorized",
		Message:   message,
		Status:    fiber.StatusUnauthorized,
		RequestID: requestIDStr,
	})
}

// ForbiddenError creates a forbidden error response
func ForbiddenError(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Access forbidden"
	}

	requestID := c.Locals("requestid")
	requestIDStr := ""
	if requestID != nil {
		requestIDStr = requestID.(string)
	}

	return c.Status(fiber.StatusForbidden).JSON(ErrorResponse{
		Error:     "forbidden",
		Message:   message,
		Status:    fiber.StatusForbidden,
		RequestID: requestIDStr,
	})
}

// NotFoundError creates a not found error response
func NotFoundError(c *fiber.Ctx, resource string) error {
	message := "Resource not found"
	if resource != "" {
		message = resource + " not found"
	}

	requestID := c.Locals("requestid")
	requestIDStr := ""
	if requestID != nil {
		requestIDStr = requestID.(string)
	}

	return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
		Error:     "not_found",
		Message:   message,
		Status:    fiber.StatusNotFound,
		RequestID: requestIDStr,
	})
}

// ConflictError creates a conflict error response
func ConflictError(c *fiber.Ctx, message string) error {
	if message == "" {
		message = "Resource conflict"
	}

	requestID := c.Locals("requestid")
	requestIDStr := ""
	if requestID != nil {
		requestIDStr = requestID.(string)
	}

	return c.Status(fiber.StatusConflict).JSON(ErrorResponse{
		Error:     "conflict",
		Message:   message,
		Status:    fiber.StatusConflict,
		RequestID: requestIDStr,
	})
}

// InternalError creates an internal server error response
func InternalError(c *fiber.Ctx, err error) error {
	requestID := c.Locals("requestid")
	requestIDStr := ""
	if requestID != nil {
		requestIDStr = requestID.(string)
	}

	// Log the actual error
	utils.Logger.Error().
		Err(err).
		Str("request_id", requestIDStr).
		Msg("Internal server error")

	return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
		Error:     "internal_error",
		Message:   "An internal error occurred",
		Status:    fiber.StatusInternalServerError,
		RequestID: requestIDStr,
	})
}
