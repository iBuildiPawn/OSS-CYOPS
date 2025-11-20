package imageutil

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
)

// ImageProcessor handles image normalization and thumbnail generation
type ImageProcessor struct {
	MaxWidth       int  // Maximum width for normalized images
	MaxHeight      int  // Maximum height for normalized images
	ThumbnailSize  int  // Size for square thumbnails
	JPEGQuality    int  // JPEG compression quality (1-100)
}

// NewImageProcessor creates a new image processor with default settings
func NewImageProcessor() *ImageProcessor {
	return &ImageProcessor{
		MaxWidth:      1920,  // Standard reporting size
		MaxHeight:     1080,  // Standard reporting size
		ThumbnailSize: 256,   // 256x256 thumbnails
		JPEGQuality:   85,    // Good quality/size balance
	}
}

// ProcessedImage contains the processed image data
type ProcessedImage struct {
	Data      []byte
	Width     int
	Height    int
	Format    string
	Thumbnail []byte
}

// ProcessImage normalizes an image and generates a thumbnail
func (p *ImageProcessor) ProcessImage(data []byte, originalFilename string) (*ProcessedImage, error) {
	// Detect image format
	format := strings.ToLower(filepath.Ext(originalFilename))

	// Decode image
	img, err := p.decodeImage(data, format)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	// Get original dimensions
	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	// Normalize (resize if needed)
	normalized := img
	if originalWidth > p.MaxWidth || originalHeight > p.MaxHeight {
		normalized = imaging.Fit(img, p.MaxWidth, p.MaxHeight, imaging.Lanczos)
	}

	// Generate thumbnail (square, center crop)
	thumbnail := imaging.Fill(img, p.ThumbnailSize, p.ThumbnailSize, imaging.Center, imaging.Lanczos)

	// Encode normalized image as JPEG
	var normalizedBuf bytes.Buffer
	if err := p.encodeJPEG(&normalizedBuf, normalized); err != nil {
		return nil, fmt.Errorf("failed to encode normalized image: %w", err)
	}

	// Encode thumbnail as JPEG
	var thumbnailBuf bytes.Buffer
	if err := p.encodeJPEG(&thumbnailBuf, thumbnail); err != nil {
		return nil, fmt.Errorf("failed to encode thumbnail: %w", err)
	}

	normalizedBounds := normalized.Bounds()

	return &ProcessedImage{
		Data:      normalizedBuf.Bytes(),
		Width:     normalizedBounds.Dx(),
		Height:    normalizedBounds.Dy(),
		Format:    "jpeg",
		Thumbnail: thumbnailBuf.Bytes(),
	}, nil
}

// decodeImage decodes an image from bytes based on format
func (p *ImageProcessor) decodeImage(data []byte, format string) (image.Image, error) {
	reader := bytes.NewReader(data)

	switch format {
	case ".jpg", ".jpeg":
		return jpeg.Decode(reader)
	case ".png":
		return png.Decode(reader)
	default:
		// Try generic decode
		img, _, err := image.Decode(bytes.NewReader(data))
		return img, err
	}
}

// encodeJPEG encodes an image as JPEG
func (p *ImageProcessor) encodeJPEG(w io.Writer, img image.Image) error {
	return jpeg.Encode(w, img, &jpeg.Options{Quality: p.JPEGQuality})
}

// IsImage checks if a file is an image based on MIME type
func IsImage(mimeType string) bool {
	imageMimes := []string{
		"image/jpeg",
		"image/png",
		"image/gif",
		"image/webp",
		"image/bmp",
	}

	for _, mime := range imageMimes {
		if strings.HasPrefix(mimeType, mime) {
			return true
		}
	}

	return false
}

// ValidateImageFile validates image file size and format
func ValidateImageFile(data []byte, filename string, maxSizeBytes int64) error {
	// Check file size
	if int64(len(data)) > maxSizeBytes {
		return fmt.Errorf("file size exceeds maximum allowed size of %d MB", maxSizeBytes/1024/1024)
	}

	// Check if it's a valid image
	_, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("invalid image file: %w", err)
	}

	return nil
}
