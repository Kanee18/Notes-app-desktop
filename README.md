# NOTES-APP: A Desktop Task Management Application

![License](https://img.shields.io/badge/license-MIT-blue.svg)

A modern desktop application for managing notes and tasks, featuring a Kanban board, calendar view, real-time cloud synchronization with Firebase, and deadline notifications via a Telegram bot.

<br>

![Notes-App Screenshot](https://place-hold.it/800x500?text=Error=24)

## 🚀 About The Project

Notes-App is a comprehensive solution designed to help users, especially students, keep track of their tasks and deadlines efficiently. The application provides a clean, intuitive user interface with both a Kanban board for workflow visualization and a calendar for a clear overview of upcoming deadlines.

A standout feature is its integration with Google Firestore for real-time data synchronization and a Telegram bot for automated deadline reminders, ensuring you never miss an important task.

## ✨ Key Features

* **Kanban Board:** Organize tasks into columns like "Upcoming" and "Completed."
* **Calendar View:** A full monthly calendar that visually displays all your deadlines.
* **Real-time Cloud Sync:** Task data is synchronized with Google Firestore.
* **Telegram Bot Notifications:** Receive automated reminders 24 hours before a task is due.
* **Natural Language Input:** Add tasks using simple, everyday language (e.g., "subject OOP, task create a report, deadline tomorrow at 10pm").
* **Light & Dark Mode:** Switch between themes to suit your preference.
* **System Tray Integration:** The app can run in the background and is accessible from the system tray.

## 🛠️ Tech Stack

This project is built with a modern stack, combining the power of Python for the backend and web technologies for the user interface.

* **Backend:**
    * [Python](https://www.python.org/)
    * [Flask](https://flask.palletsprojects.com/) - Powers the local API server.
* **Desktop Application:**
    * [pywebview](https://pywebview.flowrl.com/) - A lightweight cross-platform webview wrapper.
    * [pystray](https://pystray.readthedocs.io/) - For system tray icon and menu management.
* **Frontend:**
    * HTML5, CSS3, JavaScript
    * [FullCalendar.js](https://fullcalendar.io/) - For the interactive calendar view.
* **Database & Services:**
    * SQLite - For local data storage.
    * [Google Firestore](https://firebase.google.com/docs/firestore) - For cloud data synchronization.
    * [Telegram Bot API](https://core.telegram.org/bots/api) - For deadline notifications.

## ⚙️ Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites

Ensure you have the following software installed on your system:
* Python 3.8+ and Pip
* A Google Account to create a Firebase project.
* A Telegram Account to create a bot.

### Installation & Configuration

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git)
    cd YOUR_REPOSITORY
    ```

2.  **Set Up Google Firebase**
    * Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
    * In your project, enable the **Firestore Database**.
    * Navigate to *Project settings* > *Service accounts*.
    * Click on **"Generate new private key"**. A JSON file will be downloaded.
    * Rename this file to `firebase-credentials.json` and place it in the root directory of the project.

3.  **Set Up Telegram Bot**
    * Open Telegram and search for the `@BotFather`.
    * Send the `/newbot` command and follow the prompts to create your bot.
    * BotFather will provide you with an **API Token**. Copy this token.
    * Find your personal **Telegram User ID** by talking to a bot like `@userinfobot`.

4.  **Create the Local Settings File**
    * In the project's root directory, create a new file named `settings.json`.
    * Copy the structure below into the file and fill it with your own credentials from the previous step.
    ```json
    {
        "telegram_token": "YOUR_TELEGRAM_BOT_TOKEN_HERE",
        "telegram_id": "YOUR_PERSONAL_TELEGRAM_USER_ID_HERE"
    }
    ```

5.  **Install Python Dependencies**
    * It is highly recommended to use a virtual environment.
    ```bash
    # Create a virtual environment
    python -m venv .venv
    
    # Activate the virtual environment
    # On Windows:
    .\.venv\Scripts\activate
    # On macOS/Linux:
    # source .venv/bin/activate
    ```
    * Install all required libraries from `requirements.txt`.
    ```bash
    pip install -r requirements.txt
    ```

## ▶️ Usage

Once all the dependencies are installed and the configuration is complete, run the main application script:

```bash
python note_app.py
