# File: app/core/database.py

import sqlite3
from datetime import datetime, timezone, timedelta
from app.config import DB_PATH

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_local_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            mata_kuliah TEXT NOT NULL,
            deskripsi_tugas TEXT,
            deadline_timestamp INTEGER NOT NULL,
            tanggal_deadline_str TEXT,
            deadline_iso_str TEXT,
            status TEXT DEFAULT 'pending',
            user_id INTEGER 
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            created_at INTEGER
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            sender TEXT,
            content TEXT,
            timestamp INTEGER,
            FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()
    print("Local database initialized with correct schema (notes, chats).")

# ================= CHAT FUNCTIONS =================

def create_chat_session(title):
    conn = get_db_connection()
    cursor = conn.cursor()
    created_at = int(datetime.now().timestamp())
    cursor.execute("INSERT INTO chat_sessions (title, created_at) VALUES (?, ?)", (title, created_at))
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return session_id

def get_chat_sessions():
    conn = get_db_connection()
    sessions = conn.execute("SELECT * FROM chat_sessions ORDER BY created_at DESC").fetchall()
    conn.close()
    return sessions

def delete_chat_session(session_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
    conn.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()

def add_chat_message(session_id, sender, content):
    conn = get_db_connection()
    timestamp = int(datetime.now().timestamp())
    conn.execute("INSERT INTO chat_messages (session_id, sender, content, timestamp) VALUES (?, ?, ?, ?)", 
                 (session_id, sender, content, timestamp))
    conn.commit()
    conn.close()

def get_chat_messages(session_id):
    conn = get_db_connection()
    messages = conn.execute("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC", (session_id,)).fetchall()
    conn.close()
    return messages

def sync_notes_from_firestore(firestore_notes):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("Deleting old data from local database...")
    cursor.execute("DELETE FROM notes")

    count = 0
    for note in firestore_notes:
        data = note.to_dict()
        if data.get('mata_kuliah') and data.get('deadline_timestamp'):
            cursor.execute('''
                INSERT INTO notes (id, mata_kuliah, deskripsi_tugas, deadline_timestamp, tanggal_deadline_str, deadline_iso_str, status, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                note.id,
                data.get('mata_kuliah'),
                data.get('deskripsi_tugas'),
                data.get('deadline_timestamp'),
                data.get('tanggal_deadline_str'),
                data.get('deadline_iso_str'),
                data.get('status', 'pending'),
                data.get('user_id')
            ))
            count += 1
    
    conn.commit()
    conn.close()
    print(f"Synchronization complete. {count} new records are inserted into the local DB.")

def get_all_local_notes():
    conn = get_db_connection()
    notes = conn.execute("SELECT * FROM notes ORDER BY deadline_timestamp ASC").fetchall()
    conn.close()
    return notes

def get_notes_for_notification():
    conn = get_db_connection()
    now_utc = datetime.now(timezone.utc) 
    now_ts = now_utc.timestamp()
    tomorrow_ts = (now_utc + timedelta(days=1)).timestamp()
    notes_to_notify = conn.execute(
        "SELECT * FROM notes WHERE deadline_timestamp BETWEEN ? AND ? AND status = 'pending'",
        (now_ts, tomorrow_ts)
    ).fetchall()
    conn.close()
    return notes_to_notify

def update_note_status(note_id, new_status):
    conn = get_db_connection()
    conn.execute("UPDATE notes SET status = ? WHERE id = ?", (new_status, note_id))
    conn.commit()
    conn.close()
    print(f"Updated status for note {note_id} to {new_status}")

def delete_note_from_local_db(note_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
    print(f"Deleted note {note_id} from local DB.")