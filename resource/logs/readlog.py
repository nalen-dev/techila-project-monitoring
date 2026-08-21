import json
import re
from collections import defaultdict

# Anggap data log Anda disimpan dalam file bernama 'mqtt_log.txt'
log_file_path = 'mqtt_raw_messages.txt'

# Dictionary untuk menyimpan jumlah kemunculan tiap batch per topic
# Format: {'topic_name': {'batch_number': count}}
batch_counts = defaultdict(lambda: defaultdict(int))

# Pola Regex untuk mengekstrak Topic dan Payload JSON dari setiap baris log
log_pattern = re.compile(r'Topic:\s*(.*?)\s*\|\s*Payload:\s*({.*})', re.DOTALL)

with open(log_file_path, 'r') as file:
    content = file.read()
    
    # Memisahkan setiap block log berdasarkan tahun (asumsi log dimulai dengan 2026)
    # Ini untuk menangani payload JSON yang memiliki banyak baris (multiline)
    log_blocks = re.split(r'\n(?=\d{4}-\d{2}-\d{2}T)', content)
    
    for block in log_blocks:
        if not block.strip():
            continue
            
        match = log_pattern.search(block)
        if match:
            topic = match.group(1).strip()
            payload_str = match.group(2).strip()
            
            try:
                payload = json.loads(payload_str)
                
                # Cek tipe batch number tergantung topic/mesinnya
                if 'CM3' in topic and 'batch_number' in payload:
                    batch_id = payload['batch_number']
                    batch_counts[topic][batch_id] += 1
                elif 'FM5' in topic and 'batch_number_a' in payload:
                    batch_id = payload['batch_number_a']
                    batch_counts[topic][batch_id] += 1
                    
            except json.JSONDecodeError:
                continue

# Menampilkan Hasil (Hanya yang ganda / lebih dari 1)
print("=== LAPORAN BATCH GANDA ===")
for topic, batches in batch_counts.items():
    print(f"\nTopic: {topic}")
    found_duplicate = False
    
    for batch_id, count in batches.items():
        if count > 1:
            print(f" - Batch No: {batch_id} | Jumlah Ganda: {count} kali")
            found_duplicate = True
            
    if not found_duplicate:
        print(" - Tidak ada batch ganda.")
