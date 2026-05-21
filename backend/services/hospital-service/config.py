import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 8001))
CACHE_DB_PATH = os.getenv("CACHE_DB_PATH", "cache/hospital_cache.db")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", 3600))
OVERPASS_TIMEOUT = int(os.getenv("OVERPASS_TIMEOUT", 30))

ABDM_ENABLED = os.getenv("ABDM_ENABLED", "false").lower() == "true"
ABDM_ACCESS_TOKEN = os.getenv("ABDM_ACCESS_TOKEN", "")

SEARCH_RADIUS_M = 10000
