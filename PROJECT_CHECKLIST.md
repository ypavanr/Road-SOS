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

---

## 🚧 Remaining Tasks

### 🗺️ Navigation & UI
- [ ] **Maps Integration**: Implement live map view/routing on the frontend.
  - *Assignee:* [ Pavan,Sangam ]
- [ ] **Path Optimization**: Optimize the routing and path to nearby facilities after maps integration.
  - *Assignee:* [ Pavan,Sangam ]


### ⚙️ Dispatch Logic & Overrides
- [ ] **Trauma Specific SMS**: Trigger customized SMS messages directly to hardcoded trauma center/hospital mobile numbers based on the classification.
  - *Assignee:* [ Vibha ]
  - [ ] **Overriding Manual**: Trigger SMS messages directly without users input required anywhere.
  (ONLY CAN BE DONE IN ANDROID APK..plan in notepad.txt)
  - *Assignee:* [ Vibha ]

### 🧠 Advanced AI Triage & Media
- [ ] **Detailed Demographic Classification**: Classify for age/demographics (children, pregnant women) and specific injury types (e.g., eye or head injuries) to refine dispatch.
  - *Assignee:* [ Vibha ]
- [ ] **Image Input Option**: Allow users to attach images of the incident to be parsed by AI and sent via SMS (Requires further discussion).
  - *Assignee:* [ Vibha ]

### 📡 Advanced Offline / Peer-to-Peer SOS
- [ ] **Victim Location Broadcasting**: SMS dispatch sent directly to nearby people around the victim's immediate location.
  - *Assignee:* [ Unassigned ]
- [ ] **Bluetooth Relay (Mesh)**: Transmit SOS via Bluetooth to nearby devices when there is no cell network.
Implement a timer for the Bluetooth relay system, so if the receiving phone later gains network access, it triggers the location fallback SMS automatically
  - *Assignee:* [ Vibha ]
- [ ] **Relay Timer & Fallback**: The timer feature as fallback after Bluetooth
  - *Assignee:* [ Tanish ]

### 📡 Languages
- [ ] **All languages integration**: Languages display as input audio and also option to change to a language with default voice prompt for calling emergency service, also the emergency contact to be in that selected language.Default language acc to location and user voice
  - *Assignee:* [ Unassigned ]
---

## 👥 Team Assignments (Example)

*Use this section to declare who is currently working on what. Update the assignees above as work begins.*

- Vibha: Bluetooth Relay, SMS Override, Trauma Specific SMS
- Tanish: Maps UI Explanation, Timer fallback   SOS
- Pavan: Maps API, Path Optimization
- Sangam: Maps API, Path Optimization
