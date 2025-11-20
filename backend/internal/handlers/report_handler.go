package handlers

import (
	"encoding/csv"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// ReportHandler handles report generation endpoints
type ReportHandler struct {
	reportService *services.ReportService
}

// NewReportHandler creates a new report handler
func NewReportHandler(reportService *services.ReportService) *ReportHandler {
	return &ReportHandler{
		reportService: reportService,
	}
}

// ReportRequest represents the request parameters for generating reports
type ReportRequest struct {
	StartDate string `json:"start_date" validate:"required"`
	EndDate   string `json:"end_date" validate:"required"`
}

// GetAnalystReport generates and returns an analyst report
// @Summary Get analyst report
// @Description Generate a detailed technical report for security analysts
// @Tags Reports
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (YYYY-MM-DD)" default:"30 days ago"
// @Param end_date query string false "End date (YYYY-MM-DD)" default:"today"
// @Success 200 {object} services.AnalystReportData
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/reports/analyst [get]
// @Security BearerAuth
func (h *ReportHandler) GetAnalystReport(c *fiber.Ctx) error {
	// Parse date range from query params
	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Generate report
	report, err := h.reportService.GenerateAnalystReport(startDate, endDate)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to generate analyst report")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate report",
		})
	}

	return c.JSON(report)
}

// GetExecutiveReport generates and returns an executive report
// @Summary Get executive report
// @Description Generate a high-level report for executives with key metrics
// @Tags Reports
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (YYYY-MM-DD)" default:"30 days ago"
// @Param end_date query string false "End date (YYYY-MM-DD)" default:"today"
// @Success 200 {object} services.ExecutiveReportData
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/reports/executive [get]
// @Security BearerAuth
func (h *ReportHandler) GetExecutiveReport(c *fiber.Ctx) error {
	// Parse date range from query params
	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Generate report
	report, err := h.reportService.GenerateExecutiveReport(startDate, endDate)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to generate executive report")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate report",
		})
	}

	return c.JSON(report)
}

// GetAuditReport generates and returns an audit report
// @Summary Get audit report
// @Description Generate a compliance and audit trail report
// @Tags Reports
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (YYYY-MM-DD)" default:"30 days ago"
// @Param end_date query string false "End date (YYYY-MM-DD)" default:"today"
// @Success 200 {object} services.AuditReportData
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/reports/audit [get]
// @Security BearerAuth
func (h *ReportHandler) GetAuditReport(c *fiber.Ctx) error {
	// Parse date range from query params
	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Generate report
	report, err := h.reportService.GenerateAuditReport(startDate, endDate)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to generate audit report")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate report",
		})
	}

	return c.JSON(report)
}

// ExportAnalystReportCSV exports the analyst report as CSV
// @Summary Export analyst report as CSV
// @Description Export a detailed analyst report in CSV format
// @Tags Reports
// @Produce text/csv
// @Param start_date query string false "Start date (YYYY-MM-DD)" default:"30 days ago"
// @Param end_date query string false "End date (YYYY-MM-DD)" default:"today"
// @Success 200 {file} file
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/reports/analyst/export/csv [get]
// @Security BearerAuth
func (h *ReportHandler) ExportAnalystReportCSV(c *fiber.Ctx) error {
	// Parse date range from query params
	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Generate report
	report, err := h.reportService.GenerateAnalystReport(startDate, endDate)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to generate analyst report")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate report",
		})
	}

	// Set headers for CSV download
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=analyst-report-%s.csv", time.Now().Format("2006-01-02")))

	// Create CSV writer
	writer := csv.NewWriter(c)
	defer writer.Flush()

	// Write summary section
	writer.Write([]string{"ANALYST REPORT SUMMARY"})
	writer.Write([]string{"Generated At", report.GeneratedAt.Format(time.RFC3339)})
	writer.Write([]string{"Total Vulnerabilities", fmt.Sprintf("%d", report.TotalVulnerabilities)})
	writer.Write([]string{"Open Vulnerabilities", fmt.Sprintf("%d", report.OpenVulnerabilities)})
	writer.Write([]string{"Resolved Vulnerabilities", fmt.Sprintf("%d", report.ResolvedVulnerabilities)})
	writer.Write([]string{"Total Assets", fmt.Sprintf("%d", report.TotalAssets)})
	writer.Write([]string{})

	// Vulnerabilities by severity
	writer.Write([]string{"VULNERABILITIES BY SEVERITY"})
	writer.Write([]string{"Severity", "Count"})
	for severity, count := range report.VulnerabilitiesBySeverity {
		writer.Write([]string{severity, fmt.Sprintf("%d", count)})
	}
	writer.Write([]string{})

	// Vulnerabilities by status
	writer.Write([]string{"VULNERABILITIES BY STATUS"})
	writer.Write([]string{"Status", "Count"})
	for status, count := range report.VulnerabilitiesByStatus {
		writer.Write([]string{status, fmt.Sprintf("%d", count)})
	}
	writer.Write([]string{})

	// Recent vulnerabilities
	writer.Write([]string{"RECENT VULNERABILITIES"})
	writer.Write([]string{"ID", "Title", "Severity", "Status", "Discovery Date", "Assigned To"})
	for _, vuln := range report.RecentVulnerabilities {
		writer.Write([]string{
			vuln.ID,
			vuln.Title,
			vuln.Severity,
			vuln.Status,
			vuln.DiscoveryDate.Format("2006-01-02"),
			vuln.AssignedTo,
		})
	}
	writer.Write([]string{})

	// Assigned vulnerabilities
	writer.Write([]string{"ASSIGNED VULNERABILITIES"})
	writer.Write([]string{"Assignee", "Total", "Open", "In Progress", "Resolved"})
	for _, assignee := range report.AssignedVulnerabilities {
		writer.Write([]string{
			assignee.AssigneeName,
			fmt.Sprintf("%d", assignee.Total),
			fmt.Sprintf("%d", assignee.Open),
			fmt.Sprintf("%d", assignee.InProgress),
			fmt.Sprintf("%d", assignee.Resolved),
		})
	}

	return nil
}

// ExportExecutiveReportCSV exports the executive report as CSV
// @Summary Export executive report as CSV
// @Description Export a high-level executive report in CSV format
// @Tags Reports
// @Produce text/csv
// @Param start_date query string false "Start date (YYYY-MM-DD)" default:"30 days ago"
// @Param end_date query string false "End date (YYYY-MM-DD)" default:"today"
// @Success 200 {file} file
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/reports/executive/export/csv [get]
// @Security BearerAuth
func (h *ReportHandler) ExportExecutiveReportCSV(c *fiber.Ctx) error {
	// Parse date range from query params
	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Generate report
	report, err := h.reportService.GenerateExecutiveReport(startDate, endDate)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to generate executive report")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate report",
		})
	}

	// Set headers for CSV download
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=executive-report-%s.csv", time.Now().Format("2006-01-02")))

	// Create CSV writer
	writer := csv.NewWriter(c)
	defer writer.Flush()

	// Write executive summary
	writer.Write([]string{"EXECUTIVE REPORT SUMMARY"})
	writer.Write([]string{"Generated At", report.GeneratedAt.Format(time.RFC3339)})
	writer.Write([]string{"Risk Score", fmt.Sprintf("%.2f/100", report.RiskScore)})
	writer.Write([]string{"Security Posture", report.SecurityPosture})
	writer.Write([]string{"Critical Vulnerabilities", fmt.Sprintf("%d", report.CriticalVulnerabilities)})
	writer.Write([]string{"High Vulnerabilities", fmt.Sprintf("%d", report.HighVulnerabilities)})
	writer.Write([]string{"Total Assets", fmt.Sprintf("%d", report.TotalAssets)})
	writer.Write([]string{"Compliance Score", fmt.Sprintf("%.2f%%", report.ComplianceScore)})
	writer.Write([]string{"Remediation Rate", fmt.Sprintf("%.2f%%", report.RemediationRate)})
	writer.Write([]string{"Average Time To Remediate", fmt.Sprintf("%.2f days", report.AverageTimeToRemediate)})
	writer.Write([]string{"Cost Impact Estimate", fmt.Sprintf("$%.2f", report.CostImpactEstimate)})
	writer.Write([]string{})

	// Key risks
	writer.Write([]string{"KEY RISKS"})
	for _, risk := range report.KeyRisks {
		writer.Write([]string{risk})
	}
	writer.Write([]string{})

	// Recommended actions
	writer.Write([]string{"RECOMMENDED ACTIONS"})
	for _, action := range report.RecommendedActions {
		writer.Write([]string{action})
	}
	writer.Write([]string{})

	// Monthly trend
	writer.Write([]string{"MONTHLY TREND"})
	writer.Write([]string{"Month", "Vulnerabilities", "Resolved", "Risk Score"})
	for _, month := range report.MonthlyTrend {
		writer.Write([]string{
			month.Month,
			fmt.Sprintf("%d", month.Vulnerabilities),
			fmt.Sprintf("%d", month.Resolved),
			fmt.Sprintf("%.2f", month.RiskScore),
		})
	}

	return nil
}

// ExportAuditReportCSV exports the audit report as CSV
// @Summary Export audit report as CSV
// @Description Export a compliance and audit trail report in CSV format
// @Tags Reports
// @Produce text/csv
// @Param start_date query string false "Start date (YYYY-MM-DD)" default:"30 days ago"
// @Param end_date query string false "End date (YYYY-MM-DD)" default:"today"
// @Success 200 {file} file
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/reports/audit/export/csv [get]
// @Security BearerAuth
func (h *ReportHandler) ExportAuditReportCSV(c *fiber.Ctx) error {
	// Parse date range from query params
	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Generate report
	report, err := h.reportService.GenerateAuditReport(startDate, endDate)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to generate audit report")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate report",
		})
	}

	// Set headers for CSV download
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=audit-report-%s.csv", time.Now().Format("2006-01-02")))

	// Create CSV writer
	writer := csv.NewWriter(c)
	defer writer.Flush()

	// Write audit summary
	writer.Write([]string{"AUDIT REPORT SUMMARY"})
	writer.Write([]string{"Generated At", report.GeneratedAt.Format(time.RFC3339)})
	writer.Write([]string{"Report Period", fmt.Sprintf("%s to %s", report.ReportPeriodStart.Format("2006-01-02"), report.ReportPeriodEnd.Format("2006-01-02"))})
	writer.Write([]string{"Total Vulnerabilities", fmt.Sprintf("%d", report.TotalVulnerabilities)})
	writer.Write([]string{"Vulnerabilities Resolved", fmt.Sprintf("%d", report.VulnerabilitiesResolved)})
	writer.Write([]string{"Vulnerabilities Open", fmt.Sprintf("%d", report.VulnerabilitiesOpen)})
	writer.Write([]string{"Completed Assessments", fmt.Sprintf("%d", report.CompletedAssessments)})
	writer.Write([]string{"Documented Findings", fmt.Sprintf("%d", report.DocumentedFindings)})
	writer.Write([]string{"Verified Remediations", fmt.Sprintf("%d", report.VerifiedRemediations)})
	writer.Write([]string{"Assets Scanned", fmt.Sprintf("%d", report.AssetsScanned)})
	writer.Write([]string{"Remediation Compliance", fmt.Sprintf("%.2f%%", report.RemediationCompliance)})
	writer.Write([]string{})

	// Compliance frameworks
	writer.Write([]string{"COMPLIANCE FRAMEWORKS"})
	writer.Write([]string{"Framework", "Coverage %", "Status"})
	for _, framework := range report.ComplianceFrameworks {
		writer.Write([]string{
			framework.Name,
			fmt.Sprintf("%.2f%%", framework.Coverage),
			framework.Status,
		})
	}
	writer.Write([]string{})

	// Audit trail
	writer.Write([]string{"AUDIT TRAIL"})
	writer.Write([]string{"Timestamp", "Action", "Resource", "User", "Description"})
	for _, entry := range report.AuditTrail {
		writer.Write([]string{
			entry.Timestamp.Format(time.RFC3339),
			entry.Action,
			entry.Resource,
			entry.User,
			entry.Description,
		})
	}

	return nil
}

// Helper function to parse date range from query parameters
func (h *ReportHandler) parseDateRange(c *fiber.Ctx) (time.Time, time.Time, error) {
	// Get query parameters
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	// Default to last 30 days if not provided
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -30)

	// Parse start date if provided
	if startDateStr != "" {
		parsed, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid start_date format, use YYYY-MM-DD")
		}
		startDate = parsed
	}

	// Parse end date if provided
	if endDateStr != "" {
		parsed, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid end_date format, use YYYY-MM-DD")
		}
		endDate = parsed
	}

	// Validate date range
	if startDate.After(endDate) {
		return time.Time{}, time.Time{}, fmt.Errorf("start_date must be before end_date")
	}

	return startDate, endDate, nil
}
