# Database Migrations

This project uses **GORM AutoMigrate** to automatically create and update database tables.

## How It Works

1. **Automatic Table Creation**: When the backend starts, GORM AutoMigrate reads the model definitions in `internal/models/` and creates/updates tables automatically
2. **Schema Changes**: When you modify a model struct, GORM will add new columns on next startup (it doesn't remove columns for safety)
3. **Custom Indexes**: Additional performance indexes are created programmatically in `cmd/server/main.go` (see `createAssetManagementIndexes()`)

## Manual SQL Migrations

The `manual/` directory contains SQL scripts for:
- Performance indexes that need to be created after GORM automigrate
- Extensions (like `uuid-ossp`)
- Custom PostgreSQL features (GIN indexes, full-text search)

**These should NOT be placed in `/docker-entrypoint-initdb.d`** because they would run before tables exist.

### Running Manual Migrations

After GORM has created the tables (backend startup), you can run manual migrations:

```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d cyops_dev

# Run a specific migration
\i /path/to/migration.sql
```

Or using a script:
```bash
docker-compose exec postgres psql -U postgres -d cyops_dev -f /docker-entrypoint-initdb.d/manual/001_initial_setup.sql
```

## Migration Order

1. **Backend starts** → GORM AutoMigrate creates all tables
2. **Custom indexes created** → `createAssetManagementIndexes()` in main.go
3. **Manual migrations** (optional) → Run additional SQL scripts if needed

## Adding New Models

1. Create model in `internal/models/`
2. Add model to AutoMigrate list in `cmd/server/main.go`:
   ```go
   database.AutoMigrate(
       &models.User{},
       &models.YourNewModel{},
       // ...
   )
   ```
3. Restart backend - tables will be created automatically

## Notes

- GORM uses `deleted_at` for soft deletes (tables are never physically deleted)
- Foreign keys are created automatically based on model relationships
- Indexes defined in model tags (`` `gorm:"index"` ``) are created automatically
- Complex indexes (composite, partial, GIN) should be created in main.go or manual migrations
