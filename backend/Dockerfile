FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the Go application
RUN CGO_ENABLED=0 GOOS=linux go build -o api-server cmd/api/main.go

# Use a lightweight alpine image for the runtime
FROM alpine:latest
WORKDIR /app/

# Copy the built binary
COPY --from=builder /app/api-server .

# Expose backend port
EXPOSE 8082

# Run the backend
CMD ["./api-server"]
