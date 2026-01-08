import os
import json
from flask import Flask, jsonify, request, render_template, Blueprint
from flask_cors import CORS
from flask_socketio import SocketIO, emit

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins='*')

NODE_MODULES_DIR = os.path.join(BASE_DIR, 'node_modules')
node_modules_bp = Blueprint('node_modules', __name__, static_folder=NODE_MODULES_DIR)
app.register_blueprint(node_modules_bp, url_prefix='/node_modules')

from app.config import SETTINGS_FILE
from app.core.database import (
    get_all_local_notes,
    init_local_db,
    update_note_status,
    delete_note_from_local_db,
    sync_notes_from_firestore,
    create_chat_session,
    get_chat_sessions,
    delete_chat_session,
    add_chat_message,
    get_chat_messages
)
from app.services.firebase_service import firebase_service
from bot.bot_logic import parse_note_text

def serialize_notes_obj(note):
    return {
        "id": note["id"],
        "mata_kuliah": note["mata_kuliah"],
        "deskripsi_tugas": note["deskripsi_tugas"],
        "deadline_timestamp": note["deadline_timestamp"],
        "tanggal_deadline_str": note["tanggal_deadline_str"],
        "deadline_iso_str": note["deadline_iso_str"],
        "status": note["status"],
        "user_id": note["user_id"]
    }

with app.app_context():
    init_local_db()

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

@app.route('/')
def serve_index():
    return render_template('index.html')

@app.route('/api/sync', methods=['POST'])
def sync_with_firestore_api():
    settings = load_settings()
    user_id = settings.get("telegram_id")
    if not user_id:
        return jsonify({"error": "Telegram User ID is not set in Settings."}), 400
    try:
        firestore_notes_stream = firebase_service.get_notes_for_user(user_id)
        sync_notes_from_firestore(list(firestore_notes_stream))
        local_notes = get_all_local_notes()
        socketio.emit('notes_updated', {'notes': [serialize_notes_obj(note) for note in local_notes]})
        return jsonify({"message": "Synchronization successful"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/notes', methods=['GET'])
def get_notes():
    local_notes = get_all_local_notes()
    notes_list = [serialize_notes_obj(note) for note in local_notes]
    return jsonify(notes_list)

@app.route('/api/notes', methods=['POST'])
def add_note_api():
    settings = load_settings()
    user_id = settings.get("telegram_id")
    if not user_id:
        return jsonify({"error": "Telegram User ID is not set in Settings."}), 400
    data = request.get_json()
    note_string = f"matkul {data.get('mata_kuliah')}, tugas {data.get('deskripsi_tugas')}, deadline {data.get('deadline')}"
    parsed_data, error_message = parse_note_text(note_string)
    if error_message:
        return jsonify({"error": error_message}), 400
    doc_ref = firebase_service.add_note(parsed_data, user_id)
    if doc_ref:
        firestore_notes_stream = firebase_service.get_notes_for_user(user_id)
        sync_notes_from_firestore(list(firestore_notes_stream))
        local_notes = get_all_local_notes()
        socketio.emit('notes_updated', {'notes': [serialize_notes_obj(note) for note in local_notes]})
        return jsonify({"message": "Task added successfully"}), 201
    else:
        return jsonify({"error": "Failed to save to database"}), 500

@app.route('/api/notes/<note_id>/status', methods=['PATCH'])
def update_note_status_api(note_id):
    data = request.get_json()
    new_status = data.get('status')
    if not new_status:
        return jsonify({"error": "New status is not given"}), 400
    firebase_service.update_note_status(note_id, new_status)
    update_note_status(note_id, new_status)
    # Emit setelah update status
    local_notes = get_all_local_notes()
    socketio.emit('notes_updated', {'notes': [serialize_notes_obj(note) for note in local_notes]})
    return jsonify({"message": f"Status note {note_id} changed successfully"}), 200

@app.route('/api/notes/<note_id>', methods=['PUT'])
def update_note_details_api(note_id):
    import dateparser
    settings = load_settings()
    user_id = settings.get("telegram_id")
    
    data = request.get_json()
    mata_kuliah = data.get('mata_kuliah')
    deskripsi_tugas = data.get('deskripsi_tugas')
    deadline_str = data.get('deadline') # Expected generic date string
    
    if not mata_kuliah or not deskripsi_tugas or not deadline_str:
         return jsonify({"error": "Fields mata_kuliah, deskripsi_tugas, deadline are required"}), 400

    # Parse Deadline
    deadline_dt = dateparser.parse(deadline_str, settings={'PREFER_DATES_FROM': 'future', 'TIMEZONE': 'Asia/Jakarta'})
    if not deadline_dt:
        return jsonify({"error": "Invalid date format"}), 400
    
    update_data = {
        "mata_kuliah": mata_kuliah,
        "deskripsi_tugas": deskripsi_tugas,
        "deadline_timestamp": int(deadline_dt.timestamp()),
        "tanggal_deadline_str": deadline_dt.strftime("%d %B %Y %H:%M"),
        "deadline_iso_str": deadline_dt.strftime('%Y-%m-%d')
    }

    success = firebase_service.update_note_fields(note_id, update_data)
    
    if success:
        # Sync to update local DB
        firestore_notes_stream = firebase_service.get_notes_for_user(user_id)
        if firestore_notes_stream:
             sync_notes_from_firestore(list(firestore_notes_stream))
        
        local_notes = get_all_local_notes()
        socketio.emit('notes_updated', {'notes': [serialize_notes_obj(note) for note in local_notes]})
        return jsonify({"message": "Note updated successfully"}), 200
    else:
        return jsonify({"error": "Failed to update note"}), 500

@app.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note_api(note_id):
    firebase_service.delete_note(note_id)
    delete_note_from_local_db(note_id)
    # Emit setelah hapus
    local_notes = get_all_local_notes()
    socketio.emit('notes_updated', {'notes': [serialize_notes_obj(note) for note in local_notes]})
    return jsonify({"message": f"Note {note_id} deleted successfully"}), 200

@app.route('/api/settings', methods=['GET'])
def get_settings():
    settings = load_settings()
    return jsonify(settings)

@app.route('/api/settings', methods=['POST'])
def update_settings():
    new_settings = request.get_json()
    save_settings(new_settings)
    return jsonify({"message": "Settings saved successfully."}), 200

@app.route('/api/ask-ai', methods=['POST'])
def ask_ai():
    import requests
    settings = load_settings()
    
    # Read API key from environment variable or settings
    # Set environment variable: GROQ_API_KEY=your_key_here
    api_key = os.environ.get("GROQ_API_KEY") or settings.get("groq_api_key")
    
    if not api_key or not api_key.strip():
        return jsonify({"error": "GROQ_API_KEY not set. Please set environment variable or add to settings."}), 400
        
    data = request.get_json()
    prompt = data.get('prompt')
    context = data.get('context', '')
    
    if not prompt:
        return jsonify({"error": "Prompt cannot be empty"}), 400
        
    full_prompt = f"""
    Context (Tugas Saya):
    {context}
    
    Pertanyaan/Perintah Saya:
    {prompt}
    
    Tolong bantu saya dengan tugas ini. Jawab dengan format yang rapi dan mudah dibaca (gunakan Markdown).
    """

    
    # === GROQ API HANDLING ===
    print("Using Groq API...")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json"
    }
    payload = {
        "messages": [
            {"role": "system", "content": "You are 'Kanee', a smart and helpful AI assistant for a task management app. Your goal is to help users with their tasks (homework, programming, etc.) in a clear, educational, and easy-to-understand way. \n\nGUIDELINES:\n1. **Math**: Use LaTeX formatting for math equations (e.g., $E=mc^2$). Explain the steps clearly before showing the solution.\n2. **Programming**: When providing code, ALWAYS explain how it works efficiently. Use comments in code. \n3. **General**: Be friendly but professional. Use Markdown (bold, lists, headings) to make your answers neat and readable. Avoid complex jargon unless you explain it."},
            {"role": "user", "content": full_prompt}
        ],
        "model": "llama-3.3-70b-versatile" 
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            print(f"Groq API Error: {response.text}")
            return jsonify({"error": f"Groq Error: {response.json().get('error', {}).get('message', 'Unknown error')}"}), 500
        
        generated_text = response.json()['choices'][0]['message']['content']
        
        # Save messages to session if session_id provided
        session_id = data.get('session_id')
        if session_id:
            add_chat_message(session_id, 'user', prompt)
            add_chat_message(session_id, 'ai', generated_text)
        
        return jsonify({"response": generated_text}), 200
    except Exception as e:
        return jsonify({"error": f"Groq Connection Error: {str(e)}"}), 500

# ================= CHAT SESSION ENDPOINTS =================

@app.route('/api/chat-sessions', methods=['GET'])
def get_all_chat_sessions():
    sessions = get_chat_sessions()
    return jsonify([{"id": s["id"], "title": s["title"], "created_at": s["created_at"]} for s in sessions])

@app.route('/api/chat-sessions', methods=['POST'])
def create_new_chat_session():
    data = request.get_json()
    title = data.get('title', 'New Chat')
    session_id = create_chat_session(title)
    return jsonify({"id": session_id, "title": title}), 201

@app.route('/api/chat-sessions/<int:session_id>', methods=['DELETE'])
def delete_session(session_id):
    delete_chat_session(session_id)
    return jsonify({"message": f"Session {session_id} deleted"}), 200

@app.route('/api/chat-sessions/<int:session_id>/messages', methods=['GET'])
def get_session_messages(session_id):
    messages = get_chat_messages(session_id)
    return jsonify([{"id": m["id"], "sender": m["sender"], "content": m["content"], "timestamp": m["timestamp"]} for m in messages])

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
