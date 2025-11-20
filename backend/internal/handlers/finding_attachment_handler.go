package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/cyops/cyops-backend/internal/services"
	"github.com/cyops/cyops-backend/pkg/database"
)

type FindingAttachmentHandler struct {
	service *services.FindingAttachmentService
}

func NewFindingAttachmentHandler() *FindingAttachmentHandler {
	return &FindingAttachmentHandler{
		service: services.NewFindingAttachmentService(database.GetDB()),
	}
}

// UploadAttachment uploads a file attachment for a finding
// POST /api/findings/:id/attachments
func (h *FindingAttachmentHandler) UploadAttachment(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	findingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid finding ID",
		})
	}

	// Get file from multipart form
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "File is required",
		})
	}

	// Get attachment type and description from form
	attachmentType := c.FormValue("attachment_type", "PROOF")
	description := c.FormValue("description", "")

	// Validate attachment type
	validTypes := []string{"PROOF", "REMEDIATION", "VERIFICATION", "OTHER"}
	isValidType := false
	for _, vt := range validTypes {
		if attachmentType == vt {
			isValidType = true
			break
		}
	}
	if !isValidType {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Invalid attachment type. Must be one of: %v", validTypes),
		})
	}

	// Upload and process attachment
	attachment, err := h.service.UploadAttachment(
		findingID,
		file,
		attachmentType,
		description,
		userID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to upload attachment: %v", err),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Attachment uploaded successfully",
		"data":    attachment,
	})
}

// GetAttachment retrieves an attachment by ID
// GET /api/attachments/:id
func (h *FindingAttachmentHandler) GetAttachment(c *fiber.Ctx) error {
	attachmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid attachment ID",
		})
	}

	attachment, err := h.service.GetAttachment(attachmentID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Attachment not found",
		})
	}

	return c.JSON(fiber.Map{
		"data": attachment,
	})
}

// GetAttachmentFile serves the attachment file
// GET /api/attachments/:id/file
func (h *FindingAttachmentHandler) GetAttachmentFile(c *fiber.Ctx) error {
	attachmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid attachment ID",
		})
	}

	// Check if thumbnail is requested
	thumbnail := c.Query("thumbnail") == "true"

	attachment, err := h.service.GetAttachment(attachmentID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Attachment not found",
		})
	}

	// Get file data
	fileData, err := h.service.GetAttachmentFile(attachment, thumbnail)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read attachment file",
		})
	}

	// Set appropriate headers
	c.Set("Content-Type", attachment.MimeType)
	c.Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", attachment.OriginalName))

	return c.Send(fileData)
}

// DownloadAttachmentFile downloads the attachment file
// GET /api/attachments/:id/download
func (h *FindingAttachmentHandler) DownloadAttachmentFile(c *fiber.Ctx) error {
	attachmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid attachment ID",
		})
	}

	attachment, err := h.service.GetAttachment(attachmentID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Attachment not found",
		})
	}

	// Get file data (always full file, never thumbnail)
	fileData, err := h.service.GetAttachmentFile(attachment, false)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read attachment file",
		})
	}

	// Set download headers
	c.Set("Content-Type", attachment.MimeType)
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", attachment.OriginalName))

	return c.Send(fileData)
}

// ListFindingAttachments lists all attachments for a finding
// GET /api/findings/:id/attachments
func (h *FindingAttachmentHandler) ListFindingAttachments(c *fiber.Ctx) error {
	findingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid finding ID",
		})
	}

	attachments, err := h.service.GetFindingAttachments(findingID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list attachments",
		})
	}

	return c.JSON(fiber.Map{
		"data": attachments,
	})
}

// DeleteAttachment soft deletes an attachment
// DELETE /api/attachments/:id
func (h *FindingAttachmentHandler) DeleteAttachment(c *fiber.Ctx) error {
	attachmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid attachment ID",
		})
	}

	if err := h.service.DeleteAttachment(attachmentID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete attachment",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Attachment deleted successfully",
	})
}

// GetAttachmentStats returns statistics about attachments
// GET /api/findings/:id/attachments/stats
func (h *FindingAttachmentHandler) GetAttachmentStats(c *fiber.Ctx) error {
	var findingID *uuid.UUID

	// If finding ID is provided in path, get stats for that finding
	if idParam := c.Params("id"); idParam != "" {
		id, err := uuid.Parse(idParam)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid finding ID",
			})
		}
		findingID = &id
	}

	stats, err := h.service.GetAttachmentStats(findingID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get attachment statistics",
		})
	}

	return c.JSON(fiber.Map{
		"data": stats,
	})
}
