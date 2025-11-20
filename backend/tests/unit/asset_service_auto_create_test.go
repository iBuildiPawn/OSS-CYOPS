package unit

import (
	"testing"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestAssetFindOrCreate tests the FindOrCreate functionality
func TestAssetFindOrCreate(t *testing.T) {
	// Setup test database
	db := setupTestDB(t)
	require.NotNil(t, db)

	// Clean up test data
	defer func() {
		db.Exec("DELETE FROM affected_systems WHERE hostname LIKE 'test-find-or-create%'")
	}()

	assetService := services.NewAssetService(db)

	t.Run("CreateNewAsset", func(t *testing.T) {
		hostname := "test-find-or-create-new-" + uuid.New().String()[:8]
		ipAddress := "192.168.1.100"
		systemType := models.SystemTypeServer
		environment := models.EnvProduction

		// First call should create the asset
		asset, wasCreated, err := assetService.FindOrCreate(hostname, ipAddress, systemType, environment)
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.True(t, wasCreated, "Asset should be created on first call")
		assert.Equal(t, hostname, asset.Hostname)
		assert.Equal(t, ipAddress, asset.IPAddress)
		assert.Equal(t, systemType, asset.SystemType)
		assert.Equal(t, environment, asset.Environment)
		assert.Equal(t, models.StatusActive, asset.Status)
		assert.NotNil(t, asset.Criticality)
		assert.Equal(t, models.CriticalityMedium, *asset.Criticality)

		// Second call with same hostname should return existing asset
		existingAsset, wasCreated2, err := assetService.FindOrCreate(hostname, ipAddress, systemType, environment)
		require.NoError(t, err)
		require.NotNil(t, existingAsset)
		assert.False(t, wasCreated2, "Asset should not be created on second call")
		assert.Equal(t, asset.ID, existingAsset.ID, "Should return the same asset")
	})

	t.Run("FindExistingAssetByHostname", func(t *testing.T) {
		hostname := "test-find-or-create-existing-" + uuid.New().String()[:8]
		ipAddress := "192.168.1.101"
		systemType := models.SystemTypeWorkstation
		environment := models.EnvStaging

		// Create asset first
		createdAsset := &models.AffectedSystem{
			Hostname:    hostname,
			IPAddress:   ipAddress,
			SystemType:  systemType,
			Environment: environment,
			Status:      models.StatusActive,
		}
		err := assetService.Create(createdAsset)
		require.NoError(t, err)

		// FindOrCreate should return the existing asset
		foundAsset, wasCreated, err := assetService.FindOrCreate(hostname, "10.0.0.1", systemType, environment)
		require.NoError(t, err)
		require.NotNil(t, foundAsset)
		assert.False(t, wasCreated, "Should find existing asset by hostname")
		assert.Equal(t, createdAsset.ID, foundAsset.ID)
		assert.Equal(t, hostname, foundAsset.Hostname)
	})

	t.Run("FindExistingAssetByIP", func(t *testing.T) {
		hostname := "test-find-or-create-by-ip-" + uuid.New().String()[:8]
		ipAddress := "192.168.1.102"
		systemType := models.SystemTypeApplication
		environment := models.EnvDevelopment

		// Create asset first
		createdAsset := &models.AffectedSystem{
			Hostname:    hostname,
			IPAddress:   ipAddress,
			SystemType:  systemType,
			Environment: environment,
			Status:      models.StatusActive,
		}
		err := assetService.Create(createdAsset)
		require.NoError(t, err)

		// FindOrCreate with different hostname but same IP should return existing asset
		foundAsset, wasCreated, err := assetService.FindOrCreate("different-hostname", ipAddress, systemType, environment)
		require.NoError(t, err)
		require.NotNil(t, foundAsset)
		assert.False(t, wasCreated, "Should find existing asset by IP address")
		assert.Equal(t, createdAsset.ID, foundAsset.ID)
		assert.Equal(t, ipAddress, foundAsset.IPAddress)
	})

	t.Run("DifferentEnvironmentCreatesNew", func(t *testing.T) {
		hostname := "test-find-or-create-multi-env-" + uuid.New().String()[:8]
		ipAddress := "192.168.1.103"
		systemType := models.SystemTypeServer
		environment1 := models.EnvProduction
		environment2 := models.EnvStaging

		// Create asset in production
		asset1, wasCreated1, err := assetService.FindOrCreate(hostname, ipAddress, systemType, environment1)
		require.NoError(t, err)
		require.NotNil(t, asset1)
		assert.True(t, wasCreated1)
		assert.Equal(t, environment1, asset1.Environment)

		// Same hostname/IP in different environment should create new asset
		asset2, wasCreated2, err := assetService.FindOrCreate(hostname, ipAddress, systemType, environment2)
		require.NoError(t, err)
		require.NotNil(t, asset2)
		assert.True(t, wasCreated2, "Should create new asset for different environment")
		assert.NotEqual(t, asset1.ID, asset2.ID, "Should be different assets")
		assert.Equal(t, environment2, asset2.Environment)
	})
}

// TestCreateFromVulnerability tests the CreateFromVulnerability functionality
func TestCreateFromVulnerability(t *testing.T) {
	// Setup test database
	db := setupTestDB(t)
	require.NotNil(t, db)

	// Clean up test data
	defer func() {
		db.Exec("DELETE FROM affected_systems WHERE hostname LIKE 'test-vuln-create%'")
	}()

	assetService := services.NewAssetService(db)

	t.Run("CreateAssetFromVulnerability", func(t *testing.T) {
		hostname := "test-vuln-create-" + uuid.New().String()[:8]
		ipAddress := "192.168.2.100"
		systemType := models.SystemTypeServer
		environment := models.EnvProduction
		vulnerabilityID := uuid.New().String()

		// Create asset from vulnerability
		asset, err := assetService.CreateFromVulnerability(hostname, ipAddress, systemType, environment, vulnerabilityID)
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.Equal(t, hostname, asset.Hostname)
		assert.Equal(t, ipAddress, asset.IPAddress)
		assert.Equal(t, systemType, asset.SystemType)
		assert.Equal(t, environment, asset.Environment)
		assert.Equal(t, models.StatusActive, asset.Status)

		// Verify asset was created in database
		var foundAsset models.AffectedSystem
		err = db.Where("hostname = ?", hostname).First(&foundAsset).Error
		require.NoError(t, err)
		assert.Equal(t, asset.ID, foundAsset.ID)
	})

	t.Run("ReuseExistingAssetFromVulnerability", func(t *testing.T) {
		hostname := "test-vuln-reuse-" + uuid.New().String()[:8]
		ipAddress := "192.168.2.101"
		systemType := models.SystemTypeServer
		environment := models.EnvProduction

		// Create asset first
		existingAsset := &models.AffectedSystem{
			Hostname:    hostname,
			IPAddress:   ipAddress,
			SystemType:  systemType,
			Environment: environment,
			Status:      models.StatusActive,
		}
		err := assetService.Create(existingAsset)
		require.NoError(t, err)

		// Call CreateFromVulnerability should reuse existing asset
		vulnerabilityID := uuid.New().String()
		asset, err := assetService.CreateFromVulnerability(hostname, ipAddress, systemType, environment, vulnerabilityID)
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.Equal(t, existingAsset.ID, asset.ID, "Should reuse existing asset")
	})
}
