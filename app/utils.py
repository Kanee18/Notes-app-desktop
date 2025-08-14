# File: app/utils.py

import os
import json
import dateparser
from .config import SETTINGS_FILE

def load_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {"telegram_token": "", "telegram_id": ""}
    return {"telegram_token": "", "telegram_id": ""}

def save_settings(data):
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def parse_note_text(text: str):
    data = {}
    keywords = {
        'mata_kuliah': ['matakuliah', 'matkul', 'mk'],
        'deskripsi_tugas': ['tugas', 'deskripsi', 'task', 'apa'],
        'deadline': ['deadline', 'dl', 'tenggat', 'kapan']
    }
    try:
        parts = text.split(',')
        if len(parts) < 3:
            return None, "Incorrect format. Make sure the subject, assignment, and deadline are separated by commas (',')."

        for part in parts:
            part = part.strip()
            matched = False
            for key, aliases in keywords.items():
                for alias in aliases:
                    if part.lower().startswith(alias + " "):
                        value = part[len(alias)+1:].strip()
                        if value: data[key] = value
                        matched = True
                        break
                if matched: break
        
        if 'mata_kuliah' not in data or 'deskripsi_tugas' not in data or 'deadline' not in data:
            return None, "Incomplete format. Please ensure keyword 'matkul', 'tugas', dan 'deadline' exists and has content."

        deadline_str_value = data.get('deadline')
        deadline_dt = dateparser.parse(deadline_str_value, settings={'PREFER_DATES_FROM': 'future', 'TIMEZONE': 'Asia/Jakarta'})
        
        if not deadline_dt:
            return None, f"Date format '{deadline_str_value}' not recognized."

        del data['deadline']
        data['deadline_timestamp'] = int(deadline_dt.timestamp())
        data['tanggal_deadline_str'] = deadline_dt.strftime("%d %B %Y %H:%M")
        data['deadline_iso_str'] = deadline_dt.strftime('%Y-%m-%d')
        
        return data, None
    except Exception as e:
        return None, f"An error occurred while processing the message: {e}"