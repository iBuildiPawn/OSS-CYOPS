package unit

import (
	"fmt"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Helper functions for pointer conversion
func ptr[T any](v T) *T {
	return &v
}

func criticalityPtr(c models.AssetCriticality) *models.AssetCriticality {
	return &c
}

func statusPtr(s models.AssetStatus) *models.AssetStatus {
	return &s
}

func envPtr(e models.Environment) *models.Environment {
	return &e
}

func systemTypePtr(st models.SystemType) *models.SystemType {
	return &st
}

// setupTestDB creates a test database connection (uses PostgreSQL from Docker)
func setupTestDB(t *testing.T) *gorm.DB {
	// Use test database from environment or default
	dbHost := os.Getenv("TEST_DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}

	dsn := fmt.Sprintf(
		"host=%s user=postgres password=postgres dbname=cyberops_test port=5432 sslmode=disable TimeZone=UTC",
		dbHost,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})

	if err != nil {
		t.Skip("Skipping test: PostgreSQL test database not available. Run: docker exec -it cyops-postgres psql -U postgres -c 'CREATE DATABASE cyberops_test;'")
		return nil
	}

	// Clean up any existing data
	db.Exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
	db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")

	// Run migrations
	err = db.AutoMigrate(
		&models.Role{},
		&models.User{},
		&models.AffectedSystem{},
		&models.AssetTag{},
	)
	require.NoError(t, err, "Failed to migrate test database")

	// Add unique constraints for asset management
	db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_hostname_env 
		ON affected_systems(hostname, environment) 
		WHERE deleted_at IS NULL;
	`)
	db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_ip_env 
		ON affected_systems(ip_address, environment) 
		WHERE deleted_at IS NULL;
	`)

	return db
}

// cleanupTestDB cleans up the test database after tests
func cleanupTestDB(db *gorm.DB) {
	if db != nil {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}
}

// seedTestData creates test data in the database
func seedTestData(t *testing.T, db *gorm.DB) *models.User {
	// Create a test role
	role := &models.Role{
		Name:        "Test Role",
		DisplayName: "Test Role",
		Permissions: "{}", // Empty JSON object for permissions
		Level:       0,
		IsDefault:   false,
		IsSystem:    false,
	}
	require.NoError(t, db.Create(role).Error)

	// Convert UUID to string for RoleID
	roleIDStr := role.ID.String()

	// Create a test user
	user := &models.User{
		Email:    "test@example.com",
		Password: "hashedpassword",
		Name:     "Test User",
		RoleID:   &roleIDStr,
	}
	require.NoError(t, db.Create(user).Error)

	return user
}

func TestAssetServiceCreate(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return // Skipped
	}
	defer cleanupTestDB(db)

	user := seedTestData(t, db)
	assetService := services.NewAssetService(db)

	// Clean assets between subtests to prevent conflicts
	cleanAssets := func() {
		db.Exec("DELETE FROM affected_systems")
	}

	t.Run("successful creation with all fields", func(t *testing.T) {
		defer cleanAssets()
		asset := &models.AffectedSystem{
			Hostname:    "test-server-01",
			IPAddress:   "192.168.1.100",
			AssetID:     "ASSET-001",
			SystemType:  models.SystemTypeServer,
			Description: "Test server",
			Environment: models.EnvProduction,
			Criticality: criticalityPtr(models.CriticalityHigh),
			Status:      models.StatusActive,
			OwnerID:     &user.ID,
			Department:  "IT",
			Location:    "Data Center A",
		}

		err := assetService.Create(asset)
		require.NoError(t, err, "Failed to create asset")
		assert.NotEqual(t, uuid.Nil, asset.ID, "Asset ID should be generated")
		assert.Equal(t, "test-server-01", asset.Hostname)
		assert.Equal(t, models.StatusActive, asset.Status)
	})

	t.Run("creation with minimum required fields (hostname only)", func(t *testing.T) {
		defer cleanAssets()
		asset := &models.AffectedSystem{
			Hostname:    "minimal-server",
			Environment: models.EnvProduction,
			SystemType:  models.SystemTypeServer,
		}

		err := assetService.Create(asset)
		require.NoError(t, err, "Failed to create minimal asset")
		assert.NotEqual(t, uuid.Nil, asset.ID)
		assert.Equal(t, models.StatusActive, asset.Status, "Should default to ACTIVE status")
	})

	t.Run("creation with IP address only", func(t *testing.T) {
		defer cleanAssets()
		asset := &models.AffectedSystem{
			IPAddress:   "10.0.0.50",
			Environment: models.EnvProduction,
			SystemType:  models.SystemTypeServer,
		}

		err := assetService.Create(asset)
		require.NoError(t, err, "Failed to create asset with IP only")
		assert.NotEqual(t, uuid.Nil, asset.ID)
	})

	t.Run("creation with asset_id only", func(t *testing.T) {
		defer cleanAssets()
		asset := &models.AffectedSystem{
			AssetID:     "ASSET-XYZ-999",
			Environment: models.EnvProduction,
			SystemType:  models.SystemTypeServer,
		}

		err := assetService.Create(asset)
		require.NoError(t, err, "Failed to create asset with asset_id only")
		assert.NotEqual(t, uuid.Nil, asset.ID)
	})

	t.Run("duplicate hostname in same environment should fail", func(t *testing.T) {
		defer cleanAssets()
		// Create first asset
		asset1 := &models.AffectedSystem{
			Hostname:    "duplicate-host",
			Environment: models.EnvProduction,
			SystemType:  models.SystemTypeServer,
		}
		require.NoError(t, assetService.Create(asset1))

		// Try to create duplicate
		asset2 := &models.AffectedSystem{
			Hostname:    "duplicate-host",
			Environment: models.EnvProduction,
			SystemType:  models.SystemTypeServer,
		}
		err := assetService.Create(asset2)
		assert.Error(t, err, "Should fail on duplicate hostname in same environment")
	})

	t.Run("same hostname in different environment should succeed", func(t *testing.T) {
		defer cleanAssets()
		asset1 := &models.AffectedSystem{
			Hostname:    "multi-env-host",
			Environment: models.EnvProduction,
			SystemType:  models.SystemTypeServer,
		}
		require.NoError(t, assetService.Create(asset1))

		asset2 := &models.AffectedSystem{
			Hostname:    "multi-env-host",
			Environment: models.EnvStaging,
			SystemType:  models.SystemTypeServer,
		}
		err := assetService.Create(asset2)
		assert.NoError(t, err, "Same hostname in different environment should succeed")
	})

	t.Run("duplicate IP address in same environment should fail", func(t *testing.T) {
		defer cleanAssets()
		asset1 := &models.AffectedSystem{
			IPAddress:   "192.168.100.200",
			Environment: models.EnvProduction,
			SystemType:  models.SystemTypeServer,
		}
		require.NoError(t, assetService.Create(asset1))

		asset2 := &models.AffectedSystem{
			IPAddress:   "192.168.100.200",
			Environment: models.EnvProduction,
			SystemType:  models.SystemTypeServer,
		}
		err := assetService.Create(asset2)
		assert.Error(t, err, "Should fail on duplicate IP in same environment")
	})

	t.Run("creation with tags", func(t *testing.T) {
		defer cleanAssets()
		asset := &models.AffectedSystem{
			Hostname:    "tagged-server",
			Environment: models.EnvProduction,
			SystemType:  models.SystemTypeServer,
		}
		require.NoError(t, assetService.Create(asset))

		// Add tags
		tags := []models.AssetTag{
			{AssetID: asset.ID, Tag: "web"},
			{AssetID: asset.ID, Tag: "production"},
			{AssetID: asset.ID, Tag: "critical"},
		}
		for _, tag := range tags {
			require.NoError(t, db.Create(&tag).Error)
		}

		// Reload with tags
		var loaded models.AffectedSystem
		require.NoError(t, db.Preload("Tags").First(&loaded, asset.ID).Error)
		assert.Len(t, loaded.Tags, 3)
	})
}

func TestAssetServiceList(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer cleanupTestDB(db)

	user := seedTestData(t, db)
	assetService := services.NewAssetService(db)

	// Seed test assets with unique hostnames and IPs
	assets := []models.AffectedSystem{
		{
			Hostname:    "list-web-server-01",
			IPAddress:   "192.168.10.10",
			AssetID:     "LST-WEB-01",
			SystemType:  models.SystemTypeServer,
			Environment: models.EnvProduction,
			Criticality: criticalityPtr(models.CriticalityCritical),
			Status:      models.StatusActive,
			OwnerID:     &user.ID,
		},
		{
			Hostname:    "list-web-server-02",
			IPAddress:   "192.168.10.11",
			AssetID:     "LST-WEB-02",
			SystemType:  models.SystemTypeServer,
			Environment: models.EnvProduction,
			Criticality: criticalityPtr(models.CriticalityHigh),
			Status:      models.StatusActive,
		},
		{
			Hostname:    "list-db-server-01",
			IPAddress:   "192.168.10.12",
			AssetID:     "LST-DB-01",
			SystemType:  models.SystemTypeServer,
			Environment: models.EnvProduction,
			Criticality: criticalityPtr(models.CriticalityHigh),
			Status:      models.StatusActive, // Changed from INACTIVE to ACTIVE
		},
		{
			Hostname:    "list-test-workstation",
			IPAddress:   "192.168.10.13",
			AssetID:     "LST-WKS-01",
			SystemType:  models.SystemTypeWorkstation,
			Environment: models.EnvDevelopment,
			Criticality: criticalityPtr(models.CriticalityLow),
			Status:      models.StatusActive,
		},
	}

	for i := range assets {
		t.Logf("Creating asset %d: %s (IP: %s, Env: %s)", i, assets[i].Hostname, assets[i].IPAddress, assets[i].Environment)
		err := assetService.Create(&assets[i])
		require.NoError(t, err, "Failed to create test asset %d (%s): %v", i, assets[i].Hostname, err)
		t.Logf("Successfully created asset %d: %s with ID: %s", i, assets[i].Hostname, assets[i].ID)
	}

	t.Run("list all assets with default pagination", func(t *testing.T) {
		// Count directly in database
		var dbCount int64
		db.Model(&models.AffectedSystem{}).Count(&dbCount)
		t.Logf("Direct DB count: %d", dbCount)

		params := services.AssetListParams{}
		result, err := assetService.List(params)
		require.NoError(t, err)
		t.Logf("Service returned: Total=%d, Data length=%d", result.Total, len(result.Data))
		for i, asset := range result.Data {
			t.Logf("  Asset %d: %s (ID: %s, Status: %s)", i, asset.Hostname, asset.ID, asset.Status)
		}
		assert.Equal(t, int64(4), result.Total)
		assert.Len(t, result.Data, 4)
		assert.Equal(t, 1, result.Page)
		assert.Equal(t, 50, result.Limit) // Default limit
	})

	t.Run("list with pagination", func(t *testing.T) {
		params := services.AssetListParams{
			Page:  1,
			Limit: 2,
		}
		result, err := assetService.List(params)
		require.NoError(t, err)
		assert.Equal(t, int64(4), result.Total)
		assert.Len(t, result.Data, 2)
		assert.Equal(t, 2, result.TotalPages)
	})

	t.Run("filter by criticality", func(t *testing.T) {
		params := services.AssetListParams{
			Criticality: criticalityPtr(models.CriticalityHigh),
		}
		result, err := assetService.List(params)
		require.NoError(t, err)
		assert.Equal(t, int64(2), result.Total) // 2 HIGH criticality assets
		for _, asset := range result.Data {
			assert.Equal(t, models.CriticalityHigh, *asset.Criticality)
		}
	})

	t.Run("filter by status", func(t *testing.T) {
		params := services.AssetListParams{
			Status: statusPtr(models.StatusActive),
		}
		result, err := assetService.List(params)
		require.NoError(t, err)
		assert.Equal(t, int64(4), result.Total) // All 4 assets are ACTIVE
		for _, asset := range result.Data {
			assert.Equal(t, models.StatusActive, asset.Status)
		}
	})

	t.Run("filter by environment", func(t *testing.T) {
		params := services.AssetListParams{
			Environment: envPtr(models.EnvProduction),
		}
		result, err := assetService.List(params)
		require.NoError(t, err)
		assert.Equal(t, int64(3), result.Total) // 3 PRODUCTION assets
	})

	t.Run("filter by system type", func(t *testing.T) {
		params := services.AssetListParams{
			SystemType: systemTypePtr(models.SystemTypeWorkstation),
		}
		result, err := assetService.List(params)
		require.NoError(t, err)
		assert.Equal(t, int64(1), result.Total) // 1 WORKSTATION
	})

	t.Run("filter by owner", func(t *testing.T) {
		params := services.AssetListParams{
			OwnerID: &user.ID,
		}
		result, err := assetService.List(params)
		require.NoError(t, err)
		assert.Equal(t, int64(1), result.Total) // 1 asset owned by user
	})

	t.Run("search by hostname", func(t *testing.T) {
		params := services.AssetListParams{
			Search: "web-server",
		}
		result, err := assetService.List(params)
		require.NoError(t, err)
		assert.Equal(t, int64(2), result.Total) // 2 web servers
	})

	t.Run("combined filters", func(t *testing.T) {
		params := services.AssetListParams{
			Environment: envPtr(models.EnvProduction),
			Status:      statusPtr(models.StatusActive),
		}
		result, err := assetService.List(params)
		require.NoError(t, err)
		assert.Equal(t, int64(3), result.Total) // 3 PRODUCTION + ACTIVE assets (all servers)
		for _, asset := range result.Data {
			assert.Equal(t, models.EnvProduction, asset.Environment)
			assert.Equal(t, models.StatusActive, asset.Status)
		}
	})
}

func TestAssetServiceGetByID(t *testing.T) {
	db := setupTestDB(t)
	user := seedTestData(t, db)
	assetService := services.NewAssetService(db)

	// Create test asset
	asset := &models.AffectedSystem{
		Hostname:    "test-get-server",
		IPAddress:   "10.0.1.50",
		SystemType:  models.SystemTypeServer,
		Environment: models.EnvProduction,
		Criticality: criticalityPtr(models.CriticalityHigh),
		Status:      models.StatusActive,
		OwnerID:     &user.ID,
	}
	require.NoError(t, assetService.Create(asset))

	t.Run("get existing asset", func(t *testing.T) {
		found, err := assetService.GetByID(asset.ID.String(), false)
		require.NoError(t, err)
		assert.Equal(t, asset.ID, found.ID)
		assert.Equal(t, asset.Hostname, found.Hostname)
		assert.Equal(t, asset.IPAddress, found.IPAddress)
	})

	t.Run("get with owner preloaded", func(t *testing.T) {
		found, err := assetService.GetByID(asset.ID.String(), false)
		require.NoError(t, err)
		assert.NotNil(t, found.Owner, "Owner should be preloaded")
		assert.Equal(t, user.Email, found.Owner.Email)
	})

	t.Run("get non-existent asset", func(t *testing.T) {
		randomID := uuid.New().String()
		_, err := assetService.GetByID(randomID, false)
		assert.Error(t, err, "Should return error for non-existent asset")
	})

	t.Run("get with invalid UUID", func(t *testing.T) {
		_, err := assetService.GetByID("invalid-uuid", false)
		assert.Error(t, err, "Should return error for invalid UUID")
	})
}

func TestAssetServiceUpdate(t *testing.T) {
	db := setupTestDB(t)
	seedTestData(t, db)
	assetService := services.NewAssetService(db)

	// Create test asset
	asset := &models.AffectedSystem{
		Hostname:    "update-test-server",
		SystemType:  models.SystemTypeServer,
		Environment: models.EnvProduction,
		Criticality: criticalityPtr(models.CriticalityMedium),
		Status:      models.StatusActive,
	}
	require.NoError(t, assetService.Create(asset))

	t.Run("update criticality", func(t *testing.T) {
		updates := map[string]interface{}{
			"criticality": criticalityPtr(models.CriticalityCritical),
		}
		updated, err := assetService.Update(asset.ID.String(), updates)
		require.NoError(t, err)
		assert.Equal(t, models.CriticalityCritical, *updated.Criticality)
	})

	t.Run("update multiple fields", func(t *testing.T) {
		updates := map[string]interface{}{
			"description": "Updated description",
			"location":    "New Data Center",
			"department":  "Security",
		}
		updated, err := assetService.Update(asset.ID.String(), updates)
		require.NoError(t, err)
		assert.Equal(t, "Updated description", updated.Description)
		assert.Equal(t, "New Data Center", updated.Location)
		assert.Equal(t, "Security", updated.Department)
	})

	t.Run("update hostname", func(t *testing.T) {
		updates := map[string]interface{}{
			"hostname": "renamed-server",
		}
		updated, err := assetService.Update(asset.ID.String(), updates)
		require.NoError(t, err)
		assert.Equal(t, "renamed-server", updated.Hostname)
	})

	t.Run("update non-existent asset", func(t *testing.T) {
		randomID := uuid.New().String()
		updates := map[string]interface{}{
			"description": "This should fail",
		}
		_, err := assetService.Update(randomID, updates)
		assert.Error(t, err, "Should return error for non-existent asset")
	})
}

func TestAssetServiceDelete(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer cleanupTestDB(db)

	seedTestData(t, db)
	assetService := services.NewAssetService(db)

	t.Run("soft delete asset", func(t *testing.T) {
		asset := &models.AffectedSystem{
			Hostname:    "delete-test-server",
			IPAddress:   "192.168.50.50",
			SystemType:  models.SystemTypeServer,
			Environment: models.EnvProduction,
		}
		require.NoError(t, assetService.Create(asset))

		// Delete the asset
		err := assetService.Delete(asset.ID.String())
		require.NoError(t, err)

		// Verify it's soft deleted (not in normal queries)
		_, err = assetService.GetByID(asset.ID.String(), false)
		assert.Error(t, err, "Deleted asset should not be found")

		// Verify it still exists with Unscoped
		var deleted models.AffectedSystem
		err = db.Unscoped().First(&deleted, asset.ID).Error
		require.NoError(t, err, "Deleted asset should exist with Unscoped")
		assert.NotNil(t, deleted.DeletedAt, "DeletedAt should be set")
	})

	t.Run("delete non-existent asset", func(t *testing.T) {
		randomID := uuid.New().String()
		err := assetService.Delete(randomID)
		assert.Error(t, err, "Should return error for non-existent asset")
	})
}

func TestAssetServiceGetStats(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer cleanupTestDB(db)

	seedTestData(t, db)
	assetService := services.NewAssetService(db)

	// Seed diverse assets with unique hostnames and IPs
	assets := []models.AffectedSystem{
		{Hostname: "stats-server1", IPAddress: "192.168.60.1", SystemType: models.SystemTypeServer, Environment: models.EnvProduction, Criticality: criticalityPtr(models.CriticalityCritical), Status: models.StatusActive},
		{Hostname: "stats-server2", IPAddress: "192.168.60.2", SystemType: models.SystemTypeServer, Environment: models.EnvProduction, Criticality: criticalityPtr(models.CriticalityHigh), Status: models.StatusActive},
		{Hostname: "stats-server3", IPAddress: "192.168.60.3", SystemType: models.SystemTypeServer, Environment: models.EnvStaging, Criticality: criticalityPtr(models.CriticalityMedium), Status: models.StatusInactive},
		{Hostname: "stats-workstation1", IPAddress: "192.168.60.4", SystemType: models.SystemTypeWorkstation, Environment: models.EnvDevelopment, Criticality: criticalityPtr(models.CriticalityLow), Status: models.StatusActive},
	}

	for i := range assets {
		require.NoError(t, assetService.Create(&assets[i]))
	}

	t.Run("get asset statistics", func(t *testing.T) {
		stats, err := assetService.GetStats()
		require.NoError(t, err)
		assert.Equal(t, 4, stats.TotalAssets)

		// Check by criticality
		assert.Equal(t, 1, stats.ByCriticality["CRITICAL"])
		assert.Equal(t, 1, stats.ByCriticality["HIGH"])
		assert.Equal(t, 1, stats.ByCriticality["MEDIUM"])
		assert.Equal(t, 1, stats.ByCriticality["LOW"])

		// Check by status
		assert.Equal(t, 3, stats.ByStatus["ACTIVE"])
		assert.Equal(t, 1, stats.ByStatus["INACTIVE"])

		// Check by environment
		assert.Equal(t, 2, stats.ByEnvironment["PRODUCTION"])
		assert.Equal(t, 1, stats.ByEnvironment["STAGING"])
		assert.Equal(t, 1, stats.ByEnvironment["DEVELOPMENT"])

		// Check by system type
		assert.Equal(t, 3, stats.BySystemType["SERVER"])
		assert.Equal(t, 1, stats.BySystemType["WORKSTATION"])
	})
}
