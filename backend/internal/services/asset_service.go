package services

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"gorm.io/gorm"
)

// levenshteinDistance calculates the Levenshtein distance between two strings
func levenshteinDistance(s1, s2 string) int {
	if len(s1) == 0 {
		return len(s2)
	}
	if len(s2) == 0 {
		return len(s1)
	}

	// Create matrix
	matrix := make([][]int, len(s1)+1)
	for i := range matrix {
		matrix[i] = make([]int, len(s2)+1)
	}

	// Initialize first row and column
	for i := 0; i <= len(s1); i++ {
		matrix[i][0] = i
	}
	for j := 0; j <= len(s2); j++ {
		matrix[0][j] = j
	}

	// Fill matrix
	for i := 1; i <= len(s1); i++ {
		for j := 1; j <= len(s2); j++ {
			cost := 1
			if s1[i-1] == s2[j-1] {
				cost = 0
			}

			matrix[i][j] = min(
				matrix[i-1][j]+1,      // deletion
				matrix[i][j-1]+1,      // insertion
				matrix[i-1][j-1]+cost, // substitution
			)
		}
	}

	return matrix[len(s1)][len(s2)]
}

// min returns the minimum of three integers
func min(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

// calculateSimilarity calculates similarity percentage between two strings (0-100)
func calculateSimilarity(s1, s2 string) float64 {
	if s1 == s2 {
		return 100.0
	}

	distance := levenshteinDistance(strings.ToLower(s1), strings.ToLower(s2))
	maxLen := len(s1)
	if len(s2) > maxLen {
		maxLen = len(s2)
	}

	if maxLen == 0 {
		return 100.0
	}

	return (1.0 - float64(distance)/float64(maxLen)) * 100.0
}


// AssetService handles asset business logic
type AssetService struct {
	db            *gorm.DB
	searchService *AssetSearchService
}

// NewAssetService creates a new asset service
func NewAssetService(db *gorm.DB) *AssetService {
	return &AssetService{
		db:            db,
		searchService: NewAssetSearchService(db),
	}
}

// GetDB returns the database connection (for use with model methods)
func (s *AssetService) GetDB() *gorm.DB {
	return s.db
}

// AssetListParams defines parameters for listing assets
type AssetListParams struct {
	Page        int                      `json:"page"`
	Limit       int                      `json:"limit"`
	Search      string                   `json:"search,omitempty"`
	Criticality *models.AssetCriticality `json:"criticality,omitempty"`
	Status      *models.AssetStatus      `json:"status,omitempty"`
	Environment *models.Environment      `json:"environment,omitempty"`
	SystemType  *models.SystemType       `json:"system_type,omitempty"`
	OwnerID     *uuid.UUID               `json:"owner_id,omitempty"`
	Tags        []string                 `json:"tags,omitempty"`
	SortBy      string                   `json:"sort_by,omitempty"`
	SortOrder   string                   `json:"sort_order,omitempty"`
}

// AssetWithVulnCount extends AffectedSystem with vulnerability count
type AssetWithVulnCount struct {
	models.AffectedSystem
	VulnerabilityCount int `json:"vulnerability_count"`
}

// AssetListResponse defines the response for listing assets
type AssetListResponse struct {
	Data       []AssetWithVulnCount `json:"data"`
	Total      int64                `json:"total"`
	Page       int                  `json:"page"`
	Limit      int                  `json:"limit"`
	TotalPages int                  `json:"total_pages"`
}

// AssetStats defines aggregated statistics for assets
type AssetStats struct {
	TotalAssets             int            `json:"total_assets"`
	ByCriticality           map[string]int `json:"by_criticality"`
	ByStatus                map[string]int `json:"by_status"`
	ByEnvironment           map[string]int `json:"by_environment"`
	BySystemType            map[string]int `json:"by_system_type"`
	TotalVulnerabilities    int            `json:"total_vulnerabilities"`
	AssetsWithCriticalVulns int            `json:"assets_with_critical_vulns"`
}

// Create creates a new asset
func (s *AssetService) Create(asset *models.AffectedSystem) error {
	// Set default status if not provided
	if asset.Status == "" {
		asset.Status = models.StatusActive
	}

	// Create the asset in the database
	if err := s.db.Create(asset).Error; err != nil {
		return fmt.Errorf("failed to create asset: %w", err)
	}

	// Preload relationships for the response
	if err := s.db.Preload("Owner").Preload("Tags").First(asset, asset.ID).Error; err != nil {
		return fmt.Errorf("failed to load asset relationships: %w", err)
	}

	return nil
}

// List retrieves assets with filtering and pagination
func (s *AssetService) List(params AssetListParams) (*AssetListResponse, error) {
	// Set defaults
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 {
		params.Limit = 50
	}
	if params.Limit > 100 {
		params.Limit = 100
	}

	// Build search query with all filters
	query := s.searchService.BuildSearchQuery(params)

	// Get total count before pagination
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count assets: %w", err)
	}

	// Apply sorting
	query = s.searchService.ApplySort(query, params.SortBy, params.SortOrder)

	// Apply pagination
	offset := (params.Page - 1) * params.Limit
	query = query.Offset(offset).Limit(params.Limit)

	// Eager load relationships
	query = query.Preload("Owner").Preload("Tags")

	// Execute query
	var assets []models.AffectedSystem
	if err := query.Find(&assets).Error; err != nil {
		return nil, fmt.Errorf("failed to list assets: %w", err)
	}

	// Optimize: Batch load vulnerability counts for all assets in single query
	// Instead of N queries (one per asset), we do 1 query with GROUP BY
	assetIDs := make([]uuid.UUID, len(assets))
	for i, asset := range assets {
		assetIDs[i] = asset.ID
	}

	// Get vulnerability counts in bulk
	type VulnCountResult struct {
		AssetID uuid.UUID
		Count   int64
	}
	var vulnCounts []VulnCountResult
	if len(assetIDs) > 0 {
		s.db.Table("vulnerability_affected_systems vas").
			Select("vas.affected_system_id as asset_id, COUNT(*) as count").
			Joins("JOIN vulnerabilities v ON vas.vulnerability_id = v.id").
			Where("vas.affected_system_id IN ? AND v.deleted_at IS NULL", assetIDs).
			Group("vas.affected_system_id").
			Scan(&vulnCounts)
	}

	// Build a map for O(1) lookup
	vulnCountMap := make(map[uuid.UUID]int64)
	for _, vc := range vulnCounts {
		vulnCountMap[vc.AssetID] = vc.Count
	}

	// Build response with vulnerability counts
	assetsWithCounts := make([]AssetWithVulnCount, len(assets))
	for i, asset := range assets {
		assetsWithCounts[i] = AssetWithVulnCount{
			AffectedSystem:     asset,
			VulnerabilityCount: int(vulnCountMap[asset.ID]),
		}
	}

	// Calculate total pages
	totalPages := int(total) / params.Limit
	if int(total)%params.Limit > 0 {
		totalPages++
	}

	return &AssetListResponse{
		Data:       assetsWithCounts,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}, nil
}

// GetByID retrieves an asset by ID
func (s *AssetService) GetByID(id string, includeVulns bool) (*models.AffectedSystem, error) {
	var asset models.AffectedSystem

	query := s.db.Preload("Owner").Preload("Tags")

	if includeVulns {
		query = query.Preload("Vulnerabilities")
	}

	if err := query.First(&asset, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("asset not found: %w", err)
	}

	return &asset, nil
}

// Update updates an asset
func (s *AssetService) Update(id string, updates map[string]interface{}) (*models.AffectedSystem, error) {
	var asset models.AffectedSystem

	// Check if asset exists
	if err := s.db.First(&asset, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("asset not found: %w", err)
	}

	// Apply updates
	if err := s.db.Model(&asset).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update asset: %w", err)
	}

	// Reload with relationships
	if err := s.db.Preload("Owner").Preload("Tags").First(&asset, asset.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to reload asset: %w", err)
	}

	return &asset, nil
}

// Delete soft deletes an asset
func (s *AssetService) Delete(id string) error {
	var asset models.AffectedSystem

	// Check if asset exists
	if err := s.db.First(&asset, "id = ?", id).Error; err != nil {
		return fmt.Errorf("asset not found: %w", err)
	}

	// Soft delete
	if err := s.db.Delete(&asset).Error; err != nil {
		return fmt.Errorf("failed to delete asset: %w", err)
	}

	return nil
}

// UpdateStatus updates asset status with validation
func (s *AssetService) UpdateStatus(id string, status models.AssetStatus, notes string) (*models.AffectedSystem, error) {
	// Get current asset
	var asset models.AffectedSystem
	if err := s.db.First(&asset, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("asset not found: %w", err)
	}

	// Validate status transition
	if err := s.validateStatusTransition(asset.Status, status); err != nil {
		return nil, err
	}

	// Update status
	asset.Status = status
	if err := s.db.Save(&asset).Error; err != nil {
		return nil, fmt.Errorf("failed to update status: %w", err)
	}

	// Log status change (structured logging)
	// Note: Using fmt.Printf as placeholder until zerolog is fully integrated
	fmt.Printf("Asset status changed: asset_id=%s, old_status=%s, new_status=%s, notes=%s\n",
		id, asset.Status, status, notes)

	// Reload with relationships
	if err := s.db.Preload("Owner").Preload("Tags").First(&asset, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("failed to reload asset: %w", err)
	}

	return &asset, nil
}

// validateStatusTransition checks if a status transition is allowed
func (s *AssetService) validateStatusTransition(from, to models.AssetStatus) error {
	// DECOMMISSIONED is a final state - cannot transition from it
	if from == models.StatusDecommissioned {
		return fmt.Errorf("cannot change status from DECOMMISSIONED (final state)")
	}

	// All other transitions are allowed
	// Valid transitions:
	// - ACTIVE → UNDER_MAINTENANCE, INACTIVE, DECOMMISSIONED
	// - UNDER_MAINTENANCE → ACTIVE, INACTIVE
	// - INACTIVE → ACTIVE, DECOMMISSIONED
	return nil
}

// AddTags adds tags to an asset
func (s *AssetService) AddTags(assetID string, tags []string) error {
	if len(tags) == 0 {
		return nil
	}

	// Validate asset exists
	var asset models.AffectedSystem
	if err := s.db.First(&asset, "id = ?", assetID).Error; err != nil {
		return fmt.Errorf("asset not found: %w", err)
	}

	// Create asset tags (bulk insert with ON CONFLICT DO NOTHING)
	for _, tag := range tags {
		assetTag := models.AssetTag{
			AssetID: asset.ID,
			Tag:     tag,
		}
		// Use FirstOrCreate to handle duplicates gracefully
		if err := s.db.Where("asset_id = ? AND tag = ?", assetID, tag).
			FirstOrCreate(&assetTag).Error; err != nil {
			return fmt.Errorf("failed to add tag '%s': %w", tag, err)
		}
	}

	return nil
}

// RemoveTag removes a tag from an asset
func (s *AssetService) RemoveTag(assetID, tag string) error {
	// Normalize tag to lowercase
	tag = strings.ToLower(strings.TrimSpace(tag))

	result := s.db.Where("asset_id = ? AND tag = ?", assetID, tag).
		Delete(&models.AssetTag{})

	if result.Error != nil {
		return fmt.Errorf("failed to remove tag: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("tag not found on asset")
	}

	return nil
}

// GetStats retrieves aggregated asset statistics
func (s *AssetService) GetStats() (*AssetStats, error) {
	stats := &AssetStats{
		ByCriticality: make(map[string]int),
		ByStatus:      make(map[string]int),
		ByEnvironment: make(map[string]int),
		BySystemType:  make(map[string]int),
	}

	// Get total count
	var totalCount int64
	if err := s.db.Model(&models.AffectedSystem{}).Count(&totalCount).Error; err != nil {
		return nil, fmt.Errorf("failed to count total assets: %w", err)
	}
	stats.TotalAssets = int(totalCount)

	// Group by criticality
	var criticalityStats []struct {
		Criticality string
		Count       int
	}
	if err := s.db.Model(&models.AffectedSystem{}).
		Select("criticality, COUNT(*) as count").
		Where("criticality IS NOT NULL").
		Group("criticality").
		Scan(&criticalityStats).Error; err != nil {
		return nil, fmt.Errorf("failed to get criticality stats: %w", err)
	}
	for _, stat := range criticalityStats {
		stats.ByCriticality[stat.Criticality] = stat.Count
	}

	// Group by status
	var statusStats []struct {
		Status string
		Count  int
	}
	if err := s.db.Model(&models.AffectedSystem{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&statusStats).Error; err != nil {
		return nil, fmt.Errorf("failed to get status stats: %w", err)
	}
	for _, stat := range statusStats {
		stats.ByStatus[stat.Status] = stat.Count
	}

	// Group by environment
	var envStats []struct {
		Environment string
		Count       int
	}
	if err := s.db.Model(&models.AffectedSystem{}).
		Select("environment, COUNT(*) as count").
		Group("environment").
		Scan(&envStats).Error; err != nil {
		return nil, fmt.Errorf("failed to get environment stats: %w", err)
	}
	for _, stat := range envStats {
		stats.ByEnvironment[stat.Environment] = stat.Count
	}

	// Group by system type
	var typeStats []struct {
		SystemType string
		Count      int
	}
	if err := s.db.Model(&models.AffectedSystem{}).
		Select("system_type, COUNT(*) as count").
		Group("system_type").
		Scan(&typeStats).Error; err != nil {
		return nil, fmt.Errorf("failed to get system type stats: %w", err)
	}
	for _, stat := range typeStats {
		stats.BySystemType[stat.SystemType] = stat.Count
	}

	return stats, nil
}

// FindOrCreate finds an existing asset or creates a new one
// Returns (asset, wasCreated, error)
func (s *AssetService) FindOrCreate(hostname, ipAddress string, systemType models.SystemType, environment models.Environment) (*models.AffectedSystem, bool, error) {
	var asset models.AffectedSystem

	// Try to find existing asset by hostname+environment
	if hostname != "" {
		err := s.db.Where("hostname = ? AND environment = ?", hostname, environment).
			First(&asset).Error

		if err == nil {
			// Found existing asset
			return &asset, false, nil
		}
		if err != gorm.ErrRecordNotFound {
			return nil, false, fmt.Errorf("error searching for asset by hostname: %w", err)
		}
	}

	// Try to find existing asset by IP+environment if not found by hostname
	if ipAddress != "" {
		err := s.db.Where("ip_address = ? AND environment = ?", ipAddress, environment).
			First(&asset).Error

		if err == nil {
			// Found existing asset
			return &asset, false, nil
		}
		if err != gorm.ErrRecordNotFound {
			return nil, false, fmt.Errorf("error searching for asset by IP: %w", err)
		}
	}

	// Asset not found, create new one with defaults
	criticality := models.CriticalityMedium
	newAsset := &models.AffectedSystem{
		Hostname:    hostname,
		IPAddress:   ipAddress,
		SystemType:  systemType,
		Environment: environment,
		Criticality: &criticality,
		Status:      models.StatusActive,
	}

	if err := s.Create(newAsset); err != nil {
		return nil, false, fmt.Errorf("failed to create asset: %w", err)
	}

	return newAsset, true, nil
}

// CreateFromVulnerability creates an asset from vulnerability workflow
func (s *AssetService) CreateFromVulnerability(hostname, ipAddress string, systemType models.SystemType, environment models.Environment, vulnerabilityID string) (*models.AffectedSystem, error) {
	// Call FindOrCreate to get or create the asset
	asset, wasCreated, err := s.FindOrCreate(hostname, ipAddress, systemType, environment)
	if err != nil {
		return nil, fmt.Errorf("failed to find or create asset: %w", err)
	}

	// Log auto-creation event if asset was created
	if wasCreated {
		// TODO: Add structured logging when zerolog is set up
		// For now, we'll just track that it was created in the context of a vulnerability
		fmt.Printf("Auto-created asset: hostname=%s, ip=%s, vulnerability_id=%s\n",
			hostname, ipAddress, vulnerabilityID)
	}

	return asset, nil
}

// VulnerabilityListParams defines parameters for listing vulnerabilities
type VulnerabilityListParams struct {
	Page      int     `json:"page"`
	Limit     int     `json:"limit"`
	Severity  *string `json:"severity,omitempty"`
	Status    *string `json:"status,omitempty"`
	SortBy    string  `json:"sort_by,omitempty"`
	SortOrder string  `json:"sort_order,omitempty"`
}

// VulnerabilityWithAssetContext extends vulnerability with asset-specific context
type VulnerabilityWithAssetContext struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	Severity      string    `json:"severity"`
	Status        string    `json:"status"`
	CVSSScore     *float64  `json:"cvss_score,omitempty"`
	CVEIdentifier *string   `json:"cve_identifier,omitempty"`
	DetectedAt    *string   `json:"detected_at,omitempty"`
	PatchedAt     *string   `json:"patched_at,omitempty"`
	Notes         *string   `json:"notes,omitempty"`
	CreatedAt     string    `json:"created_at"`
}

// VulnerabilityListResponse defines the response for listing vulnerabilities
type VulnerabilityListResponse struct {
	Data       []VulnerabilityWithAssetContext `json:"data"`
	Total      int64                           `json:"total"`
	Page       int                             `json:"page"`
	Limit      int                             `json:"limit"`
	TotalPages int                             `json:"total_pages"`
}

// GetVulnerabilities retrieves vulnerabilities for a specific asset
func (s *AssetService) GetVulnerabilities(assetID uuid.UUID, params VulnerabilityListParams) (*VulnerabilityListResponse, error) {
	// Set defaults
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 {
		params.Limit = 50
	}
	if params.Limit > 100 {
		params.Limit = 100
	}

	// Build base query
	query := s.db.Table("vulnerabilities v").
		Select(`
			v.id, 
			v.title, 
			v.description, 
			v.severity, 
			v.status, 
			v.cvss_score, 
			v.cve_identifier,
			vas.detected_at,
			vas.patched_at,
			vas.notes,
			v.created_at
		`).
		Joins("JOIN vulnerability_affected_systems vas ON v.id = vas.vulnerability_id").
		Where("vas.affected_system_id = ? AND v.deleted_at IS NULL", assetID)

	// Apply filters
	if params.Severity != nil {
		query = query.Where("v.severity = ?", *params.Severity)
	}
	if params.Status != nil {
		query = query.Where("v.status = ?", *params.Status)
	}

	// Get total count
	var total int64
	countQuery := s.db.Table("vulnerabilities v").
		Joins("JOIN vulnerability_affected_systems vas ON v.id = vas.vulnerability_id").
		Where("vas.affected_system_id = ? AND v.deleted_at IS NULL", assetID)

	if params.Severity != nil {
		countQuery = countQuery.Where("v.severity = ?", *params.Severity)
	}
	if params.Status != nil {
		countQuery = countQuery.Where("v.status = ?", *params.Status)
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count vulnerabilities: %w", err)
	}

	// Apply sorting (default: severity DESC, then created_at DESC)
	sortBy := "v.severity"
	sortOrder := "DESC"
	if params.SortBy != "" {
		sortBy = params.SortBy
		if sortBy == "severity" {
			sortBy = "v.severity"
		} else if sortBy == "created_at" {
			sortBy = "v.created_at"
		} else if sortBy == "detected_at" {
			sortBy = "vas.detected_at"
		}
	}
	if params.SortOrder != "" {
		sortOrder = params.SortOrder
	}
	query = query.Order(fmt.Sprintf("%s %s, v.created_at DESC", sortBy, sortOrder))

	// Apply pagination
	offset := (params.Page - 1) * params.Limit
	query = query.Offset(offset).Limit(params.Limit)

	// Execute query
	var vulnerabilities []VulnerabilityWithAssetContext
	if err := query.Scan(&vulnerabilities).Error; err != nil {
		return nil, fmt.Errorf("failed to list vulnerabilities: %w", err)
	}

	// Calculate total pages
	totalPages := int(total) / params.Limit
	if int(total)%params.Limit > 0 {
		totalPages++
	}

	return &VulnerabilityListResponse{
		Data:       vulnerabilities,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	}, nil
}

// AssetDuplicateMatch represents potential duplicate assets
type AssetDuplicateMatch struct {
	Asset             *models.AffectedSystem `json:"asset"`
	Similarity        float64                `json:"similarity"`
	MatchedOnName     bool                   `json:"matched_on_name"`
	MatchedOnIP       bool                   `json:"matched_on_ip"`
	MatchedOnHostname bool                   `json:"matched_on_hostname"`
}

// CheckDuplicate finds potential duplicate assets based on fuzzy matching
func (s *AssetService) CheckDuplicate(name, ipAddress, hostname string, threshold float64) ([]*AssetDuplicateMatch, error) {
	// Default threshold to 80% if not provided
	if threshold <= 0 || threshold > 100 {
		threshold = 80.0
	}

	var results []*AssetDuplicateMatch
	exactMatches := make(map[uuid.UUID]bool) // Track exact matches to avoid duplicates

	// Optimize: Use targeted queries instead of loading all assets
	baseQuery := s.db.Model(&models.AffectedSystem{}).
		Preload("Owner").
		Preload("Tags").
		Where("status != ? AND deleted_at IS NULL", "DECOMMISSIONED")

	// 1. Check for exact IP match (most common duplicate scenario)
	if ipAddress != "" {
		var ipMatches []models.AffectedSystem
		if err := baseQuery.Where("ip_address = ?", ipAddress).Find(&ipMatches).Error; err == nil {
			for i := range ipMatches {
				asset := &ipMatches[i]
				results = append(results, &AssetDuplicateMatch{
					Asset:       asset,
					Similarity:  100.0,
					MatchedOnIP: true,
				})
				exactMatches[asset.ID] = true
			}
		}
	}

	// 2. Check for exact hostname match
	if hostname != "" {
		var hostnameMatches []models.AffectedSystem
		if err := baseQuery.Where("hostname = ?", hostname).Find(&hostnameMatches).Error; err == nil {
			for i := range hostnameMatches {
				asset := &hostnameMatches[i]
				if !exactMatches[asset.ID] { // Avoid duplicate entries
					results = append(results, &AssetDuplicateMatch{
						Asset:           asset,
						Similarity:      100.0,
						MatchedOnHostname: true,
					})
					exactMatches[asset.ID] = true
				}
			}
		}
	}

	// 3. Fuzzy match on asset_id (only if name provided and not too many exact matches)
	// Limit fuzzy matching to avoid performance issues
	if name != "" && len(results) < 10 {
		var candidates []models.AffectedSystem
		
		// Use LIKE for initial filtering to reduce candidates
		// This is a heuristic: if first 3 chars match, it's worth checking similarity
		likePattern := ""
		if len(name) >= 3 {
			likePattern = name[:3] + "%"
		}
		
		candidateQuery := baseQuery
		if likePattern != "" {
			candidateQuery = candidateQuery.Where("asset_id ILIKE ?", likePattern)
		} else {
			// If name is very short, limit to reasonable number of candidates
			candidateQuery = candidateQuery.Limit(100)
		}
		
		if err := candidateQuery.Find(&candidates).Error; err == nil {
			for i := range candidates {
				asset := &candidates[i]
				if exactMatches[asset.ID] { // Skip assets already matched
					continue
				}
				
				if asset.AssetID != "" {
					similarity := calculateSimilarity(name, asset.AssetID)
					if similarity >= threshold {
						results = append(results, &AssetDuplicateMatch{
							Asset:         asset,
							Similarity:    similarity,
							MatchedOnName: true,
						})
					}
				}
			}
		}
	}

	return results, nil
}

