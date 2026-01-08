# File: run_desktop_app.py

import webview
import threading
from pystray import MenuItem as item
import pystray
from PIL import Image
import os

from api_server import app
from app.core.notifier import run_notifier_check

window = None

def create_tray_icon():
    image_path = os.path.join(os.path.dirname(__file__), 'assets', 'icon.png')
    image = Image.open(image_path)
    menu = (item('Show Applications', show_window, default=True), item('exit', quit_window))
    icon = pystray.Icon("Aplikasi Note Tugas", image, "Aplikasi Note Tugas", menu)
    icon.run()

def show_window():
    if window:
        window.show()

def quit_window(icon):
    if window:
        window.destroy()
    icon.stop()
    os._exit(0)

def on_closing():
    if window:
        window.hide()
    return False

if __name__ == '__main__':
    print("Starting background notifier thread...")
    notifier_thread = threading.Thread(target=run_notifier_check, daemon=True)
    notifier_thread.start()

    tray_thread = threading.Thread(target=create_tray_icon)
    tray_thread.daemon = True
    tray_thread.start()

    window = webview.create_window(
        'Note App',
        app,
        width=1200,             
        height=900,             
        resizable=False         
    )

    window.events.closing += on_closing

    webview.start(debug=False)