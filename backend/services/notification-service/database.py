import sqlite3
import logging
from config import DB_PATH

logger = logging.getLogger(__name__)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS token_geohash (
            token TEXT PRIMARY KEY,
            geohash TEXT NOT NULL
        )
    ''')
    # Create an index for fast lookup of tokens by geohash
    c.execute('CREATE INDEX IF NOT EXISTS idx_geohash ON token_geohash(geohash)')
    conn.commit()
    conn.close()

def upsert_token_location(token: str, geohash: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO token_geohash (token, geohash)
        VALUES (?, ?)
        ON CONFLICT(token) DO UPDATE SET geohash=excluded.geohash
    ''', (token, geohash))
    conn.commit()
    conn.close()

def get_tokens_by_geohashes(geohashes: list) -> list:
    if not geohashes:
        return []
        
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    placeholders = ','.join(['?'] * len(geohashes))
    c.execute(f'SELECT token FROM token_geohash WHERE geohash IN ({placeholders})', geohashes)
    
    tokens = [row[0] for row in c.fetchall()]
    conn.close()
    return tokens
