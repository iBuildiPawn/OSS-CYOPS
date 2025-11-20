package services

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/models"
	"github.com/cyops/cyops-backend/pkg/auth"
	"github.com/cyops/cyops-backend/pkg/database"
	"github.com/cyops/cyops-backend/pkg/utils"
	"gorm.io/gorm"
)

// TwoFactorService handles 2FA operations
type TwoFactorService struct {
	db *gorm.DB
}

// NewTwoFactorService creates a new 2FA service
func NewTwoFactorService() *TwoFactorService {
	return &TwoFactorService{
		db: database.GetDB(),
	}
}

// Enable2FAResponse represents the response for enabling 2FA
type Enable2FAResponse struct {
	Secret      string   `json:"secret"`
	QRCode      string   `json:"qr_code"`
	BackupCodes []string `json:"backup_codes"`
	URL         string   `json:"url"`
}

// EnableTwoFactor initiates 2FA setup for a user
func (s *TwoFactorService) EnableTwoFactor(userID uuid.UUID, issuer string) (*Enable2FAResponse, error) {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check if 2FA is already enabled
	if user.TwoFactorEnabled {
		return nil, fmt.Errorf("two-factor authentication is already enabled")
	}

	// Generate TOTP secret
	accountName := user.Email
	key, err := auth.GenerateTOTPSecret(accountName, issuer)
	if err != nil {
		return nil, fmt.Errorf("failed to generate TOTP secret: %w", err)
	}

	// Generate QR code
	qrCode, err := auth.GenerateQRCode(key)
	if err != nil {
		return nil, fmt.Errorf("failed to generate QR code: %w", err)
	}

	// Generate backup codes
	backupCodes, err := auth.GenerateBackupCodes(8)
	if err != nil {
		return nil, fmt.Errorf("failed to generate backup codes: %w", err)
	}

	// Store backup codes as JSON
	backupCodesJSON, err := json.Marshal(backupCodes)
	if err != nil {
		return nil, fmt.Errorf("failed to encode backup codes: %w", err)
	}

	// Save secret and backup codes (not yet enabled)
	user.TwoFactorSecret = key.Secret()
	user.BackupCodes = string(backupCodesJSON)

	if err := s.db.Save(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to save 2FA setup: %w", err)
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Msg("2FA setup initiated")

	return &Enable2FAResponse{
		Secret:      key.Secret(),
		QRCode:      qrCode,
		BackupCodes: backupCodes,
		URL:         auth.GetTOTPURL(key),
	}, nil
}

// VerifyAndEnable2FA verifies the TOTP code and enables 2FA
func (s *TwoFactorService) VerifyAndEnable2FA(userID uuid.UUID, code string, ipAddress, userAgent string) error {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("database error: %w", err)
	}

	// Check if 2FA is already enabled
	if user.TwoFactorEnabled {
		return fmt.Errorf("two-factor authentication is already enabled")
	}

	// Check if secret exists
	if user.TwoFactorSecret == "" {
		return fmt.Errorf("2FA setup not initiated. Please start setup first")
	}

	// Validate TOTP code
	if !auth.ValidateTOTPCode(code, user.TwoFactorSecret) {
		return fmt.Errorf("invalid verification code")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Enable 2FA
	user.TwoFactorEnabled = true
	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to enable 2FA: %w", err)
	}

	// Log 2FA enabled event
	event := models.NewAuthEvent(&userID, models.EventTypeTwoFactorEnabled, ipAddress, userAgent)
	if err := tx.Create(event).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to log 2FA enabled event")
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Msg("2FA enabled successfully")

	return nil
}

// DisableTwoFactor disables 2FA for a user
func (s *TwoFactorService) DisableTwoFactor(userID uuid.UUID, password, code string, ipAddress, userAgent string) error {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("database error: %w", err)
	}

	// Check if 2FA is enabled
	if !user.TwoFactorEnabled {
		return fmt.Errorf("two-factor authentication is not enabled")
	}

	// Verify password
	if !user.CheckPassword(password) {
		return fmt.Errorf("incorrect password")
	}

	// Verify TOTP code or backup code
	validCode := auth.ValidateTOTPCode(code, user.TwoFactorSecret)
	if !validCode {
		// Check if it's a valid backup code
		validCode = s.validateBackupCode(&user, code)
	}

	if !validCode {
		return fmt.Errorf("invalid verification code")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Disable 2FA
	user.TwoFactorEnabled = false
	user.TwoFactorSecret = ""
	user.BackupCodes = ""

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to disable 2FA: %w", err)
	}

	// Log 2FA disabled event
	event := models.NewAuthEvent(&userID, models.EventTypeTwoFactorDisabled, ipAddress, userAgent)
	if err := tx.Create(event).Error; err != nil {
		utils.Logger.Error().Err(err).Msg("Failed to log 2FA disabled event")
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	utils.Logger.Info().
		Str("user_id", userID.String()).
		Msg("2FA disabled successfully")

	return nil
}

// VerifyTOTP verifies a TOTP code for a user (used during login)
func (s *TwoFactorService) VerifyTOTP(userID uuid.UUID, code string) (bool, error) {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, fmt.Errorf("user not found")
		}
		return false, fmt.Errorf("database error: %w", err)
	}

	if !user.TwoFactorEnabled {
		return false, fmt.Errorf("2FA is not enabled for this user")
	}

	// Check TOTP code
	if auth.ValidateTOTPCode(code, user.TwoFactorSecret) {
		return true, nil
	}

	// Check backup code
	if s.validateBackupCode(&user, code) {
		// Remove used backup code
		if err := s.removeBackupCode(&user, code); err != nil {
			utils.Logger.Error().Err(err).Msg("Failed to remove used backup code")
		}
		return true, nil
	}

	return false, nil
}

// validateBackupCode checks if a backup code is valid
func (s *TwoFactorService) validateBackupCode(user *models.User, code string) bool {
	if user.BackupCodes == "" {
		return false
	}

	var backupCodes []string
	if err := json.Unmarshal([]byte(user.BackupCodes), &backupCodes); err != nil {
		return false
	}

	for _, bc := range backupCodes {
		if bc == code {
			return true
		}
	}

	return false
}

// removeBackupCode removes a used backup code
func (s *TwoFactorService) removeBackupCode(user *models.User, code string) error {
	if user.BackupCodes == "" {
		return nil
	}

	var backupCodes []string
	if err := json.Unmarshal([]byte(user.BackupCodes), &backupCodes); err != nil {
		return err
	}

	// Remove the used code
	updatedCodes := make([]string, 0)
	for _, bc := range backupCodes {
		if bc != code {
			updatedCodes = append(updatedCodes, bc)
		}
	}

	// Update user
	backupCodesJSON, err := json.Marshal(updatedCodes)
	if err != nil {
		return err
	}

	user.BackupCodes = string(backupCodesJSON)
	return s.db.Save(user).Error
}
