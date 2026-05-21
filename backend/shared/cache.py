import json
import os
import sqlite3
import time
from typing import List, Optional, Tuple
from models import Facility


class FacilityCache:
    def __init__(self, db_path: str, ttl_seconds: int = 3600):
        self.db_path = db_path
        self.ttl = ttl_seconds
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
        self._init()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path, check_same_thread=False)

    def _init(self):
        conn = self._connect()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS facility_cache (
                cache_key  TEXT PRIMARY KEY,
                data       TEXT NOT NULL,
                created_at REAL NOT NULL
            )
        """)
        conn.commit()
        conn.close()

    @staticmethod
    def _key(lat: float, lon: float, radius_m: int) -> str:
        return f"{round(lat, 2)}:{round(lon, 2)}:{radius_m}"

    def get(self, lat: float, lon: float, radius_m: int) -> Tuple[Optional[List[Facility]], bool]:
        """Returns (facilities, is_fresh). is_fresh=False means stale but usable offline."""
        key = self._key(lat, lon, radius_m)
        try:
            conn = self._connect()
            row = conn.execute(
                "SELECT data, created_at FROM facility_cache WHERE cache_key = ?", (key,)
            ).fetchone()
            conn.close()
            if not row:
                return None, False
            data, created_at = row
            is_fresh = (time.time() - created_at) < self.ttl
            return [Facility(**f) for f in json.loads(data)], is_fresh
        except Exception:
            return None, False

    def save(self, lat: float, lon: float, radius_m: int, facilities: List[Facility]):
        key = self._key(lat, lon, radius_m)
        try:
            conn = self._connect()
            conn.execute(
                "INSERT OR REPLACE INTO facility_cache (cache_key, data, created_at) VALUES (?, ?, ?)",
                (key, json.dumps([f.model_dump() for f in facilities]), time.time()),
            )
            conn.commit()
            conn.close()
        except Exception:
            pass  # non-fatal

    def purge_expired(self):
        # Keep stale entries for 24× TTL to serve offline users
        try:
            conn = self._connect()
            conn.execute(
                "DELETE FROM facility_cache WHERE created_at < ?",
                (time.time() - self.ttl * 24,),
            )
            conn.commit()
            conn.close()
        except Exception:
            pass
