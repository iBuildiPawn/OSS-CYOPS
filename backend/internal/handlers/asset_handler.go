package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// AssetHandler handles HTTP requests for asset management
type AssetHandler struct {
	assetService      *services.AssetService
	validationService *services.AssetValidationService
	searchService     *services.AssetSearchService
}

// NewAssetHandler creates a new asset handler
func NewAssetHandler(
	assetService *services.AssetService,
	validationService *services.AssetValidationService,
	searchService *services.AssetSearchService,
) *AssetHandler {
	return &AssetHandler{
		assetService:      assetService,
		validationService: validationService,
		searchService:     searchService,
	}
}

// AssetCreateRequest defines the request body for creating an asset
type AssetCreateRequest struct {
	Hostname    string                   `json:"hostname,omitempty"`
	IPAddress   string                   `json:"ip_address,omitempty"`
	AssetID     string                   `json:"asset_id,omitempty"`
	SystemType  models.SystemType        `json:"system_type" validate:"required"`
	Description string                   `json:"description,omitempty"`
	Environment models.Environment       `json:"environment" validate:"required"`
	Criticality *models.AssetCriticality `json:"criticality,omitempty"`
	Status      models.AssetStatus       `json:"status,omitempty"`
	OwnerID     *uuid.UUID               `json:"owner_id,omitempty"`
	Department  string                   `json:"department,omitempty"`
	Location    string                   `json:"location,omitempty"`
	Tags        []string                 `json:"tags,omitempty"`
}

// AssetResponse defines the response for asset operations
type AssetResponse struct {
	models.AffectedSystem
	VulnerabilityCount int            `json:"vulnerability_count,omitempty"`
	VulnerabilityStats map[string]int `json:"vulnerability_stats,omitempty"`
}

// AssetCreateResponse includes auto-created asset warnings
type AssetCreateResponse struct {
	Asset            *models.AffectedSystem  `json:"asset"`
	DuplicateWarning bool                    `json:"duplicate_warning,omitempty"`
	SimilarAssets    []models.AffectedSystem `json:"similar_assets,omitempty"`
}

// ListAssets handles GET /api/v1/assets
func (h *AssetHandler) ListAssets(c *fiber.Ctx) error {
	// Parse query parameters
	params := services.AssetListParams{
		Page:      c.QueryInt("page", 1),
		Limit:     c.QueryInt("limit", 50),
		Search:    c.Query("search"),
		SortBy:    c.Query("sort_by", "created_at"),
		SortOrder: c.Query("sort_order", "DESC"),
	}

	// Parse optional filters
	if criticality := c.Query("criticality"); criticality != "" {
		crit := models.AssetCriticality(criticality)
		params.Criticality = &crit
	}

	if status := c.Query("status"); status != "" {
		stat := models.AssetStatus(status)
		params.Status = &stat
	}

	if environment := c.Query("environment"); environment != "" {
		env := models.Environment(environment)
		params.Environment = &env
	}

	if systemType := c.Query("system_type"); systemType != "" {
		sysType := models.SystemType(systemType)
		params.SystemType = &sysType
	}

	if ownerID := c.Query("owner_id"); ownerID != "" {
		if id, err := uuid.Parse(ownerID); err == nil {
			params.OwnerID = &id
		}
	}

	// Get assets
	response, err := h.assetService.List(params)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to list assets")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve assets",
		})
	}

	return c.JSON(response)
}

// CreateAsset handles POST /api/v1/assets
func (h *AssetHandler) CreateAsset(c *fiber.Ctx) error {
	var req AssetCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Create asset model
	asset := &models.AffectedSystem{
		Hostname:    req.Hostname,
		IPAddress:   req.IPAddress,
		AssetID:     req.AssetID,
		SystemType:  req.SystemType,
		Description: req.Description,
		Environment: req.Environment,
		Criticality: req.Criticality,
		Status:      req.Status,
		OwnerID:     req.OwnerID,
		Department:  req.Department,
		Location:    req.Location,
	}

	// Validate the asset
	if err := h.validationService.ValidateCreate(asset); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Check for duplicates (soft warning, not blocking)
	duplicateCheck, err := h.validationService.CheckDuplicate(
		req.Hostname,
		req.IPAddress,
		req.Environment,
	)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to check for duplicates")
	}

	// Create the asset
	if err := h.assetService.Create(asset); err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to create asset")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create asset",
		})
	}

	// Handle tags if provided
	if len(req.Tags) > 0 {
		if err := h.assetService.AddTags(asset.ID.String(), req.Tags); err != nil {
			utils.Logger.Error().Err(err).Msg("Failed to add tags to asset")
			// Don't fail the request, just log the error
		}
	}

	utils.Logger.Info().
		Str("asset_id", asset.ID.String()).
		Str("hostname", asset.Hostname).
		Str("environment", string(asset.Environment)).
		Msg("Asset created successfully")

	// Build response with duplicate warning if applicable
	response := AssetCreateResponse{
		Asset:            asset,
		DuplicateWarning: duplicateCheck != nil && duplicateCheck.IsDuplicate,
	}
	if duplicateCheck != nil && duplicateCheck.IsDuplicate {
		response.SimilarAssets = duplicateCheck.Matches
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

// GetAsset handles GET /api/v1/assets/:id
func (h *AssetHandler) GetAsset(c *fiber.Ctx) error {
	id := c.Params("id")
	includeVulns := c.QueryBool("include_vulnerabilities", false)

	asset, err := h.assetService.GetByID(id, includeVulns)
	if err != nil {
		utils.Logger.Error().Err(err).Str("asset_id", id).Msg("Failed to get asset")
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Asset not found",
		})
	}

	// Add vulnerability statistics using GetVulnerabilityStats
	response := AssetResponse{
		AffectedSystem: *asset,
	}

	// Get vulnerability stats from the database
	stats, err := asset.GetVulnerabilityStats(h.assetService.GetDB())
	if err != nil {
		utils.Logger.Error().Err(err).Str("asset_id", id).Msg("Failed to get vulnerability stats")
		// Don't fail the request, just omit stats
	} else {
		response.VulnerabilityStats = stats
		// Calculate total count
		totalCount := 0
		for _, count := range stats {
			totalCount += count
		}
		response.VulnerabilityCount = totalCount
	}

	return c.JSON(response)
}

// UpdateAsset handles PUT /api/v1/assets/:id
func (h *AssetHandler) UpdateAsset(c *fiber.Ctx) error {
	id := c.Params("id")

	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get existing asset for validation
	existingAsset, err := h.assetService.GetByID(id, false)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Asset not found",
		})
	}

	// Validate updates
	if err := h.validationService.ValidateUpdate(existingAsset, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Update the asset
	updatedAsset, err := h.assetService.Update(id, req)
	if err != nil {
		utils.Logger.Error().Err(err).Str("asset_id", id).Msg("Failed to update asset")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update asset",
		})
	}

	utils.Logger.Info().
		Str("asset_id", id).
		Msg("Asset updated successfully")

	return c.JSON(updatedAsset)
}

// DeleteAsset handles DELETE /api/v1/assets/:id
func (h *AssetHandler) DeleteAsset(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.assetService.Delete(id); err != nil {
		utils.Logger.Error().Err(err).Str("asset_id", id).Msg("Failed to delete asset")
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Asset not found",
		})
	}

	utils.Logger.Info().
		Str("asset_id", id).
		Msg("Asset deleted successfully")

	return c.JSON(fiber.Map{
		"message": "Asset deleted successfully",
	})
}

// UpdateAssetStatus handles PATCH /api/v1/assets/:id/status
func (h *AssetHandler) UpdateAssetStatus(c *fiber.Ctx) error {
	// Parse asset ID
	assetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid asset ID format",
		})
	}

	// Parse request body
	var req struct {
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate status
	if req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Status is required",
		})
	}

	// Convert string to AssetStatus
	status := models.AssetStatus(req.Status)

	// Update status
	asset, err := h.assetService.UpdateStatus(assetID.String(), status, req.Notes)
	if err != nil {
		if err.Error() == "asset not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Asset not found",
			})
		}
		if err.Error() == "invalid status transition: cannot change status from DECOMMISSIONED" ||
			len(err.Error()) >= 23 && err.Error()[:23] == "invalid status transition" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update asset status",
		})
	}

	return c.Status(fiber.StatusOK).JSON(asset)
}

// GetAssetVulnerabilities handles GET /api/v1/assets/:id/vulnerabilities
func (h *AssetHandler) GetAssetVulnerabilities(c *fiber.Ctx) error {
	// Parse asset ID
	assetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid asset ID format",
		})
	}

	// Check if asset exists
	_, err = h.assetService.GetByID(assetID.String(), false)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Asset not found",
		})
	}

	// Parse query parameters
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	severity := c.Query("severity")
	status := c.Query("status")
	sortBy := c.Query("sort_by", "severity")
	sortOrder := c.Query("sort_order", "DESC")

	params := services.VulnerabilityListParams{
		Page:      page,
		Limit:     limit,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}

	if severity != "" {
		params.Severity = &severity
	}
	if status != "" {
		params.Status = &status
	}

	// Get vulnerabilities
	response, err := h.assetService.GetVulnerabilities(assetID, params)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve vulnerabilities",
		})
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// AddAssetTags handles POST /api/v1/assets/:id/tags
func (h *AssetHandler) AddAssetTags(c *fiber.Ctx) error {
	// Parse asset ID
	assetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid asset ID format",
		})
	}

	// Parse request body
	var req struct {
		Tags []string `json:"tags"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate tags
	if len(req.Tags) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "At least one tag is required",
		})
	}

	// Add tags
	err = h.assetService.AddTags(assetID.String(), req.Tags)
	if err != nil {
		if err.Error() == "asset not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Asset not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to add tags",
		})
	}

	// Fetch updated asset to return
	asset, err := h.assetService.GetByID(assetID.String(), false)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Tags added but failed to fetch updated asset",
		})
	}

	return c.Status(fiber.StatusOK).JSON(asset)
}

// RemoveAssetTag handles DELETE /api/v1/assets/:id/tags/:tag
func (h *AssetHandler) RemoveAssetTag(c *fiber.Ctx) error {
	// Parse asset ID
	assetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid asset ID format",
		})
	}

	// Get tag from URL parameter
	tag := c.Params("tag")
	if tag == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Tag is required",
		})
	}

	// Remove tag
	err = h.assetService.RemoveTag(assetID.String(), tag)
	if err != nil {
		if err.Error() == "asset not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Asset not found",
			})
		}
		if err.Error() == "tag not found on asset" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Tag not found on asset",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to remove tag",
		})
	}

	// Fetch updated asset to return
	asset, err := h.assetService.GetByID(assetID.String(), false)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Tag removed but failed to fetch updated asset",
		})
	}

	return c.Status(fiber.StatusOK).JSON(asset)
}

// GetAssetStats handles GET /api/v1/assets/stats
func (h *AssetHandler) GetAssetStats(c *fiber.Ctx) error {
	// Get statistics
	stats, err := h.assetService.GetStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve statistics",
		})
	}

	return c.Status(fiber.StatusOK).JSON(stats)
}

// CheckDuplicateAsset handles POST /api/v1/assets/check-duplicate
func (h *AssetHandler) CheckDuplicateAsset(c *fiber.Ctx) error {
	// Parse request body
	var req struct {
		Name      string  `json:"name"`
		IPAddress string  `json:"ip_address"`
		Hostname  string  `json:"hostname"`
		Threshold float64 `json:"threshold"` // Optional, defaults to 80%
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate at least one field is provided
	if req.Name == "" && req.IPAddress == "" && req.Hostname == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "At least one of name, ip_address, or hostname must be provided",
		})
	}

	// Check for duplicates
	results, err := h.assetService.CheckDuplicate(req.Name, req.IPAddress, req.Hostname, req.Threshold)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check for duplicates",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"duplicates": results,
		"count":      len(results),
	})
}
