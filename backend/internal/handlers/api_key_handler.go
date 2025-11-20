package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/middleware"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/utils"
)

type APIKeyHandler struct {
	service *services.APIKeyService
}

func NewAPIKeyHandler() *APIKeyHandler {
	return &APIKeyHandler{
		service: services.NewAPIKeyService(),
	}
}

// CreateAPIKeyRequest represents the request body for creating an API key
type CreateAPIKeyRequest struct {
	Name        string                `json:"name" validate:"required,min=3,max=100"`
	Type        models.APIKeyType     `json:"type" validate:"required,oneof=mcp service personal"`
	Scopes      []string              `json:"scopes" validate:"required,min=1"`
	ExpiresAt   *time.Time            `json:"expires_at,omitempty"`
	Description string                `json:"description,omitempty" validate:"max=500"`
	RateLimitPerMinute int            `json:"rate_limit_per_minute,omitempty" validate:"min=1,max=1000"`
}

// CreateAPIKeyResponse represents the response after creating an API key
type CreateAPIKeyResponse struct {
	APIKey   *models.APIKey `json:"api_key"`
	PlainKey string         `json:"plain_key"` // ONLY shown once!
	Message  string         `json:"message"`
}

// ListAPIKeysResponse represents the response for listing API keys
type ListAPIKeysResponse struct {
	APIKeys []models.APIKey `json:"api_keys"`
	Total   int             `json:"total"`
}

// CreateAPIKey creates a new API key
func (h *APIKeyHandler) CreateAPIKey(c *fiber.Ctx) error {
	var req CreateAPIKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	// Validate required fields
	if req.Name == "" {
		return middleware.ValidationError(c, "Name is required", nil)
	}
	if len(req.Name) < 3 || len(req.Name) > 100 {
		return middleware.ValidationError(c, "Name must be between 3 and 100 characters", nil)
	}
	if req.Type == "" {
		return middleware.ValidationError(c, "Type is required", nil)
	}
	if req.Type != models.APIKeyTypeMCP && req.Type != models.APIKeyTypeService && req.Type != models.APIKeyTypePersonal {
		return middleware.ValidationError(c, "Invalid type. Must be 'mcp', 'service', or 'personal'", nil)
	}
	if len(req.Scopes) == 0 {
		return middleware.ValidationError(c, "At least one scope is required", nil)
	}
	if len(req.Description) > 500 {
		return middleware.ValidationError(c, "Description must not exceed 500 characters", nil)
	}
	if req.RateLimitPerMinute < 0 || req.RateLimitPerMinute > 1000 {
		return middleware.ValidationError(c, "Rate limit must be between 1 and 1000 requests per minute", nil)
	}

	// Get user ID from context
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// Validate scope format
	for _, scope := range req.Scopes {
		if !isValidScope(scope) {
			return middleware.ValidationError(c, "Invalid scope format", map[string]interface{}{
				"scope": scope,
				"valid_format": "resource:action (e.g., vulnerabilities:read, assets:write, *:*)",
			})
		}
	}

	// Create API key
	result, err := h.service.Create(services.CreateAPIKeyInput{
		UserID:             userID,
		Name:               req.Name,
		Type:               req.Type,
		Scopes:             req.Scopes,
		ExpiresAt:          req.ExpiresAt,
		Description:        req.Description,
		RateLimitPerMinute: req.RateLimitPerMinute,
	})
	if err != nil {
		if err == services.ErrDuplicateKeyName {
			return middleware.ValidationError(c, "API key name already exists", nil)
		}
		utils.Logger.Error().Err(err).Msg("Failed to create API key")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create API key",
		})
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Str("api_key_id", result.APIKey.ID.String()).
		Str("api_key_name", result.APIKey.Name).
		Str("api_key_type", string(result.APIKey.Type)).
		Msg("API key created successfully")

	return c.Status(fiber.StatusCreated).JSON(CreateAPIKeyResponse{
		APIKey:   result.APIKey,
		PlainKey: result.PlainKey,
		Message:  "API key created successfully. Save this key securely - it will not be shown again!",
	})
}

// ListAPIKeys lists all API keys for the authenticated user
func (h *APIKeyHandler) ListAPIKeys(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	apiKeys, err := h.service.List(userID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to list API keys")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list API keys",
		})
	}

	return c.JSON(ListAPIKeysResponse{
		APIKeys: apiKeys,
		Total:   len(apiKeys),
	})
}

// GetAPIKey retrieves a specific API key by ID
func (h *APIKeyHandler) GetAPIKey(c *fiber.Ctx) error {
	keyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid API key ID", nil)
	}

	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	apiKey, err := h.service.GetByID(keyID, userID)
	if err != nil {
		if err == services.ErrAPIKeyNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "API key not found",
			})
		}
		utils.Logger.Error().Err(err).Msg("Failed to get API key")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get API key",
		})
	}

	return c.JSON(apiKey)
}

// RevokeAPIKey revokes an API key
func (h *APIKeyHandler) RevokeAPIKey(c *fiber.Ctx) error {
	keyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid API key ID", nil)
	}

	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	if err := h.service.Revoke(keyID, userID); err != nil {
		if err == services.ErrAPIKeyNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "API key not found",
			})
		}
		utils.Logger.Error().Err(err).Msg("Failed to revoke API key")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to revoke API key",
		})
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Str("api_key_id", keyID.String()).
		Msg("API key revoked")

	return c.JSON(fiber.Map{
		"message": "API key revoked successfully",
	})
}

// DeleteAPIKey soft-deletes an API key
func (h *APIKeyHandler) DeleteAPIKey(c *fiber.Ctx) error {
	keyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid API key ID", nil)
	}

	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	if err := h.service.Delete(keyID, userID); err != nil {
		if err == services.ErrAPIKeyNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "API key not found",
			})
		}
		utils.Logger.Error().Err(err).Msg("Failed to delete API key")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete API key",
		})
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Str("api_key_id", keyID.String()).
		Msg("API key deleted")

	return c.JSON(fiber.Map{
		"message": "API key deleted successfully",
	})
}

// UpdateAPIKeyStatusRequest represents the request body for updating API key status
type UpdateAPIKeyStatusRequest struct {
	Status models.APIKeyStatus `json:"status" validate:"required,oneof=active inactive revoked"`
}

// UpdateAPIKeyStatus updates the status of an API key
func (h *APIKeyHandler) UpdateAPIKeyStatus(c *fiber.Ctx) error {
	keyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return middleware.ValidationError(c, "Invalid API key ID", nil)
	}

	var req UpdateAPIKeyStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	// Validate status
	if req.Status != models.APIKeyStatusActive && req.Status != models.APIKeyStatusInactive && req.Status != models.APIKeyStatusRevoked {
		return middleware.ValidationError(c, "Invalid status. Must be 'active', 'inactive', or 'revoked'", nil)
	}

	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	if err := h.service.UpdateStatus(keyID, userID, req.Status); err != nil {
		if err == services.ErrAPIKeyNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "API key not found",
			})
		}
		utils.Logger.Error().Err(err).Msg("Failed to update API key status")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update API key status",
		})
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Str("api_key_id", keyID.String()).
		Str("new_status", string(req.Status)).
		Msg("API key status updated")

	return c.JSON(fiber.Map{
		"message": "API key status updated successfully",
	})
}

// isValidScope validates the scope format (resource:action)
func isValidScope(scope string) bool {
	// Allow wildcard
	if scope == "*:*" {
		return true
	}

	// Check format: resource:action
	parts := make([]rune, 0, len(scope))
	colonCount := 0
	for _, r := range scope {
		parts = append(parts, r)
		if r == ':' {
			colonCount++
		}
	}

	if colonCount != 1 {
		return false
	}

	// Split and check both parts are non-empty
	beforeColon := ""
	afterColon := ""
	foundColon := false
	for _, r := range scope {
		if r == ':' {
			foundColon = true
			continue
		}
		if !foundColon {
			beforeColon += string(r)
		} else {
			afterColon += string(r)
		}
	}

	return len(beforeColon) > 0 && len(afterColon) > 0
}
