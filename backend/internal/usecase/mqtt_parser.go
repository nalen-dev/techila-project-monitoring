package usecase

import (
	"bufio"
	"encoding/json"
	"os"
	"strings"
	"time"
)

type MqttLogEntry struct {
	Timestamp     string                 `json:"timestamp"`
	TopicCategory string                 `json:"topic_category"` // e.g., batch-monitoring or backup
	Identifier    string                 `json:"identifier"`     // e.g., CM3, CM4, FM5
	RawTopic      string                 `json:"raw_topic"`
	Payload       map[string]interface{} `json:"payload"`
	RawBlock      string                 `json:"raw_block"`
}

// ParseAndFilterMqttLogs reads the MQTT log file and separates it into blocks,
// then filters based on category, identifier, and timestamp.
func ParseAndFilterMqttLogs(filePath string, categoryFilter, identifierFilter, startTimeStr, endTimeStr, tsStartStr, tsEndStr string, maxLines int) ([]MqttLogEntry, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var entries []MqttLogEntry
	scanner := bufio.NewScanner(file)
	
	// Tingkatkan ukuran buffer karena payload JSON bisa cukup panjang
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	var currentBlock strings.Builder
	var currentTimestamp string
	var currentRawTopic string
	var currentCategory string
	var currentIdentifier string
	inPayload := false

	// Parse custom time filters if provided
	var startTime, endTime time.Time
	hasStartTime := startTimeStr != ""
	hasEndTime := endTimeStr != ""
	
	// Gunakan zona waktu lokal atau set ke Asia/Jakarta (+07:00) 
	// karena log menggunakan +07:00
	if hasStartTime {
		startTime, _ = time.Parse(time.RFC3339, startTimeStr+":00+07:00")
	}
	if hasEndTime {
		// Tambahkan detik :59 agar mencakup seluruh menit tersebut
		endTime, _ = time.Parse(time.RFC3339, endTimeStr+":59+07:00")
	}

	// Payload TS filters
	var tsStart, tsEnd time.Time
	hasTsStart := tsStartStr != ""
	hasTsEnd := tsEndStr != ""
	if hasTsStart {
		tsStart, _ = time.Parse(time.RFC3339, tsStartStr+":00+07:00")
	}
	if hasTsEnd {
		tsEnd, _ = time.Parse(time.RFC3339, tsEndStr+":59+07:00")
	}

	// Pre-load timezone for parsing
	loc, _ := time.LoadLocation("Asia/Jakarta")

	for scanner.Scan() {
		line := scanner.Text()
		
		// Deteksi awal blok baru
		if strings.Contains(line, "| Topic:") && strings.Contains(line, "| Payload:") {
			currentBlock.Reset()
			currentBlock.WriteString(line + "\n")
			
			// Parsing header: 2026-06-09T11:54:15+07:00 | Topic: cisangkan/batch-monitoring/CM3 | Payload: {
			parts := strings.Split(line, "|")
			if len(parts) >= 3 {
				currentTimestamp = strings.TrimSpace(parts[0])
				
				topicPart := strings.TrimSpace(strings.Replace(parts[1], "Topic:", "", 1))
				currentRawTopic = topicPart
				
				// Extract category and identifier dari topic (contoh: cisangkan/batch-monitoring/CM3)
				topicSegments := strings.Split(topicPart, "/")
				if len(topicSegments) >= 3 {
					currentCategory = topicSegments[1]
					currentIdentifier = topicSegments[2]
				}
			}
			inPayload = true
			continue
		}

		if inPayload {
			currentBlock.WriteString(line + "\n")
			// Asumsi payload ditutup dengan kurawal penutup di awal baris
			if strings.HasPrefix(strings.TrimSpace(line), "}") {
				inPayload = false
				
				// Terapkan Filter
				matchCategory := (categoryFilter == "" || categoryFilter == "all" || currentCategory == categoryFilter)
				matchIdentifier := (identifierFilter == "" || identifierFilter == "all" || currentIdentifier == identifierFilter)
				matchTime := true

				// Time Filtering
				if hasStartTime || hasEndTime {
					// format log: 2026-06-09T11:54:15+07:00
					logTime, err := time.Parse(time.RFC3339, currentTimestamp)
					if err == nil {
						if hasStartTime && logTime.Before(startTime) {
							matchTime = false
						}
						if hasEndTime && logTime.After(endTime) {
							matchTime = false
						}
					}
				}

				if matchCategory && matchIdentifier && matchTime {
					// Ekstrak string JSON untuk di-parse
					rawStr := currentBlock.String()
					payloadStartIndex := strings.Index(rawStr, "Payload: {")
					var payloadMap map[string]interface{}
					
					if payloadStartIndex != -1 {
						jsonStr := rawStr[payloadStartIndex+9:] // ambil mulai dari '{'
						_ = json.Unmarshal([]byte(jsonStr), &payloadMap)
					}

					matchTs := true
					if hasTsStart || hasTsEnd {
						tsVal, ok := payloadMap["ts"].(string)
						if ok {
							var payloadTime time.Time
							var parseErr error
							
							if strings.Contains(tsVal, "T") {
								// Format "2026-08-06T06:22:46.130076"
								payloadTime, parseErr = time.ParseInLocation("2006-01-02T15:04:05.999999", tsVal, loc)
							} else {
								// Format "06/08 08:23:42" -> DD/MM HH:mm:ss
								// Asumsikan tahun dari log file (currentTimestamp format "2026-06...")
								var year string
								if len(currentTimestamp) >= 4 {
									year = currentTimestamp[:4]
								} else {
									year = time.Now().Format("2006")
								}
								payloadTime, parseErr = time.ParseInLocation("2006/02/01 15:04:05", year+"/"+tsVal, loc)
							}

							if parseErr == nil {
								if hasTsStart && payloadTime.Before(tsStart) {
									matchTs = false
								}
								if hasTsEnd && payloadTime.After(tsEnd) {
									matchTs = false
								}
							} else {
								matchTs = false // skip if unparseable
							}
						} else {
							matchTs = false // skip if no ts
						}
					}

					if matchTs {
						entries = append(entries, MqttLogEntry{
							Timestamp:     currentTimestamp,
							TopicCategory: currentCategory,
							Identifier:    currentIdentifier,
							RawTopic:      currentRawTopic,
							Payload:       payloadMap,
							RawBlock:      rawStr,
						})
					}
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	// Ambil N terakhir
	if maxLines > 0 && len(entries) > maxLines {
		entries = entries[len(entries)-maxLines:]
	}

	return entries, nil
}
