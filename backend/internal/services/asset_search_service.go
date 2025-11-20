package services

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"gorm.io/gorm"
)

// AssetSearchService handles asset search and filtering logic
type AssetSearchService struct {
	db *gorm.DB
}

// NewAssetSearchService creates a new asset search service
func NewAssetSearchService(db *gorm.DB) *AssetSearchService {
	return &AssetSearchService{db: db}
}

// BuildSearchQuery builds a GORM query with all filters applied
func (s *AssetSearchService) BuildSearchQuery(params AssetListParams) *gorm.DB {
	query := s.db.Model(&models.AffectedSystem{})

	// Apply status filter (default to ACTIVE)
	if params.Status != nil {
		query = query.Where("status = ?", *params.Status)
	} else {
		query = query.Where("status = ?", models.StatusActive)
	}

	// Apply criticality filter
	if params.Criticality != nil {
		query = query.Where("criticality = ?", *params.Criticality)
	}

	// Apply environment filter
	if params.Environment != nil {
		query = query.Where("environment = ?", *params.Environment)
	}

	// Apply system type filter
	if params.SystemType != nil {
		query = query.Where("system_type = ?", *params.SystemType)
	}

	// Apply owner filter
	if params.OwnerID != nil {
		query = query.Where("owner_id = ?", *params.OwnerID)
	}

	// Apply full-text search if provided
	if params.Search != "" {
		assetIDs, err := s.FullTextSearch(params.Search)
		if err == nil && len(assetIDs) > 0 {
			// Use full-text search results
			query = query.Where("id IN ?", assetIDs)
		} else {
			// Fallback to ILIKE search
			searchPattern := "%" + params.Search + "%"
			query = query.Where(
				"hostname ILIKE ? OR description ILIKE ? OR ip_address ILIKE ? OR asset_id ILIKE ?",
				searchPattern, searchPattern, searchPattern, searchPattern,
			)
		}
	}

	// Apply tag filter if provided
	if len(params.Tags) > 0 {
		query = s.ApplyTagFilter(query, params.Tags)
	}

	return query
}

// FullTextSearch performs full-text search on assets using PostgreSQL GIN index
func (s *AssetSearchService) FullTextSearch(searchTerm string) ([]uuid.UUID, error) {
	if searchTerm == "" {
		return nil, fmt.Errorf("search term is empty")
	}

	// Sanitize search term for tsquery
	// Convert to lowercase and replace spaces with &
	sanitized := strings.ToLower(strings.TrimSpace(searchTerm))
	sanitized = strings.ReplaceAll(sanitized, " ", " & ")

	// Add prefix matching for partial word search
	if !strings.HasSuffix(sanitized, "&") {
		sanitized += ":*"
	}

	var assetIDs []uuid.UUID

	// Use PostgreSQL full-text search with GIN index
	err := s.db.Model(&models.AffectedSystem{}).
		Select("id").
		Where(
			"to_tsvector('english', COALESCE(hostname, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(asset_id, '')) @@ to_tsquery('english', ?)",
			sanitized,
		).
		Pluck("id", &assetIDs).Error

	if err != nil {
		return nil, fmt.Errorf("full-text search failed: %w", err)
	}

	return assetIDs, nil
}

// ApplyTagFilter applies tag filtering to a query
// Assets must have ALL specified tags (AND logic)
func (s *AssetSearchService) ApplyTagFilter(query *gorm.DB, tags []string) *gorm.DB {
	if len(tags) == 0 {
		return query
	}

	// Normalize tags to lowercase
	normalizedTags := make([]string, len(tags))
	for i, tag := range tags {
		normalizedTags[i] = strings.ToLower(strings.TrimSpace(tag))
	}

	// Use subquery to find assets with ALL specified tags
	// SELECT asset_id FROM asset_tags WHERE tag IN (tags) GROUP BY asset_id HAVING COUNT(DISTINCT tag) = len(tags)
	subquery := s.db.Table("asset_tags").
		Select("asset_id").
		Where("tag IN ?", normalizedTags).
		Group("asset_id").
		Having("COUNT(DISTINCT tag) = ?", len(normalizedTags))

	return query.Where("id IN (?)", subquery)
}

// ApplySort applies sorting to a query
// Supports: hostname, criticality, status, vulnerability_count, created_at, updated_at
func (s *AssetSearchService) ApplySort(query *gorm.DB, sortBy, sortOrder string) *gorm.DB {
	// Default sort
	if sortBy == "" {
		sortBy = "created_at"
	}
	if sortOrder == "" {
		sortOrder = "DESC"
	}

	// Validate sort order
	sortOrder = strings.ToUpper(sortOrder)
	if sortOrder != "ASC" && sortOrder != "DESC" {
		sortOrder = "DESC"
	}

	switch sortBy {
	case "hostname":
		return query.Order(fmt.Sprintf("hostname %s", sortOrder))

	case "criticality":
		// Custom order for criticality enum: CRITICAL > HIGH > MEDIUM > LOW
		// Use CASE WHEN for custom ordering
		criticalityOrder := `
			CASE criticality
				WHEN 'CRITICAL' THEN 1
				WHEN 'HIGH' THEN 2
				WHEN 'MEDIUM' THEN 3
				WHEN 'LOW' THEN 4
				ELSE 5
			END
		`
		if sortOrder == "DESC" {
			return query.Order(criticalityOrder + " ASC") // DESC means CRITICAL first
		}
		return query.Order(criticalityOrder + " DESC") // ASC means LOW first

	case "status":
		return query.Order(fmt.Sprintf("status %s", sortOrder))

	case "vulnerability_count":
		// This requires a subquery/join - will be handled in the service layer
		// For now, return unsorted and let the caller handle it
		return query

	case "created_at":
		return query.Order(fmt.Sprintf("created_at %s", sortOrder))

	case "updated_at":
		return query.Order(fmt.Sprintf("updated_at %s", sortOrder))

	default:
		// Default to created_at DESC
		return query.Order("created_at DESC")
	}
}
