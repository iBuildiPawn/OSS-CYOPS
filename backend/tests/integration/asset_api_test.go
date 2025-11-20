package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/handlers"
	"github.com/cyops/cyops-backend/internal/middleware"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// TestApp holds the test application and database
type TestApp struct {
	App *fiber.App
	DB  *gorm.DB
}

// TestUser holds test user information
type TestUser struct {
	User     *models.User
	Session  *models.Session
	Token    string
	RoleName string
}

// setupTestApp creates a new Fiber app for testing
func setupTestApp(t *testing.T) *TestApp {
	// Connect to test database
	dsn := "host=localhost user=postgres password=postgres dbname=cyberops_test port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	require.NoError(t, err, "Failed to connect to test database")

	// Drop and recreate schema
	db.Exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
	db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")

	// Run migrations
	err = db.AutoMigrate(
		&models.Role{},
		&models.User{},
		&models.Session{},
		&models.AffectedSystem{},
		&models.AssetTag{},
		&models.VulnerabilityAffectedSystem{},
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

	// Create Fiber app with test configuration
	app := fiber.New(fiber.Config{
		ErrorHandler: middleware.ErrorHandler(),
	})

	// Setup asset routes directly with test handlers
	setupTestAssetRoutes(app, db)

	return &TestApp{
		App: app,
		DB:  db,
	}
}

// setupTestAssetRoutes configures asset management routes for testing
func setupTestAssetRoutes(app *fiber.App, db *gorm.DB) {
	handler := handlers.NewAssetHandler(
		services.NewAssetService(db),
		services.NewAssetValidationService(db),
		services.NewAssetSearchService(db),
	)

	// Create test session service middleware
	testAuthMiddleware := func(db *gorm.DB) fiber.Handler {
		return func(c *fiber.Ctx) error {
			// Extract token from Authorization header
			authHeader := c.Get("Authorization")
			if authHeader == "" {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Authorization header required",
				})
			}

			// Check Bearer token format
			parts := authHeader[7:] // Skip "Bearer "
			if len(authHeader) < 8 {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Invalid authorization format",
				})
			}

			token := parts

			// Validate session from test DB
			var session models.Session
			if err := db.Preload("User.Role").Where("token = ?", token).First(&session).Error; err != nil {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Invalid or expired session",
				})
			}

			// Check if session is expired
			if session.IsExpired() {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Session expired",
				})
			}

			// Attach user and session to context
			c.Locals("user", session.User)
			c.Locals("user_id", session.UserID)
			c.Locals("session", &session)
			c.Locals("session_id", session.ID)

			return c.Next()
		}
	}

	// Create test RBAC middleware
	testRequirePermission := func(db *gorm.DB, resource, action string) fiber.Handler {
		return func(c *fiber.Ctx) error {
			user := c.Locals("user").(*models.User)
			if user == nil || user.Role == nil {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "No role assigned",
				})
			}

			// Parse permissions
			var permissions map[string][]string
			if err := json.Unmarshal([]byte(user.Role.Permissions), &permissions); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Invalid permissions format",
				})
			}

			// Check permission
			actions, exists := permissions[resource]
			if !exists {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "You do not have permission to perform this action",
				})
			}

			hasPermission := false
			for _, a := range actions {
				if a == action {
					hasPermission = true
					break
				}
			}

			if !hasPermission {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error": "You do not have permission to perform this action",
				})
			}

			return c.Next()
		}
	}

	// Asset routes
	assets := app.Group("/api/v1/assets")
	assets.Use(testAuthMiddleware(db))

	assets.Get("/stats",
		testRequirePermission(db, "asset", "read"),
		handler.GetAssetStats,
	)

	assets.Post("/check-duplicate",
		testRequirePermission(db, "asset", "read"),
		handler.CheckDuplicateAsset,
	)

	assets.Get("/",
		testRequirePermission(db, "asset", "read"),
		handler.ListAssets,
	)

	assets.Get("/:id",
		testRequirePermission(db, "asset", "read"),
		handler.GetAsset,
	)

	assets.Post("/",
		testRequirePermission(db, "asset", "write"),
		handler.CreateAsset,
	)

	assets.Put("/:id",
		testRequirePermission(db, "asset", "write"),
		handler.UpdateAsset,
	)

	assets.Patch("/:id/status",
		testRequirePermission(db, "asset", "admin"),
		handler.UpdateAssetStatus,
	)

	assets.Get("/:id/vulnerabilities",
		testRequirePermission(db, "asset", "read"),
		handler.GetAssetVulnerabilities,
	)

	assets.Post("/:id/tags",
		testRequirePermission(db, "asset", "write"),
		handler.AddAssetTags,
	)

	assets.Delete("/:id/tags/:tag",
		testRequirePermission(db, "asset", "write"),
		handler.RemoveAssetTag,
	)

	assets.Delete("/:id",
		testRequirePermission(db, "asset", "delete"),
		handler.DeleteAsset,
	)
}

// cleanup closes database connection
func (ta *TestApp) cleanup() {
	if ta.DB != nil {
		sqlDB, _ := ta.DB.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}
}

// createTestUser creates a test user with specified role and returns auth token
func (ta *TestApp) createTestUser(t *testing.T, roleName string, permissions map[string][]string) *TestUser {
	// Create role with permissions
	permissionsJSON, _ := json.Marshal(permissions)
	role := &models.Role{
		Name:        roleName,
		DisplayName: roleName,
		Permissions: string(permissionsJSON),
		Level:       100,
		IsDefault:   false,
		IsSystem:    false,
	}
	require.NoError(t, ta.DB.Create(role).Error)

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	require.NoError(t, err)

	// Create user
	roleIDStr := role.ID.String()
	user := &models.User{
		Email:    fmt.Sprintf("%s@test.com", roleName),
		Password: string(hashedPassword),
		Name:     fmt.Sprintf("Test %s", roleName),
		RoleID:   &roleIDStr,
		Role:     role,
	}
	require.NoError(t, ta.DB.Create(user).Error)

	// Create session
	session := &models.Session{
		UserID:    user.ID,
		Token:     uuid.New().String(),
		ExpiresAt: time.Now().Add(24 * 365 * 10 * time.Hour), // 10 years for testing
		IPAddress: "127.0.0.1",
		UserAgent: "Test Agent",
	}
	require.NoError(t, ta.DB.Create(session).Error)

	// Preload user into session
	require.NoError(t, ta.DB.Preload("User.Role").First(session, session.ID).Error)

	return &TestUser{
		User:     user,
		Session:  session,
		Token:    session.Token,
		RoleName: roleName,
	}
}

// makeRequest makes an HTTP request to the test app
func (ta *TestApp) makeRequest(t *testing.T, method, path string, body interface{}, token string) *httptest.ResponseRecorder {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		require.NoError(t, err)
		bodyReader = bytes.NewReader(jsonBody)
	}

	req := httptest.NewRequest(method, path, bodyReader)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	}

	resp, err := ta.App.Test(req, -1) // -1 means no timeout
	require.NoError(t, err)

	// Convert response to ResponseRecorder for easier testing
	recorder := httptest.NewRecorder()
	recorder.Code = resp.StatusCode
	body_bytes, _ := io.ReadAll(resp.Body)
	recorder.Body.Write(body_bytes)

	return recorder
}

// parseJSONResponse parses JSON response body
func parseJSONResponse(t *testing.T, resp *httptest.ResponseRecorder, target interface{}) {
	err := json.Unmarshal(resp.Body.Bytes(), target)
	require.NoError(t, err, "Failed to parse JSON response")
}

// TestAssetAPI_CreateAsset tests POST /api/v1/assets endpoint
func TestAssetAPI_CreateAsset(t *testing.T) {
	app := setupTestApp(t)
	defer app.cleanup()

	// Create test users with different permissions
	adminUser := app.createTestUser(t, "admin", map[string][]string{
		"asset": {"read", "write", "delete", "admin"},
	})
	analystUser := app.createTestUser(t, "analyst", map[string][]string{
		"asset": {"read", "write"},
	})
	viewerUser := app.createTestUser(t, "viewer", map[string][]string{
		"asset": {"read"},
	})

	t.Run("successful creation with all fields", func(t *testing.T) {
		payload := map[string]interface{}{
			"hostname":    "test-server-01",
			"ip_address":  "192.168.1.100",
			"asset_id":    "ASSET-001",
			"system_type": "SERVER",
			"description": "Test server",
			"environment": "PRODUCTION",
			"criticality": "HIGH",
			"department":  "IT",
			"location":    "Data Center A",
		}

		resp := app.makeRequest(t, "POST", "/api/v1/assets", payload, adminUser.Token)
		t.Logf("Response code: %d, body: %s", resp.Code, resp.Body.String())
		assert.Equal(t, fiber.StatusCreated, resp.Code)

		var result map[string]interface{}
		parseJSONResponse(t, resp, &result)
		t.Logf("Parsed result: %+v", result)
		assert.Equal(t, "Asset created successfully", result["message"])
		assert.NotNil(t, result["data"])

		// Verify asset in database
		var asset models.AffectedSystem
		err := app.DB.Where("hostname = ?", "test-server-01").First(&asset).Error
		require.NoError(t, err)
		assert.Equal(t, "test-server-01", asset.Hostname)
		assert.Equal(t, "192.168.1.100", asset.IPAddress)
	})

	t.Run("creation with minimum required fields", func(t *testing.T) {
		payload := map[string]interface{}{
			"hostname":    "minimal-server",
			"system_type": "SERVER",
			"environment": "DEVELOPMENT",
		}

		resp := app.makeRequest(t, "POST", "/api/v1/assets", payload, analystUser.Token)
		assert.Equal(t, fiber.StatusCreated, resp.Code)
	})

	t.Run("validation error - missing hostname", func(t *testing.T) {
		payload := map[string]interface{}{
			"system_type": "SERVER",
			"environment": "PRODUCTION",
		}

		resp := app.makeRequest(t, "POST", "/api/v1/assets", payload, adminUser.Token)
		assert.Equal(t, fiber.StatusBadRequest, resp.Code)

		var result map[string]interface{}
		parseJSONResponse(t, resp, &result)
		assert.Contains(t, result["error"], "required")
	})

	t.Run("validation error - invalid system_type", func(t *testing.T) {
		payload := map[string]interface{}{
			"hostname":    "invalid-type-server",
			"system_type": "INVALID_TYPE",
			"environment": "PRODUCTION",
		}

		resp := app.makeRequest(t, "POST", "/api/v1/assets", payload, adminUser.Token)
		assert.Equal(t, fiber.StatusBadRequest, resp.Code)
	})

	t.Run("duplicate hostname in same environment", func(t *testing.T) {
		// Create first asset
		payload1 := map[string]interface{}{
			"hostname":    "duplicate-host",
			"system_type": "SERVER",
			"environment": "PRODUCTION",
		}
		resp1 := app.makeRequest(t, "POST", "/api/v1/assets", payload1, adminUser.Token)
		assert.Equal(t, fiber.StatusCreated, resp1.Code)

		// Try to create duplicate
		payload2 := map[string]interface{}{
			"hostname":    "duplicate-host",
			"system_type": "SERVER",
			"environment": "PRODUCTION",
		}
		resp2 := app.makeRequest(t, "POST", "/api/v1/assets", payload2, adminUser.Token)
		assert.Equal(t, fiber.StatusConflict, resp2.Code)

		var result map[string]interface{}
		parseJSONResponse(t, resp2, &result)
		assert.Contains(t, result["error"], "duplicate")
	})

	t.Run("same hostname in different environment succeeds", func(t *testing.T) {
		// Create in PRODUCTION
		payload1 := map[string]interface{}{
			"hostname":    "multi-env-host",
			"system_type": "SERVER",
			"environment": "PRODUCTION",
		}
		resp1 := app.makeRequest(t, "POST", "/api/v1/assets", payload1, adminUser.Token)
		assert.Equal(t, fiber.StatusCreated, resp1.Code)

		// Create in STAGING (should succeed)
		payload2 := map[string]interface{}{
			"hostname":    "multi-env-host",
			"system_type": "SERVER",
			"environment": "STAGING",
		}
		resp2 := app.makeRequest(t, "POST", "/api/v1/assets", payload2, adminUser.Token)
		assert.Equal(t, fiber.StatusCreated, resp2.Code)
	})

	t.Run("unauthorized - no token", func(t *testing.T) {
		payload := map[string]interface{}{
			"hostname":    "unauthorized-test",
			"system_type": "SERVER",
			"environment": "PRODUCTION",
		}

		resp := app.makeRequest(t, "POST", "/api/v1/assets", payload, "")
		assert.Equal(t, fiber.StatusUnauthorized, resp.Code)
	})

	t.Run("forbidden - insufficient permissions", func(t *testing.T) {
		payload := map[string]interface{}{
			"hostname":    "forbidden-test",
			"system_type": "SERVER",
			"environment": "PRODUCTION",
		}

		resp := app.makeRequest(t, "POST", "/api/v1/assets", payload, viewerUser.Token)
		assert.Equal(t, fiber.StatusForbidden, resp.Code)

		var result map[string]interface{}
		parseJSONResponse(t, resp, &result)
		assert.Contains(t, result["error"], "permission")
	})
}

// TestAssetAPI_ListAssets tests GET /api/v1/assets endpoint
func TestAssetAPI_ListAssets(t *testing.T) {
	app := setupTestApp(t)
	defer app.cleanup()

	adminUser := app.createTestUser(t, "admin", map[string][]string{
		"asset": {"read", "write", "delete", "admin"},
	})

	// Seed test assets
	assetService := services.NewAssetService(app.DB)
	assets := []models.AffectedSystem{
		{
			Hostname:    "api-web-server-01",
			IPAddress:   "192.168.2.10",
			SystemType:  models.SystemTypeServer,
			Environment: models.EnvProduction,
			Criticality: criticalityPtr(models.CriticalityCritical),
			Status:      models.StatusActive,
		},
		{
			Hostname:    "api-web-server-02",
			IPAddress:   "192.168.2.11",
			SystemType:  models.SystemTypeServer,
			Environment: models.EnvProduction,
			Criticality: criticalityPtr(models.CriticalityHigh),
			Status:      models.StatusActive,
		},
		{
			Hostname:    "api-db-server-01",
			IPAddress:   "192.168.2.12",
			SystemType:  models.SystemTypeServer,
			Environment: models.EnvStaging,
			Criticality: criticalityPtr(models.CriticalityMedium),
			Status:      models.StatusActive,
		},
	}
	for i := range assets {
		require.NoError(t, assetService.Create(&assets[i]))
	}

	t.Run("list all assets with default pagination", func(t *testing.T) {
		resp := app.makeRequest(t, "GET", "/api/v1/assets", nil, adminUser.Token)
		assert.Equal(t, fiber.StatusOK, resp.Code)

		var result map[string]interface{}
		parseJSONResponse(t, resp, &result)

		data := result["data"].(map[string]interface{})
		assets := data["assets"].([]interface{})
		assert.GreaterOrEqual(t, len(assets), 3)
		assert.Equal(t, float64(1), data["page"])
	})

	t.Run("list with pagination", func(t *testing.T) {
		resp := app.makeRequest(t, "GET", "/api/v1/assets?page=1&limit=2", nil, adminUser.Token)
		assert.Equal(t, fiber.StatusOK, resp.Code)

		var result map[string]interface{}
		parseJSONResponse(t, resp, &result)

		data := result["data"].(map[string]interface{})
		assets := data["assets"].([]interface{})
		assert.LessOrEqual(t, len(assets), 2)
	})

	t.Run("filter by environment", func(t *testing.T) {
		resp := app.makeRequest(t, "GET", "/api/v1/assets?environment=PRODUCTION", nil, adminUser.Token)
		assert.Equal(t, fiber.StatusOK, resp.Code)

		var result map[string]interface{}
		parseJSONResponse(t, resp, &result)

		data := result["data"].(map[string]interface{})
		assets := data["assets"].([]interface{})
		assert.Equal(t, 2, len(assets))
	})

	t.Run("search by hostname", func(t *testing.T) {
		resp := app.makeRequest(t, "GET", "/api/v1/assets?search=web-server", nil, adminUser.Token)
		assert.Equal(t, fiber.StatusOK, resp.Code)

		var result map[string]interface{}
		parseJSONResponse(t, resp, &result)

		data := result["data"].(map[string]interface{})
		assets := data["assets"].([]interface{})
		assert.GreaterOrEqual(t, len(assets), 2)
	})

	t.Run("unauthorized access", func(t *testing.T) {
		resp := app.makeRequest(t, "GET", "/api/v1/assets", nil, "")
		assert.Equal(t, fiber.StatusUnauthorized, resp.Code)
	})
}

// TestAssetAPI_GetAsset tests GET /api/v1/assets/:id endpoint
func TestAssetAPI_GetAsset(t *testing.T) {
	app := setupTestApp(t)
	defer app.cleanup()

	adminUser := app.createTestUser(t, "admin", map[string][]string{
		"asset": {"read", "write", "delete", "admin"},
	})

	// Create test asset
	assetService := services.NewAssetService(app.DB)
	asset := &models.AffectedSystem{
		Hostname:    "api-get-test",
		IPAddress:   "192.168.3.10",
		SystemType:  models.SystemTypeServer,
		Environment: models.EnvProduction,
	}
	require.NoError(t, assetService.Create(asset))

	t.Run("get existing asset", func(t *testing.T) {
		resp := app.makeRequest(t, "GET", fmt.Sprintf("/api/v1/assets/%s", asset.ID), nil, adminUser.Token)
		assert.Equal(t, fiber.StatusOK, resp.Code)

		var result map[string]interface{}
		parseJSONResponse(t, resp, &result)

		data := result["data"].(map[string]interface{})
		assert.Equal(t, "api-get-test", data["hostname"])
	})

	t.Run("get non-existent asset", func(t *testing.T) {
		randomID := uuid.New().String()
		resp := app.makeRequest(t, "GET", fmt.Sprintf("/api/v1/assets/%s", randomID), nil, adminUser.Token)
		assert.Equal(t, fiber.StatusNotFound, resp.Code)
	})

	t.Run("get with invalid UUID", func(t *testing.T) {
		resp := app.makeRequest(t, "GET", "/api/v1/assets/invalid-uuid", nil, adminUser.Token)
		assert.Equal(t, fiber.StatusBadRequest, resp.Code)
	})
}

// TestAssetAPI_UpdateAsset tests PUT /api/v1/assets/:id endpoint
func TestAssetAPI_UpdateAsset(t *testing.T) {
	app := setupTestApp(t)
	defer app.cleanup()

	adminUser := app.createTestUser(t, "admin", map[string][]string{
		"asset": {"read", "write", "delete", "admin"},
	})

	// Create test asset
	assetService := services.NewAssetService(app.DB)
	asset := &models.AffectedSystem{
		Hostname:    "api-update-test",
		IPAddress:   "192.168.4.10",
		SystemType:  models.SystemTypeServer,
		Environment: models.EnvProduction,
		Criticality: criticalityPtr(models.CriticalityMedium),
	}
	require.NoError(t, assetService.Create(asset))

	t.Run("successful update", func(t *testing.T) {
		payload := map[string]interface{}{
			"criticality": "HIGH",
			"description": "Updated description",
		}

		resp := app.makeRequest(t, "PUT", fmt.Sprintf("/api/v1/assets/%s", asset.ID), payload, adminUser.Token)
		assert.Equal(t, fiber.StatusOK, resp.Code)

		// Verify update in database
		var updated models.AffectedSystem
		err := app.DB.First(&updated, asset.ID).Error
		require.NoError(t, err)
		assert.Equal(t, models.CriticalityHigh, *updated.Criticality)
		assert.Equal(t, "Updated description", updated.Description)
	})

	t.Run("update non-existent asset", func(t *testing.T) {
		randomID := uuid.New().String()
		payload := map[string]interface{}{
			"criticality": "HIGH",
		}

		resp := app.makeRequest(t, "PUT", fmt.Sprintf("/api/v1/assets/%s", randomID), payload, adminUser.Token)
		assert.Equal(t, fiber.StatusNotFound, resp.Code)
	})
}

// TestAssetAPI_DeleteAsset tests DELETE /api/v1/assets/:id endpoint
func TestAssetAPI_DeleteAsset(t *testing.T) {
	app := setupTestApp(t)
	defer app.cleanup()

	adminUser := app.createTestUser(t, "admin", map[string][]string{
		"asset": {"read", "write", "delete", "admin"},
	})
	analystUser := app.createTestUser(t, "analyst2", map[string][]string{
		"asset": {"read", "write"},
	})

	// Create test asset
	assetService := services.NewAssetService(app.DB)
	asset := &models.AffectedSystem{
		Hostname:    "api-delete-test",
		IPAddress:   "192.168.5.10",
		SystemType:  models.SystemTypeServer,
		Environment: models.EnvProduction,
	}
	require.NoError(t, assetService.Create(asset))

	t.Run("successful soft delete", func(t *testing.T) {
		resp := app.makeRequest(t, "DELETE", fmt.Sprintf("/api/v1/assets/%s", asset.ID), nil, adminUser.Token)
		assert.Equal(t, fiber.StatusOK, resp.Code)

		// Verify soft delete
		var deleted models.AffectedSystem
		err := app.DB.First(&deleted, asset.ID).Error
		assert.Error(t, err) // Should not find in normal queries

		// Verify exists with Unscoped
		err = app.DB.Unscoped().First(&deleted, asset.ID).Error
		require.NoError(t, err)
		assert.NotNil(t, deleted.DeletedAt)
	})

	t.Run("forbidden - insufficient permissions", func(t *testing.T) {
		asset2 := &models.AffectedSystem{
			Hostname:    "api-delete-test-2",
			IPAddress:   "192.168.5.11",
			SystemType:  models.SystemTypeServer,
			Environment: models.EnvProduction,
		}
		require.NoError(t, assetService.Create(asset2))

		resp := app.makeRequest(t, "DELETE", fmt.Sprintf("/api/v1/assets/%s", asset2.ID), nil, analystUser.Token)
		assert.Equal(t, fiber.StatusForbidden, resp.Code)
	})
}

// Helper function for criticality pointer
func criticalityPtr(c models.AssetCriticality) *models.AssetCriticality {
	return &c
}
