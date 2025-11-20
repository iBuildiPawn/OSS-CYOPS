package auth

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"image/png"
	"strings"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

// GenerateTOTPSecret generates a new TOTP secret for a user
func GenerateTOTPSecret(accountName, issuer string) (*otp.Key, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      issuer,
		AccountName: accountName,
		SecretSize:  32, // 32 bytes = 256 bits for strong security
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate TOTP secret: %w", err)
	}

	return key, nil
}

// ValidateTOTPCode validates a TOTP code against a secret
func ValidateTOTPCode(code, secret string) bool {
	return totp.Validate(code, secret)
}

// GenerateQRCode generates a QR code image as a base64-encoded PNG
func GenerateQRCode(key *otp.Key) (string, error) {
	// Generate QR code
	var buf bytes.Buffer
	img, err := key.Image(200, 200) // 200x200 pixels
	if err != nil {
		return "", fmt.Errorf("failed to generate QR code image: %w", err)
	}

	// Encode as PNG
	if err := png.Encode(&buf, img); err != nil {
		return "", fmt.Errorf("failed to encode QR code as PNG: %w", err)
	}

	// Convert to base64
	encoded := base64.StdEncoding.EncodeToString(buf.Bytes())
	return fmt.Sprintf("data:image/png;base64,%s", encoded), nil
}

// GenerateBackupCodes generates a set of backup codes
func GenerateBackupCodes(count int) ([]string, error) {
	codes := make([]string, count)
	for i := 0; i < count; i++ {
		// Generate 8 random bytes
		b := make([]byte, 8)
		if _, err := rand.Read(b); err != nil {
			return nil, err
		}
		// Convert to hex string (16 chars)
		token := hex.EncodeToString(b)
		// Format as XXXX-XXXX for readability
		codes[i] = strings.ToUpper(token[:4] + "-" + token[4:8])
	}
	return codes, nil
}

// GetTOTPURL returns the provisioning URI for the TOTP key
func GetTOTPURL(key *otp.Key) string {
	return key.URL()
}
