package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/middleware"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/config"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// AuthHandler handles authentication requests
type AuthHandler struct {
	userService  *services.UserService
	emailService *services.EmailService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		userService:  services.NewUserService(),
		emailService: services.NewEmailService(cfg),
	}
}

// RegisterRequest represents a registration request
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

// RegisterResponse represents a registration response
type RegisterResponse struct {
	Message string      `json:"message"`
	User    interface{} `json:"user"`
}

// Register handles user registration
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	// Validate required fields
	if req.Email == "" {
		return middleware.ValidationError(c, "Email is required", map[string]interface{}{
			"email": "required",
		})
	}
	if req.Password == "" {
		return middleware.ValidationError(c, "Password is required", map[string]interface{}{
			"password": "required",
		})
	}

	// Get IP address and user agent
	ipAddress := c.IP()
	userAgent := c.Get("User-Agent")

	// Register user
	user, token, err := h.userService.RegisterUser(services.RegisterRequest{
		Email:    req.Email,
		Password: req.Password,
		Name:     req.Name,
	}, ipAddress, userAgent)

	if err != nil {
		utils.Logger.Error().Err(err).Str("email", req.Email).Msg("Registration failed")
		return middleware.ValidationError(c, err.Error(), nil)
	}

	// Send verification email
	if err := h.emailService.SendVerificationEmail(user.Email, user.Name, token.Token); err != nil {
		utils.Logger.Error().Err(err).Str("email", user.Email).Msg("Failed to send verification email")
		// Don't fail registration if email fails
	}

	return c.Status(fiber.StatusCreated).JSON(RegisterResponse{
		Message: "Registration successful. Please check your email to verify your account.",
		User:    user.ToPublic(),
	})
}

// VerifyEmailRequest represents an email verification request
type VerifyEmailRequest struct {
	Token string `json:"token"`
}

// VerifyEmailResponse represents an email verification response
type VerifyEmailResponse struct {
	Message string      `json:"message"`
	User    interface{} `json:"user"`
}

// VerifyEmail handles email verification
func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
	var req VerifyEmailRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	if req.Token == "" {
		return middleware.ValidationError(c, "Verification token is required", map[string]interface{}{
			"token": "required",
		})
	}

	// Get IP address and user agent
	ipAddress := c.IP()
	userAgent := c.Get("User-Agent")

	// Verify email
	user, err := h.userService.VerifyEmail(req.Token, ipAddress, userAgent)
	if err != nil {
		utils.Logger.Error().Err(err).Str("token", req.Token).Msg("Email verification failed")
		return middleware.ValidationError(c, err.Error(), nil)
	}

	return c.JSON(VerifyEmailResponse{
		Message: "Email verified successfully. You can now sign in.",
		User:    user.ToPublic(),
	})
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email         string `json:"email"`
	Password      string `json:"password"`
	TwoFactorCode string `json:"two_factor_code,omitempty"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	Message           string      `json:"message"`
	User              interface{} `json:"user,omitempty"`
	Token             string      `json:"token,omitempty"`
	RequiresTwoFactor bool        `json:"requires_two_factor,omitempty"`
}

// Login handles user login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	// Validate required fields
	if req.Email == "" {
		return middleware.ValidationError(c, "Email is required", map[string]interface{}{
			"email": "required",
		})
	}
	if req.Password == "" {
		return middleware.ValidationError(c, "Password is required", map[string]interface{}{
			"password": "required",
		})
	}

	// Get IP address and user agent
	ipAddress := c.IP()
	userAgent := c.Get("User-Agent")

	// Authenticate user
	sessionService := services.NewSessionService()
	user, err := h.userService.GetUserByEmail(req.Email)
	if err != nil {
		utils.Logger.Warn().
			Str("email", req.Email).
			Str("ip", ipAddress).
			Msg("Login failed - user not found")
		return middleware.ValidationError(c, "Invalid email or password", nil)
	}

	// Check if email is verified
	if !user.EmailVerified {
		return middleware.ValidationError(c, "Please verify your email before signing in", nil)
	}

	// Check password
	if !user.CheckPassword(req.Password) {
		utils.Logger.Warn().
			Str("email", req.Email).
			Str("ip", ipAddress).
			Msg("Login failed - invalid password")
		return middleware.ValidationError(c, "Invalid email or password", nil)
	}

	// Check if 2FA is enabled
	if user.TwoFactorEnabled {
		// If no 2FA code provided, request it
		if req.TwoFactorCode == "" {
			return c.JSON(LoginResponse{
				Message:           "Two-factor authentication required",
				RequiresTwoFactor: true,
			})
		}

		// Verify 2FA code
		twoFactorService := services.NewTwoFactorService()
		valid, err := twoFactorService.VerifyTOTP(user.ID, req.TwoFactorCode)
		if err != nil {
			utils.Logger.Error().Err(err).Msg("2FA verification error")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Authentication error",
			})
		}

		if !valid {
			utils.Logger.Warn().
				Str("email", req.Email).
				Str("ip", ipAddress).
				Msg("Login failed - invalid 2FA code")
			return middleware.ValidationError(c, "Invalid two-factor authentication code", nil)
		}
	}

	// Create session
	session, err := sessionService.CreateSession(user.ID, ipAddress, userAgent)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to create session")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create session",
		})
	}

	// Update last login time
	if err := h.userService.UpdateLastLogin(user.ID); err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to update last login time")
		// Don't fail login if update fails
	}

	utils.Logger.Info().
		Str("user_id", user.ID.String()).
		Str("ip", ipAddress).
		Msg("User logged in successfully")

	return c.JSON(LoginResponse{
		Message: "Login successful",
		User:    user.ToPublic(),
		Token:   session.Token,
	})
}

// LogoutResponse represents a logout response
type LogoutResponse struct {
	Message string `json:"message"`
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	// Get session from context (set by auth middleware)
	sessionValue := c.Locals("session")
	if sessionValue == nil {
		return middleware.ValidationError(c, "No active session", nil)
	}

	sessionService := services.NewSessionService()

	// Extract token from Authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return middleware.ValidationError(c, "Authorization header required", nil)
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 {
		return middleware.ValidationError(c, "Invalid authorization format", nil)
	}

	token := parts[1]

	// Revoke session
	if err := sessionService.RevokeSession(token); err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to revoke session")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to logout",
		})
	}

	// Log logout - safely get user_id from context
	userID := c.Locals("user_id")
	if userID != nil {
		// user_id is stored as uuid.UUID in context
		if uid, ok := userID.(uuid.UUID); ok {
			utils.Logger.Info().
				Str("user_id", uid.String()).
				Msg("User logged out successfully")
		}
	}

	return c.JSON(LogoutResponse{
		Message: "Logout successful",
	})
}

// ForgotPasswordRequest represents a forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

// ForgotPasswordResponse represents a forgot password response
type ForgotPasswordResponse struct {
	Message string `json:"message"`
}

// ForgotPassword handles password reset requests
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	if req.Email == "" {
		return middleware.ValidationError(c, "Email is required", map[string]interface{}{
			"email": "required",
		})
	}

	// Get IP address and user agent
	ipAddress := c.IP()
	userAgent := c.Get("User-Agent")

	// Request password reset
	passwordService := services.NewPasswordService()
	user, token, err := passwordService.RequestPasswordReset(req.Email, ipAddress, userAgent)

	// Always return success to prevent email enumeration
	// Even if the email doesn't exist, we return success
	if err != nil {
		utils.Logger.Error().Err(err).Str("email", req.Email).Msg("Password reset request failed")
		// Still return success to prevent enumeration
	}

	// Send reset email only if user exists
	if user != nil && token != nil {
		if err := h.emailService.SendPasswordResetEmail(user.Email, user.Name, token.Token); err != nil {
			utils.Logger.Error().Err(err).Str("email", user.Email).Msg("Failed to send password reset email")
			// Don't fail the request if email fails
		}
	}

	return c.JSON(ForgotPasswordResponse{
		Message: "If your email is registered, you will receive a password reset link shortly.",
	})
}

// ResetPasswordRequest represents a password reset request
type ResetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

// ResetPasswordResponse represents a password reset response
type ResetPasswordResponse struct {
	Message string `json:"message"`
}

// ResetPassword handles password reset with token
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return middleware.ValidationError(c, "Invalid request body", nil)
	}

	if req.Token == "" {
		return middleware.ValidationError(c, "Reset token is required", map[string]interface{}{
			"token": "required",
		})
	}

	if req.Password == "" {
		return middleware.ValidationError(c, "New password is required", map[string]interface{}{
			"password": "required",
		})
	}

	// Get IP address and user agent
	ipAddress := c.IP()
	userAgent := c.Get("User-Agent")

	// Reset password
	passwordService := services.NewPasswordService()
	user, err := passwordService.ResetPassword(req.Token, req.Password, ipAddress, userAgent)
	if err != nil {
		utils.Logger.Error().Err(err).Msg("Password reset failed")
		return middleware.ValidationError(c, err.Error(), nil)
	}

	utils.Logger.Info().
		Str("user_id", user.ID.String()).
		Str("email", user.Email).
		Msg("Password reset successful")

	return c.JSON(ResetPasswordResponse{
		Message: "Password reset successful. You can now sign in with your new password.",
	})
}
