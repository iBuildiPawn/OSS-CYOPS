package services

import (
	"fmt"
	"net/smtp"
	"strings"

	"github.com/cyops/cyops-backend/pkg/config"
	"github.com/cyops/cyops-backend/pkg/utils"
)

// EmailService handles email sending
type EmailService struct {
	config *config.Config
}

// NewEmailService creates a new email service
func NewEmailService(cfg *config.Config) *EmailService {
	return &EmailService{
		config: cfg,
	}
}

// SendVerificationEmail sends an email verification email
func (s *EmailService) SendVerificationEmail(to, name, token string) error {
	if !s.isConfigured() {
		utils.Logger.Warn().Msg("SMTP not configured, email not sent (check logs in development)")
		// In development, log the verification link instead of sending email
		utils.Logger.Info().
			Str("to", to).
			Str("token", token).
			Str("verification_url", s.buildVerificationURL(token)).
			Msg("Verification email (not sent - SMTP not configured)")
		return nil
	}

	subject := "Verify Your Email Address"
	body := s.buildVerificationEmailBody(name, token)

	return s.sendEmail(to, subject, body)
}

// SendPasswordResetEmail sends a password reset email
func (s *EmailService) SendPasswordResetEmail(to, name, token string) error {
	if !s.isConfigured() {
		utils.Logger.Warn().Msg("SMTP not configured, email not sent (check logs in development)")
		utils.Logger.Info().
			Str("to", to).
			Str("token", token).
			Str("reset_url", s.buildPasswordResetURL(token)).
			Msg("Password reset email (not sent - SMTP not configured)")
		return nil
	}

	subject := "Reset Your Password"
	body := s.buildPasswordResetEmailBody(name, token)

	return s.sendEmail(to, subject, body)
}

// sendEmail sends an email using SMTP
func (s *EmailService) sendEmail(to, subject, body string) error {
	from := s.config.FromEmail

	// Set up authentication
	auth := smtp.PlainAuth("", s.config.SMTPUsername, s.config.SMTPPassword, s.config.SMTPHost)

	// Build message
	msg := []byte(fmt.Sprintf("To: %s\r\n"+
		"From: %s\r\n"+
		"Subject: %s\r\n"+
		"Content-Type: text/html; charset=UTF-8\r\n"+
		"\r\n"+
		"%s\r\n", to, from, subject, body))

	// Send email
	addr := fmt.Sprintf("%s:%d", s.config.SMTPHost, s.config.SMTPPort)
	if err := smtp.SendMail(addr, auth, from, []string{to}, msg); err != nil {
		utils.Logger.Error().Err(err).Str("to", to).Msg("Failed to send email")
		return fmt.Errorf("failed to send email: %w", err)
	}

	utils.Logger.Info().Str("to", to).Str("subject", subject).Msg("Email sent successfully")
	return nil
}

// isConfigured checks if SMTP is configured
func (s *EmailService) isConfigured() bool {
	return s.config.SMTPHost != "" && s.config.SMTPUsername != ""
}

// buildVerificationURL builds the email verification URL
func (s *EmailService) buildVerificationURL(token string) string {
	// In production, this should be the frontend URL
	frontendURL := "http://localhost:3000" // TODO: Get from config
	return fmt.Sprintf("%s/verify-email?token=%s", frontendURL, token)
}

// buildPasswordResetURL builds the password reset URL
func (s *EmailService) buildPasswordResetURL(token string) string {
	frontendURL := "http://localhost:3000" // TODO: Get from config
	return fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)
}

// buildVerificationEmailBody builds the verification email body
func (s *EmailService) buildVerificationEmailBody(name, token string) string {
	verificationURL := s.buildVerificationURL(token)

	greeting := "Hello"
	if name != "" {
		greeting = fmt.Sprintf("Hello %s", name)
	}

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #4a5568;">Verify Your Email Address</h2>
    <p>%s,</p>
    <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="%s" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
    </div>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #4299e1;">%s</p>
    <p style="color: #718096; font-size: 14px; margin-top: 30px;">
        This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.
    </p>
</body>
</html>
`, greeting, verificationURL, verificationURL)

	return strings.TrimSpace(body)
}

// buildPasswordResetEmailBody builds the password reset email body
func (s *EmailService) buildPasswordResetEmailBody(name, token string) string {
	resetURL := s.buildPasswordResetURL(token)

	greeting := "Hello"
	if name != "" {
		greeting = fmt.Sprintf("Hello %s", name)
	}

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #4a5568;">Reset Your Password</h2>
    <p>%s,</p>
    <p>You requested to reset your password. Click the button below to set a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="%s" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
    </div>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #4299e1;">%s</p>
    <p style="color: #718096; font-size: 14px; margin-top: 30px;">
        This password reset link will expire in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.
    </p>
</body>
</html>
`, greeting, resetURL, resetURL)

	return strings.TrimSpace(body)
}
