package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/middleware"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/database"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// AssessmentHandler handles assessment-related requests
type AssessmentHandler struct {
	assessmentService *services.AssessmentService
}

// NewAssessmentHandler creates a new assessment handler
func NewAssessmentHandler() *AssessmentHandler {
	return &AssessmentHandler{
		assessmentService: services.NewAssessmentService(database.GetDB()),
	}
}

// CreateAssessmentRequest represents a create assessment request
type CreateAssessmentRequest struct {
	Name                 string   `json:"name"`
	Description          string   `json:"description"`
	AssessmentType       string   `json:"assessment_type"`
	AssessorName         string   `json:"assessor_name"`
	AssessorOrganization string   `json:"assessor_organization"`
	StartDate            string   `json:"start_date"` // ISO date format
	EndDate              string   `json:"end_date"`   // ISO date format (optional)
	VulnerabilityIDs     []string `json:"vulnerability_ids"`
	AssetIDs             []string `json:"asset_ids"`
}

// UpdateAssessmentRequest represents an update assessment request
type UpdateAssessmentRequest struct {
	Name                 *string `json:"name,omitempty"`
	Description          *string `json:"description,omitempty"`
	Status               *string `json:"status,omitempty"`
	AssessorName         *string `json:"assessor_name,omitempty"`
	AssessorOrganization *string `json:"assessor_organization,omitempty"`
	StartDate            *string `json:"start_date,omitempty"`
	EndDate              *string `json:"end_date,omitempty"`
	ReportURL            *string `json:"report_url,omitempty"`
	ExecutiveSummary     *string `json:"executive_summary,omitempty"`
	FindingsSummary      *string `json:"findings_summary,omitempty"`
	Recommendations      *string `json:"recommendations,omitempty"`
	Score                *int    `json:"score,omitempty"`
}

// LinkRequest represents a request to link vulnerabilities or assets
type LinkRequest struct {
	VulnerabilityID string `json:"vulnerability_id,omitempty"`
	AssetID         string `json:"asset_id,omitempty"`
	Notes           string `json:"notes,omitempty"`
}

// CreateAssessment creates a new assessment
func (h *AssessmentHandler) CreateAssessment(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	var req CreateAssessmentRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	// Validate required fields
	if req.Name == "" {
		return middleware.ValidationError(c, "Name is required", nil)
	}
	if req.AssessmentType == "" {
		return middleware.ValidationError(c, "Assessment type is required", nil)
	}
	if req.AssessorName == "" {
		return middleware.ValidationError(c, "Assessor name is required", nil)
	}
	if req.StartDate == "" {
		return middleware.ValidationError(c, "Start date is required", nil)
	}

	// Parse start date
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return middleware.ValidationError(c, "Invalid start date format (use YYYY-MM-DD)", nil)
	}

	// Parse end date if provided
	var endDate *time.Time
	if req.EndDate != "" {
		parsed, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return middleware.ValidationError(c, "Invalid end date format (use YYYY-MM-DD)", nil)
		}
		endDate = &parsed
	}

	// Parse vulnerability IDs
	var vulnerabilityIDs []uuid.UUID
	for _, idStr := range req.VulnerabilityIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			return middleware.ValidationError(c, "Invalid vulnerability ID format", nil)
		}
		vulnerabilityIDs = append(vulnerabilityIDs, id)
	}

	// Parse asset IDs
	var assetIDs []uuid.UUID
	for _, idStr := range req.AssetIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			return middleware.ValidationError(c, "Invalid asset ID format", nil)
		}
		assetIDs = append(assetIDs, id)
	}

	// Create service request
	serviceReq := services.CreateAssessmentRequest{
		Name:                 req.Name,
		Description:          req.Description,
		AssessmentType:       models.AssessmentType(req.AssessmentType),
		AssessorName:         req.AssessorName,
		AssessorOrganization: req.AssessorOrganization,
		StartDate:            startDate,
		EndDate:              endDate,
		VulnerabilityIDs:     vulnerabilityIDs,
		AssetIDs:             assetIDs,
	}

	// Create assessment
	assessment, err := h.assessmentService.CreateAssessment(serviceReq, userID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to create assessment")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create assessment",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": assessment,
	})
}

// GetAssessment retrieves a single assessment by ID
func (h *AssessmentHandler) GetAssessment(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid assessment ID", nil)
	}

	assessment, err := h.assessmentService.GetAssessment(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Assessment not found",
		})
	}

	return c.JSON(fiber.Map{
		"data": assessment,
	})
}

// ListAssessments retrieves a list of assessments with pagination
func (h *AssessmentHandler) ListAssessments(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	statusStr := c.Query("status")
	typeStr := c.Query("type")

	var status *models.AssessmentStatus
	if statusStr != "" {
		s := models.AssessmentStatus(statusStr)
		status = &s
	}

	var assessmentType *models.AssessmentType
	if typeStr != "" {
		t := models.AssessmentType(typeStr)
		assessmentType = &t
	}

	assessments, total, err := h.assessmentService.ListAssessments(page, limit, status, assessmentType)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to list assessments")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list assessments",
		})
	}

	totalPages := (int(total) + limit - 1) / limit

	return c.JSON(fiber.Map{
		"data":        assessments,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
	})
}

// UpdateAssessment updates an existing assessment
func (h *AssessmentHandler) UpdateAssessment(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid assessment ID", nil)
	}

	var req UpdateAssessmentRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	// Convert string dates to time.Time
	serviceReq := services.UpdateAssessmentRequest{
		Name:                 req.Name,
		Description:          req.Description,
		AssessorName:         req.AssessorName,
		AssessorOrganization: req.AssessorOrganization,
		ReportURL:            req.ReportURL,
		ExecutiveSummary:     req.ExecutiveSummary,
		FindingsSummary:      req.FindingsSummary,
		Recommendations:      req.Recommendations,
		Score:                req.Score,
	}

	if req.Status != nil {
		s := models.AssessmentStatus(*req.Status)
		serviceReq.Status = &s
	}

	if req.StartDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.StartDate)
		if err != nil {
			return middleware.ValidationError(c, "Invalid start date format", nil)
		}
		serviceReq.StartDate = &parsed
	}

	if req.EndDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			return middleware.ValidationError(c, "Invalid end date format", nil)
		}
		serviceReq.EndDate = &parsed
	}

	assessment, err := h.assessmentService.UpdateAssessment(id, serviceReq)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to update assessment")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update assessment",
		})
	}

	return c.JSON(fiber.Map{
		"data": assessment,
	})
}

// DeleteAssessment deletes an assessment
func (h *AssessmentHandler) DeleteAssessment(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid assessment ID", nil)
	}

	if err := h.assessmentService.DeleteAssessment(id); err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to delete assessment")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete assessment",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Assessment deleted successfully",
	})
}

// LinkVulnerability links a vulnerability to an assessment
func (h *AssessmentHandler) LinkVulnerability(c *fiber.Ctx) error {
	assessmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid assessment ID", nil)
	}

	var req LinkRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	vulnerabilityID, err := uuid.Parse(req.VulnerabilityID)
	if err != nil {
		return middleware.ValidationError(c, "Invalid vulnerability ID", nil)
	}

	if err := h.assessmentService.LinkVulnerability(assessmentID, vulnerabilityID, req.Notes); err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to link vulnerability")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to link vulnerability",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Vulnerability linked successfully",
	})
}

// UnlinkVulnerability removes a vulnerability from an assessment
func (h *AssessmentHandler) UnlinkVulnerability(c *fiber.Ctx) error {
	assessmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid assessment ID", nil)
	}

	vulnerabilityID, err := uuid.Parse(c.Params("vulnerability_id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid vulnerability ID", nil)
	}

	if err := h.assessmentService.UnlinkVulnerability(assessmentID, vulnerabilityID); err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to unlink vulnerability")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to unlink vulnerability",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Vulnerability unlinked successfully",
	})
}

// LinkAsset links an asset to an assessment
func (h *AssessmentHandler) LinkAsset(c *fiber.Ctx) error {
	assessmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid assessment ID", nil)
	}

	var req LinkRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	assetID, err := uuid.Parse(req.AssetID)
	if err != nil {
		return middleware.ValidationError(c, "Invalid asset ID", nil)
	}

	if err := h.assessmentService.LinkAsset(assessmentID, assetID, req.Notes); err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to link asset")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to link asset",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Asset linked successfully",
	})
}

// UnlinkAsset removes an asset from an assessment
func (h *AssessmentHandler) UnlinkAsset(c *fiber.Ctx) error {
	assessmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid assessment ID", nil)
	}

	assetID, err := uuid.Parse(c.Params("asset_id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid asset ID", nil)
	}

	if err := h.assessmentService.UnlinkAsset(assessmentID, assetID); err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to unlink asset")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to unlink asset",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Asset unlinked successfully",
	})
}

// GetAssessmentStats returns statistics about assessments
func (h *AssessmentHandler) GetAssessmentStats(c *fiber.Ctx) error {
	stats, err := h.assessmentService.GetAssessmentStats()
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to get assessment stats")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get statistics",
		})
	}

	return c.JSON(fiber.Map{
		"data": stats,
	})
}
