package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// RoleHandler handles role management requests
type RoleHandler struct {
	roleService *services.RoleService
}

// NewRoleHandler creates a new role handler
func NewRoleHandler() *RoleHandler {
	return &RoleHandler{
		roleService: services.NewRoleService(),
	}
}

// CreateRoleRequest represents a role creation request
type CreateRoleRequest struct {
	Name        string               `json:"name" validate:"required,min=2,max=50"`
	DisplayName string               `json:"display_name" validate:"required,min=2,max=100"`
	Description string               `json:"description,omitempty" validate:"max=255"`
	Level       int                  `json:"level" validate:"required,min=0,max=1000"`
	Permissions models.PermissionMap `json:"permissions"`
}

// UpdateRoleRequest represents a role update request
type UpdateRoleRequest struct {
	DisplayName string               `json:"display_name" validate:"required,min=2,max=100"`
	Description string               `json:"description,omitempty" validate:"max=255"`
	Level       int                  `json:"level" validate:"required,min=0,max=1000"`
	Permissions models.PermissionMap `json:"permissions"`
}

// ListRoles retrieves all roles
func (h *RoleHandler) ListRoles(c *fiber.Ctx) error {
	roles, err := h.roleService.GetAllRoles()
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to get roles")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve roles",
		})
	}

	return c.JSON(fiber.Map{
		"roles": roles,
	})
}

// GetRole retrieves a specific role by ID
func (h *RoleHandler) GetRole(c *fiber.Ctx) error {
	roleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	role, err := h.roleService.GetRoleByID(roleID)
	if err != nil {
		utils.Logger.Error().Err(err).Str("role_id", roleID.String()).Msg("Failed to get role")
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Role not found",
		})
	}

	return c.JSON(fiber.Map{
		"role": role,
	})
}

// CreateRole creates a new role
func (h *RoleHandler) CreateRole(c *fiber.Ctx) error {
	var req CreateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate request
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Role name is required",
		})
	}
	if req.DisplayName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Display name is required",
		})
	}

	role, err := h.roleService.CreateRole(
		req.Name,
		req.DisplayName,
		req.Description,
		req.Level,
		req.Permissions,
	)
	if err != nil {
		utils.Logger.Error().Err(err).Str("role_name", req.Name).Msg("Failed to create role")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Role created successfully",
		"role":    role,
	})
}

// UpdateRole updates an existing role
func (h *RoleHandler) UpdateRole(c *fiber.Ctx) error {
	roleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	var req UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate request
	if req.DisplayName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Display name is required",
		})
	}

	role, err := h.roleService.UpdateRole(
		roleID,
		req.DisplayName,
		req.Description,
		req.Level,
		req.Permissions,
	)
	if err != nil {
		utils.Logger.Error().Err(err).Str("role_id", roleID.String()).Msg("Failed to update role")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Role updated successfully",
		"role":    role,
	})
}

// DeleteRole deletes a role
func (h *RoleHandler) DeleteRole(c *fiber.Ctx) error {
	roleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	if err := h.roleService.DeleteRole(roleID); err != nil {
		utils.Logger.Error().Err(err).Str("role_id", roleID.String()).Msg("Failed to delete role")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Role deleted successfully",
	})
}
