package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/rs/zerolog"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// ConnectionConfig holds database connection configuration
type ConnectionConfig struct {
	DSN             string
	IsDevelopment   bool
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// Connect establishes database connection with configuration
func Connect(dsn string, isDevelopment bool) error {
	config := ConnectionConfig{
		DSN:             dsn,
		IsDevelopment:   isDevelopment,
		MaxOpenConns:    25,
		MaxIdleConns:    5,
		ConnMaxLifetime: 5 * time.Minute,
	}
	return ConnectWithConfig(config)
}

// ConnectWithConfig establishes database connection with custom configuration
func ConnectWithConfig(config ConnectionConfig) error {
	var err error

	gormConfig := &gorm.Config{}

	// Configure logger with slow query detection
	if config.IsDevelopment {
		// Development: Log all queries and slow queries (>100ms)
		gormConfig.Logger = logger.New(
			log.New(log.Writer(), "\r\n", log.LstdFlags),
			logger.Config{
				SlowThreshold:             100 * time.Millisecond, // Slow SQL threshold
				LogLevel:                  logger.Info,            // Log all queries
				IgnoreRecordNotFoundError: true,
				Colorful:                  true,
			},
		)
	} else {
		// Production: Only log slow queries (>200ms) and errors
		gormConfig.Logger = logger.New(
			log.New(log.Writer(), "\r\n", log.LstdFlags),
			logger.Config{
				SlowThreshold:             200 * time.Millisecond, // Slow SQL threshold
				LogLevel:                  logger.Warn,            // Only warnings and errors
				IgnoreRecordNotFoundError: true,
				Colorful:                  false,
			},
		)
	}

	DB, err = gorm.Open(postgres.Open(config.DSN), gormConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying SQL database
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxOpenConns(config.MaxOpenConns)
	sqlDB.SetMaxIdleConns(config.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(config.ConnMaxLifetime)

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Database connected successfully")
	return nil
}

// GetDB returns the global database instance
func GetDB() *gorm.DB {
	return DB
}

// AutoMigrate runs automatic migrations for given models
func AutoMigrate(models ...interface{}) error {
	// Note: api_keys table is intentionally NOT included here
	// It's managed via SQL migrations (migrations/001_create_api_keys_table.sql)
	// GORM tries to sync ALL tables it finds, so we must ensure APIKey model
	// is never passed to AutoMigrate
	return DB.AutoMigrate(models...)
}

// Close closes the database connection
func Close() error {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}

// HealthCheck verifies database connectivity
func HealthCheck() error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	return sqlDB.Ping()
}

// QueryStats returns database connection pool statistics
func QueryStats() map[string]interface{} {
	if DB == nil {
		return map[string]interface{}{"error": "database not initialized"}
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}

	stats := sqlDB.Stats()
	return map[string]interface{}{
		"max_open_connections": stats.MaxOpenConnections,
		"open_connections":     stats.OpenConnections,
		"in_use":               stats.InUse,
		"idle":                 stats.Idle,
		"wait_count":           stats.WaitCount,
		"wait_duration":        stats.WaitDuration.String(),
		"max_idle_closed":      stats.MaxIdleClosed,
		"max_lifetime_closed":  stats.MaxLifetimeClosed,
	}
}

// WithQueryLogging wraps a GORM query with performance logging
func WithQueryLogging(ctx context.Context, db *gorm.DB, operation string, fn func(*gorm.DB) error) error {
	start := time.Now()
	err := fn(db.WithContext(ctx))
	duration := time.Since(start)

	// Log slow queries
	if duration > 200*time.Millisecond {
		log := zerolog.Ctx(ctx)
		log.Warn().
			Str("operation", operation).
			Dur("duration_ms", duration).
			Msg("Slow query detected")
	}

	return err
}
