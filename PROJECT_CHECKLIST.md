# Road-SOS Project Checklist

This document tracks the overall progress of the Road-SOS system, mapping out what has been successfully integrated and what is currently pending or actively being developed. 

---

## ✅ Completed Features

- [x] **Speech to Text**: Audio recording and automated transcription.
- [x] **AI Triage & Classification**: Processing transcripts to classify emergencies, specifically mapping to trauma center requirements.
- [x] **Nearby Facilities**: Geolocation-based retrieval of nearby hospitals, trauma centers, and roadside assistance.
- [x] **SOS Microservice**: Dedicated `sos-service` backend to manage secure Telegram dispatch and configuration.
- [x] **Alert Dispatch**: Fully functional Telegram dispatching and native SMS composer integration.
- [x] **Classification of Male or Female**: Accordingly the emergency services changed
- [x] **Classification of Victim or Bystander**: Accordinlgy emergency contact sms is sent or not.
- [x] **Emegency Contact Feature**: Multiple registartions of contacts and removal of hardcoded contact dependency for emergency contact sms
- [x] **Maps Display**: Maps displayed immediately on load, irrespective of voice input.
- [x] **Text input box**: Dynamic UI toggle for manual text emergency classification.
- [x] **Maps Integration**: Implement live map view/routing on the frontend.
- [x] **Register Page**: Succesfully implemented with all details.
- [x] **ULW Base Scoring Trauma Routing**: Choose 1st nearest trauma center based on ULW scoring, OR allow the user to select their preferred trauma center from the list.
- [x]**AI classification results**:add AI triage assessment UI and dynamic progressive radius search up to 20km
---

## 🚧 Remaining Tasks

### 🗺️ Navigation & UI
- [ ] **Cancel Button**: A cancel button to stop voice recording, SMS dispatch, or any ongoing emergency process.
  - *Assignee:* [ Unassigned ]
- [ ] **Manual Location Override**: Allow changing the location manually to test global functionality and verify if regional data loads correctly.
  - *Assignee:* [ Unassigned ]
- [ ] **Localization (Language & Contacts)**: Ensure display language matches the user's country, and emergency contacts change accordingly based on location (e.g., 112, 100).
  - *Assignee:* [ Unassigned ]

### 🏥 Facilities & Services
- [ ] **Vehicle Showrooms**: Fetch and display nearest vehicle showrooms for rescue and assistance.
  - *Assignee:* [ Unassigned ]
- [ ] **Ambulance Assistance**: Specific feature to find and request nearby ambulance assistance.
  - *Assignee:* [ Unassigned ]
- [ ] **Emergency Hotlines Configuration**: Configure specific hotlines (e.g., 112 for SMS, 100/11 etc. for calling) based on previous UI design.
  - *Assignee:* [ Vibha ]

### ⚙️ Dispatch Logic & Overrides
- [x] **Trauma Specific SMS**: Trigger customized SMS messages including the voice text being given as input when used by user.
  - *Assignee:* [ Vibha ]
- [ ] **Overriding Manual**: Trigger SMS messages directly without users input required anywhere.
  (ONLY CAN BE DONE IN ANDROID APK..plan in notepad.txt)
  - *Assignee:* [ Vibha ]
- [ ] **Role-Based SMS Routing**: If Victim -> send SMS to trauma center, general (police/fire/all ppl nearby), and emergency contacts. If Bystander -> send SMS to trauma center and general, but NOT emergency contacts.
(Except trauma centre finish everything else)
  - *Assignee:* [ Tanish, Vibha ]
- [ ] **Context-Aware Nearby Dispatch**: Send SMS to nearby people generally, but prevent sending alerts to nearby people if AI classification detects a terrorist attack (to protect their safety).
  - *Assignee:* [ Unassigned ]
- [ ] **Non-Medical Incident Dispatch**: If AI classification is strictly a "Puncture" or "Vehicle Assistant" emergency (non-medical), route SMS only to puncture/towing shops (and potentially police) instead of hospitals or trauma centers.
  - *Assignee:* [ Unassigned ]
- [ ] **Telegram Chatbot Debugging**: Debug and stabilize the Telegram dispatch chatbot and have a group discussion on whether telegram is required or keep it as a notification of our application.
  - *Assignee:* [ Vibha ]

### 🧠 Advanced AI Triage & Media
- [ ] **Detailed Demographic Classification**: Classify for age/demographics (children, pregnant women) and specific injury types (e.g., eye or head injuries) to refine dispatch.
  - *Assignee:* [ Vibha ]
- [ ] **Image Input Option**: Allow users to attach images of the incident to be parsed by AI and sent via SMS (Requires further discussion).
  - *Assignee:* [ Vibha ]

### 📡 Advanced Offline / Peer-to-Peer SOS
- [ ] **Offline Trauma Center Caching**: Every 5 minutes (while connected), fetch and cache the nearest trauma center locally so it's available if the network is lost while traveling.
  - *Assignee:* [ Tanish, Pavan, Sangam ]

- [ ] **Bluetooth Relay (Mesh)**: Transmit SOS via Bluetooth to nearby devices when there is no cell network.
Implement a timer for the Bluetooth relay system, so if the receiving phone later gains network access, it triggers the location fallback SMS automatically.
**Condition**: Spend an hour researching if it works *without pairing* (research only).
  - *Assignee:* [ Vibha ]
- [ ] **Relay Timer & Fallback**: The timer feature as fallback after Bluetooth
  - *Assignee:* [ Tanish, Pavan, Sangam ]
- [ ] **Offline and Low Network Functionality**: Needs more discussion on implementation details and scope.
  - *Assignee:* [ Unassigned ]

### 📡 Languages
- [ ] **All languages integration**: Languages display as input audio and also option to change to a language with default voice prompt for calling emergency service, also the emergency contact to be in that selected language.Default language acc to location and user voice
  - *Assignee:* [ Unassigned ]
---

## 👥 Team Assignments (Example)

*Use this section to declare who is currently working on what. Update the assignees above as work begins.*

- Vibha: Bluetooth Relay, SMS Override, 112, Classification, Images, Telegram, User based sms
- Tanish: Bluetooth Fallback + Local storage
- Pavan: Bluetooth Fallback + Local storage
- Sangam: Bluetooth Fallback + Local storage
