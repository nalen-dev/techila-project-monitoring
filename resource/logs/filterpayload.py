#!/usr/bin/env python3

import json
import re
import argparse
from collections import defaultdict

# ======================================================
# ARGUMENT
# ======================================================

parser = argparse.ArgumentParser(
    description="Filter MQTT payload berdasarkan tanggal dan mixer."
)

parser.add_argument(
    "--date",
    help="Filter tanggal (format: YYYY-MM-DD)",
)

parser.add_argument(
    "--mixer",
    nargs="*",
    help="Filter mixer. Contoh: CM3 CM4 FM5",
)

parser.add_argument(
    "--file",
    default="mqtt_raw_messages.txt",
    help="File log MQTT (default: mqtt_raw_messages.txt)",
)

args = parser.parse_args()

date_filter = args.date
mixer_filter = set(args.mixer) if args.mixer else None
log_file_path = args.file

# ======================================================
# REGEX
# ======================================================

pattern = re.compile(
    r'(?P<datetime>\d{4}-\d{2}-\d{2}T[^\|]+)\s*\|\s*Topic:\s*(?P<topic>[^\|]+)\s*\|\s*Payload:\s*(?P<payload>{.*})',
    re.DOTALL
)

# ======================================================
# STORAGE
# ======================================================

data_per_date = defaultdict(lambda: defaultdict(list))

# ======================================================
# READ FILE
# ======================================================

with open(log_file_path, "r", encoding="utf-8") as f:
    content = f.read()

blocks = re.split(r'\n(?=\d{4}-\d{2}-\d{2}T)', content)

for block in blocks:

    block = block.strip()

    if not block:
        continue

    match = pattern.search(block)

    if match is None:
        continue

    datetime_str = match.group("datetime").strip()
    topic = match.group("topic").strip()
    payload_text = match.group("payload")

    try:
        payload = json.loads(payload_text)
    except json.JSONDecodeError:
        print("JSON Error, dilewati...")
        continue

    # tanggal log
    date = datetime_str[:10]

    # nama mixer
    mixer = topic.split("/")[-1]

    # -------------------------
    # Filter tanggal
    # -------------------------
    if date_filter:
        if date != date_filter:
            continue

    # -------------------------
    # Filter mixer
    # -------------------------
    if mixer_filter:
        if mixer not in mixer_filter:
            continue

    data_per_date[date][mixer].append(payload)

# ======================================================
# SORT BERDASARKAN TS
# ======================================================

for date in data_per_date:
    for mixer in data_per_date[date]:
        data_per_date[date][mixer].sort(
            key=lambda x: x.get("ts", "")
        )

# ======================================================
# OUTPUT
# ======================================================

if not data_per_date:
    print("Tidak ada data yang cocok.")
    exit()

for date in sorted(data_per_date.keys()):

    print("=" * 100)
    print("Tanggal :", date)
    print("=" * 100)

    for mixer in sorted(data_per_date[date].keys()):

        print(f"\nMixer : {mixer}")
        print("-" * 100)

        for i, payload in enumerate(data_per_date[date][mixer], start=1):

            batch = payload.get("batch_number", "-")
            ts = payload.get("ts", "-")

            print(f"Data #{i} | Batch: {batch} | TS: {ts}")
            print(json.dumps(payload, indent=4, ensure_ascii=False))
            print()
