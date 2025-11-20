package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/cyops/cyops-backend/internal/middleware"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/config"
	"github.com/cyops/cyops-backend/pkg/database"
)

// SetupRoutes configures all application routes
func SetupRoutes(app *fiber.App, cfg *config.Config) {
	// Health check routes at root level
	healthHandler := NewHealthHandler()
	app.Get("/health", healthHandler.Health)
	app.Get("/health/ready", healthHandler.Ready)
	app.Get("/health/live", healthHandler.Live)

	// API v1 group
	api := app.Group("/api/v1")

	// API info endpoint
	api.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Welcome to Auth API v1",
			"version": "1.0.0",
			"status":  "operational",
		})
	})

	// Auth routes
	auth := api.Group("/auth")
	SetupAuthRoutes(auth, cfg)

	// User routes (protected)
	users := api.Group("/users")
	SetupUserRoutes(users)

	// Profile routes (protected)
	profile := api.Group("/profile")
	SetupProfileRoutes(profile)

	// Two-Factor Authentication routes (protected)
	twoFactor := api.Group("/auth/2fa")
	SetupTwoFactorRoutes(twoFactor)

	// Admin routes (protected, admin only)
	admin := api.Group("/admin")
	SetupAdminRoutes(admin)

	// Vulnerability routes (protected)
	vulnerabilities := api.Group("/vulnerabilities")
	SetupVulnerabilityRoutes(vulnerabilities, cfg)

	// Affected system routes (protected)
	affectedSystems := api.Group("/affected-systems")
	SetupAffectedSystemRoutes(affectedSystems, middleware.AuthMiddleware())

	// Asset management routes (protected)
	assets := api.Group("/assets")
	SetupAssetRoutes(assets)

	// Assessment routes (protected)
	assessments := api.Group("/assessments")
	SetupAssessmentRoutes(assessments)

	// Report routes (protected)
	reports := api.Group("/reports")
	SetupReportRoutes(reports)

	// API Key management routes (protected)
	apiKeys := api.Group("/api-keys")
	SetupAPIKeyRoutes(apiKeys)

	// System Settings routes (protected, admin only)
	settings := api.Group("/settings")
	SetupSystemSettingsRoutes(settings)

	// API Documentation routes (public)
	docs := api.Group("/docs")
	SetupDocsRoutes(docs)
}

// SetupAuthRoutes configures authentication routes
func SetupAuthRoutes(router fiber.Router, cfg *config.Config) {
	handler := NewAuthHandler(cfg)

	// Public routes
	// Registration (with rate limiting)
	router.Post("/register", middleware.RegistrationRateLimiter(), handler.Register)

	// Email verification (with rate limiting)
	router.Post("/verify-email", middleware.AuthRateLimiter(), handler.VerifyEmail)

	// Login (with rate limiting)
	router.Post("/login", middleware.AuthRateLimiter(), handler.Login)

	// Password reset (with rate limiting)
	router.Post("/forgot-password", middleware.PasswordResetRateLimiter(), handler.ForgotPassword)
	router.Post("/reset-password", middleware.PasswordResetRateLimiter(), handler.ResetPassword)

	// Protected routes
	// Logout (requires authentication)
	router.Post("/logout", middleware.AuthMiddleware(), handler.Logout)

	// Placeholder for future auth routes
	router.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Auth endpoints",
			"endpoints": []string{
				"POST /register - User registration",
				"POST /verify-email - Email verification",
				"POST /login - User login",
				"POST /logout - User logout (requires auth)",
				"POST /forgot-password - Password reset request",
				"POST /reset-password - Password reset",
			},
		})
	})
}

// SetupUserRoutes configures user management routes
func SetupUserRoutes(router fiber.Router) {
	// Will be implemented in user handler
	router.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "User routes - coming soon",
		})
	})
}

// SetupProfileRoutes configures profile management routes
func SetupProfileRoutes(router fiber.Router) {
	handler := NewProfileHandler()

	// All profile routes require authentication
	router.Use(middleware.AuthMiddleware())

	// Profile management
	router.Get("/", handler.GetProfile)
	router.Put("/", handler.UpdateProfile)
	router.Post("/change-password", handler.ChangePassword)

	// Session management
	router.Get("/sessions", handler.GetActiveSessions)
	router.Delete("/sessions/:id", handler.RevokeSession)
	router.Delete("/sessions", handler.RevokeAllSessions)
}

// SetupTwoFactorRoutes configures 2FA routes
func SetupTwoFactorRoutes(router fiber.Router) {
	handler := NewTwoFactorHandler()

	// All 2FA routes require authentication
	router.Use(middleware.AuthMiddleware())

	// 2FA management
	router.Post("/enable", handler.EnableTwoFactor)
	router.Post("/verify", handler.VerifyTwoFactor)
	router.Post("/disable", handler.DisableTwoFactor)
}

// SetupAdminRoutes configures admin routes
func SetupAdminRoutes(router fiber.Router) {
	adminHandler := NewAdminHandler()
	roleHandler := NewRoleHandler()

	// All admin routes require authentication and admin role
	router.Use(middleware.AuthMiddleware())
	router.Use(middleware.RequireAdmin())

	// User management
	router.Get("/users", adminHandler.ListUsers)
	router.Post("/users", adminHandler.CreateUser)
	router.Get("/users/:id", adminHandler.GetUser)
	router.Put("/users/:id/role", adminHandler.AssignRole)
	router.Put("/users/:id/status", adminHandler.UpdateUserStatus)
	router.Delete("/users/:id", adminHandler.DeleteUser)

	// Role management
	router.Get("/roles", roleHandler.ListRoles)
	router.Get("/roles/:id", roleHandler.GetRole)
	router.Post("/roles", roleHandler.CreateRole)
	router.Put("/roles/:id", roleHandler.UpdateRole)
	router.Delete("/roles/:id", roleHandler.DeleteRole)

	// Database cleanup management
	router.Get("/cleanup/stats", adminHandler.GetCleanupStats)
	router.Post("/cleanup/assets", adminHandler.CleanupAssets)
	router.Post("/cleanup/vulnerabilities", adminHandler.CleanupVulnerabilities)
	router.Post("/cleanup/all", adminHandler.CleanupAllData)
}

// SetupVulnerabilityRoutes configures vulnerability management routes
func SetupVulnerabilityRoutes(router fiber.Router, cfg *config.Config) {
	handler := NewVulnerabilityHandler()

	// All vulnerability routes require authentication
	router.Use(middleware.AuthMiddleware())

	// Get vulnerability statistics (requires vulnerability:read permission)
	// Note: This must come BEFORE /:id to avoid route conflict
	router.Get("/stats",
		middleware.RequirePermission("vulnerability", "read"),
		middleware.RequireScope("vulnerabilities:read"),
		handler.GetVulnerabilityStats,
	)

	// Integration configuration routes (must come BEFORE /:id to avoid route conflict)
	integrationHandler := NewIntegrationConfigHandler(cfg.JWTSecret)
	router.Post("/integrations/configs",
		middleware.RequirePermission("integration", "configure"),
		integrationHandler.CreateConfig,
	)
	router.Get("/integrations/configs",
		middleware.RequirePermission("integration", "read"),
		integrationHandler.ListConfigs,
	)
	router.Get("/integrations/configs/:id",
		middleware.RequirePermission("integration", "read"),
		integrationHandler.GetConfig,
	)
	router.Put("/integrations/configs/:id",
		middleware.RequirePermission("integration", "configure"),
		integrationHandler.UpdateConfig,
	)
	router.Delete("/integrations/configs/:id",
		middleware.RequirePermission("integration", "configure"),
		integrationHandler.DeleteConfig,
	)
	router.Post("/integrations/configs/:id/test",
		middleware.RequirePermission("integration", "test"),
		integrationHandler.TestConnection,
	)

	// Import routes (must come BEFORE /:id to avoid route conflict)
	importHandler := NewVulnerabilityImportHandler()
	router.Post("/import/nessus/preview",
		middleware.RequirePermission("vulnerability", "import"),
		importHandler.PreviewNessusFile,
	)
	router.Post("/import/nessus",
		middleware.RequirePermission("vulnerability", "import"),
		importHandler.UploadNessusFile,
	)

	// Nessus API integration routes (scan browsing and import)
	nessusScanHandler := NewNessusScanHandler(cfg.JWTSecret)

	// List all scans from Nessus
	router.Get("/integrations/nessus/:config_id/scans",
		middleware.RequirePermission("vulnerability", "read"),
		nessusScanHandler.ListScans,
	)

	// Get scan details
	router.Get("/integrations/nessus/:config_id/scans/:scan_id",
		middleware.RequirePermission("vulnerability", "read"),
		nessusScanHandler.GetScanDetails,
	)

	// Preview scan before importing
	router.Get("/integrations/nessus/:config_id/scans/:scan_id/preview",
		middleware.RequirePermission("vulnerability", "read"),
		nessusScanHandler.PreviewScan,
	)

	// Import single scan
	router.Post("/integrations/nessus/:config_id/scans/:scan_id/import",
		middleware.RequirePermission("vulnerability", "import"),
		nessusScanHandler.ImportSingleScan,
	)

	// Import multiple selected scans
	router.Post("/integrations/nessus/:config_id/scans/import-multiple",
		middleware.RequirePermission("vulnerability", "import"),
		nessusScanHandler.ImportMultipleScans,
	)

	// Import all scans
	router.Post("/integrations/nessus/:config_id/scans/import-all",
		middleware.RequirePermission("vulnerability", "import"),
		nessusScanHandler.ImportAllScans,
	)

	// Finding management routes (must come BEFORE /:id to avoid route conflict)
	findingHandler := NewVulnerabilityFindingHandler()

	// Get findings statistics (must come BEFORE /findings/:id)
	router.Get("/findings/stats",
		middleware.RequirePermission("finding", "read"),
		findingHandler.GetFindingStatistics,
	)

	// List all findings with filters
	router.Get("/findings",
		middleware.RequirePermission("finding", "read"),
		findingHandler.ListFindings,
	)

	// Get specific finding details
	router.Get("/findings/:id",
		middleware.RequirePermission("finding", "read"),
		findingHandler.GetFinding,
	)

	// Mark finding as fixed
	router.Post("/findings/:id/mark-fixed",
		middleware.RequirePermission("finding", "mark_fixed"),
		findingHandler.MarkFindingFixed,
	)

	// Mark finding as verified
	router.Post("/findings/:id/mark-verified",
		middleware.RequirePermission("finding", "verify"),
		findingHandler.MarkFindingVerified,
	)

	// Accept risk for a finding
	router.Post("/findings/:id/accept-risk",
		middleware.RequirePermission("finding", "accept_risk"),
		findingHandler.AcceptRisk,
	)

	// Finding attachment routes
	attachmentHandler := NewFindingAttachmentHandler()

	// Upload attachment to a finding
	router.Post("/findings/:id/attachments",
		middleware.RequirePermission("finding", "upload_attachment"),
		attachmentHandler.UploadAttachment,
	)

	// List attachments for a finding
	router.Get("/findings/:id/attachments",
		middleware.RequirePermission("finding", "read"),
		attachmentHandler.ListFindingAttachments,
	)

	// Get attachment stats for a finding
	router.Get("/findings/:id/attachments/stats",
		middleware.RequirePermission("finding", "read"),
		attachmentHandler.GetAttachmentStats,
	)

	// Get attachment metadata
	router.Get("/attachments/:id",
		middleware.RequirePermission("finding", "read"),
		attachmentHandler.GetAttachment,
	)

	// View/serve attachment file (inline)
	router.Get("/attachments/:id/file",
		middleware.RequirePermission("finding", "read"),
		attachmentHandler.GetAttachmentFile,
	)

	// Download attachment file
	router.Get("/attachments/:id/download",
		middleware.RequirePermission("finding", "read"),
		attachmentHandler.DownloadAttachmentFile,
	)

	// Delete attachment
	router.Delete("/attachments/:id",
		middleware.RequirePermission("finding", "upload_attachment"),
		attachmentHandler.DeleteAttachment,
	)

	// Vulnerability attachment routes
	vulnAttachmentHandler := NewVulnerabilityAttachmentHandler()

	// Upload attachment to a vulnerability
	router.Post("/:id/attachments",
		middleware.RequirePermission("vulnerability", "write"),
		vulnAttachmentHandler.UploadAttachment,
	)

	// List attachments for a vulnerability
	router.Get("/:id/attachments",
		middleware.RequirePermission("vulnerability", "read"),
		vulnAttachmentHandler.ListVulnerabilityAttachments,
	)

	// Get attachment stats for a vulnerability
	router.Get("/:id/attachments/stats",
		middleware.RequirePermission("vulnerability", "read"),
		vulnAttachmentHandler.GetAttachmentStats,
	)

	// Get vulnerability attachment metadata
	router.Get("/vulnerability-attachments/:id",
		middleware.RequirePermission("vulnerability", "read"),
		vulnAttachmentHandler.GetAttachment,
	)

	// View/serve vulnerability attachment file (inline)
	router.Get("/vulnerability-attachments/:id/file",
		middleware.RequirePermission("vulnerability", "read"),
		vulnAttachmentHandler.GetAttachmentFile,
	)

	// Download vulnerability attachment file
	router.Get("/vulnerability-attachments/:id/download",
		middleware.RequirePermission("vulnerability", "read"),
		vulnAttachmentHandler.DownloadAttachmentFile,
	)

	// Delete vulnerability attachment
	router.Delete("/vulnerability-attachments/:id",
		middleware.RequirePermission("vulnerability", "write"),
		vulnAttachmentHandler.DeleteAttachment,
	)

	// List vulnerabilities (requires vulnerability:read permission)
	router.Get("/",
		middleware.RequirePermission("vulnerability", "read"),
		middleware.RequireScope("vulnerabilities:read"),
		handler.ListVulnerabilities,
	)

	// Get vulnerability details (requires vulnerability:read permission)
	router.Get("/:id",
		middleware.RequirePermission("vulnerability", "read"),
		middleware.RequireScope("vulnerabilities:read"),
		handler.GetVulnerability,
	)

	// Create vulnerability (requires vulnerability:write permission, with rate limiting)
	router.Post("/",
		middleware.VulnerabilityCreationRateLimiter(),
		middleware.RequirePermission("vulnerability", "write"),
		middleware.RequireScope("vulnerabilities:write"),
		handler.CreateVulnerability,
	)

	// Update vulnerability (requires vulnerability:write permission)
	router.Put("/:id",
		middleware.RequirePermission("vulnerability", "write"),
		middleware.RequireScope("vulnerabilities:write"),
		handler.UpdateVulnerability,
	)

	// Update vulnerability status (requires vulnerability:status_change permission)
	router.Patch("/:id/status",
		middleware.RequirePermission("vulnerability", "status_change"),
		middleware.RequireScope("vulnerabilities:write"),
		handler.UpdateVulnerabilityStatus,
	)

	// Assign vulnerability (requires vulnerability:assign permission)
	router.Patch("/:id/assign",
		middleware.RequirePermission("vulnerability", "assign"),
		middleware.RequireScope("vulnerabilities:write"),
		handler.AssignVulnerability,
	)

	// Delete vulnerability (requires vulnerability:delete permission)
	router.Delete("/:id",
		middleware.RequirePermission("vulnerability", "delete"),
		middleware.RequireScope("vulnerabilities:delete"),
		handler.DeleteVulnerability,
	)

	// Affected systems routes
	affectedSystemHandler := NewAffectedSystemHandler()

	router.Get("/:id/affected-systems",
		middleware.RequirePermission("vulnerability", "read"),
		affectedSystemHandler.GetVulnerabilityAffectedSystems,
	)

	router.Post("/:id/affected-systems",
		middleware.RequirePermission("vulnerability", "write"),
		affectedSystemHandler.AddVulnerabilityAffectedSystems,
	)

	router.Delete("/:id/affected-systems/:system_id",
		middleware.RequirePermission("vulnerability", "write"),
		affectedSystemHandler.RemoveVulnerabilityAffectedSystem,
	)

	// List findings for a specific vulnerability
	router.Get("/:id/findings",
		middleware.RequirePermission("vulnerability", "read"),
		findingHandler.ListFindingsByVulnerability,
	)
}

// SetupAffectedSystemRoutes sets up all affected system related routes
func SetupAffectedSystemRoutes(router fiber.Router, authMiddleware fiber.Handler) {
	handler := NewAffectedSystemHandler()

	// All routes require authentication
	router.Use(authMiddleware)

	// List affected systems (requires vulnerability:read permission)
	router.Get("/",
		middleware.RequirePermission("vulnerability", "read"),
		handler.ListAffectedSystems,
	)

	// Create affected system (requires vulnerability:write permission)
	router.Post("/",
		middleware.RequirePermission("vulnerability", "write"),
		handler.CreateAffectedSystem,
	)

	// Get single affected system (requires vulnerability:read permission)
	router.Get("/:id",
		middleware.RequirePermission("vulnerability", "read"),
		handler.GetAffectedSystem,
	)

	// Update affected system (requires vulnerability:write permission)
	router.Put("/:id",
		middleware.RequirePermission("vulnerability", "write"),
		handler.UpdateAffectedSystem,
	)

	// Delete affected system (requires vulnerability:delete permission)
	router.Delete("/:id",
		middleware.RequirePermission("vulnerability", "delete"),
		handler.DeleteAffectedSystem,
	)

	// List findings for a specific system/asset
	findingHandler := NewVulnerabilityFindingHandler()
	router.Get("/:id/findings",
		middleware.RequirePermission("vulnerability", "read"),
		findingHandler.ListFindingsBySystem,
	)
}

// SetupAssetRoutes configures asset management routes
func SetupAssetRoutes(router fiber.Router) {
	handler := NewAssetHandler(
		services.NewAssetService(database.GetDB()),
		services.NewAssetValidationService(database.GetDB()),
		services.NewAssetSearchService(database.GetDB()),
	)

	// All asset routes require authentication
	router.Use(middleware.AuthMiddleware())

	// Get asset statistics (requires asset:read permission)
	// Note: This must come BEFORE /:id to avoid route conflict
	router.Get("/stats",
		middleware.RequirePermission("asset", "read"),
		handler.GetAssetStats,
	)

	// Check for duplicate assets (requires asset:read permission)
	router.Post("/check-duplicate",
		middleware.RequirePermission("asset", "read"),
		handler.CheckDuplicateAsset,
	)

	// List assets (requires asset:read permission)
	router.Get("/",
		middleware.RequirePermission("asset", "read"),
		handler.ListAssets,
	)

	// Get asset details (requires asset:read permission)
	router.Get("/:id",
		middleware.RequirePermission("asset", "read"),
		handler.GetAsset,
	)

	// Create asset (requires asset:write permission)
	router.Post("/",
		middleware.RequirePermission("asset", "write"),
		handler.CreateAsset,
	)

	// Update asset (requires asset:write permission)
	router.Put("/:id",
		middleware.RequirePermission("asset", "write"),
		handler.UpdateAsset,
	)

	// Update asset status (requires asset:write permission)
	router.Patch("/:id/status",
		middleware.RequirePermission("asset", "write"),
		handler.UpdateAssetStatus,
	)

	// Get asset vulnerabilities (requires asset:read permission)
	router.Get("/:id/vulnerabilities",
		middleware.RequirePermission("asset", "read"),
		handler.GetAssetVulnerabilities,
	)

	// Get asset findings (requires asset:read permission)
	findingHandler := NewVulnerabilityFindingHandler()
	router.Get("/:id/findings",
		middleware.RequirePermission("asset", "read"),
		findingHandler.ListFindingsBySystem,
	)

	// Add tags to asset (requires asset:write permission)
	router.Post("/:id/tags",
		middleware.RequirePermission("asset", "write"),
		handler.AddAssetTags,
	)

	// Remove tag from asset (requires asset:write permission)
	router.Delete("/:id/tags/:tag",
		middleware.RequirePermission("asset", "write"),
		handler.RemoveAssetTag,
	)

	// Delete asset (requires asset:delete permission)
	router.Delete("/:id",
		middleware.RequirePermission("asset", "delete"),
		handler.DeleteAsset,
	)
}

// SetupDocsRoutes configures API documentation routes
func SetupDocsRoutes(router fiber.Router) {
	handler := NewDocsHandler()

	// Serve OpenAPI spec at /api/v1/docs/openapi.yaml
	router.Get("/openapi.yaml", handler.ServeOpenAPISpec)

	// Serve Swagger UI at /api/v1/docs (default)
	router.Get("/", handler.ServeSwaggerUI)
	router.Get("/swagger", handler.ServeSwaggerUI)

	// Serve Redoc UI at /api/v1/docs/redoc (alternative documentation)
	router.Get("/redoc", handler.ServeRedocUI)
}

// SetupAssessmentRoutes configures assessment management routes
func SetupAssessmentRoutes(router fiber.Router) {
	handler := NewAssessmentHandler()

	// All assessment routes require authentication
	router.Use(middleware.AuthMiddleware())

	// Get assessment statistics (requires assessment:read permission)
	router.Get("/stats",
		middleware.RequirePermission("assessment", "read"),
		handler.GetAssessmentStats,
	)

	// List assessments (requires assessment:read permission)
	router.Get("/",
		middleware.RequirePermission("assessment", "read"),
		handler.ListAssessments,
	)

	// Get assessment details (requires assessment:read permission)
	router.Get("/:id",
		middleware.RequirePermission("assessment", "read"),
		handler.GetAssessment,
	)

	// Create assessment (requires assessment:create permission)
	router.Post("/",
		middleware.RequirePermission("assessment", "create"),
		handler.CreateAssessment,
	)

	// Update assessment (requires assessment:update permission)
	router.Put("/:id",
		middleware.RequirePermission("assessment", "update"),
		handler.UpdateAssessment,
	)

	// Delete assessment (requires assessment:delete permission)
	router.Delete("/:id",
		middleware.RequirePermission("assessment", "delete"),
		handler.DeleteAssessment,
	)

	// Link vulnerability to assessment (requires assessment:link_vulnerability permission)
	router.Post("/:id/vulnerabilities",
		middleware.RequirePermission("assessment", "link_vulnerability"),
		handler.LinkVulnerability,
	)

	// Unlink vulnerability from assessment (requires assessment:link_vulnerability permission)
	router.Delete("/:id/vulnerabilities/:vulnerability_id",
		middleware.RequirePermission("assessment", "link_vulnerability"),
		handler.UnlinkVulnerability,
	)

	// Link asset to assessment (requires assessment:update permission)
	router.Post("/:id/assets",
		middleware.RequirePermission("assessment", "update"),
		handler.LinkAsset,
	)

	// Unlink asset from assessment (requires assessment:update permission)
	router.Delete("/:id/assets/:asset_id",
		middleware.RequirePermission("assessment", "update"),
		handler.UnlinkAsset,
	)

	// Assessment report routes
	reportHandler := NewAssessmentReportHandler(services.NewAssessmentReportService(database.GetDB()))

	// Upload PDF report (requires assessment:upload_report permission)
	router.Post("/:id/reports",
		middleware.RequirePermission("assessment", "upload_report"),
		reportHandler.UploadReport,
	)

	// List reports for assessment (requires assessment:read permission)
	router.Get("/:id/reports",
		middleware.RequirePermission("assessment", "read"),
		reportHandler.GetAssessmentReports,
	)

	// Get report statistics (requires assessment:read permission)
	router.Get("/:id/reports/stats",
		middleware.RequirePermission("assessment", "read"),
		reportHandler.GetReportStats,
	)

	// Get specific report metadata (requires assessment:read permission)
	router.Get("/:id/reports/:reportId",
		middleware.RequirePermission("assessment", "read"),
		reportHandler.GetReport,
	)

	// Get report file for viewing/download (requires assessment:read permission)
	router.Get("/:id/reports/:reportId/file",
		middleware.RequirePermission("assessment", "read"),
		reportHandler.GetReportFile,
	)

	// Get report version history (requires assessment:read permission)
	router.Get("/:id/reports/:reportId/versions",
		middleware.RequirePermission("assessment", "read"),
		reportHandler.GetReportVersions,
	)

	// Delete report (requires assessment:delete permission)
	router.Delete("/:id/reports/:reportId",
		middleware.RequirePermission("assessment", "delete"),
		reportHandler.DeleteReport,
	)
}

// SetupReportRoutes configures report generation routes
func SetupReportRoutes(router fiber.Router) {
	db := database.GetDB()
	reportService := services.NewReportService(db)
	handler := NewReportHandler(reportService)

	// All report routes require authentication
	router.Use(middleware.AuthMiddleware())

	// Analyst report - detailed technical report (requires report:generate permission)
	router.Get("/analyst",
		middleware.RequirePermission("report", "generate"),
		handler.GetAnalystReport,
	)

	// Executive report - high-level metrics (requires report:generate permission)
	router.Get("/executive",
		middleware.RequirePermission("report", "generate"),
		handler.GetExecutiveReport,
	)

	// Audit report - compliance and audit trail (requires report:generate permission)
	router.Get("/audit",
		middleware.RequirePermission("report", "generate"),
		handler.GetAuditReport,
	)

	// Export endpoints (requires report:export permission)
	router.Get("/analyst/export/csv",
		middleware.RequirePermission("report", "export"),
		handler.ExportAnalystReportCSV,
	)

	router.Get("/executive/export/csv",
		middleware.RequirePermission("report", "export"),
		handler.ExportExecutiveReportCSV,
	)

	router.Get("/audit/export/csv",
		middleware.RequirePermission("report", "export"),
		handler.ExportAuditReportCSV,
	)
}

// SetupAPIKeyRoutes configures API key management routes
func SetupAPIKeyRoutes(router fiber.Router) {
	handler := NewAPIKeyHandler()

	// All API key routes require authentication
	router.Use(middleware.AuthMiddleware())

	// List user's API keys (no additional permission required - users manage their own keys)
	router.Get("/", handler.ListAPIKeys)

	// Create new API key (no additional permission required)
	router.Post("/", handler.CreateAPIKey)

	// Get specific API key (no additional permission required)
	router.Get("/:id", handler.GetAPIKey)

	// Update API key status (no additional permission required)
	router.Patch("/:id/status", handler.UpdateAPIKeyStatus)

	// Revoke API key (no additional permission required)
	router.Post("/:id/revoke", handler.RevokeAPIKey)

	// Delete API key (no additional permission required)
	router.Delete("/:id", handler.DeleteAPIKey)
}

// SetupSystemSettingsRoutes configures system settings routes
func SetupSystemSettingsRoutes(router fiber.Router) {
	handler := NewSystemSettingsHandler(
		services.NewSystemSettingsService(database.GetDB()),
	)

	// All system settings routes require authentication and admin permission
	router.Use(middleware.AuthMiddleware())
	router.Use(middleware.RequireAdmin())

	// Get all system settings
	router.Get("/", handler.GetAllSettings)

	// Get specific system setting
	router.Get("/:key", handler.GetSetting)

	// Update system setting
	router.Put("/:key", handler.UpdateSetting)

	// MCP Server specific endpoints
	router.Get("/mcp/status", handler.GetMCPStatus)
	router.Post("/mcp/toggle", handler.ToggleMCPServer)
}
