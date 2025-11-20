package services

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// NessusAPIService handles interactions with Nessus API
type NessusAPIService struct {
	configService *IntegrationConfigService
	parser        *NessusParserService
}

// NewNessusAPIService creates a new Nessus API service
func NewNessusAPIService(configService *IntegrationConfigService) *NessusAPIService {
	return &NessusAPIService{
		configService: configService,
		parser:        NewNessusParserService(),
	}
}

// createHTTPClient creates an HTTP client that skips TLS verification
// This is common for Nessus installations with self-signed certificates
func (s *NessusAPIService) createHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}
}

// NessusScan represents a scan in Nessus
type NessusScan struct {
	ID               int    `json:"id"`
	UUID             string `json:"uuid"`
	Name             string `json:"name"`
	Status           string `json:"status"`
	CreationDate     int64  `json:"creation_date"`
	LastModification int64  `json:"last_modification_date"`
	FolderID         int    `json:"folder_id"`
	ReadOnly         bool   `json:"read"`
	Shared           bool   `json:"shared"`
	UserPermissions  int    `json:"user_permissions"`
	Owner            string `json:"owner"`
}

// NessusScanList represents the response from listing scans
type NessusScanList struct {
	Scans []NessusScan `json:"scans"`
}

// NessusScanDetail represents detailed information about a scan
type NessusScanDetail struct {
	Info NessusScanInfo `json:"info"`
	Hosts []NessusScanHost `json:"hosts"`
	Vulnerabilities []NessusScanVulnerability `json:"vulnerabilities"`
}

// NessusScanInfo contains scan metadata
type NessusScanInfo struct {
	UUID             string `json:"uuid"`
	Name             string `json:"name"`
	Status           string `json:"status"`
	ScanStart        int64  `json:"scan_start"`
	ScanEnd          int64  `json:"scan_end"`
	Targets          string `json:"targets"`
	HostCount        int    `json:"hostcount"`
	VulnCount        int    `json:"vulnerabilitycount"`
}

// NessusScanHost represents a host in a scan
type NessusScanHost struct {
	HostID       int    `json:"host_id"`
	HostIndex    int    `json:"host_index"`
	Hostname     string `json:"hostname"`
	Progress     int    `json:"progress"`
	Critical     int    `json:"critical"`
	High         int    `json:"high"`
	Medium       int    `json:"medium"`
	Low          int    `json:"low"`
	Info         int    `json:"info"`
	TotalChecks  int    `json:"totalchecksconsidered"`
	NumChecks    int    `json:"numchecksconsidered"`
	ScanProgress int    `json:"scanprogresscurrent"`
	Score        int    `json:"score"`
}

// NessusScanVulnerability represents vulnerability summary
type NessusScanVulnerability struct {
	PluginID     int    `json:"plugin_id"`
	PluginName   string `json:"plugin_name"`
	PluginFamily string `json:"plugin_family"`
	Count        int    `json:"count"`
	VulnIndex    int    `json:"vuln_index"`
	SeverityIndex int   `json:"severity_index"`
}

// NessusExportStatus represents scan export status
type NessusExportStatus struct {
	Status string `json:"status"`
}

// TestConnection tests the connection to Nessus API
func (s *NessusAPIService) TestConnection(configID uuid.UUID) error {
	config, err := s.configService.GetConfig(configID)
	if err != nil {
		return fmt.Errorf("failed to get config: %w", err)
	}

	// Try to list scans - if successful, connection is good
	client := s.createHTTPClient(10 * time.Second)
	req, err := http.NewRequest("GET", config.BaseURL+"/scans", nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set authentication headers
	req.Header.Set("X-ApiKeys", fmt.Sprintf("accessKey=%s; secretKey=%s", config.AccessKey, config.SecretKey))
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// ListScans retrieves all available scans from Nessus
func (s *NessusAPIService) ListScans(configID uuid.UUID) ([]NessusScan, error) {
	config, err := s.configService.GetConfig(configID)
	if err != nil {
		return nil, fmt.Errorf("failed to get config: %w", err)
	}

	client := s.createHTTPClient(30 * time.Second)
	req, err := http.NewRequest("GET", config.BaseURL+"/scans", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-ApiKeys", fmt.Sprintf("accessKey=%s; secretKey=%s", config.AccessKey, config.SecretKey))
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var scanList NessusScanList
	if err := json.NewDecoder(resp.Body).Decode(&scanList); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return scanList.Scans, nil
}

// GetScanDetails retrieves detailed information about a specific scan
func (s *NessusAPIService) GetScanDetails(configID uuid.UUID, scanID int) (*NessusScanDetail, error) {
	config, err := s.configService.GetConfig(configID)
	if err != nil {
		return nil, fmt.Errorf("failed to get config: %w", err)
	}

	client := s.createHTTPClient(30 * time.Second)
	url := fmt.Sprintf("%s/scans/%d", config.BaseURL, scanID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-ApiKeys", fmt.Sprintf("accessKey=%s; secretKey=%s", config.AccessKey, config.SecretKey))
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var scanDetail NessusScanDetail
	if err := json.NewDecoder(resp.Body).Decode(&scanDetail); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &scanDetail, nil
}

// ExportScan exports a scan in Nessus format (.nessus XML)
func (s *NessusAPIService) ExportScan(configID uuid.UUID, scanID int) ([]byte, error) {
	config, err := s.configService.GetConfig(configID)
	if err != nil {
		return nil, fmt.Errorf("failed to get config: %w", err)
	}

	client := s.createHTTPClient(5 * time.Minute) // Exports can take time

	// Step 1: Request export
	exportURL := fmt.Sprintf("%s/scans/%d/export", config.BaseURL, scanID)
	exportReq := map[string]string{"format": "nessus"}
	exportBody, _ := json.Marshal(exportReq)

	req, err := http.NewRequest("POST", exportURL, bytes.NewBuffer(exportBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create export request: %w", err)
	}

	req.Header.Set("X-ApiKeys", fmt.Sprintf("accessKey=%s; secretKey=%s", config.AccessKey, config.SecretKey))
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("export request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("export API returned status %d: %s", resp.StatusCode, string(body))
	}

	var exportResp struct {
		File interface{} `json:"file"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&exportResp); err != nil {
		return nil, fmt.Errorf("failed to decode export response: %w", err)
	}

	// Convert file ID to string (Nessus may return it as number or string)
	var fileID string
	switch v := exportResp.File.(type) {
	case string:
		fileID = v
	case float64:
		fileID = fmt.Sprintf("%.0f", v)
	case int:
		fileID = fmt.Sprintf("%d", v)
	default:
		return nil, fmt.Errorf("unexpected file ID type: %T", v)
	}

	// Step 2: Poll for export completion
	statusURL := fmt.Sprintf("%s/scans/%d/export/%s/status", config.BaseURL, scanID, fileID)
	maxRetries := 60 // 5 minutes with 5 second intervals
	for i := 0; i < maxRetries; i++ {
		time.Sleep(5 * time.Second)

		statusReq, _ := http.NewRequest("GET", statusURL, nil)
		statusReq.Header.Set("X-ApiKeys", fmt.Sprintf("accessKey=%s; secretKey=%s", config.AccessKey, config.SecretKey))

		statusResp, err := client.Do(statusReq)
		if err != nil {
			continue
		}

		var status NessusExportStatus
		json.NewDecoder(statusResp.Body).Decode(&status)
		statusResp.Body.Close()

		if status.Status == "ready" {
			break
		}
	}

	// Step 3: Download the export file
	downloadURL := fmt.Sprintf("%s/scans/%d/export/%s/download", config.BaseURL, scanID, fileID)
	downloadReq, err := http.NewRequest("GET", downloadURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create download request: %w", err)
	}

	downloadReq.Header.Set("X-ApiKeys", fmt.Sprintf("accessKey=%s; secretKey=%s", config.AccessKey, config.SecretKey))

	downloadResp, err := client.Do(downloadReq)
	if err != nil {
		return nil, fmt.Errorf("download request failed: %w", err)
	}
	defer downloadResp.Body.Close()

	if downloadResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download failed with status %d", downloadResp.StatusCode)
	}

	data, err := io.ReadAll(downloadResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read export data: %w", err)
	}

	return data, nil
}

// ImportScan exports a scan from Nessus and parses it
func (s *NessusAPIService) ImportScan(configID uuid.UUID, scanID int) ([]ParsedVulnerability, error) {
	// Export scan from Nessus
	data, err := s.ExportScan(configID, scanID)
	if err != nil {
		return nil, fmt.Errorf("failed to export scan: %w", err)
	}

	// Parse the exported data using existing parser
	vulnerabilities, err := s.parser.ParseNessusFile(data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse scan: %w", err)
	}

	return vulnerabilities, nil
}

// ImportMultipleScans imports multiple scans
func (s *NessusAPIService) ImportMultipleScans(configID uuid.UUID, scanIDs []int) (map[int][]ParsedVulnerability, map[int]error) {
	results := make(map[int][]ParsedVulnerability)
	errors := make(map[int]error)

	for _, scanID := range scanIDs {
		vulns, err := s.ImportScan(configID, scanID)
		if err != nil {
			fmt.Printf("Failed to import scan %d: %v\n", scanID, err)
			errors[scanID] = err
		} else {
			fmt.Printf("Successfully imported scan %d with %d vulnerabilities\n", scanID, len(vulns))
			results[scanID] = vulns
		}
	}

	return results, errors
}

// ImportAllScans imports all available scans
func (s *NessusAPIService) ImportAllScans(configID uuid.UUID) (map[int][]ParsedVulnerability, map[int]error) {
	scans, err := s.ListScans(configID)
	if err != nil {
		return nil, map[int]error{0: err}
	}

	scanIDs := make([]int, 0, len(scans))
	for _, scan := range scans {
		// Only import completed scans
		if scan.Status == "completed" {
			scanIDs = append(scanIDs, scan.ID)
		}
	}

	return s.ImportMultipleScans(configID, scanIDs)
}

// GetScanSummary returns a summary of a scan for preview
func (s *NessusAPIService) GetScanSummary(configID uuid.UUID, scanID int) (*NessusScanDetail, error) {
	return s.GetScanDetails(configID, scanID)
}
