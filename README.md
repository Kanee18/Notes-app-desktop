# NOTES-APP: A Desktop Task Management Application

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)

A modern desktop application for managing notes and tasks, featuring a Kanban board, calendar view, real-time cloud synchronization with Firebase, AI assistant powered by Groq, and deadline notifications via a Telegram bot.

## About The Project

Notes-App is a comprehensive solution designed to help users, especially students, keep track of their tasks and deadlines efficiently. The application provides a clean, intuitive user interface with both a Kanban board for workflow visualization and a calendar for a clear overview of upcoming deadlines.

### Key Features:
- **Kanban Board:** Organize tasks into "Upcoming" and "Completed" columns
- **Calendar View:** Full monthly calendar displaying all deadlines
- **Ask with Kanee (AI Assistant):** Chat with AI for homework help (supports math rendering)
- **Real-time Cloud Sync:** Task data synchronized with Google Firestore
- **Telegram Bot Notifications:** Automated reminders 24 hours before deadline
- **Natural Language Input:** Add tasks using everyday language
- **Light & Dark Mode:** Switch between themes
- **System Tray Integration:** Run in background, accessible from system tray

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python, Flask, Flask-SocketIO |
| **Desktop** | pywebview, pystray |
| **Frontend** | HTML5, CSS3, JavaScript, FullCalendar.js, MathJax |
| **Database** | SQLite (local), Google Firestore (cloud) |
| **AI** | Groq API (Llama 3.3 70B) |
| **Bot** | Telegram Bot API |

---

## Getting Started

### Prerequisites

- Python 3.8+ 
- Git
- Google Account (for Firebase)
- Telegram Account (for Bot)
- Groq API Key (for AI Assistant)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/Kanee18/Notes-app-desktop.git
cd Notes-app-desktop
```

#### 2. Create Virtual Environment
```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.\.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate
```

#### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 4. Set Up Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Firestore Database**
4. Go to *Project settings* > *Service accounts*
5. Click **"Generate new private key"**
6. Rename the downloaded file to `firebase-credentials.json`
7. Place it in the project root directory

#### 5. Set Up Telegram Bot
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the prompts
3. Copy the **API Token** provided
4. Get your **Telegram User ID** from `@userinfobot`

#### 6. Create Settings File
Create `settings.json` in the project root:
```json
{
    "telegram_token": "YOUR_TELEGRAM_BOT_TOKEN",
    "telegram_id": "YOUR_TELEGRAM_USER_ID",
    "groq_api_key": "YOUR_GROQ_API_KEY"
}
```

#### 7. Set Groq API Key (Alternative Method)
Instead of settings.json, you can use environment variable:

**Windows (PowerShell):**
```powershell
$env:GROQ_API_KEY = "your_groq_api_key_here"
```

**macOS/Linux:**
```bash
export GROQ_API_KEY="your_groq_api_key_here"
```

> Get your free Groq API key at: https://console.groq.com/

---

## Running the Application

### Option 1: Run All Services (Recommended)

Open **3 separate terminals** and run:

**Terminal 1 - API Server:**
```bash
python api_server.py
```

**Terminal 2 - Telegram Bot:**
```bash
cd bot
python run_bot.py
```

**Terminal 3 - Desktop App:**
```bash
python note_app.py
```

### Option 2: Run Desktop Only (Without Telegram Bot)

If you don't need Telegram notifications:

**Terminal 1:**
```bash
python api_server.py
```

**Terminal 2:**
```bash
python note_app.py
```

---

## Project Structure

```
Notes-app-desktop/
├── note_app.py              # Desktop app entry point
├── api_server.py            # Flask API server
├── app/
│   ├── config.py            # Configuration paths
│   ├── utils.py             # Utility functions
│   ├── core/
│   │   ├── database.py      # SQLite local database
│   │   └── notifier.py      # Background notification service
│   └── services/
│       └── firebase_service.py  # Firestore cloud sync
├── bot/
│   ├── run_bot.py           # Telegram bot runner
│   └── bot_logic.py         # Bot message handlers
├── static/
│   ├── css/index.css        # Application styles
│   └── js/script.js         # Frontend logic
├── templates/
│   └── index.html           # Main HTML template
├── firebase-credentials.json # Firebase credentials (gitignored)
├── settings.json            # App settings (gitignored)
└── notes.db                 # Local SQLite database (gitignored)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| AI not responding | Check if `GROQ_API_KEY` is set or in `settings.json` |
| Firebase error | Ensure `firebase-credentials.json` exists in root |
| Notes not syncing | Click "Sync Data" button, check Telegram ID in Settings |
| App won't start | Make sure `api_server.py` is running first |

---

## License

This project is licensed under the MIT License.

---

## Author

**Kanee18**

- GitHub: [@Kanee18](https://github.com/Kanee18)
