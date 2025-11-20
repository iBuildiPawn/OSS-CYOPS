package services

import (
	"fmt"
	"time"

	"github.com/cyops/cyops-backend/internal/models"
	"gorm.io/gorm"
)

// ReportService handles report generation and data aggregation
type ReportService struct {
	db *gorm.DB
}

// NewReportService creates a new report service
func NewReportService(db *gorm.DB) *ReportService {
	return &ReportService{db: db}
}

// AnalystReportData contains detailed technical information for security analysts
type AnalystReportData struct {
	GeneratedAt             time.Time                    `json:"generated_at"`
	TotalVulnerabilities    int64                        `json:"total_vulnerabilities"`
	VulnerabilitiesBySeverity map[string]int64           `json:"vulnerabilities_by_severity"`
	VulnerabilitiesByStatus   map[string]int64           `json:"vulnerabilities_by_status"`
	OpenVulnerabilities     int64                        `json:"open_vulnerabilities"`
	ResolvedVulnerabilities int64                        `json:"resolved_vulnerabilities"`
	TotalAssets             int64                        `json:"total_assets"`
	AssetsByCriticality     map[string]int64             `json:"assets_by_criticality"`
	AssetsByEnvironment     map[string]int64             `json:"assets_by_environment"`
	TopCVEs                 []CVEStats                   `json:"top_cves"`
	RecentVulnerabilities   []VulnerabilitySummary       `json:"recent_vulnerabilities"`
	AssignedVulnerabilities []AssigneeStats              `json:"assigned_vulnerabilities"`
	FindingsOverview        FindingsOverview             `json:"findings_overview"`
	AssessmentsSummary      AssessmentsSummary           `json:"assessments_summary"`
	TrendData               TrendData                    `json:"trend_data"`
}

// ExecutiveReportData contains high-level metrics for executives
type ExecutiveReportData struct {
	GeneratedAt              time.Time            `json:"generated_at"`
	RiskScore                float64              `json:"risk_score"`
	CriticalVulnerabilities  int64                `json:"critical_vulnerabilities"`
	HighVulnerabilities      int64                `json:"high_vulnerabilities"`
	TotalAssets              int64                `json:"total_assets"`
	ComplianceScore          float64              `json:"compliance_score"`
	RemediationRate          float64              `json:"remediation_rate"`
	AverageTimeToRemediate   float64              `json:"average_time_to_remediate"`
	SecurityPosture          string               `json:"security_posture"`
	KeyRisks                 []string             `json:"key_risks"`
	RecommendedActions       []string             `json:"recommended_actions"`
	MonthlyTrend             []MonthlyMetrics     `json:"monthly_trend"`
	CostImpactEstimate       float64              `json:"cost_impact_estimate"`
}

// AuditReportData contains compliance and audit trail information
type AuditReportData struct {
	GeneratedAt              time.Time            `json:"generated_at"`
	ReportPeriodStart        time.Time            `json:"report_period_start"`
	ReportPeriodEnd          time.Time            `json:"report_period_end"`
	TotalVulnerabilities     int64                `json:"total_vulnerabilities"`
	VulnerabilitiesResolved  int64                `json:"vulnerabilities_resolved"`
	VulnerabilitiesOpen      int64                `json:"vulnerabilities_open"`
	CompletedAssessments     int64                `json:"completed_assessments"`
	ComplianceFrameworks     []ComplianceFramework `json:"compliance_frameworks"`
	AuditTrail               []AuditEntry         `json:"audit_trail"`
	PolicyViolations         int64                `json:"policy_violations"`
	RemediationCompliance    float64              `json:"remediation_compliance"`
	DocumentedFindings       int64                `json:"documented_findings"`
	VerifiedRemediations     int64                `json:"verified_remediations"`
	AssetsScanned            int64                `json:"assets_scanned"`
}

// Supporting types
type CVEStats struct {
	CVEID       string  `json:"cve_id"`
	Title       string  `json:"title"`
	Severity    string  `json:"severity"`
	CVSSScore   float64 `json:"cvss_score"`
	AffectedSystems int64   `json:"affected_systems"`
}

type VulnerabilitySummary struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Severity     string    `json:"severity"`
	Status       string    `json:"status"`
	DiscoveryDate time.Time `json:"discovery_date"`
	AssignedTo   string    `json:"assigned_to"`
}

type AssigneeStats struct {
	AssigneeName  string `json:"assignee_name"`
	Total         int64  `json:"total"`
	Open          int64  `json:"open"`
	InProgress    int64  `json:"in_progress"`
	Resolved      int64  `json:"resolved"`
}

type FindingsOverview struct {
	TotalFindings     int64 `json:"total_findings"`
	OpenFindings      int64 `json:"open_findings"`
	ResolvedFindings  int64 `json:"resolved_findings"`
	WithAttachments   int64 `json:"with_attachments"`
}

type AssessmentsSummary struct {
	TotalAssessments      int64 `json:"total_assessments"`
	CompletedAssessments  int64 `json:"completed_assessments"`
	InProgressAssessments int64 `json:"in_progress_assessments"`
	PlannedAssessments    int64 `json:"planned_assessments"`
}

type TrendData struct {
	Last30Days  MetricsPeriod `json:"last_30_days"`
	Last60Days  MetricsPeriod `json:"last_60_days"`
	Last90Days  MetricsPeriod `json:"last_90_days"`
}

type MetricsPeriod struct {
	NewVulnerabilities      int64 `json:"new_vulnerabilities"`
	ResolvedVulnerabilities int64 `json:"resolved_vulnerabilities"`
	NewFindings             int64 `json:"new_findings"`
}

type MonthlyMetrics struct {
	Month               string  `json:"month"`
	Vulnerabilities     int64   `json:"vulnerabilities"`
	Resolved            int64   `json:"resolved"`
	RiskScore           float64 `json:"risk_score"`
}

type ComplianceFramework struct {
	Name           string  `json:"name"`
	Coverage       float64 `json:"coverage"`
	Status         string  `json:"status"`
}

type AuditEntry struct {
	Timestamp   time.Time `json:"timestamp"`
	Action      string    `json:"action"`
	Resource    string    `json:"resource"`
	User        string    `json:"user"`
	Description string    `json:"description"`
}

// GenerateAnalystReport generates a detailed technical report for analysts
func (s *ReportService) GenerateAnalystReport(startDate, endDate time.Time) (*AnalystReportData, error) {
	report := &AnalystReportData{
		GeneratedAt:             time.Now(),
		VulnerabilitiesBySeverity: make(map[string]int64),
		VulnerabilitiesByStatus:   make(map[string]int64),
		AssetsByCriticality:       make(map[string]int64),
		AssetsByEnvironment:       make(map[string]int64),
	}

	// Total vulnerabilities
	if err := s.db.Model(&models.Vulnerability{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.TotalVulnerabilities).Error; err != nil {
		return nil, fmt.Errorf("failed to count vulnerabilities: %w", err)
	}

	// Vulnerabilities by severity
	var severityCounts []struct {
		Severity string
		Count    int64
	}
	if err := s.db.Model(&models.Vulnerability{}).
		Select("severity, COUNT(*) as count").
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Group("severity").
		Scan(&severityCounts).Error; err != nil {
		return nil, fmt.Errorf("failed to count by severity: %w", err)
	}
	for _, sc := range severityCounts {
		report.VulnerabilitiesBySeverity[sc.Severity] = sc.Count
	}

	// Vulnerabilities by status
	var statusCounts []struct {
		Status string
		Count  int64
	}
	if err := s.db.Model(&models.Vulnerability{}).
		Select("status, COUNT(*) as count").
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Group("status").
		Scan(&statusCounts).Error; err != nil {
		return nil, fmt.Errorf("failed to count by status: %w", err)
	}
	for _, sc := range statusCounts {
		report.VulnerabilitiesByStatus[sc.Status] = sc.Count
		if sc.Status == "OPEN" || sc.Status == "IN_PROGRESS" {
			report.OpenVulnerabilities += sc.Count
		} else if sc.Status == "RESOLVED" || sc.Status == "VERIFIED" || sc.Status == "CLOSED" {
			report.ResolvedVulnerabilities += sc.Count
		}
	}

	// Total assets
	if err := s.db.Model(&models.AffectedSystem{}).Count(&report.TotalAssets).Error; err != nil {
		return nil, fmt.Errorf("failed to count assets: %w", err)
	}

	// Assets by criticality
	var criticalityCounts []struct {
		Criticality string
		Count       int64
	}
	if err := s.db.Model(&models.AffectedSystem{}).
		Select("criticality, COUNT(*) as count").
		Group("criticality").
		Scan(&criticalityCounts).Error; err != nil {
		return nil, fmt.Errorf("failed to count by criticality: %w", err)
	}
	for _, cc := range criticalityCounts {
		report.AssetsByCriticality[cc.Criticality] = cc.Count
	}

	// Assets by environment
	var envCounts []struct {
		Environment string
		Count       int64
	}
	if err := s.db.Model(&models.AffectedSystem{}).
		Select("environment, COUNT(*) as count").
		Group("environment").
		Scan(&envCounts).Error; err != nil {
		return nil, fmt.Errorf("failed to count by environment: %w", err)
	}
	for _, ec := range envCounts {
		report.AssetsByEnvironment[ec.Environment] = ec.Count
	}

	// Top CVEs (with most affected systems)
	var topCVEs []struct {
		CVEID          string
		Title          string
		Severity       string
		CVSSScore      float64
		AffectedCount  int64
	}
	if err := s.db.Model(&models.Vulnerability{}).
		Select("cve_id, title, severity, cvss_score, COUNT(*) as affected_count").
		Where("cve_id != '' AND created_at BETWEEN ? AND ?", startDate, endDate).
		Group("cve_id, title, severity, cvss_score").
		Order("affected_count DESC").
		Limit(10).
		Scan(&topCVEs).Error; err != nil {
		return nil, fmt.Errorf("failed to get top CVEs: %w", err)
	}
	for _, cve := range topCVEs {
		report.TopCVEs = append(report.TopCVEs, CVEStats{
			CVEID:       cve.CVEID,
			Title:       cve.Title,
			Severity:    cve.Severity,
			CVSSScore:   cve.CVSSScore,
			AffectedSystems: cve.AffectedCount,
		})
	}

	// Recent vulnerabilities
	var recentVulns []models.Vulnerability
	if err := s.db.Model(&models.Vulnerability{}).
		Preload("AssignedTo").
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Order("created_at DESC").
		Limit(20).
		Find(&recentVulns).Error; err != nil {
		return nil, fmt.Errorf("failed to get recent vulnerabilities: %w", err)
	}
	for _, v := range recentVulns {
		assignedTo := "Unassigned"
		if v.AssignedTo != nil {
			assignedTo = v.AssignedTo.Name
		}
		report.RecentVulnerabilities = append(report.RecentVulnerabilities, VulnerabilitySummary{
			ID:            v.ID.String(),
			Title:         v.Title,
			Severity:      string(v.Severity),
			Status:        string(v.Status),
			DiscoveryDate: v.DiscoveryDate,
			AssignedTo:    assignedTo,
		})
	}

	// Assigned vulnerabilities stats
	var assigneeStats []struct {
		AssigneeName  string
		Total         int64
		Open          int64
		InProgress    int64
		Resolved      int64
	}
	if err := s.db.Model(&models.Vulnerability{}).
		Select(`
			COALESCE(users.name, 'Unassigned') as assignee_name,
			COUNT(*) as total,
			SUM(CASE WHEN vulnerabilities.status = 'OPEN' THEN 1 ELSE 0 END) as open,
			SUM(CASE WHEN vulnerabilities.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
			SUM(CASE WHEN vulnerabilities.status IN ('RESOLVED', 'VERIFIED', 'CLOSED') THEN 1 ELSE 0 END) as resolved
		`).
		Joins("LEFT JOIN users ON vulnerabilities.assigned_to_id = users.id").
		Where("vulnerabilities.created_at BETWEEN ? AND ?", startDate, endDate).
		Group("users.name").
		Scan(&assigneeStats).Error; err != nil {
		return nil, fmt.Errorf("failed to get assignee stats: %w", err)
	}
	for _, as := range assigneeStats {
		report.AssignedVulnerabilities = append(report.AssignedVulnerabilities, AssigneeStats{
			AssigneeName: as.AssigneeName,
			Total:        as.Total,
			Open:         as.Open,
			InProgress:   as.InProgress,
			Resolved:     as.Resolved,
		})
	}

	// Findings overview
	if err := s.db.Model(&models.VulnerabilityFinding{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.FindingsOverview.TotalFindings).Error; err != nil {
		return nil, fmt.Errorf("failed to count findings: %w", err)
	}
	if err := s.db.Model(&models.VulnerabilityFinding{}).
		Where("status = 'OPEN' AND created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.FindingsOverview.OpenFindings).Error; err != nil {
		return nil, fmt.Errorf("failed to count open findings: %w", err)
	}
	if err := s.db.Model(&models.VulnerabilityFinding{}).
		Where("status = 'RESOLVED' AND created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.FindingsOverview.ResolvedFindings).Error; err != nil {
		return nil, fmt.Errorf("failed to count resolved findings: %w", err)
	}

	// Assessments summary
	if err := s.db.Model(&models.Assessment{}).
		Count(&report.AssessmentsSummary.TotalAssessments).Error; err != nil {
		return nil, fmt.Errorf("failed to count assessments: %w", err)
	}
	if err := s.db.Model(&models.Assessment{}).
		Where("status = 'COMPLETED'").
		Count(&report.AssessmentsSummary.CompletedAssessments).Error; err != nil {
		return nil, fmt.Errorf("failed to count completed assessments: %w", err)
	}
	if err := s.db.Model(&models.Assessment{}).
		Where("status = 'IN_PROGRESS'").
		Count(&report.AssessmentsSummary.InProgressAssessments).Error; err != nil {
		return nil, fmt.Errorf("failed to count in progress assessments: %w", err)
	}
	if err := s.db.Model(&models.Assessment{}).
		Where("status = 'PLANNED'").
		Count(&report.AssessmentsSummary.PlannedAssessments).Error; err != nil {
		return nil, fmt.Errorf("failed to count planned assessments: %w", err)
	}

	// Trend data for different periods
	report.TrendData = s.calculateTrendData(time.Now())

	return report, nil
}

// GenerateExecutiveReport generates a high-level report for executives
func (s *ReportService) GenerateExecutiveReport(startDate, endDate time.Time) (*ExecutiveReportData, error) {
	report := &ExecutiveReportData{
		GeneratedAt: time.Now(),
	}

	// Critical and High vulnerabilities
	if err := s.db.Model(&models.Vulnerability{}).
		Where("severity = 'CRITICAL' AND created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.CriticalVulnerabilities).Error; err != nil {
		return nil, fmt.Errorf("failed to count critical vulnerabilities: %w", err)
	}
	if err := s.db.Model(&models.Vulnerability{}).
		Where("severity = 'HIGH' AND created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.HighVulnerabilities).Error; err != nil {
		return nil, fmt.Errorf("failed to count high vulnerabilities: %w", err)
	}

	// Total assets
	if err := s.db.Model(&models.AffectedSystem{}).Count(&report.TotalAssets).Error; err != nil {
		return nil, fmt.Errorf("failed to count assets: %w", err)
	}

	// Calculate risk score (0-100 based on vulnerability severity and count)
	var totalVulns int64
	var weightedScore float64

	severityWeights := map[string]float64{
		"CRITICAL": 10.0,
		"HIGH":     7.0,
		"MEDIUM":   4.0,
		"LOW":      1.0,
		"NONE":     0.0,
	}

	var severityCounts []struct {
		Severity string
		Count    int64
	}
	if err := s.db.Model(&models.Vulnerability{}).
		Select("severity, COUNT(*) as count").
		Where("status NOT IN ('RESOLVED', 'VERIFIED', 'CLOSED') AND created_at BETWEEN ? AND ?", startDate, endDate).
		Group("severity").
		Scan(&severityCounts).Error; err != nil {
		return nil, fmt.Errorf("failed to calculate risk score: %w", err)
	}

	for _, sc := range severityCounts {
		totalVulns += sc.Count
		weightedScore += float64(sc.Count) * severityWeights[sc.Severity]
	}

	if totalVulns > 0 {
		report.RiskScore = (weightedScore / float64(totalVulns)) * 10
		if report.RiskScore > 100 {
			report.RiskScore = 100
		}
	}

	// Calculate remediation rate
	var totalVulnerabilitiesInPeriod int64
	var resolvedVulnerabilitiesInPeriod int64

	if err := s.db.Model(&models.Vulnerability{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&totalVulnerabilitiesInPeriod).Error; err != nil {
		return nil, fmt.Errorf("failed to count total vulnerabilities: %w", err)
	}

	if err := s.db.Model(&models.Vulnerability{}).
		Where("status IN ('RESOLVED', 'VERIFIED', 'CLOSED') AND created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&resolvedVulnerabilitiesInPeriod).Error; err != nil {
		return nil, fmt.Errorf("failed to count resolved vulnerabilities: %w", err)
	}

	if totalVulnerabilitiesInPeriod > 0 {
		report.RemediationRate = (float64(resolvedVulnerabilitiesInPeriod) / float64(totalVulnerabilitiesInPeriod)) * 100
	}

	// Compliance score (based on assessments)
	var totalAssessments, completedAssessments int64
	if err := s.db.Model(&models.Assessment{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&totalAssessments).Error; err == nil {
		s.db.Model(&models.Assessment{}).
			Where("status = 'COMPLETED' AND created_at BETWEEN ? AND ?", startDate, endDate).
			Count(&completedAssessments)
		if totalAssessments > 0 {
			report.ComplianceScore = (float64(completedAssessments) / float64(totalAssessments)) * 100
		}
	}

	// Security posture
	if report.RiskScore < 30 {
		report.SecurityPosture = "Strong"
	} else if report.RiskScore < 60 {
		report.SecurityPosture = "Moderate"
	} else {
		report.SecurityPosture = "Needs Improvement"
	}

	// Key risks (top critical/high vulnerabilities)
	var topRisks []models.Vulnerability
	if err := s.db.Model(&models.Vulnerability{}).
		Where("severity IN ('CRITICAL', 'HIGH') AND status NOT IN ('RESOLVED', 'VERIFIED', 'CLOSED') AND created_at BETWEEN ? AND ?", startDate, endDate).
		Order("severity DESC, cvss_score DESC").
		Limit(5).
		Find(&topRisks).Error; err == nil {
		for _, v := range topRisks {
			report.KeyRisks = append(report.KeyRisks, fmt.Sprintf("%s (%s)", v.Title, v.Severity))
		}
	}

	// Recommended actions
	if report.CriticalVulnerabilities > 0 {
		report.RecommendedActions = append(report.RecommendedActions,
			fmt.Sprintf("Immediately address %d critical vulnerabilities", report.CriticalVulnerabilities))
	}
	if report.RemediationRate < 50 {
		report.RecommendedActions = append(report.RecommendedActions,
			"Improve remediation rate by allocating additional resources")
	}
	if report.ComplianceScore < 80 {
		report.RecommendedActions = append(report.RecommendedActions,
			"Complete pending security assessments to improve compliance")
	}

	// Monthly trend (last 6 months)
	report.MonthlyTrend = s.calculateMonthlyTrend(6)

	// Cost impact estimate (simple calculation based on vulnerability count and severity)
	avgCostPerCritical := 50000.0
	avgCostPerHigh := 25000.0
	report.CostImpactEstimate = (float64(report.CriticalVulnerabilities) * avgCostPerCritical) +
		(float64(report.HighVulnerabilities) * avgCostPerHigh)

	return report, nil
}

// GenerateAuditReport generates a compliance and audit trail report
func (s *ReportService) GenerateAuditReport(startDate, endDate time.Time) (*AuditReportData, error) {
	report := &AuditReportData{
		GeneratedAt:       time.Now(),
		ReportPeriodStart: startDate,
		ReportPeriodEnd:   endDate,
	}

	// Total vulnerabilities in period
	if err := s.db.Model(&models.Vulnerability{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.TotalVulnerabilities).Error; err != nil {
		return nil, fmt.Errorf("failed to count vulnerabilities: %w", err)
	}

	// Resolved vulnerabilities
	if err := s.db.Model(&models.Vulnerability{}).
		Where("status IN ('RESOLVED', 'VERIFIED', 'CLOSED') AND created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.VulnerabilitiesResolved).Error; err != nil {
		return nil, fmt.Errorf("failed to count resolved vulnerabilities: %w", err)
	}

	// Open vulnerabilities
	if err := s.db.Model(&models.Vulnerability{}).
		Where("status IN ('OPEN', 'IN_PROGRESS') AND created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.VulnerabilitiesOpen).Error; err != nil {
		return nil, fmt.Errorf("failed to count open vulnerabilities: %w", err)
	}

	// Completed assessments
	if err := s.db.Model(&models.Assessment{}).
		Where("status = 'COMPLETED' AND created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.CompletedAssessments).Error; err != nil {
		return nil, fmt.Errorf("failed to count completed assessments: %w", err)
	}

	// Documented findings
	if err := s.db.Model(&models.VulnerabilityFinding{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.DocumentedFindings).Error; err != nil {
		return nil, fmt.Errorf("failed to count findings: %w", err)
	}

	// Verified remediations (resolved findings)
	if err := s.db.Model(&models.VulnerabilityFinding{}).
		Where("status = 'RESOLVED' AND updated_at BETWEEN ? AND ?", startDate, endDate).
		Count(&report.VerifiedRemediations).Error; err != nil {
		return nil, fmt.Errorf("failed to count verified remediations: %w", err)
	}

	// Assets scanned (from findings)
	if err := s.db.Model(&models.AffectedSystem{}).
		Count(&report.AssetsScanned).Error; err != nil {
		return nil, fmt.Errorf("failed to count assets: %w", err)
	}

	// Remediation compliance
	if report.TotalVulnerabilities > 0 {
		report.RemediationCompliance = (float64(report.VulnerabilitiesResolved) / float64(report.TotalVulnerabilities)) * 100
	}

	// Compliance frameworks (mock data - in real scenario, this would come from assessment data)
	report.ComplianceFrameworks = []ComplianceFramework{
		{Name: "ISO 27001", Coverage: 85.5, Status: "In Progress"},
		{Name: "NIST 800-53", Coverage: 72.3, Status: "In Progress"},
		{Name: "PCI DSS", Coverage: 90.0, Status: "Compliant"},
		{Name: "SOC 2", Coverage: 88.7, Status: "Compliant"},
	}

	// Audit trail - get recent status changes from vulnerability history
	var auditEntries []struct {
		CreatedAt   time.Time
		FromStatus  string
		ToStatus    string
		ChangedBy   string
		VulnTitle   string
	}

	if err := s.db.Table("vulnerability_status_history").
		Select("vulnerability_status_history.created_at, vulnerability_status_history.from_status, vulnerability_status_history.to_status, users.name as changed_by, vulnerabilities.title as vuln_title").
		Joins("LEFT JOIN users ON vulnerability_status_history.changed_by_id = users.id").
		Joins("LEFT JOIN vulnerabilities ON vulnerability_status_history.vulnerability_id = vulnerabilities.id").
		Where("vulnerability_status_history.created_at BETWEEN ? AND ?", startDate, endDate).
		Order("vulnerability_status_history.created_at DESC").
		Limit(50).
		Scan(&auditEntries).Error; err == nil {
		for _, entry := range auditEntries {
			report.AuditTrail = append(report.AuditTrail, AuditEntry{
				Timestamp:   entry.CreatedAt,
				Action:      "Status Change",
				Resource:    "Vulnerability",
				User:        entry.ChangedBy,
				Description: fmt.Sprintf("%s: %s → %s", entry.VulnTitle, entry.FromStatus, entry.ToStatus),
			})
		}
	}

	return report, nil
}

// Helper functions

func (s *ReportService) calculateTrendData(baseTime time.Time) TrendData {
	trend := TrendData{}

	periods := []struct {
		name   string
		days   int
		target *MetricsPeriod
	}{
		{"30 days", 30, &trend.Last30Days},
		{"60 days", 60, &trend.Last60Days},
		{"90 days", 90, &trend.Last90Days},
	}

	for _, period := range periods {
		startDate := baseTime.AddDate(0, 0, -period.days)

		s.db.Model(&models.Vulnerability{}).
			Where("created_at BETWEEN ? AND ?", startDate, baseTime).
			Count(&period.target.NewVulnerabilities)

		s.db.Model(&models.Vulnerability{}).
			Where("status IN ('RESOLVED', 'VERIFIED', 'CLOSED') AND updated_at BETWEEN ? AND ?", startDate, baseTime).
			Count(&period.target.ResolvedVulnerabilities)

		s.db.Model(&models.VulnerabilityFinding{}).
			Where("created_at BETWEEN ? AND ?", startDate, baseTime).
			Count(&period.target.NewFindings)
	}

	return trend
}

func (s *ReportService) calculateMonthlyTrend(months int) []MonthlyMetrics {
	var trend []MonthlyMetrics

	for i := months - 1; i >= 0; i-- {
		startDate := time.Now().AddDate(0, -i-1, 0)
		endDate := time.Now().AddDate(0, -i, 0)

		monthName := startDate.Format("Jan 2006")

		var vulnCount, resolvedCount int64
		s.db.Model(&models.Vulnerability{}).
			Where("created_at BETWEEN ? AND ?", startDate, endDate).
			Count(&vulnCount)

		s.db.Model(&models.Vulnerability{}).
			Where("status IN ('RESOLVED', 'VERIFIED', 'CLOSED') AND updated_at BETWEEN ? AND ?", startDate, endDate).
			Count(&resolvedCount)

		// Simple risk score calculation
		riskScore := 50.0
		if vulnCount > 0 {
			var criticalCount int64
			s.db.Model(&models.Vulnerability{}).
				Where("severity = 'CRITICAL' AND created_at BETWEEN ? AND ?", startDate, endDate).
				Count(&criticalCount)
			riskScore = (float64(criticalCount) / float64(vulnCount)) * 100
		}

		trend = append(trend, MonthlyMetrics{
			Month:           monthName,
			Vulnerabilities: vulnCount,
			Resolved:        resolvedCount,
			RiskScore:       riskScore,
		})
	}

	return trend
}
