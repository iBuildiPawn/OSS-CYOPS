package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/middleware"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// AffectedSystemHandler handles affected system related requests
type AffectedSystemHandler struct {
	affectedSystemService *services.AffectedSystemService
	vulnerabilityService  *services.VulnerabilityService
}

// NewAffectedSystemHandler creates a new affected system handler
func NewAffectedSystemHandler() *AffectedSystemHandler {
	return &AffectedSystemHandler{
		affectedSystemService: services.NewAffectedSystemService(),
		vulnerabilityService:  services.NewVulnerabilityService(),
	}
}

// CreateAffectedSystemRequest represents a create request
type CreateAffectedSystemRequest struct {
	Hostname    string `json:"hostname"`
	IPAddress   string `json:"ip_address,omitempty"`
	AssetID     string `json:"asset_id,omitempty"`
	SystemType  string `json:"system_type"`
	Description string `json:"description,omitempty"`
	Environment string `json:"environment,omitempty"`
}

// CreateAffectedSystem creates a new affected system
func (h *AffectedSystemHandler) CreateAffectedSystem(c *fiber.Ctx) error {
	var req CreateAffectedSystemRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	// Validate required fields
	if req.Hostname == "" {
		return middleware.ValidationError(c, "Hostname is required", nil)
	}
	if req.SystemType == "" {
		return middleware.ValidationError(c, "SystemType is required", nil)
	}

	serviceReq := services.CreateAffectedSystemRequest{
		Hostname:    req.Hostname,
		IPAddress:   req.IPAddress,
		AssetID:     req.AssetID,
		SystemType:  req.SystemType,
		Description: req.Description,
		Environment: req.Environment,
	}

	system, err := h.affectedSystemService.CreateAffectedSystem(serviceReq)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to create affected system")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create affected system",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Affected system created successfully",
		"data":    system,
	})
}

// ListAffectedSystems returns a list of affected systems
func (h *AffectedSystemHandler) ListAffectedSystems(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	systemType := c.Query("type", "")
	environment := c.Query("environment", "")
	search := c.Query("search", "")

	req := services.ListAffectedSystemsRequest{
		Page:        page,
		Limit:       limit,
		SystemType:  systemType,
		Environment: environment,
		Search:      search,
	}

	systems, total, err := h.affectedSystemService.ListAffectedSystems(req)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to list affected systems")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list affected systems",
		})
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	return c.JSON(fiber.Map{
		"data": systems,
		"meta": fiber.Map{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// GetAffectedSystem returns a single affected system
func (h *AffectedSystemHandler) GetAffectedSystem(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return middleware.ValidationError(c, "Invalid system ID", nil)
	}

	system, err := h.affectedSystemService.GetAffectedSystemByID(id)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Affected system not found",
			})
		}
		utils.Logger.Error().Err(err).Msg("Failed to get affected system")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get affected system",
		})
	}

	return c.JSON(fiber.Map{
		"data": system,
	})
}

// GetVulnerabilityAffectedSystems returns affected systems for a vulnerability
func (h *AffectedSystemHandler) GetVulnerabilityAffectedSystems(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return middleware.ValidationError(c, "Invalid vulnerability ID", nil)
	}

	systems, err := h.affectedSystemService.GetSystemsForVulnerability(id)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to get affected systems for vulnerability")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get affected systems",
		})
	}

	return c.JSON(fiber.Map{
		"data": systems,
	})
}

// AddAffectedSystemsRequest represents a request to add systems to a vulnerability
type AddAffectedSystemsRequest struct {
	SystemIDs []string `json:"system_ids"`
}

// AddVulnerabilityAffectedSystems adds affected systems to a vulnerability
func (h *AffectedSystemHandler) AddVulnerabilityAffectedSystems(c *fiber.Ctx) error {
	idParam := c.Params("id")
	vulnerabilityID, err := uuid.Parse(idParam)
	if err != nil {
		return middleware.ValidationError(c, "Invalid vulnerability ID", nil)
	}

	var req AddAffectedSystemsRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	if len(req.SystemIDs) == 0 {
		return middleware.ValidationError(c, "At least one system ID is required", nil)
	}

	// Parse system IDs
	var systemIDs []uuid.UUID
	for _, idStr := range req.SystemIDs {
		systemID, err := uuid.Parse(idStr)
		if err != nil {
			return middleware.ValidationError(c, "Invalid system ID format", nil)
		}
		systemIDs = append(systemIDs, systemID)
	}

	if err := h.vulnerabilityService.AddAffectedSystems(vulnerabilityID, systemIDs); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		utils.Logger.Error().Err(err).Msg("Failed to add affected systems")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to add affected systems",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Affected systems added successfully",
	})
}

// RemoveVulnerabilityAffectedSystem removes an affected system from a vulnerability
func (h *AffectedSystemHandler) RemoveVulnerabilityAffectedSystem(c *fiber.Ctx) error {
	vulnerabilityIDParam := c.Params("id")
	vulnerabilityID, err := uuid.Parse(vulnerabilityIDParam)
	if err != nil {
		return middleware.ValidationError(c, "Invalid vulnerability ID", nil)
	}

	systemIDParam := c.Params("system_id")
	systemID, err := uuid.Parse(systemIDParam)
	if err != nil {
		return middleware.ValidationError(c, "Invalid system ID", nil)
	}

	if err := h.vulnerabilityService.RemoveAffectedSystem(vulnerabilityID, systemID); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		utils.Logger.Error().Err(err).Msg("Failed to remove affected system")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to remove affected system",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Affected system removed successfully",
	})
}

// UpdateAffectedSystemRequest represents an update request
type UpdateAffectedSystemRequest struct {
	Hostname    *string `json:"hostname,omitempty"`
	IPAddress   *string `json:"ip_address,omitempty"`
	AssetID     *string `json:"asset_id,omitempty"`
	SystemType  *string `json:"system_type,omitempty"`
	Description *string `json:"description,omitempty"`
	Environment *string `json:"environment,omitempty"`
}

// UpdateAffectedSystem updates an affected system
func (h *AffectedSystemHandler) UpdateAffectedSystem(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return middleware.ValidationError(c, "Invalid system ID", nil)
	}

	var req UpdateAffectedSystemRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	serviceReq := services.UpdateAffectedSystemRequest{
		Hostname:    req.Hostname,
		IPAddress:   req.IPAddress,
		AssetID:     req.AssetID,
		SystemType:  req.SystemType,
		Description: req.Description,
		Environment: req.Environment,
	}

	system, err := h.affectedSystemService.UpdateAffectedSystem(id, serviceReq)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Affected system not found",
			})
		}
		utils.Logger.Error().Err(err).Msg("Failed to update affected system")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update affected system",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Affected system updated successfully",
		"data":    system,
	})
}

// DeleteAffectedSystem deletes an affected system
func (h *AffectedSystemHandler) DeleteAffectedSystem(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return middleware.ValidationError(c, "Invalid system ID", nil)
	}

	if err := h.affectedSystemService.DeleteAffectedSystem(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Affected system not found",
			})
		}
		utils.Logger.Error().Err(err).Msg("Failed to delete affected system")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete affected system",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Affected system deleted successfully",
	})
}
