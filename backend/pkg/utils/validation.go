package utils

import (
	"fmt"
	"net/mail"
	"regexp"
	"strings"
)

var (
	// Common disposable email domains
	disposableDomains = map[string]bool{
		"tempmail.com":      true,
		"throwaway.email":   true,
		"guerrillamail.com": true,
		"10minutemail.com":  true,
		"mailinator.com":    true,
	}
)

// ValidateEmail validates an email address
func ValidateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email is required")
	}

	// Trim whitespace
	email = strings.TrimSpace(email)

	// Check length
	if len(email) > 254 {
		return fmt.Errorf("email is too long (max 254 characters)")
	}

	// Parse email using standard library
	addr, err := mail.ParseAddress(email)
	if err != nil {
		return fmt.Errorf("invalid email format")
	}

	// Additional validation
	if addr.Address != email {
		return fmt.Errorf("invalid email format")
	}

	// Check for disposable email domains
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return fmt.Errorf("invalid email format")
	}

	domain := strings.ToLower(parts[1])
	if disposableDomains[domain] {
		return fmt.Errorf("disposable email addresses are not allowed")
	}

	return nil
}

// NormalizeEmail normalizes an email address (lowercase, trim)
func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// ValidateName validates a user's name
func ValidateName(name string) error {
	if name == "" {
		return nil // Name is optional
	}

	name = strings.TrimSpace(name)

	if len(name) < 2 {
		return fmt.Errorf("name must be at least 2 characters")
	}

	if len(name) > 100 {
		return fmt.Errorf("name must be at most 100 characters")
	}

	// Allow letters, spaces, hyphens, and apostrophes
	validName := regexp.MustCompile(`^[a-zA-Z\s\-']+$`)
	if !validName.MatchString(name) {
		return fmt.Errorf("name contains invalid characters")
	}

	return nil
}

// SanitizeName sanitizes a user's name
func SanitizeName(name string) string {
	return strings.TrimSpace(name)
}

// ValidateURL validates a URL
func ValidateURL(url string) error {
	if url == "" {
		return nil // URL is optional
	}

	if len(url) > 500 {
		return fmt.Errorf("URL is too long (max 500 characters)")
	}

	// Basic URL pattern validation
	validURL := regexp.MustCompile(`^https?://`)
	if !validURL.MatchString(url) {
		return fmt.Errorf("URL must start with http:// or https://")
	}

	return nil
}

// SanitizeString removes potentially dangerous characters from user input
// This is defense-in-depth; the API returns JSON (not HTML) so XSS is not a primary concern
func SanitizeString(input string) string {
	// Trim whitespace
	sanitized := strings.TrimSpace(input)

	// Remove null bytes
	sanitized = strings.ReplaceAll(sanitized, "\x00", "")

	// Remove control characters except newlines and tabs
	var result strings.Builder
	for _, r := range sanitized {
		if r == '\n' || r == '\t' || r >= 32 {
			result.WriteRune(r)
		}
	}

	return result.String()
}

// SanitizeHTML removes HTML tags and potentially dangerous content
// Used for fields that should be plain text only
func SanitizeHTML(input string) string {
	// Remove HTML tags
	htmlTags := regexp.MustCompile(`<[^>]*>`)
	sanitized := htmlTags.ReplaceAllString(input, "")

	// Remove script tags content even if malformed
	scriptContent := regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`)
	sanitized = scriptContent.ReplaceAllString(sanitized, "")

	// Basic sanitization
	return SanitizeString(sanitized)
}

// ValidateCVEID validates a CVE ID format (CVE-YYYY-NNNNN)
func ValidateCVEID(cveID string) error {
	if cveID == "" {
		return nil // CVE ID is optional
	}

	// CVE ID format: CVE-YYYY-NNNNN (year with 4 digits, number with at least 4 digits)
	validCVE := regexp.MustCompile(`^CVE-\d{4}-\d{4,}$`)
	if !validCVE.MatchString(cveID) {
		return fmt.Errorf("CVE ID must be in format CVE-YYYY-NNNNN (e.g., CVE-2024-12345)")
	}

	return nil
}
