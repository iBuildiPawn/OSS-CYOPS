package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// SystemSettingsHandler handles system settings endpoints
type SystemSettingsHandler struct {
	service *services.SystemSettingsService
}

// NewSystemSettingsHandler creates a new system settings handler
func NewSystemSettingsHandler(service *services.SystemSettingsService) *SystemSettingsHandler {
	return &SystemSettingsHandler{
		service: service,
	}
}

// UpdateSettingRequest represents a request to update a system setting
type UpdateSettingRequest struct {
	Value       string `json:"value" validate:"required"`
	Description string `json:"description,omitempty"`
}

// GetAllSettings returns all system settings
// GET /api/v1/settings
func (h *SystemSettingsHandler) GetAllSettings(c *fiber.Ctx) error {
	settings, err := h.service.GetAllSettings()
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to get system settings")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve system settings",
		})
	}

	return c.JSON(fiber.Map{
		"settings": settings,
	})
}

// GetSetting returns a specific system setting
// GET /api/v1/settings/:key
func (h *SystemSettingsHandler) GetSetting(c *fiber.Ctx) error {
	key := c.Params("key")

	setting, err := h.service.GetSetting(key)
	if err != nil {
		if err.Error() == "setting not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Setting not found",
			})
		}
		utils.Logger.Error().Err(err).Str("key", key).Msg("Failed to get system setting")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve system setting",
		})
	}

	return c.JSON(fiber.Map{
		"setting": setting,
	})
}

// UpdateSetting updates a system setting
// PUT /api/v1/settings/:key
func (h *SystemSettingsHandler) UpdateSetting(c *fiber.Ctx) error {
	key := c.Params("key")

	var req UpdateSettingRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate that value is not empty
	if req.Value == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Value is required",
		})
	}

	// Get current user email from context
	user := c.Locals("user").(*models.User)

	// Update setting
	setting, err := h.service.UpdateSetting(key, req.Value, req.Description, user.Email)
	if err != nil {
		utils.Logger.Error().Err(err).Str("key", key).Msg("Failed to update system setting")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update system setting",
		})
	}

	utils.Logger.Info().Str("key", key).Str("value", req.Value).Str("updated_by", user.Email).Msg("System setting updated")

	return c.JSON(fiber.Map{
		"message": "Setting updated successfully",
		"setting": setting,
	})
}

// GetMCPStatus returns the current MCP server status
// GET /api/v1/settings/mcp/status
func (h *SystemSettingsHandler) GetMCPStatus(c *fiber.Ctx) error {
	enabled := h.service.IsMCPServerEnabled()

	return c.JSON(fiber.Map{
		"enabled": enabled,
		"key":     string(models.SystemSettingMCPEnabled),
	})
}

// ToggleMCPServer enables or disables the MCP server
// POST /api/v1/settings/mcp/toggle
func (h *SystemSettingsHandler) ToggleMCPServer(c *fiber.Ctx) error {
	var req struct {
		Enabled bool `json:"enabled"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get current user email from context
	user := c.Locals("user").(*models.User)

	// Update MCP server setting
	if err := h.service.SetMCPServerEnabled(req.Enabled, user.Email); err != nil {
		utils.Logger.Error().Err(err).Bool("enabled", req.Enabled).Msg("Failed to toggle MCP server")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to toggle MCP server",
		})
	}

	action := "disabled"
	if req.Enabled {
		action = "enabled"
	}

	utils.Logger.Info().Str("action", action).Str("by", user.Email).Msg("MCP server toggled")

	return c.JSON(fiber.Map{
		"message": "MCP server " + action + " successfully",
		"enabled": req.Enabled,
	})
}
