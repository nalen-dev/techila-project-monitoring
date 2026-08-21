import json
import re
import argparse
from datetime import datetime
from collections import defaultdict

def main():
    # Setup Argparse untuk mengambil argumen dari terminal
    parser = argparse.ArgumentParser(description="Analisis Batch Ganda di Log MQTT")
    parser.add_argument('--file', type=str, default='mqtt_raw_messages.txt', 
                        help="Path file log MQTT (default: mqtt_raw_mesages.txt)")
    # Default menggunakan tanggal hari ini, format DD/MM/YYYY
    parser.add_argument('--date', type=str, default=datetime.today().strftime('%d/%m/%Y'),
                        help="Filter tanggal dengan format DD/MM/YYYY (contoh: 11/06/2026). Default: Hari ini")

    args = parser.parse_args()

    # Log MQTT menggunakan format YYYY-MM-DD, jadi kita perlu mengkonversi input user
    try:
        target_date = datetime.strptime(args.date, '%d/%m/%Y').strftime('%Y-%m-%d')
    except ValueError:
        print("❌ Format tanggal salah! Pastikan menggunakan format DD/MM/YYYY (contoh: 11/06/2026)")
        return

    print(f"🔍 Menganalisis log untuk tanggal: {args.date} ...")

    batch_counts = defaultdict(lambda: defaultdict(int))

    try:
        with open(args.file, 'r') as file:
            content = file.read()
    except FileNotFoundError:
        print(f"❌ File '{args.file}' tidak ditemukan. Gunakan argumen --file untuk path yang benar.")
        return

    # Pisahkan blok log berdasarkan awalan baris yang memiliki format tanggal (YYYY-MM-DD)
    log_blocks = re.split(r'(?m)^(?=\d{4}-\d{2}-\d{2}T)', content)

    for block in log_blocks:
        if not block.strip():
            continue

        # Ekstrak Tanggal, Topic, dan Payload secara dinamis
        match = re.search(r'^(\d{4}-\d{2}-\d{2}).*?Topic:\s*(.*?)\s*\|\s*Payload:\s*({.*})', block, re.DOTALL)
        if match:
            log_date = match.group(1)
            topic = match.group(2).strip()
            payload_str = match.group(3).strip()

            # Filter data dengan melewati block yang tanggalnya tidak sesuai target
            if log_date != target_date:
                continue

            try:
                payload = json.loads(payload_str)

                # Logika filter untuk CM3 dan CM4 (menggunakan batch_number)
                if ('CM3' in topic or 'CM4' in topic) and 'batch_number' in payload:
                    batch_id = payload['batch_number']
                    batch_counts[topic][batch_id] += 1
                    
                # Logika filter untuk FM5 (menggunakan batch_number_a)
                elif 'FM5' in topic and 'batch_number_a' in payload:
                    batch_id = payload['batch_number_a']
                    batch_counts[topic][batch_id] += 1

            except json.JSONDecodeError:
                continue

    # --- Menampilkan Hasil ---
    print("\n=== LAPORAN BATCH GANDA ===")
    if not batch_counts:
        print(f"ℹ️ Tidak ada log payload ditemukan pada tanggal {args.date}.")
        return

    for topic, batches in batch_counts.items():
        print(f"\nTopic: {topic}")
        found_duplicate = False
        
        for batch_id, count in batches.items():
            if count > 1:
                print(f" ⚠️ Batch No: {batch_id} | Jumlah Ganda: {count} kali")
                found_duplicate = True
                
        if not found_duplicate:
            print(" ✅ Tidak ada batch ganda.")

if __name__ == '__main__':
    main()
