package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/cyops/cyops-backend/pkg/database"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// HealthHandler handles health check endpoints
type HealthHandler struct{}

// NewHealthHandler creates a new health check handler
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp time.Time         `json:"timestamp"`
	Version   string            `json:"version"`
	Uptime    float64           `json:"uptime_seconds"`
	Checks    map[string]string `json:"checks"`
}

var startTime = time.Now()

// Health returns basic health status
// @Summary Health check endpoint
// @Description Returns the health status of the API
// @Tags health
// @Produce json
// @Success 200 {object} HealthResponse
// @Router /health [get]
func (h *HealthHandler) Health(c *fiber.Ctx) error {
	uptime := time.Since(startTime).Seconds()

	response := HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now(),
		Version:   "1.0.0",
		Uptime:    uptime,
		Checks:    make(map[string]string),
	}

	// Check database connection
	db := database.GetDB()
	if db != nil {
		sqlDB, err := db.DB()
		if err != nil {
			response.Checks["database"] = "unhealthy: " + err.Error()
			response.Status = "degraded"
		} else {
			err = sqlDB.Ping()
			if err != nil {
				response.Checks["database"] = "unhealthy: " + err.Error()
				response.Status = "degraded"
			} else {
				response.Checks["database"] = "healthy"
			}
		}
	} else {
		response.Checks["database"] = "unhealthy: no connection"
		response.Status = "degraded"
	}

	statusCode := fiber.StatusOK
	if response.Status == "degraded" {
		statusCode = fiber.StatusServiceUnavailable
	}

	utils.Logger.Info().
		Str("status", response.Status).
		Float64("uptime", uptime).
		Msg("Health check performed")

	return c.Status(statusCode).JSON(response)
}

// Ready returns readiness status
// @Summary Readiness check endpoint
// @Description Returns whether the API is ready to accept traffic
// @Tags health
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /health/ready [get]
func (h *HealthHandler) Ready(c *fiber.Ctx) error {
	// Check if database is ready
	db := database.GetDB()
	if db == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status": "not ready",
			"reason": "database not initialized",
		})
	}

	sqlDB, err := db.DB()
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status": "not ready",
			"reason": "cannot get database connection: " + err.Error(),
		})
	}

	err = sqlDB.Ping()
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status": "not ready",
			"reason": "database ping failed: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "ready",
	})
}

// Live returns liveness status
// @Summary Liveness check endpoint
// @Description Returns whether the API is alive
// @Tags health
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /health/live [get]
func (h *HealthHandler) Live(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "alive",
	})
}
