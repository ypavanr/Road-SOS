# Maps Whisper language codes or Sarvam detected languages to a standard set
LANGUAGE_MAP = {
    "en": "en",
    "english": "en",
    "hi": "hi",
    "hindi": "hi",
    "kn": "kn",
    "kannada": "kn",
    "ta": "ta",
    "tamil": "ta",
    "te": "te",
    "telugu": "te",
    "ml": "ml",
    "malayalam": "ml",
}

def normalize_language_code(lang: str) -> str:
    """Normalize language name/code to a standard 2-letter code."""
    if not lang:
        return "unknown"
    return LANGUAGE_MAP.get(lang.lower(), lang.lower())
