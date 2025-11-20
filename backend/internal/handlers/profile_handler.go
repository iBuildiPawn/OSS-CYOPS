package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/middleware"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// ProfileHandler handles user profile requests
type ProfileHandler struct {
	profileService *services.ProfileService
}

// NewProfileHandler creates a new profile handler
func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{
		profileService: services.NewProfileService(),
	}
}

// GetProfile retrieves the authenticated user's profile
func (h *ProfileHandler) GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	user, err := h.profileService.GetProfile(userID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to get profile")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve profile",
		})
	}

	return c.JSON(fiber.Map{
		"user": user.ToPublic(),
	})
}

// UpdateProfileRequest represents a profile update request
type UpdateProfileRequest struct {
	Name              *string `json:"name,omitempty"`
	Email             *string `json:"email,omitempty"`
	ProfilePictureURL *string `json:"profile_picture_url,omitempty"`
}

// UpdateProfile updates the authenticated user's profile
func (h *ProfileHandler) UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	// Get IP address and user agent
	ipAddress := c.IP()
	userAgent := c.Get("User-Agent")

	// Convert to service request
	serviceReq := services.UpdateProfileRequest{
		Name:              req.Name,
		Email:             req.Email,
		ProfilePictureURL: req.ProfilePictureURL,
	}

	user, err := h.profileService.UpdateProfile(userID, serviceReq, ipAddress, userAgent)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to update profile")
		return middleware.ValidationError(c, err.Error(), nil)
	}

	return c.JSON(fiber.Map{
		"message": "Profile updated successfully",
		"user":    user.ToPublic(),
	})
}

// ChangePasswordRequest represents a password change request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// ChangePassword changes the authenticated user's password
func (h *ProfileHandler) ChangePassword(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	if req.CurrentPassword == "" {
		return middleware.ValidationError(c, "Current password is required", map[string]interface{}{
			"current_password": "required",
		})
	}

	if req.NewPassword == "" {
		return middleware.ValidationError(c, "New password is required", map[string]interface{}{
			"new_password": "required",
		})
	}

	// Get IP address and user agent
	ipAddress := c.IP()
	userAgent := c.Get("User-Agent")

	// Convert to service request
	serviceReq := services.ChangePasswordRequest{
		CurrentPassword: req.CurrentPassword,
		NewPassword:     req.NewPassword,
	}

	err := h.profileService.ChangePassword(userID, serviceReq, ipAddress, userAgent)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to change password")
		return middleware.ValidationError(c, err.Error(), nil)
	}

	return c.JSON(fiber.Map{
		"message": "Password changed successfully. Please sign in again.",
	})
}

// GetActiveSessions retrieves all active sessions for the authenticated user
func (h *ProfileHandler) GetActiveSessions(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	sessions, err := h.profileService.GetActiveSessions(userID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to get active sessions")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve sessions",
		})
	}

	// Convert to public format
	publicSessions := make([]interface{}, len(sessions))
	for i, session := range sessions {
		publicSessions[i] = session.ToPublic()
	}

	return c.JSON(fiber.Map{
		"sessions": publicSessions,
	})
}

// RevokeSessionRequest represents a session revocation request
type RevokeSessionRequest struct {
	SessionID string `json:"session_id"`
}

// RevokeSession revokes a specific session
func (h *ProfileHandler) RevokeSession(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	var req RevokeSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	if req.SessionID == "" {
		return middleware.ValidationError(c, "Session ID is required", map[string]interface{}{
			"session_id": "required",
		})
	}

	sessionID, err := uuid.Parse(req.SessionID)
	if err != nil {
		return middleware.ValidationError(c, "Invalid session ID", nil)
	}

	err = h.profileService.RevokeSession(userID, sessionID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to revoke session")
		return middleware.ValidationError(c, err.Error(), nil)
	}

	return c.JSON(fiber.Map{
		"message": "Session revoked successfully",
	})
}

// RevokeAllSessions revokes all sessions except the current one
func (h *ProfileHandler) RevokeAllSessions(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	currentSessionID := c.Locals("session_id").(uuid.UUID)

	err := h.profileService.RevokeAllSessions(userID, &currentSessionID)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to revoke all sessions")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to revoke sessions",
		})
	}

	return c.JSON(fiber.Map{
		"message": "All other sessions revoked successfully",
	})
}
