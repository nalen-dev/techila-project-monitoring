package usecase

import (
	"os/exec"
	"strconv"
	"strings"
)

// ReadTailLog membaca N baris terakhir dari sebuah file menggunakan command 'tail'
func ReadTailLog(filePath string, lines int) ([]string, error) {
	nParam := strconv.Itoa(lines)
	
	// Execute `tail -n <lines> <file>`
	cmd := exec.Command("tail", "-n", nParam, filePath)
	output, err := cmd.Output()
	
	if err != nil {
		return nil, err
	}

	// Pecah berdasarkan newline
	rawStr := string(output)
	// Pisahkan baris per baris dan bersihkan string kosong di akhir
	linesArr := strings.Split(strings.TrimSpace(rawStr), "\n")
	
	return linesArr, nil
}
