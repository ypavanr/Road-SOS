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
- [x] **AI classification results**:add AI triage assessment UI and dynamic progressive radius search up to 20km
- [x] **Detailed Demographic Classification**: Classify for demographics (pregnant women, children) and specific injury types (e.g., eye or head injuries) to dynamically route to specialized hospitals.
- [x] **Fire Station Classification**: Specifically classify fire and burning incidents to route to the nearest fire station in combination with medical facilities.
- [x] **Vehicle Showrooms**: Display nearest vehicle showrooms for rescue and assistance.
- [x] **Image/Camera Input Option**: Allow users to attach images or open the camera directly from the application. This image should be added to the SMS *only* for Trauma Centers, Police Stations, and 3-digit emergency numbers. *(Note: For now, the image is sent as a link. Later, in the Android APK build, it must be sent as the actual image file itself).* [Assignee: Tanish]
- [x] **Notification Bar Overlap**: Fixed top UI padding for device status bar.
- [x] **Offline Caching & Fallback**: Every 5 minutes fetches & caches nearest facilities and full road routes locally for offline access.
- [x] **Offline Routing & Maps Functionality**: Skip API fetches and seamlessly render pre-cached road polylines when network is lost.
---

## 🚧 Remaining Tasks

### 🗺️ Navigation & UI
- [ ] **Map Default Categorization**: Take out the ambulance categorization from the map and make hospitals the default view.
  - *Assignee:* [ Pavan ]
- [Last] **User Onboarding & Test Run**: Provide helpful videos for new users explaining how the application works for easy navigation. Implement an interactive "test run" mode to let them practice safely.
(After everything is done)
  - *Assignee:* [ Unassigned ]
- [ ] **Cancel Button**: A cancel button to stop voice recording, SMS dispatch, or any ongoing emergency process.
  - *Assignee:* [ Tanish ]
- [ ] **UI Polish (Final Demo)**: Hide or gracefully remove raw error popups/messages for the final demo presentation.
  - *Assignee:* [ Unassigned ]

- [ ] **Manual Location Override**: Allow changing the location manually to test global functionality and verify if regional data loads correctly.
  - *Assignee:* [ Unassigned ]
- [ ] **Localization (Language & Contacts)**: Ensure display language matches the user's country, and emergency contacts change accordingly based on location (e.g., 112, 100).
  - *Assignee:* [ Unassigned ]

### 🏥 Facilities & Services
- [ ] **Ambulance Assistance**: Specific feature to find and request nearby ambulance assistance.
(Research told not possible so showing it as nearby hospitals and 3 digit emrgency numbers for now)
  - *Assignee:* [ Pavan ]
- [ ] **Emergency Hotlines Configuration**: Configure specific hotlines (e.g., 112 for SMS, 100/11 etc. for calling) based on previous UI design.
  - *Assignee:* [ Vibha ]

### ⚙️ Dispatch Logic & Overrides
- [ ] **Nearest Medical Facility Routing**: When both trauma center and hospital are classified, deduplicate and route the user to ONLY the single nearest available medical facility to avoid map confusion.
  - *Assignee:* [ Unassigned ]
- [On Hold] **Overriding Manual**: Trigger SMS messages directly without users input required anywhere.
  (ONLY CAN BE DONE IN ANDROID APK..plan in notepad.txt)
  - *Assignee:* [ Vibha ]

- [ ] **Context-Aware Nearby Dispatch**: Send SMS to nearby people generally, but prevent sending alerts to nearby people if AI classification detects a terrorist attack + police involved (to protect their safety).
  - *Assignee:* [ Vibha ]
- [ ] **Complex Injury Combinations**: Test and refine AI routing for overlapping edge cases (e.g., Pregnant + Eye Injury, Eye + Broken Leg, Pregnancy + Leg) to ensure the system prioritizes the most critical specialist or defaults to a general trauma center correctly.
  - *Assignee:* [ Unassigned ]
- [ ] **Non-Medical Incident Dispatch**: If AI classification is strictly a "Puncture" or "Vehicle Assistant" emergency (non-medical), route SMS only to puncture/towing shops (and potentially police) instead of hospitals or trauma centers or emrgency contacts(but if the time is in the night then to emergency contacts).
  - *Assignee:* [ Vibha ]
- [On Hold] **Telegram Chatbot Debugging**: Debug and stabilize the Telegram dispatch chatbot and have a group discussion on whether telegram is required or keep it as a notification of our application.
(Discussion still pending)
  - *Assignee:* [ Vibha ]


### 📡 Advanced Offline / Peer-to-Peer SOS


- [On Hold] **Bluetooth Relay (Mesh)**: Transmit SOS via Bluetooth to nearby devices when there is no cell network.
Implement a timer for the Bluetooth relay system, so if the receiving phone later gains network access, it triggers the location fallback SMS automatically.
**Condition**: Spend an hour researching if it works *without pairing* (research only).
(Kept on hold to be done in the end)
  - *Assignee:* [ Vibha ]


### 📡 Languages
- [ ] **All languages integration**: Languages display as input audio and also option to change to a language with default voice prompt for calling emergency service, also the emergency contact to be in that selected language.Default language acc to location and user voice
  - *Assignee:* [ Unassigned ]
---

## 👥 Team Assignments

*Use this section to declare who is currently working on what. Update the assignees above as work begins.*

- Vibha: Bluetooth Relay, SMS Override, 112, Classification, Images, Telegram, User based sms
- Tanish: Bluetooth Fallback + Local storage
- Pavan: Bluetooth Fallback + Local storage
- Sangam: Bluetooth Fallback + Local storage
