import json

# Start with base contacts logic
contacts_db = {
  "IN": {
    "national": [
      {"name": "National Emergency", "number": "112", "type": "emergency", "description": "Single number for police, fire, and medical emergencies", "always_available": True},
      {"name": "Police", "number": "100", "type": "police", "description": "Local police emergency response", "always_available": True},
      {"name": "Fire Brigade", "number": "101", "type": "fire", "description": "Fire emergency response", "always_available": True},
      {"name": "Ambulance", "number": "108", "type": "ambulance", "description": "Emergency ambulance service", "always_available": True},
      {"name": "NHAI Highway Helpline", "number": "1033", "type": "highway", "description": "National Highway Authority", "always_available": True},
      {"name": "Disaster Management", "number": "1078", "type": "disaster", "description": "National Disaster Response Force (NDRF)", "always_available": True},
      {"name": "Women Helpline", "number": "181", "type": "women", "description": "Women in distress", "always_available": True},
      {"name": "Child Helpline", "number": "1098", "type": "child", "description": "CHILDLINE India Foundation", "always_available": True}
    ],
    "states": {}
  },
  "US": {
    "national": [
      {"name": "Emergency", "number": "911", "type": "emergency", "description": "Police, Fire, and Ambulance", "always_available": True},
      {"name": "Poison Control", "number": "1-800-222-1222", "type": "medical", "description": "Poison Help", "always_available": True}
    ],
    "states": {}
  },
  "GB": {
    "national": [
      {"name": "Emergency", "number": "999", "type": "emergency", "description": "Police, Fire, and Ambulance", "always_available": True},
      {"name": "Non-Emergency Medical", "number": "111", "type": "medical", "description": "NHS non-emergency", "always_available": True},
      {"name": "Non-Emergency Police", "number": "101", "type": "police", "description": "Police non-emergency", "always_available": True}
    ],
    "states": {}
  },
  "AU": {
    "national": [
      {"name": "Emergency", "number": "000", "type": "emergency", "description": "Police, Fire, and Ambulance", "always_available": True},
      {"name": "SES", "number": "132 500", "type": "disaster", "description": "State Emergency Service", "always_available": True}
    ],
    "states": {}
  },
  "CA": {
    "national": [
      {"name": "Emergency", "number": "911", "type": "emergency", "description": "Police, Fire, and Ambulance", "always_available": True}
    ],
    "states": {}
  },
  "EU": {
    "national": [
      {"name": "European Emergency Number", "number": "112", "type": "emergency", "description": "Standard emergency number across the EU", "always_available": True}
    ],
    "states": {}
  }
}

# Add all 28 states and 8 union territories of India
indian_states = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", 
    "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Lakshadweep", "Delhi", "Puducherry", "Ladakh", "Jammu and Kashmir"
]

for state in indian_states:
    contacts_db["IN"]["states"][state] = [
        {"name": f"{state} Ambulance", "number": "108", "type": "ambulance", "description": f"Ambulance service for {state}", "always_available": True},
        {"name": f"{state} Police Control Room", "number": "100", "type": "police", "description": f"Police control for {state}", "always_available": True}
    ]

# Some European countries (FR, DE, IT, ES) mapped to 112
for eu_country in ["FR", "DE", "IT", "ES", "NL", "SE", "CH", "AT"]:
    contacts_db[eu_country] = {
        "national": [
            {"name": "Emergency", "number": "112", "type": "emergency", "description": "General Emergency", "always_available": True},
            {"name": "Police", "number": "112", "type": "police", "description": "Police", "always_available": True},
            {"name": "Ambulance", "number": "112", "type": "ambulance", "description": "Ambulance", "always_available": True}
        ],
        "states": {}
    }

# Save it to contacts.json
import os
data_dir = os.path.dirname(os.path.abspath(__file__))
filepath = os.path.join(data_dir, "contacts.json")

with open(filepath, "w", encoding="utf-8") as f:
    json.dump(contacts_db, f, indent=2)

print(f"Updated {filepath} with global support and all Indian states.")
