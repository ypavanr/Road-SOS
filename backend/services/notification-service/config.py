import os

PORT = int(os.environ.get("PORT", 8008))
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "notifications.db")
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
