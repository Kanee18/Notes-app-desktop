# File: app/config.py

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CRED_PATH = os.path.join(BASE_DIR, "firebase-credentials.json") 
DB_PATH = os.path.join(BASE_DIR, "notes.db")
SETTINGS_FILE = os.path.join(BASE_DIR, "settings.json")