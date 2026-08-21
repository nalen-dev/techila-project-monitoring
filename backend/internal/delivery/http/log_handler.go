package http

import (
	"github.com/gin-gonic/gin"
	"monitoring-app-backend/internal/usecase"
	"net/http"
	"strconv"
	"strings"
)

func RegisterLogRoutes(router *gin.RouterGroup) {
	router.GET("/logs", GetLogs)
}

func GetLogs(c *gin.Context) {
	// Parse lines parameter (default 100)
	linesParam := c.DefaultQuery("lines", "100")
	lines, err := strconv.Atoi(linesParam)
	if err != nil || lines <= 0 {
		lines = 100
	}

	// Parse file parameter
	fileName := c.DefaultQuery("file", "mqtt_raw_messages.txt")
	
	// Security: Whitelist allowed log files
	if fileName != "mqtt_raw_messages.txt" && fileName != "api-server.log" && fileName != "mqtt-worker.log" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid log file requested"})
		return
	}

	logPath := "../resource/logs/" + fileName
	
	startTime := c.DefaultQuery("start_time", "")
	endTime := c.DefaultQuery("end_time", "")
	
	// Jika file adalah MQTT, gunakan Smart Parser
	if fileName == "mqtt_raw_messages.txt" {
		category := c.DefaultQuery("category", "all")
		identifier := c.DefaultQuery("identifier", "all")
		tsStart := c.DefaultQuery("ts_start", "")
		tsEnd := c.DefaultQuery("ts_end", "")
		
		mqttEntries, err := usecase.ParseAndFilterMqttLogs(logPath, category, identifier, startTime, endTime, tsStart, tsEnd, lines)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		
		// Ubah kembali dari struktur object ke string array agar kompatibel dengan UI frontend saat ini
		// atau kembalikan raw data JSON untuk di-render lebih bagus nanti
		var logContent []string
		for _, entry := range mqttEntries {
			logContent = append(logContent, strings.TrimSpace(entry.RawBlock))
		}
		
		c.JSON(http.StatusOK, gin.H{
			"file":       fileName,
			"lines":      lines,
			"category":   category,
			"identifier": identifier,
			"data":       logContent,
			"parsedData": mqttEntries, // Kirimkan juga format JSON aslinya jika frontend ingin membuat tabel/grafik
		})
		return
	}

	// Untuk file log standar lainnya (api-server.log, mqtt-worker.log)
	category := c.DefaultQuery("category", "all")
	identifier := c.DefaultQuery("identifier", "all")
	logContent, err := usecase.ParseAndFilterJsonlLogs(logPath, category, identifier, startTime, endTime, lines)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"file":  fileName,
		"lines": lines,
		"data":  logContent,
	})
}
