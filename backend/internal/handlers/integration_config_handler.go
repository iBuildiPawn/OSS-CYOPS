package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/database"
	"github.com/cyops/cyops-backend/pkg/utils"
)

type IntegrationConfigHandler struct {
	service          *services.IntegrationConfigService
	nessusAPIService *services.NessusAPIService
}

func NewIntegrationConfigHandler(encryptionKey string) *IntegrationConfigHandler {
	configService := services.NewIntegrationConfigService(database.GetDB(), encryptionKey)
	return &IntegrationConfigHandler{
		service:          configService,
		nessusAPIService: services.NewNessusAPIService(configService),
	}
}

// CreateConfig creates a new integration configuration
func (h *IntegrationConfigHandler) CreateConfig(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	var req struct {
		Name             string                     `json:"name"`
		Type             models.IntegrationType     `json:"type"`
		BaseURL          string                     `json:"base_url"`
		AccessKey        string                     `json:"access_key"`
		SecretKey        string                     `json:"secret_key"`
		Config           map[string]interface{}     `json:"config"`
		AutoSync         bool                       `json:"auto_sync"`
		SyncIntervalMins int                        `json:"sync_interval_mins"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	config := &models.IntegrationConfig{
		Name:             req.Name,
		Type:             req.Type,
		BaseURL:          req.BaseURL,
		AccessKey:        req.AccessKey,
		SecretKey:        req.SecretKey,
		Config:           req.Config,
		AutoSync:         req.AutoSync,
		SyncIntervalMins: req.SyncIntervalMins,
		Active:           true,
		CreatedBy:        userID,
	}

	if err := h.service.CreateConfig(config); err != nil {
		// Check if it's a duplicate error
		if strings.Contains(err.Error(), "already exists") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error":   "Duplicate integration",
				"details": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create integration config",
			"details": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Integration configuration created successfully",
		"data":    config.ToPublic(),
	})
}

// GetConfig retrieves a specific integration configuration
func (h *IntegrationConfigHandler) GetConfig(c *fiber.Ctx) error {
	configID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid config ID",
		})
	}

	config, err := h.service.GetConfig(configID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Integration config not found",
		})
	}

	return c.JSON(fiber.Map{
		"data": config.ToPublic(),
	})
}

// ListConfigs lists all integration configurations
func (h *IntegrationConfigHandler) ListConfigs(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	// Optional filter by type
	var integrationType *models.IntegrationType
	if typeParam := c.Query("type"); typeParam != "" {
		t := models.IntegrationType(typeParam)
		integrationType = &t
	}

	configs, err := h.service.ListConfigs(userID, integrationType)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list integration configs",
		})
	}

	// Convert to public configs
	publicConfigs := make([]models.PublicIntegrationConfig, len(configs))
	for i, config := range configs {
		publicConfigs[i] = config.ToPublic()
	}

	return c.JSON(fiber.Map{
		"data": publicConfigs,
	})
}

// UpdateConfig updates an integration configuration
func (h *IntegrationConfigHandler) UpdateConfig(c *fiber.Ctx) error {
	configID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid config ID",
		})
	}

	var req struct {
		Name             *string                `json:"name"`
		BaseURL          *string                `json:"base_url"`
		AccessKey        *string                `json:"access_key"`
		SecretKey        *string                `json:"secret_key"`
		Config           map[string]interface{} `json:"config"`
		Active           *bool                  `json:"active"`
		AutoSync         *bool                  `json:"auto_sync"`
		SyncIntervalMins *int                   `json:"sync_interval_mins"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Build updates map
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.BaseURL != nil {
		updates["base_url"] = *req.BaseURL
	}
	if req.AccessKey != nil {
		updates["access_key"] = *req.AccessKey
	}
	if req.SecretKey != nil {
		updates["secret_key"] = *req.SecretKey
	}
	if req.Config != nil {
		updates["config"] = req.Config
	}
	if req.Active != nil {
		updates["active"] = *req.Active
	}
	if req.AutoSync != nil {
		updates["auto_sync"] = *req.AutoSync
	}
	if req.SyncIntervalMins != nil {
		updates["sync_interval_mins"] = *req.SyncIntervalMins
	}

	if err := h.service.UpdateConfig(configID, updates); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update integration config",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Integration configuration updated successfully",
	})
}

// DeleteConfig deletes an integration configuration
func (h *IntegrationConfigHandler) DeleteConfig(c *fiber.Ctx) error {
	configID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid config ID",
		})
	}

	if err := h.service.DeleteConfig(configID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete integration config",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Integration configuration deleted successfully",
	})
}

// TestConnection tests the connection to the external API
func (h *IntegrationConfigHandler) TestConnection(c *fiber.Ctx) error {
	configID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid config ID",
		})
	}

	// Get config to determine type
	config, err := h.service.GetConfig(configID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Configuration not found",
		})
	}

	// Test connection based on integration type
	var testErr error
	switch config.Type {
	case models.IntegrationTypeNessus:
		testErr = h.nessusAPIService.TestConnection(configID)
	default:
		// Fallback to basic validation
		testErr = h.service.TestConnection(configID)
	}

	if testErr != nil {
		// Log the error for debugging
		utils.Logger.Error().
			Err(testErr).
			Str("config_id", configID.String()).
			Str("type", string(config.Type)).
			Msg("Connection test failed")

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Connection test failed",
			"details": testErr.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Connection test successful",
		"type":    config.Type,
	})
}
