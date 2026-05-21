import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 8002))
CACHE_DB_PATH = os.getenv("CACHE_DB_PATH", "cache/roadside_cache.db")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", 3600))
OVERPASS_TIMEOUT = int(os.getenv("OVERPASS_TIMEOUT", 30))

SEARCH_RADIUS_M = 5000
