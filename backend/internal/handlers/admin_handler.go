package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/auth"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// AdminHandler handles admin-level user management requests
type AdminHandler struct {
	userService    *services.UserService
	roleService    *services.RoleService
	cleanupService *services.CleanupService
}

// NewAdminHandler creates a new admin handler
func NewAdminHandler() *AdminHandler {
	return &AdminHandler{
		userService:    services.NewUserService(),
		roleService:    services.NewRoleService(),
		cleanupService: services.NewCleanupService(),
	}
}

// ListUsersRequest represents pagination and filter parameters
type ListUsersRequest struct {
	Page    int    `query:"page"`
	PerPage int    `query:"per_page"`
	Search  string `query:"search"`
	Role    string `query:"role"`
}

// ListUsers retrieves a paginated list of all users
func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	var req ListUsersRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	// Set defaults
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PerPage < 1 || req.PerPage > 100 {
		req.PerPage = 20
	}

	// Build query
	db := h.userService.GetDB().Model(&models.User{}).Preload("Role")

	// Apply search filter
	if req.Search != "" {
		search := "%" + req.Search + "%"
		db = db.Where("email LIKE ? OR name LIKE ?", search, search)
	}

	// Apply role filter
	if req.Role != "" {
		role, err := h.roleService.GetRoleByName(req.Role)
		if err == nil {
			db = db.Where("role_id = ?", role.ID.String())
		}
	}

	// Count total
	var total int64
	if err := db.Count(&total).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to count users")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve users",
		})
	}

	// Get paginated users
	offset := (req.Page - 1) * req.PerPage

	var dbUsers []models.User
	if err := db.Offset(offset).Limit(req.PerPage).Find(&dbUsers).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to get users")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve users",
		})
	}

	// Convert to public format
	users := make([]interface{}, 0, len(dbUsers))
	for _, user := range dbUsers {
		users = append(users, user.ToPublic())
	}

	return c.JSON(fiber.Map{
		"users":       users,
		"total":       total,
		"page":        req.Page,
		"per_page":    req.PerPage,
		"total_pages": (int(total) + req.PerPage - 1) / req.PerPage,
	})
}

// GetUser retrieves a specific user by ID
func (h *AdminHandler) GetUser(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	user, err := h.userService.GetUserByID(userID)
	if err != nil {
		utils.Logger.Error().Err(err).Str("user_id", userID.String()).Msg("Failed to get user")
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	return c.JSON(fiber.Map{
		"user": user.ToPublic(),
	})
}

// CreateUser creates a new user account (admin only)
func (h *AdminHandler) CreateUser(c *fiber.Ctx) error {
	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get current admin user to verify OTP
	currentUserID := c.Locals("user_id").(uuid.UUID)
	currentUser, err := h.userService.GetUserByID(currentUserID)
	if err != nil {
		utils.Logger.Error().Err(err).Str("user_id", currentUserID.String()).Msg("Failed to get current user")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to verify admin identity",
		})
	}

	// Verify admin has 2FA enabled
	if !currentUser.TwoFactorEnabled {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Two-factor authentication must be enabled to create users",
		})
	}

	// Verify OTP code
	if !auth.ValidateTOTPCode(req.OTPCode, currentUser.TwoFactorSecret) {
		utils.Logger.Warn().
			Str("admin_id", currentUserID.String()).
			Msg("Invalid OTP code provided for user creation")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid OTP code",
		})
	}

	// Check if user already exists
	existingUser, _ := h.userService.GetUserByEmail(req.Email)
	if existingUser != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "User with this email already exists",
		})
	}

	// Parse and validate role ID
	roleUUID, err := uuid.Parse(req.RoleID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	// Verify role exists
	role, err := h.roleService.GetRoleByID(roleUUID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Role not found",
		})
	}

	// Create user
	roleIDStr := req.RoleID
	user := &models.User{
		Email:         req.Email,
		Name:          req.Name,
		RoleID:        &roleIDStr,
		EmailVerified: true, // Admin-created users are auto-verified
	}

	// Hash password
	if err := user.HashPassword(req.Password); err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to hash password")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create user",
		})
	}

	// Save to database
	if err := h.userService.GetDB().Create(user).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to create user")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create user",
		})
	}

	// Load role for response
	user.Role = role

	utils.Logger.Info().
		Str("user_id", user.ID.String()).
		Str("email", user.Email).
		Str("role", role.Name).
		Str("admin_id", currentUserID.String()).
		Msg("User created by admin")

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User created successfully",
		"user":    user.ToPublic(),
	})
}

// CreateUserRequest represents a request to create a new user
type CreateUserRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name"`
	RoleID   string `json:"role_id" validate:"required,uuid"`
	OTPCode  string `json:"otp_code" validate:"required,len=6"`
}

// AssignRoleRequest represents a role assignment request
type AssignRoleRequest struct {
	RoleID string `json:"role_id" validate:"required,uuid"`
}

// AssignRole assigns a role to a user
func (h *AdminHandler) AssignRole(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var req AssignRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	roleID, err := uuid.Parse(req.RoleID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	if err := h.roleService.AssignRoleToUser(userID, roleID); err != nil {
		utils.Logger.Error().
			Err(err).
			Str("user_id", userID.String()).
			Str("role_id", roleID.String()).
			Msg("Failed to assign role")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Get updated user
	user, err := h.userService.GetUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve updated user",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Role assigned successfully",
		"user":    user.ToPublic(),
	})
}

// UpdateUserStatusRequest represents a user status update
type UpdateUserStatusRequest struct {
	EmailVerified *bool `json:"email_verified,omitempty"`
}

// UpdateUserStatus updates user account status (admin only)
func (h *AdminHandler) UpdateUserStatus(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var req UpdateUserStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	user, err := h.userService.GetUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Update fields
	if req.EmailVerified != nil {
		user.EmailVerified = *req.EmailVerified
	}

	if err := h.userService.GetDB().Save(user).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to update user status")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update user",
		})
	}

	return c.JSON(fiber.Map{
		"message": "User status updated successfully",
		"user":    user.ToPublic(),
	})
}

// DeleteUser deletes a user account (admin only)
func (h *AdminHandler) DeleteUser(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Prevent admin from deleting themselves
	currentUserID := c.Locals("user_id").(uuid.UUID)
	if userID == currentUserID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "You cannot delete your own account",
		})
	}

	user, err := h.userService.GetUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Soft delete
	if err := h.userService.GetDB().Delete(user).Error; err != nil {
		utils.Logger.Error().Err(err).Str("user_id", userID.String()).Msg("Failed to delete user")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete user",
		})
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Str("admin_id", currentUserID.String()).
		Msg("User deleted by admin")

	return c.JSON(fiber.Map{
		"message": "User deleted successfully",
	})
}

// GetCleanupStats retrieves statistics about soft-deleted items
func (h *AdminHandler) GetCleanupStats(c *fiber.Ctx) error {
	stats, err := h.cleanupService.GetCleanupStats()
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to get cleanup stats")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve cleanup statistics",
		})
	}

	return c.JSON(fiber.Map{
		"stats": stats,
	})
}

// CleanupAssets permanently deletes all soft-deleted assets
func (h *AdminHandler) CleanupAssets(c *fiber.Ctx) error {
	currentUserID := c.Locals("user_id").(uuid.UUID)

	result, err := h.cleanupService.CleanupAssets()
	if err != nil {
		utils.Logger.Error().
			Err(err).
			Str("admin_id", currentUserID.String()).
			Msg("Failed to cleanup assets")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to cleanup assets",
		})
	}

	utils.Logger.Info().
		Int64("deleted_count", result.DeletedCount).
		Str("admin_id", currentUserID.String()).
		Msg("Assets cleaned up by admin")

	return c.JSON(fiber.Map{
		"message":       result.Message,
		"deleted_count": result.DeletedCount,
	})
}

// CleanupVulnerabilities permanently deletes all soft-deleted vulnerabilities
func (h *AdminHandler) CleanupVulnerabilities(c *fiber.Ctx) error {
	currentUserID := c.Locals("user_id").(uuid.UUID)

	result, err := h.cleanupService.CleanupVulnerabilities()
	if err != nil {
		utils.Logger.Error().
			Err(err).
			Str("admin_id", currentUserID.String()).
			Msg("Failed to cleanup vulnerabilities")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to cleanup vulnerabilities",
		})
	}

	utils.Logger.Info().
		Int64("deleted_count", result.DeletedCount).
		Str("admin_id", currentUserID.String()).
		Msg("Vulnerabilities cleaned up by admin")

	return c.JSON(fiber.Map{
		"message":       result.Message,
		"deleted_count": result.DeletedCount,
	})
}

// CleanupAllData permanently deletes ALL vulnerability and asset data
// This is a destructive operation that removes all data but preserves users/auth
func (h *AdminHandler) CleanupAllData(c *fiber.Ctx) error {
	currentUserID := c.Locals("user_id").(uuid.UUID)

	result, err := h.cleanupService.CleanupAllData()
	if err != nil {
		utils.Logger.Error().
			Err(err).
			Str("admin_id", currentUserID.String()).
			Msg("Failed to cleanup all data")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to cleanup all data",
		})
	}

	utils.Logger.Warn().
		Int64("deleted_count", result.DeletedCount).
		Str("admin_id", currentUserID.String()).
		Msg("Complete database cleanup performed by admin")

	return c.JSON(fiber.Map{
		"message":       result.Message,
		"deleted_count": result.DeletedCount,
	})
}
