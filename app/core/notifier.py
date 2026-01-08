# File: app/core/notifier.py

import time
from datetime import datetime
from plyer import notification
from .database import get_notes_for_notification, update_note_status

def run_notifier_check():
    print("[Notifier] The notification thread starts.")
    while True:
        try:
            print(f"[{datetime.now()}] [Notifier] Checking deadlines...")
            
            notes_to_notify = get_notes_for_notification()
            
            print(f"[Notifier] Found {len(notes_to_notify)} notes to be notified.")
            
            if not notes_to_notify:
                print("[Notifier] There is no deadline in the next 24 hours.")
            else:
                for note in notes_to_notify:
                    note_id = note['id']
                    print(f"[Notifier] Trying to send notification for note ID: {note_id}")
                    title = f"Deadline Reminder: {note['mata_kuliah']}"
                    message = f"Task '{note['deskripsi_tugas']}' due on {note['tanggal_deadline_str']}"
                    
                    try:
                        notification.notify(
                            title=title,
                            message=message,
                            app_name="Aplikasi Note Tugas",
                            app_icon='assets/icon.ico', 
                            timeout=20
                        )
                        print(f"[Notifier] Notifications for {note_id} SUCCESSFULLY displayed.")
                        
                        update_note_status(note_id, 'notified')
                        print(f"[Notifier] Status for {note_id} successfully changed to 'notified'.")

                    except Exception as e:
                        print(f"[Notifier] FAILED to display notification for {note_id}. Error: {e}")

            print("[Notifier] Waiting 1 Hour before next check...")
            time.sleep(3600) 

        except Exception as e:
            print(f"[Notifier] A major error occurred in the notifier thread: {e}")
            time.sleep(300)