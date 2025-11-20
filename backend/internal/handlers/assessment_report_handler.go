package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/utils"
)

type AssessmentReportHandler struct {
	service *services.AssessmentReportService
}

func NewAssessmentReportHandler(service *services.AssessmentReportService) *AssessmentReportHandler {
	return &AssessmentReportHandler{
		service: service,
	}
}

// UploadReport handles PDF upload for an assessment
// POST /api/v1/assessments/:id/reports
func (h *AssessmentReportHandler) UploadReport(c *fiber.Ctx) error {
	// Parse assessment ID
	assessmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid assessment ID",
		})
	}

	// Get file from request
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No file uploaded",
		})
	}

	// Get title and description from form
	title := c.FormValue("title")
	if title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title is required",
		})
	}
	description := c.FormValue("description")

	// Get current user from context
	user := c.Locals("user").(*models.User)

	// Upload report
	report, err := h.service.UploadReport(assessmentID, file, title, description, user.ID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to upload report")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Report uploaded successfully",
		"data":    report,
	})
}

// GetAssessmentReports retrieves all reports for an assessment
// GET /api/v1/assessments/:id/reports?include_all_versions=false
func (h *AssessmentReportHandler) GetAssessmentReports(c *fiber.Ctx) error {
	// Parse assessment ID
	assessmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid assessment ID",
		})
	}

	// Parse query parameter for including all versions
	includeAllVersions := c.Query("include_all_versions", "false") == "true"

	// Get reports
	reports, err := h.service.GetAssessmentReports(assessmentID, includeAllVersions)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to retrieve reports")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve reports",
		})
	}

	return c.JSON(fiber.Map{
		"data": reports,
		"meta": fiber.Map{
			"count":                len(reports),
			"include_all_versions": includeAllVersions,
		},
	})
}

// GetReport retrieves a single report's metadata
// GET /api/v1/assessments/:id/reports/:reportId
func (h *AssessmentReportHandler) GetReport(c *fiber.Ctx) error {
	// Parse report ID
	reportID, err := uuid.Parse(c.Params("reportId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid report ID",
		})
	}

	// Get report
	report, err := h.service.GetReport(reportID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Report not found",
		})
	}

	// Verify report belongs to the specified assessment
	assessmentID, _ := uuid.Parse(c.Params("id"))
	if report.AssessmentID != assessmentID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Report not found",
		})
	}

	return c.JSON(fiber.Map{
		"data": report,
	})
}

// GetReportFile serves the PDF file for viewing/download
// GET /api/v1/assessments/:id/reports/:reportId/file
func (h *AssessmentReportHandler) GetReportFile(c *fiber.Ctx) error {
	// Parse report ID
	reportID, err := uuid.Parse(c.Params("reportId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid report ID",
		})
	}

	// Get report metadata
	report, err := h.service.GetReport(reportID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Report not found",
		})
	}

	// Verify report belongs to the specified assessment
	assessmentID, _ := uuid.Parse(c.Params("id"))
	if report.AssessmentID != assessmentID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Report not found",
		})
	}

	// Get file data
	fileData, err := h.service.GetReportFile(report)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to read report file")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read report file",
		})
	}

	// Set headers for PDF viewing
	c.Set("Content-Type", report.MimeType)
	c.Set("Content-Disposition", "inline; filename=\""+report.OriginalName+"\"")
	c.Set("Content-Length", string(rune(report.FileSize)))

	return c.Send(fileData)
}

// GetReportVersions retrieves version history for a report title
// GET /api/v1/assessments/:id/reports/:reportId/versions
func (h *AssessmentReportHandler) GetReportVersions(c *fiber.Ctx) error {
	// Parse assessment ID
	assessmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid assessment ID",
		})
	}

	// Parse report ID to get the title
	reportID, err := uuid.Parse(c.Params("reportId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid report ID",
		})
	}

	// Get the report to extract its title
	report, err := h.service.GetReport(reportID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Report not found",
		})
	}

	// Get all versions
	versions, err := h.service.GetReportVersions(assessmentID, report.Title)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to retrieve report versions")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve report versions",
		})
	}

	return c.JSON(fiber.Map{
		"data": versions,
		"meta": fiber.Map{
			"title": report.Title,
			"count": len(versions),
		},
	})
}

// DeleteReport soft deletes a report
// DELETE /api/v1/assessments/:id/reports/:reportId
func (h *AssessmentReportHandler) DeleteReport(c *fiber.Ctx) error {
	// Parse report ID
	reportID, err := uuid.Parse(c.Params("reportId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid report ID",
		})
	}

	// Get report to verify it belongs to the assessment
	report, err := h.service.GetReport(reportID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Report not found",
		})
	}

	// Verify report belongs to the specified assessment
	assessmentID, _ := uuid.Parse(c.Params("id"))
	if report.AssessmentID != assessmentID {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Report not found",
		})
	}

	// Delete report
	if err := h.service.DeleteReport(reportID); err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to delete report")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete report",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Report deleted successfully",
	})
}

// GetReportStats retrieves statistics about reports
// GET /api/v1/assessments/:id/reports/stats
func (h *AssessmentReportHandler) GetReportStats(c *fiber.Ctx) error {
	// Parse assessment ID
	assessmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid assessment ID",
		})
	}

	// Get stats
	stats, err := h.service.GetReportStats(&assessmentID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to retrieve report stats")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve report stats",
		})
	}

	return c.JSON(fiber.Map{
		"data": stats,
	})
}
