# File: bot/run_bot.py

import sys
import os
from telegram.ext import Application, CommandHandler, MessageHandler, filters

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from bot.bot_logic import handle_message, start_command
from api_server import load_settings 
def main():
    print("Starting bot...")
    settings = load_settings()
    token = settings.get("telegram_token")
    
    # Token validation
    if not token or token == "GANTI_DENGAN_TOKEN_BOT_ANDA":
        print("Error: TELEGRAM_TOKEN has not been set. Please set it via the Settings panel in the app..")
        return

    application = Application.builder().token(token).build()

    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("Telegram bot is running... Press Ctrl+C to stop.")
    application.run_polling()

if __name__ == '__main__':
    main()