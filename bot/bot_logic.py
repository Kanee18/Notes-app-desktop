# File: bot/bot_logic.py

import requests
from telegram import Update
from telegram.ext import ContextTypes

from app.utils import load_settings, parse_note_text
from app.services.firebase_service import firebase_service


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_name = update.message.from_user.first_name
    await update.message.reply_text(
        f"Halo, {user_name}!\n\n"
        "Saya siap mencatat tugasmu. Kirim dengan format:\n\n"
        "`matkul [nama matkul], tugas [deskripsi tugas], deadline [tanggal]`",
        parse_mode='Markdown'
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_text = update.message.text
    
    settings = load_settings()
    user_id = settings.get("telegram_id")

    if not user_id:
        await update.message.reply_text("⚠️ Error: Telegram User ID is not set in the app.")
        return
        
    if str(update.message.from_user.id) != str(user_id):
        await update.message.reply_text("⚠️ Sorry, you are not registered to use this bot..")
        return

    parsed_data, error_message = parse_note_text(user_text)
    
    if error_message:
        await update.message.reply_text(f"⚠️ Oops! {error_message}")
        return
        
    doc_ref = firebase_service.add_note(parsed_data, user_id) 
    
    if doc_ref:
        reply_text = (
            f"✅ **Tugas Berhasil Disimpan!**\n\n"
            f"📖 **Mata Kuliah:** {parsed_data['mata_kuliah']}\n"
            f"📝 **Tugas:** {parsed_data['deskripsi_tugas']}\n"
            f"🗓️ **Deadline:** {parsed_data['tanggal_deadline_str']}"
        )
        await update.message.reply_text(reply_text, parse_mode='Markdown')
    else:
        await update.message.reply_text("Sorry, an error occurred while saving data to the database.")
        
    requests.post("http://127.0.0.1:5000/api/sync")

