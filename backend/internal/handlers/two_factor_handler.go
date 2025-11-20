package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// TwoFactorHandler handles 2FA related requests
type TwoFactorHandler struct {
	twoFactorService *services.TwoFactorService
}

// NewTwoFactorHandler creates a new 2FA handler
func NewTwoFactorHandler() *TwoFactorHandler {
	return &TwoFactorHandler{
		twoFactorService: services.NewTwoFactorService(),
	}
}

// EnableTwoFactorRequest represents the request to enable 2FA
type EnableTwoFactorRequest struct {
	Issuer string `json:"issuer" validate:"required,min=1,max=100"`
}

// VerifyTwoFactorRequest represents the request to verify and enable 2FA
type VerifyTwoFactorRequest struct {
	Code string `json:"code" validate:"required,len=6"`
}

// DisableTwoFactorRequest represents the request to disable 2FA
type DisableTwoFactorRequest struct {
	Password string `json:"password" validate:"required,min=8"`
	Code     string `json:"code" validate:"required,len=6"`
}

// EnableTwoFactor initiates 2FA setup
// @Summary Enable Two-Factor Authentication
// @Description Initiates 2FA setup by generating secret and QR code
// @Tags 2FA
// @Accept json
// @Produce json
// @Param request body EnableTwoFactorRequest true "Issuer name (e.g., 'MyApp')"
// @Success 200 {object} services.Enable2FAResponse
// @Failure 400 {object} fiber.Map
// @Failure 401 {object} fiber.Map
// @Failure 500 {object} fiber.Map
// @Router /auth/2fa/enable [post]
func (h *TwoFactorHandler) EnableTwoFactor(c *fiber.Ctx) error {
	// Get user from context (set by auth middleware)
	userID := c.Locals("user_id").(uuid.UUID)

	// Parse request body
	var req EnableTwoFactorRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate issuer
	if req.Issuer == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Issuer is required",
		})
	}

	// Enable 2FA
	response, err := h.twoFactorService.EnableTwoFactor(userID, req.Issuer)
	if err != nil {
		utils.Logger.Error().
			Err(err).
			Str("user_id", userID.String()).
			Msg("Failed to enable 2FA")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(response)
}

// VerifyTwoFactor verifies the TOTP code and enables 2FA
// @Summary Verify and Enable Two-Factor Authentication
// @Description Verifies the TOTP code and completes 2FA setup
// @Tags 2FA
// @Accept json
// @Produce json
// @Param request body VerifyTwoFactorRequest true "TOTP code from authenticator app"
// @Success 200 {object} fiber.Map
// @Failure 400 {object} fiber.Map
// @Failure 401 {object} fiber.Map
// @Failure 500 {object} fiber.Map
// @Router /auth/2fa/verify [post]
func (h *TwoFactorHandler) VerifyTwoFactor(c *fiber.Ctx) error {
	// Get user from context
	userID := c.Locals("user_id").(uuid.UUID)

	// Parse request body
	var req VerifyTwoFactorRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate code
	if req.Code == "" || len(req.Code) != 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Valid 6-digit code is required",
		})
	}

	// Get client info
	ipAddress := c.IP()
	userAgent := c.Get("User-Agent")

	// Verify and enable 2FA
	if err := h.twoFactorService.VerifyAndEnable2FA(userID, req.Code, ipAddress, userAgent); err != nil {
		utils.Logger.Error().
			Err(err).
			Str("user_id", userID.String()).
			Msg("Failed to verify and enable 2FA")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Two-factor authentication enabled successfully",
	})
}

// DisableTwoFactor disables 2FA for a user
// @Summary Disable Two-Factor Authentication
// @Description Disables 2FA after verifying password and TOTP code
// @Tags 2FA
// @Accept json
// @Produce json
// @Param request body DisableTwoFactorRequest true "Password and TOTP code"
// @Success 200 {object} fiber.Map
// @Failure 400 {object} fiber.Map
// @Failure 401 {object} fiber.Map
// @Failure 500 {object} fiber.Map
// @Router /auth/2fa/disable [post]
func (h *TwoFactorHandler) DisableTwoFactor(c *fiber.Ctx) error {
	// Get user from context
	userID := c.Locals("user_id").(uuid.UUID)

	// Parse request body
	var req DisableTwoFactorRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate fields
	if req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Password is required",
		})
	}
	if req.Code == "" || len(req.Code) != 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Valid 6-digit code is required",
		})
	}

	// Get client info
	ipAddress := c.IP()
	userAgent := c.Get("User-Agent")

	// Disable 2FA
	if err := h.twoFactorService.DisableTwoFactor(userID, req.Password, req.Code, ipAddress, userAgent); err != nil {
		utils.Logger.Error().
			Err(err).
			Str("user_id", userID.String()).
			Msg("Failed to disable 2FA")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Two-factor authentication disabled successfully",
	})
}
