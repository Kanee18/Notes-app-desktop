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
    sync_notes_from_firestore
)
from app.services.firebase_service import firebase_service
from bot.bot_logic import parse_note_text

def serialize_notes_obj(note):
    # pastikan serialisasi struktur sesuai dengan JS frontend!
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
        # setelah sync, emit ke semua frontend:
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
        # Emit langsung ke frontend
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

if __name__ == '__main__':
    # gunakan socketio untuk run server!
    socketio.run(app, debug=True, port=5000)
