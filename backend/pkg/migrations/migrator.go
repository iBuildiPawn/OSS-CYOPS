package migrations

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// Migrator handles database migrations
type Migrator struct {
	db *gorm.DB
}

// NewMigrator creates a new migration manager
func NewMigrator(db *gorm.DB) *Migrator {
	return &Migrator{db: db}
}

// AutoMigrate runs automatic migrations for all models
func (m *Migrator) AutoMigrate(models ...interface{}) error {
	log.Println("Running database migrations...")

	if err := m.db.AutoMigrate(models...); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database migrations completed successfully")
	return nil
}

// CreateIndexes creates custom indexes not handled by GORM
func (m *Migrator) CreateIndexes() error {
	log.Println("Creating custom database indexes...")

	// Add custom indexes here as needed
	// Example:
	// m.db.Exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")

	log.Println("Custom indexes created successfully")
	return nil
}

// Rollback performs rollback operations if needed
func (m *Migrator) Rollback() error {
	log.Println("WARNING: Rollback not implemented - manual intervention required")
	return nil
}
