package main

import (
	"log"
	"monitoring-app-backend/internal/delivery/http"
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
)

func main() {
	r := gin.Default()

	// Setup CORS agar frontend React (Port 5173) bisa menembak API ini
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
	}))

	// Register Routes
	api := r.Group("/api/v1")
	http.RegisterLogRoutes(api)

	log.Println("Server running on port 8082...")
	r.Run(":8082")
}
