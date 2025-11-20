package services

import (
	"encoding/xml"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/cyops/cyops-backend/internal/models"
)

// NessusClientData represents the root of a Nessus XML file
type NessusClientData struct {
	XMLName xml.Name      `xml:"NessusClientData_v2"`
	Report  NessusReport  `xml:"Report"`
}

// NessusReport represents a scan report
type NessusReport struct {
	Name        string              `xml:"name,attr"`
	ReportHosts []NessusReportHost  `xml:"ReportHost"`
}

// NessusReportHost represents a scanned host
type NessusReportHost struct {
	Name        string              `xml:"name,attr"`
	ReportItems []NessusReportItem  `xml:"ReportItem"`
	HostProperties NessusHostProperties `xml:"HostProperties"`
}

// NessusHostProperties contains host metadata
type NessusHostProperties struct {
	Tags []NessusTag `xml:"tag"`
}

// NessusTag represents a host property tag
type NessusTag struct {
	Name  string `xml:"name,attr"`
	Value string `xml:",chardata"`
}

// Common host property tag names for scan timestamps
const (
	HostStartTag          = "HOST_START"
	HostStartTimestampTag = "HOST_START_TIMESTAMP"
	HostEndTag            = "HOST_END"
	HostEndTimestampTag   = "HOST_END_TIMESTAMP"
)

// NessusReportItem represents a vulnerability finding
type NessusReportItem struct {
	Port           string `xml:"port,attr"`
	SvcName        string `xml:"svc_name,attr"`
	Protocol       string `xml:"protocol,attr"`
	Severity       int    `xml:"severity,attr"`
	PluginID       string `xml:"pluginID,attr"`
	PluginName     string `xml:"pluginName,attr"`
	PluginFamily   string `xml:"pluginFamily,attr"`
	Description    string `xml:"description"`
	Synopsis       string `xml:"synopsis"`
	Solution       string `xml:"solution"`
	SeeAlso        string `xml:"see_also"`
	CVSSBaseScore  string `xml:"cvss_base_score"`
	CVSSVector     string `xml:"cvss_vector"`
	CVSS3BaseScore string `xml:"cvss3_base_score"`
	CVSS3Vector    string `xml:"cvss3_vector"`
	CVE            string `xml:"cve"`
	RiskFactor     string `xml:"risk_factor"`
	ExploitAvailable string `xml:"exploit_available"`
	PatchPublicationDate string `xml:"patch_publication_date"`
	VulnPublicationDate  string `xml:"vuln_publication_date"`
}

// ParsedVulnerability represents a parsed vulnerability with its affected systems
type ParsedVulnerability struct {
	Title                     string
	Description               string
	Severity                  models.VulnerabilitySeverity
	CVSSScore                 *float64
	CVSSVector                string
	CVEID                     string
	ImpactAssessment          string
	MitigationRecommendations string
	PluginID                  string
	RiskFactor                string
	ScanDate                  time.Time
	AffectedHosts             []ParsedHost
}

// ParsedHost represents a parsed affected system
type ParsedHost struct {
	Hostname      string
	IPAddress     string
	Port          string
	Protocol      string
	ServiceName   string
	OS            string
	ScanTimestamp time.Time
}

// NessusParserService handles parsing of Nessus files
type NessusParserService struct{}

// NewNessusParserService creates a new Nessus parser service
func NewNessusParserService() *NessusParserService {
	return &NessusParserService{}
}

// ParseNessusFile parses a Nessus XML file and returns parsed vulnerabilities
func (s *NessusParserService) ParseNessusFile(data []byte) ([]ParsedVulnerability, error) {
	var nessusData NessusClientData
	if err := xml.Unmarshal(data, &nessusData); err != nil {
		return nil, fmt.Errorf("failed to parse XML: %w", err)
	}

	// Group vulnerabilities by plugin ID across all hosts
	vulnMap := make(map[string]*ParsedVulnerability)

	for _, host := range nessusData.Report.ReportHosts {
		// Extract host information
		hostname := host.Name
		ipAddress := hostname
		osName := ""
		var scanTimestamp time.Time

		// Try to get more detailed host info from properties
		for _, tag := range host.HostProperties.Tags {
			if tag.Name == "host-ip" {
				ipAddress = tag.Value
			} else if tag.Name == "host-fqdn" {
				hostname = tag.Value
			} else if tag.Name == "operating-system" {
				osName = tag.Value
			} else if tag.Name == HostStartTimestampTag {
				// Extract scan start time from Unix timestamp (preferred)
				scanTimestamp = s.parseNessusTimestamp(tag.Value)
			} else if tag.Name == HostStartTag && scanTimestamp.IsZero() {
				// Fallback to human-readable format if timestamp not available
				scanTimestamp = s.parseNessusDateString(tag.Value)
			}
		}

		// If no scan timestamp found, use current time as fallback
		if scanTimestamp.IsZero() {
			scanTimestamp = time.Now()
		}

		// Process each vulnerability finding
		for _, item := range host.ReportItems {
			// Skip informational findings if severity is 0
			if item.Severity == 0 {
				continue
			}

			pluginID := item.PluginID

			// Get or create vulnerability entry
			vuln, exists := vulnMap[pluginID]
			if !exists {
				vuln = &ParsedVulnerability{
					Title:                     item.PluginName,
					Description:               s.buildDescription(item),
					Severity:                  s.mapSeverity(item.Severity, item.RiskFactor),
					CVSSScore:                 s.parseCVSSScore(item),
					CVSSVector:                s.getCVSSVector(item),
					CVEID:                     s.extractCVE(item.CVE),
					ImpactAssessment:          item.Synopsis,
					MitigationRecommendations: item.Solution,
					PluginID:                  pluginID,
					RiskFactor:                item.RiskFactor,
					ScanDate:                  scanTimestamp,
					AffectedHosts:             []ParsedHost{},
				}
				vulnMap[pluginID] = vuln
			}

			// Add affected host
			parsedHost := ParsedHost{
				Hostname:      hostname,
				IPAddress:     ipAddress,
				Port:          item.Port,
				Protocol:      item.Protocol,
				ServiceName:   item.SvcName,
				OS:            osName,
				ScanTimestamp: scanTimestamp,
			}
			vuln.AffectedHosts = append(vuln.AffectedHosts, parsedHost)
		}
	}

	// Convert map to slice
	vulnerabilities := make([]ParsedVulnerability, 0, len(vulnMap))
	for _, vuln := range vulnMap {
		vulnerabilities = append(vulnerabilities, *vuln)
	}

	return vulnerabilities, nil
}

// buildDescription combines description and synopsis
func (s *NessusParserService) buildDescription(item NessusReportItem) string {
	desc := item.Description
	if desc == "" {
		desc = item.Synopsis
	}
	return strings.TrimSpace(desc)
}

// mapSeverity converts Nessus severity (0-4) to our severity enum
func (s *NessusParserService) mapSeverity(severity int, riskFactor string) models.VulnerabilitySeverity {
	// Nessus severity: 0=Info, 1=Low, 2=Medium, 3=High, 4=Critical
	switch severity {
	case 0:
		return models.SeverityNone
	case 1:
		return models.SeverityLow
	case 2:
		return models.SeverityMedium
	case 3:
		return models.SeverityHigh
	case 4:
		return models.SeverityCritical
	default:
		// Fallback to risk factor
		switch strings.ToLower(riskFactor) {
		case "critical":
			return models.SeverityCritical
		case "high":
			return models.SeverityHigh
		case "medium":
			return models.SeverityMedium
		case "low":
			return models.SeverityLow
		default:
			return models.SeverityNone
		}
	}
}

// parseCVSSScore extracts CVSS score (preferring CVSS v3)
func (s *NessusParserService) parseCVSSScore(item NessusReportItem) *float64 {
	scoreStr := item.CVSS3BaseScore
	if scoreStr == "" {
		scoreStr = item.CVSSBaseScore
	}

	if scoreStr == "" {
		return nil
	}

	score, err := strconv.ParseFloat(scoreStr, 64)
	if err != nil {
		return nil
	}

	return &score
}

// getCVSSVector gets CVSS vector (preferring CVSS v3)
func (s *NessusParserService) getCVSSVector(item NessusReportItem) string {
	if item.CVSS3Vector != "" {
		return item.CVSS3Vector
	}
	return item.CVSSVector
}

// extractCVE extracts CVE ID from string (may contain multiple CVEs)
func (s *NessusParserService) extractCVE(cveStr string) string {
	if cveStr == "" {
		return ""
	}

	// Split by comma and take the first CVE
	cves := strings.Split(cveStr, ",")
	if len(cves) > 0 {
		return strings.TrimSpace(cves[0])
	}

	return cveStr
}

// GetImportSummary returns a summary of what will be imported
func (s *NessusParserService) GetImportSummary(vulnerabilities []ParsedVulnerability) map[string]interface{} {
	totalVulns := len(vulnerabilities)
	totalHosts := 0
	severityCounts := make(map[string]int)
	uniqueHosts := make(map[string]bool)

	for _, vuln := range vulnerabilities {
		totalHosts += len(vuln.AffectedHosts)
		severityCounts[string(vuln.Severity)]++

		for _, host := range vuln.AffectedHosts {
			uniqueHosts[host.IPAddress] = true
		}
	}

	return map[string]interface{}{
		"total_vulnerabilities": totalVulns,
		"total_affected_hosts":  totalHosts,
		"unique_hosts":          len(uniqueHosts),
		"severity_breakdown":    severityCounts,
	}
}

// parseNessusTimestamp parses Nessus Unix timestamp format
// Used for HOST_START_TIMESTAMP and HOST_END_TIMESTAMP tags
func (s *NessusParserService) parseNessusTimestamp(timestampStr string) time.Time {
	// Parse as Unix timestamp (integer seconds since epoch)
	if timestamp, err := strconv.ParseInt(timestampStr, 10, 64); err == nil {
		return time.Unix(timestamp, 0)
	}

	// Return zero time if parsing fails (caller will handle fallback)
	return time.Time{}
}

// parseNessusDateString parses Nessus human-readable date format
// Used for HOST_START and HOST_END tags (e.g., "Tue Oct  7 13:57:37 2025")
func (s *NessusParserService) parseNessusDateString(dateStr string) time.Time {
	// Nessus date format: "Mon Jan 2 15:04:05 2006"
	layouts := []string{
		"Mon Jan _2 15:04:05 2006",
		"Mon Jan 2 15:04:05 2006",
		time.ANSIC,
		time.UnixDate,
	}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, dateStr); err == nil {
			return t
		}
	}

	// Return zero time if all parsing attempts fail
	return time.Time{}
}
