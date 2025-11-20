# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Development stage
FROM golang:1.24-alpine AS development

WORKDIR /app

# Install Air for live reloading (v1.52.3 compatible with Go 1.24)
RUN go install github.com/air-verse/air@v1.52.3

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Run with Air for hot reload
CMD ["air", "-c", ".air.toml"]

# Production stage
FROM alpine:latest AS production

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Copy binary from builder
COPY --from=builder /build/main .

# Copy migrations
COPY --from=builder /build/migrations ./migrations

# Expose port
EXPOSE 8080

# Run the binary
CMD ["./main"]