from app.models import ClassifyResponse

# Map keyword stems to categories
_MEDICAL = [
    "bleed", "blood", "hurt", "pain", "injured", "injury", "unconscious",
    "heart", "breathe", "breathing", "fracture", "broken bone", "burn",
    "medical", "hospital", "chest pain", "stroke", "seizure",
    "faint", "vomit", "choking", "poison", "allergy", "pregnant",
    "wound", "cut", "head", "trauma", "stab", "stabbed",
]

_POLICE = [
    "crime", "criminal", "robber", "robbery", "rob", "stole", "steal",
    "stolen", "thief", "theft", "gun", "knife", "weapon", "fight",
    "assault", "attacked", "murder", "kill", "shoot", "shot", "threat",
    "threaten", "kidnap", "harass", "vandal", "break-in", "intruder",
    "police", "cop",
]

_FIRE = [
    "fire", "flame", "blaze", "inferno", "arson", "explosion", "explode",
    "burning", "caught fire", "on fire",
]

_ROADSIDE = [
    "tire", "tyre", "flat tire", "flat tyre", "puncture",
    "engine", "broke down", "breakdown", "break down", "won't start",
    "wont start", "not starting", "overheat", "overheating",
    "tow", "towing", "stuck", "stranded",
    "fuel", "petrol", "diesel", "gas", "ran out",
    "mechanic", "repair", "garage",
    "smoke from car", "battery", "radiator", "coolant",
]

_ACCIDENT = [
    "accident", "crash", "crashed", "collision", "collide", "smash",
    "hit", "rollover", "roll over", "wreck", "pile up", "pileup",
    "rear-ended", "sideswipe", "head-on",
]


def _match(text: str, keywords: list) -> list:
    """Return all matched keywords found in the text."""
    return [k for k in keywords if k in text]


def fallback_classify(text: str) -> ClassifyResponse:
    text = text.lower()

    broad = set()
    specific = set()
    reasons = []

    med_hits = _match(text, _MEDICAL)
    pol_hits = _match(text, _POLICE)
    fire_hits = _match(text, _FIRE)
    road_hits = _match(text, _ROADSIDE)
    acc_hits = _match(text, _ACCIDENT)

    # ── Medical ──────────────────────────────────────────────
    if med_hits:
        broad.add("medical")
        specific.update(["trauma_center", "hospital"])
        reasons.append(f"Medical keywords detected: {', '.join(med_hits)}")

    # ── Police ───────────────────────────────────────────────
    if pol_hits:
        broad.add("police")
        specific.add("police")
        reasons.append(f"Crime/police keywords detected: {', '.join(pol_hits)}")

    # ── Fire ─────────────────────────────────────────────────
    if fire_hits:
        broad.add("medical")   # fires cause injuries
        specific.update(["fire_station", "hospital", "trauma_center"])
        reasons.append(f"Fire keywords detected: {', '.join(fire_hits)}")

    # ── Roadside ─────────────────────────────────────────────
    if road_hits:
        broad.add("roadside")
        # Sub-classify
        if any(k in text for k in ["tire", "tyre", "flat tire", "flat tyre", "puncture"]):
            specific.add("tyre_shop")
        if any(k in text for k in ["tow", "towing", "broke down", "breakdown", "break down",
                                    "won't start", "wont start", "not starting", "stuck", "stranded"]):
            specific.update(["towing", "car_repair"])
        if any(k in text for k in ["fuel", "petrol", "diesel", "gas", "ran out"]):
            specific.add("fuel_station")
        if any(k in text for k in ["engine", "mechanic", "repair", "garage", "battery",
                                    "overheat", "overheating", "radiator", "coolant"]):
            specific.add("car_repair")
        specific.add("roadside_assistance")
        reasons.append(f"Roadside keywords detected: {', '.join(road_hits)}")

    # ── Accident (multi-type) ────────────────────────────────
    if acc_hits:
        broad.update(["medical", "police", "roadside"])
        specific.update(["police", "towing", "hospital"])
        reasons.append(f"Accident keywords detected: {', '.join(acc_hits)}")

    # ── Emergency detection ──────────────────────────────────
    emergency_words = ["help", "emergency", "sos", "urgent", "save", "dying", "please"]
    is_emergency = len(broad) > 0 or any(k in text for k in emergency_words)

    # Default fallback when is_emergency but nothing specific matched
    if is_emergency and not specific:
        broad.update(["medical", "police"])
        specific.update(["police", "hospital"])
        reasons.append("Emergency intent detected but no specific category matched — defaulting to hospital and police.")

    explanation = " | ".join(reasons) if reasons else "No emergency keywords detected in the prompt."

    return ClassifyResponse(
        is_emergency=is_emergency,
        broad_categories=sorted(broad),
        specific_facilities=sorted(specific),
        explanation=explanation,
        confidence_score=0.7 if len(reasons) >= 2 else 0.6,
        engine_used="rules",
        user_role="unknown",
        patient_gender="unknown",
    )
