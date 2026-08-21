package usecase

import (
	"bufio"
	"encoding/json"
	"os"
	"strings"
	"time"
)

type LogEntry struct {
	Time string `json:"time"`
}

func ParseAndFilterJsonlLogs(filePath string, categoryFilter, identifierFilter, startTimeStr, endTimeStr string, maxLines int) ([]string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var entries []string
	scanner := bufio.NewScanner(file)
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	var startTime, endTime time.Time
	hasStartTime := startTimeStr != ""
	hasEndTime := endTimeStr != ""
	hasCategory := categoryFilter != "" && categoryFilter != "all"
	hasIdentifier := identifierFilter != "" && identifierFilter != "all"

	if hasStartTime {
		startTime, _ = time.Parse(time.RFC3339, startTimeStr+":00+07:00")
	}
	if hasEndTime {
		endTime, _ = time.Parse(time.RFC3339, endTimeStr+":59+07:00")
	}

	for scanner.Scan() {
		line := scanner.Text()
		
		if hasStartTime || hasEndTime || hasCategory || hasIdentifier {
			var logData map[string]interface{}
			if err := json.Unmarshal([]byte(line), &logData); err == nil {
				
				// 1. Time Filtering
				if hasStartTime || hasEndTime {
					timeStr, ok := logData["time"].(string)
					if ok {
						logTime, err := time.Parse(time.RFC3339Nano, timeStr)
						if err == nil {
							if hasStartTime && logTime.Before(startTime) {
								continue
							}
							if hasEndTime && logTime.After(endTime) {
								continue
							}
						} else { continue }
					} else { continue }
				}

				// 2. Category & Identifier Filtering (khusus mqtt-worker.log yang punya field topic/machine)
				if hasCategory || hasIdentifier {
					topicStr, _ := logData["topic"].(string)
					machineStr, _ := logData["machine"].(string)

					if hasCategory {
						if topicStr == "" || !strings.Contains(topicStr, "/"+categoryFilter+"/") {
							continue
						}
					}
					if hasIdentifier {
						if machineStr != "" && machineStr != identifierFilter {
							continue
						}
						if machineStr == "" && topicStr != "" && !strings.HasSuffix(topicStr, "/"+identifierFilter) {
							continue
						}
						if machineStr == "" && topicStr == "" {
							continue
						}
					}
				}

			} else {
				// Jika strict filter aktif tapi json rusak
				continue
			}
		}
		entries = append(entries, line)
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	if maxLines > 0 && len(entries) > maxLines {
		entries = entries[len(entries)-maxLines:]
	}

	return entries, nil
}
