import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 8007))

# Telegram Config
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
AUTHORITY_CHAT_IDS = [
    chat_id.strip() 
    for chat_id in os.getenv("TELEGRAM_CHAT_IDS", "").split(",") 
    if chat_id.strip()
]

# User Info (for the SMS/Telegram messages)
USER_NAME = os.getenv("USER_NAME", "Your Name")
USER_PHONE = os.getenv("USER_PHONE", "+91 00000 00000")
USER_MEDICAL_NOTES = os.getenv("USER_MEDICAL_NOTES", "None")
USER_ADDRESS = os.getenv("USER_ADDRESS", "123 Main St, City, Country")

# SMS Contacts
SMS_NUMBERS = [
    num.strip()
    for num in os.getenv("SMS_NUMBERS", "").split(",")
    if num.strip()
]
