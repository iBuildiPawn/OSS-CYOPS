package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
	"github.com/cyops/cyops-backend/internal/handlers"
	"github.com/cyops/cyops-backend/internal/middleware"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/config"
	"github.com/cyops/cyops-backend/pkg/database"
	"github.com/cyops/cyops-backend/pkg/utils"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Load configuration
	cfg := config.Load()

	// Initialize logger
	utils.InitLogger(cfg.GoEnv == "development")
	utils.Logger.Info().Str("environment", cfg.GoEnv).Msg("Starting application")

	// Connect to database
	if err := database.Connect(cfg.DatabaseDSN(), cfg.GoEnv == "development"); err != nil {
		utils.Logger.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer database.Close()

	// Run migrations
	if err := runMigrations(cfg); err != nil {
		utils.Logger.Fatal().Err(err).Msg("Failed to run migrations")
	}

	// Start background jobs
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	startBackgroundJobs(ctx)

	// Create Fiber app with configuration
	app := fiber.New(fiber.Config{
		AppName:               "Auth Backend API v1.0.0",
		ErrorHandler:          middleware.ErrorHandler(),
		DisableStartupMessage: false,
		BodyLimit:             100 * 1024 * 1024, // 100MB for file uploads (Nessus files)
	})

	// Global middleware
	app.Use(recover.New())                // Panic recovery
	app.Use(middleware.RequestID())       // Request ID tracking with logging
	app.Use(middleware.SecurityHeaders()) // Security headers
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))

	// CORS configuration - whitelist approach for security
	corsOrigins := cfg.CORSOrigins
	if corsOrigins == "" || corsOrigins == "*" {
		// Default to production domain or localhost for development
		if cfg.GoEnv == "production" {
			corsOrigins = "https://cyops.example.com,https://www.cyops.example.com"
		} else {
			corsOrigins = "http://localhost:3000,http://localhost:3001"
		}
		utils.Logger.Warn().
			Str("origins", corsOrigins).
			Msg("CORS_ORIGINS not set or wildcard detected, using default whitelist")
	}
	
	app.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Request-ID",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
		ExposeHeaders:    "X-Request-ID",
	}))

	// Setup routes
	handlers.SetupRoutes(app, cfg)

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		utils.Logger.Info().Msg("Shutting down server...")
		cancel() // Stop background jobs
		if err := app.Shutdown(); err != nil {
			utils.Logger.Error().Err(err).Msg("Error during shutdown")
		}
	}()

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	utils.Logger.Info().Str("address", addr).Msg("Server starting")
	if err := app.Listen(addr); err != nil {
		utils.Logger.Fatal().Err(err).Msg("Failed to start server")
	}
}

// runMigrations runs database migrations
func runMigrations(cfg *config.Config) error {
	utils.Logger.Info().Msg("Running database migrations...")

	// Enable UUID extension before running migrations
	if err := enableUUIDExtension(); err != nil {
		return fmt.Errorf("failed to enable UUID extension: %w", err)
	}

	// Register all models here for GORM AutoMigrate
	if err := database.AutoMigrate(
		&models.User{},
		&models.Role{},
		&models.VerificationToken{},
		&models.AuthEvent{},
		&models.Session{},
		&models.APIKey{}, // Managed by GORM with datatypes.JSON
		// Vulnerability Management models
		&models.Vulnerability{},
		&models.AffectedSystem{},
		&models.VulnerabilityStatusHistory{},
		&models.VulnerabilityAffectedSystem{},
		&models.VulnerabilityFinding{},
		&models.FindingStatusHistory{},
		&models.FindingAttachment{},
		&models.VulnerabilityAttachment{},
		// Asset Management models
		&models.AssetTag{},
		// Integration models
		&models.IntegrationConfig{},
		// Assessment models
		&models.Assessment{},
		&models.AssessmentVulnerability{},
		&models.AssessmentAsset{},
		&models.AssessmentReport{},
		// System Settings
		&models.SystemSetting{},
		// Add other models as they are created
	); err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	// Create custom indexes for asset management
	if err := createAssetManagementIndexes(); err != nil {
		return fmt.Errorf("failed to create asset management indexes: %w", err)
	}

	utils.Logger.Info().Msg("Migrations completed successfully")

	// Seed default roles
	utils.Logger.Info().Msg("Seeding default roles...")
	if err := database.SeedRoles(database.GetDB()); err != nil {
		return fmt.Errorf("role seeding failed: %w", err)
	}

	// Seed admin user
	utils.Logger.Info().Msg("Seeding admin user...")
	if err := database.SeedAdminUser(database.GetDB(), database.AdminSeedConfig{
		Email:    cfg.AdminEmail,
		Password: cfg.AdminPassword,
		Name:     cfg.AdminName,
	}); err != nil {
		return fmt.Errorf("admin user seeding failed: %w", err)
	}

	// Initialize default system settings
	utils.Logger.Info().Msg("Initializing system settings...")
	settingsService := services.NewSystemSettingsService(database.GetDB())
	if err := settingsService.InitializeDefaultSettings(); err != nil {
		return fmt.Errorf("system settings initialization failed: %w", err)
	}

	return nil
}

// enableUUIDExtension enables the uuid-ossp extension for PostgreSQL
func enableUUIDExtension() error {
	db := database.GetDB()
	utils.Logger.Info().Msg("Enabling UUID extension...")

	// Enable uuid-ossp extension (provides uuid_generate_v4())
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error; err != nil {
		return fmt.Errorf("failed to create uuid-ossp extension: %w", err)
	}

	utils.Logger.Info().Msg("UUID extension enabled successfully")
	return nil
}

// createAssetManagementIndexes creates custom indexes for asset management
func createAssetManagementIndexes() error {
	db := database.GetDB()
	utils.Logger.Info().Msg("Creating asset management indexes...")

	// Unique constraints for duplicate prevention (per environment)
	indexes := []string{
		// Unique hostname + environment
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_hostname_env 
		 ON affected_systems(hostname, environment) 
		 WHERE hostname IS NOT NULL AND deleted_at IS NULL`,

		// Unique IP + environment
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_ip_env 
		 ON affected_systems(ip_address, environment) 
		 WHERE ip_address IS NOT NULL AND deleted_at IS NULL`,

		// Performance indexes
		`CREATE INDEX IF NOT EXISTS idx_assets_criticality 
		 ON affected_systems(criticality) 
		 WHERE status = 'ACTIVE' AND deleted_at IS NULL`,

		`CREATE INDEX IF NOT EXISTS idx_assets_status 
		 ON affected_systems(status) 
		 WHERE deleted_at IS NULL`,

		`CREATE INDEX IF NOT EXISTS idx_assets_owner 
		 ON affected_systems(owner_id) 
		 WHERE owner_id IS NOT NULL AND deleted_at IS NULL`,

		`CREATE INDEX IF NOT EXISTS idx_assets_composite_crit_status 
		 ON affected_systems(criticality, status) 
		 WHERE deleted_at IS NULL`,

		// Full-text search index
		`CREATE INDEX IF NOT EXISTS idx_assets_search 
		 ON affected_systems USING GIN(
			 to_tsvector('english', 
				 COALESCE(hostname, '') || ' ' || 
				 COALESCE(description, '') || ' ' || 
				 COALESCE(asset_id, '')
			 )
		 )`,

		// Tag indexes
		`CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tag)`,
		`CREATE INDEX IF NOT EXISTS idx_asset_tags_asset ON asset_tags(asset_id)`,
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			utils.Logger.Warn().Err(err).Str("sql", indexSQL).Msg("Failed to create index (may already exist)")
			// Continue with other indexes even if one fails
		}
	}

	utils.Logger.Info().Msg("Asset management indexes created successfully")
	return nil
}


// startBackgroundJobs starts all background jobs
func startBackgroundJobs(ctx context.Context) {
	sessionService := services.NewSessionService()

	// Session cleanup job - runs every hour
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		// Run immediately on startup
		utils.Logger.Info().Msg("Starting session cleanup job")
		if count, err := sessionService.CleanupExpiredSessions(); err != nil {
			utils.Logger.Error().Err(err).Msg("Failed to cleanup expired sessions")
		} else if count > 0 {
			utils.Logger.Info().Int64("count", count).Msg("Cleaned up expired sessions on startup")
		}

		for {
			select {
			case <-ctx.Done():
				utils.Logger.Info().Msg("Stopping session cleanup job")
				return
			case <-ticker.C:
				if count, err := sessionService.CleanupExpiredSessions(); err != nil {
					utils.Logger.Error().Err(err).Msg("Failed to cleanup expired sessions")
				} else if count > 0 {
					utils.Logger.Info().Int64("count", count).Msg("Cleaned up expired sessions")
				}
			}
		}
	}()
}
