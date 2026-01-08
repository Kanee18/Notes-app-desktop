# File: app/services/firebase_service.py

import firebase_admin
from firebase_admin import credentials, firestore
from app.config import CRED_PATH

class FirebaseService:
    def __init__(self):
        if not firebase_admin._apps:
            try:
                cred = credentials.Certificate(CRED_PATH)
                firebase_admin.initialize_app(cred)
            except Exception as e:
                print(f"Error initializing Firebase: {e}")
                self.db = None
                return
        self.db = firestore.client()

    def get_notes_for_user(self, user_id):
        if not self.db or not user_id: return []
        try:
            notes_filter = firestore.FieldFilter('user_id', '==', int(user_id))
            notes_ref = self.db.collection('notes').where(filter=notes_filter).stream()
            return notes_ref
        except Exception as e:
            print(f"Error fetching notes from Firestore: {e}")
            return []

    def add_note(self, note_data, user_id):
        if not self.db or not user_id: return None
        try:
            note_data['user_id'] = int(user_id)
            note_data['created_at'] = firestore.SERVER_TIMESTAMP
            update_time, doc_ref = self.db.collection('notes').add(note_data)
            return doc_ref
        except Exception as e:
            print(f"Error adding note to Firestore: {e}")
            return None

    def update_note_status(self, note_id, new_status):
        if not self.db: return None
        try:
            doc_ref = self.db.collection('notes').document(note_id)
            doc_ref.update({'status': new_status})
            print(f"Note {note_id} status updated to '{new_status}' in Firestore.")
            return True
        except Exception as e:
            print(f"Error updating note status in Firestore: {e}")
            return False

    def update_note_fields(self, note_id, data):
        if not self.db: return None
        try:
            self.db.collection('notes').document(note_id).update(data)
            print(f"Note {note_id} updated in Firestore.")
            return True
        except Exception as e:
            print(f"Error updating note in Firestore: {e}")
            return False

    def delete_note(self, note_id):
        if not self.db: return None
        try:
            self.db.collection('notes').document(note_id).delete()
            print(f"Note {note_id} deleted from Firestore.")
            return True
        except Exception as e:
            print(f"Error deleting note from Firestore: {e}")
            return False

firebase_service = FirebaseService()