package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/database"
	"github.com/cyops/cyops-backend/pkg/utils"
)

type NessusScanHandler struct {
	apiService    *services.NessusAPIService
	importService *services.VulnerabilityImportService
}

func NewNessusScanHandler(encryptionKey string) *NessusScanHandler {
	configService := services.NewIntegrationConfigService(database.GetDB(), encryptionKey)
	return &NessusScanHandler{
		apiService:    services.NewNessusAPIService(configService),
		importService: services.NewVulnerabilityImportService(),
	}
}

// ListScans retrieves all available scans from Nessus
// GET /api/v1/vulnerabilities/integrations/nessus/:config_id/scans
func (h *NessusScanHandler) ListScans(c *fiber.Ctx) error {
	configID, err := uuid.Parse(c.Params("config_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid config ID",
		})
	}

	scans, err := h.apiService.ListScans(configID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to list scans from Nessus")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to list scans",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Scans retrieved successfully",
		"data":    scans,
		"count":   len(scans),
	})
}

// GetScanDetails retrieves detailed information about a specific scan
// GET /api/v1/vulnerabilities/integrations/nessus/:config_id/scans/:scan_id
func (h *NessusScanHandler) GetScanDetails(c *fiber.Ctx) error {
	configID, err := uuid.Parse(c.Params("config_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid config ID",
		})
	}

	scanID, err := strconv.Atoi(c.Params("scan_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid scan ID",
		})
	}

	details, err := h.apiService.GetScanDetails(configID, scanID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to get scan details")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get scan details",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Scan details retrieved successfully",
		"data":    details,
	})
}

// ImportSingleScan imports a single scan from Nessus
// POST /api/v1/vulnerabilities/integrations/nessus/:config_id/scans/:scan_id/import
func (h *NessusScanHandler) ImportSingleScan(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	configID, err := uuid.Parse(c.Params("config_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid config ID",
		})
	}

	scanID, err := strconv.Atoi(c.Params("scan_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid scan ID",
		})
	}

	var req struct {
		Environment         string `json:"environment"`
		AutoCreateAssets    bool   `json:"auto_create_assets"`
		UpdateExisting      bool   `json:"update_existing"`
		DefaultAssigneeID   *uuid.UUID `json:"default_assignee_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		// Use defaults if no body provided
		req.Environment = "PRODUCTION"
		req.AutoCreateAssets = true
		req.UpdateExisting = false
	}

	utils.Logger.Info().
		Str("config_id", configID.String()).
		Int("scan_id", scanID).
		Msg("Importing single scan from Nessus")

	// Import and parse scan
	vulnerabilities, err := h.apiService.ImportScan(configID, scanID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to import scan")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to import scan",
			"details": err.Error(),
		})
	}

	// Save to database using existing import service
	// Note: skipDuplicates is opposite of update_existing
	skipDuplicates := !req.UpdateExisting
	result, err := h.importService.ImportFromNessus(
		vulnerabilities,
		userID,
		skipDuplicates,
	)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to save imported vulnerabilities")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to save vulnerabilities",
			"details": err.Error(),
		})
	}

	utils.Logger.Info().
		Int("vulnerabilities_imported", result.ImportedVulnerabilities).
		Int("assets_created", result.CreatedAssets).
		Msg("Scan import completed successfully")

	// Convert to response format expected by frontend
	responseData := fiber.Map{
		"created":        result.ImportedVulnerabilities,
		"updated":        result.UpdatedFindings,
		"skipped":        result.SkippedVulnerabilities,
		"assets_created": result.CreatedAssets,
		"findings_created": result.CreatedFindings,
		"errors":         result.Errors,
	}

	return c.JSON(fiber.Map{
		"message": "Scan imported successfully",
		"data":    responseData,
	})
}

// ImportMultipleScans imports multiple selected scans from Nessus
// POST /api/v1/vulnerabilities/integrations/nessus/:config_id/scans/import-multiple
func (h *NessusScanHandler) ImportMultipleScans(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	configID, err := uuid.Parse(c.Params("config_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid config ID",
		})
	}

	var req struct {
		ScanIDs             []int      `json:"scan_ids"`
		Environment         string     `json:"environment"`
		AutoCreateAssets    bool       `json:"auto_create_assets"`
		UpdateExisting      bool       `json:"update_existing"`
		DefaultAssigneeID   *uuid.UUID `json:"default_assignee_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(req.ScanIDs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "At least one scan ID is required",
		})
	}

	// Set defaults
	if req.Environment == "" {
		req.Environment = "PRODUCTION"
	}

	utils.Logger.Info().
		Str("config_id", configID.String()).
		Ints("scan_ids", req.ScanIDs).
		Msg("Importing multiple scans from Nessus")

	// Import all scans
	results, errors := h.apiService.ImportMultipleScans(configID, req.ScanIDs)

	// Aggregate all vulnerabilities
	allVulns := []services.ParsedVulnerability{}
	for _, vulns := range results {
		allVulns = append(allVulns, vulns...)
	}

	// Save to database
	skipDuplicates := !req.UpdateExisting
	importResult, err := h.importService.ImportFromNessus(
		allVulns,
		userID,
		skipDuplicates,
	)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to save imported vulnerabilities")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to save vulnerabilities",
			"details": err.Error(),
		})
	}

	// Build response with success/failure details
	scanResults := make([]fiber.Map, 0, len(req.ScanIDs))
	for _, scanID := range req.ScanIDs {
		scanResult := fiber.Map{"scan_id": scanID}
		if vulns, ok := results[scanID]; ok {
			scanResult["status"] = "success"
			scanResult["vulnerabilities_found"] = len(vulns)
		} else if err, ok := errors[scanID]; ok {
			scanResult["status"] = "failed"
			scanResult["error"] = err.Error()
		}
		scanResults = append(scanResults, scanResult)
	}

	utils.Logger.Info().
		Int("total_vulnerabilities_imported", importResult.ImportedVulnerabilities).
		Int("total_assets_created", importResult.CreatedAssets).
		Int("scans_succeeded", len(results)).
		Int("scans_failed", len(errors)).
		Msg("Multiple scans import completed")

	return c.JSON(fiber.Map{
		"message":      "Scans import completed",
		"data":         importResult,
		"scan_results": scanResults,
		"summary": fiber.Map{
			"scans_requested": len(req.ScanIDs),
			"scans_succeeded": len(results),
			"scans_failed":    len(errors),
		},
	})
}

// ImportAllScans imports all completed scans from Nessus
// POST /api/v1/vulnerabilities/integrations/nessus/:config_id/scans/import-all
func (h *NessusScanHandler) ImportAllScans(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	configID, err := uuid.Parse(c.Params("config_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid config ID",
		})
	}

	var req struct {
		Environment         string     `json:"environment"`
		AutoCreateAssets    bool       `json:"auto_create_assets"`
		UpdateExisting      bool       `json:"update_existing"`
		DefaultAssigneeID   *uuid.UUID `json:"default_assignee_id"`
		StatusFilter        string     `json:"status_filter"` // "completed", "running", "all"
	}

	if err := c.BodyParser(&req); err != nil {
		// Use defaults if no body provided
		req.Environment = "PRODUCTION"
		req.AutoCreateAssets = true
		req.UpdateExisting = false
		req.StatusFilter = "completed"
	}

	utils.Logger.Info().
		Str("config_id", configID.String()).
		Str("status_filter", req.StatusFilter).
		Msg("Importing all scans from Nessus")

	// Get all scans first
	scans, err := h.apiService.ListScans(configID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to list scans",
			"details": err.Error(),
		})
	}

	// Filter scans by status
	scanIDs := make([]int, 0)
	for _, scan := range scans {
		if req.StatusFilter == "all" || strings.ToLower(scan.Status) == strings.ToLower(req.StatusFilter) {
			scanIDs = append(scanIDs, scan.ID)
		}
	}

	if len(scanIDs) == 0 {
		return c.JSON(fiber.Map{
			"message": "No scans found matching the filter",
			"data": fiber.Map{
				"scans_found": 0,
			},
		})
	}

	// Import all filtered scans
	results, errors := h.apiService.ImportMultipleScans(configID, scanIDs)

	// Aggregate all vulnerabilities
	allVulns := []services.ParsedVulnerability{}
	for _, vulns := range results {
		allVulns = append(allVulns, vulns...)
	}

	// Save to database
	skipDuplicates := !req.UpdateExisting
	importResult, err := h.importService.ImportFromNessus(
		allVulns,
		userID,
		skipDuplicates,
	)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to save imported vulnerabilities")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to save vulnerabilities",
			"details": err.Error(),
		})
	}

	utils.Logger.Info().
		Int("total_vulnerabilities_imported", importResult.ImportedVulnerabilities).
		Int("total_assets_created", importResult.CreatedAssets).
		Int("scans_succeeded", len(results)).
		Int("scans_failed", len(errors)).
		Msg("All scans import completed")

	return c.JSON(fiber.Map{
		"message": "All scans imported successfully",
		"data":    importResult,
		"summary": fiber.Map{
			"total_scans_found": len(scans),
			"scans_imported":    len(scanIDs),
			"scans_succeeded":   len(results),
			"scans_failed":      len(errors),
		},
	})
}

// PreviewScan previews what will be imported from a scan without saving
// GET /api/v1/vulnerabilities/integrations/nessus/:config_id/scans/:scan_id/preview
func (h *NessusScanHandler) PreviewScan(c *fiber.Ctx) error {
	configID, err := uuid.Parse(c.Params("config_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid config ID",
		})
	}

	scanID, err := strconv.Atoi(c.Params("scan_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid scan ID",
		})
	}

	utils.Logger.Info().
		Str("config_id", configID.String()).
		Int("scan_id", scanID).
		Msg("Previewing scan")

	// Import and parse scan (without saving)
	vulnerabilities, err := h.apiService.ImportScan(configID, scanID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to preview scan")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to preview scan",
			"details": err.Error(),
		})
	}

	// Get summary using existing parser service
	parser := services.NewNessusParserService()
	summary := parser.GetImportSummary(vulnerabilities)

	// Add additional details
	summary["scan_id"] = scanID
	summary["vulnerabilities_preview"] = vulnerabilities[:min(10, len(vulnerabilities))] // First 10 for preview

	return c.JSON(fiber.Map{
		"message": "Scan preview generated successfully",
		"data":    summary,
	})
}

// Helper function
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
