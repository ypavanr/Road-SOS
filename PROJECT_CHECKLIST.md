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
- [x] **Image/Camera Input Option**: Allow users to attach images or open the camera directly from the application. This image should be added to the SMS *only* for Trauma Centers, Police Stations, and 3-digit emergency numbers. *(Note: For now, the image is sent as a link. Later, in the Android APK build, it must be sent as the actual image file itself).
- [x] **Notification Bar Overlap**: Fixed top UI padding for device status bar.
- [x] **Offline Caching & Fallback**: Every 5 minutes fetches & caches nearest facilities and full road routes locally for offline access.
- [x] **Offline Routing & Maps Functionality**: Skip API fetches and seamlessly render pre-cached road polylines when network is lost.
- [x] **Map Default Categorization**: Take out the ambulance categorization from the map and make hospitals the default view.
- [x] **Nearest Medical Facility Routing**: When both trauma center and hospital are classified, deduplicate and route the user to ONLY the single nearest available medical facility to avoid map confusion.
- [x] **All languages integration (Partial)**: A few languages are successfully integrated for input audio and prompts.
- [x] **Manual Location Override**: Hidden developer menu (5 taps on title) added to cycle global mock locations for presentation/testing.
- [x] **Emergency Hotlines Configuration**: UI block added with SMS/Call shortcuts (112, 108, 1033, 100).
- [x] **Context-Aware Nearby Dispatch**: Prevent sending alerts to emergency contacts (and bystanders) if AI classification detects police involvement to protect their safety.
- [x] **Localization (Language & Contacts)**: Ensure display language matches the user's country, and emergency contacts change accordingly based on location (e.g., 112, 100).
- [x] **Cancel Button**: A cancel button to stop voice recording, SMS dispatch, or any ongoing emergency process.
- [x] **Non-Medical Incident Dispatch**: If AI classification is strictly a "Puncture" or "Vehicle Assistant" emergency (non-medical), route SMS only to puncture/towing shops (and potentially police) instead of hospitals or trauma centers. The user's emergency contacts will always receive an alert regardless of the time of day.
- [x] **Automatic Language Bug**: Fix the issue where the display language does not automatically change when the user's physical location/country changes.
- [x] **Complex Injury Combinations & Classification Bugs**: Test and refine AI routing for overlapping edge cases (e.g., child + pregnant, pregnant + eye injury). Fix the second SMS logic for normal map/hospital routing. Fix the facility finding logic and re-evaluate classification errors (bystander vs victim).
- [x] **Geohash Proximity Notifications**: Implemented custom Geohash grid-based proximity broadcasting using pure WebSockets (bypassing Expo Go push limits) to dynamically alert active app users physically near the accident zone with native popups and Map links.
- [x] **Emergency Contact Direct WebSocket (WiFi Bypass)**: Replaced "WiFi Captive Portal" with direct, real-time WebSocket routing. Emergency Contacts now instantly receive a native in-app popup (with map links) over the internet, acting as a real-time addition to the SMS dispatch.
- [x] **Text Input UI Polish**: Changed "CLASSIFY TEXT" button wording to "SUBMIT" via translation files to be more user-friendly during emergencies.
- [x] **WebSocket Routing & Safety Constraints**: Implemented safety checks to completely block WebSocket broadcasts (both Geohash and Emergency Contacts) if Police are involved to prevent drawing people to dangerous situations. Ensured the system never broadcasts a proximity alert back to the victim who triggered it.
- [x] **Translation Coverage**: Added multi-language translation support for the "Emergency Numbers" title, all regional hotline subtitle cards, "Emergency Services", and the "User Settings" card.
- [x] **Geohash Payload Fix**: Fixed the HTTP 422 crash where bystander proximity alerts were failing due to missing/null payload fields.
- [x] **User Settings UI**: Placed a dedicated User Settings card (black background) gracefully into the Emergency Services grid.
---

## 🚧 Remaining Tasks

### 🗺️ Navigation & UI
- [ ] **User Settings Page**: Implement the actual User Settings interface so users can freely edit their registered emergency contacts after initial onboarding.
  - *Assignee:* [ Unassigned ]
- [ ] **Native Popup Translations**: Ensure that all native alert pop-ups (success, failure, warnings, sms emergency services, msgs) properly translate to the user's selected language instead of defaulting to English.
  - *Assignee:* [ Unassigned ]
- [ Last ] **User Onboarding & Test Run**: Provide helpful videos for new users explaining how the application works for easy navigation. Implement an interactive "test run" mode to let them practice safely.
(After everything is done)
  - *Assignee:* [ Unassigned ]
- [ Kept for easier understanding ] **UI Polish (Final Demo)**: Hide or gracefully remove raw error popups/messages for the final demo presentation.
  - *Assignee:* [ Unassigned ]


### ⚙️ Dispatch Logic & Overrides
- [ Scrapped ] **Overriding Manual**: Trigger SMS messages directly without users input required anywhere.
  (ONLY CAN BE DONE IN ANDROID APK..plan in notepad.txt)
  - *Assignee:* [ Vibha ]

### 📡 Advanced Offline / Peer-to-Peer SOS
- [ Scrapped ] **Bluetooth Relay (Mesh)**: Transmit SOS via Bluetooth to nearby devices when there is no cell network.
Implement a timer for the Bluetooth relay system, so if the receiving phone later gains network access, it triggers the location fallback SMS automatically.
**Condition**: Spend an hour researching if it works *without pairing* (research only).
(Kept on hold to be done in the end)
  - *Assignee:* [ Vibha ]


-[ ] **Change emergency contacts numbers**

### 📡 Languages
- [No Time] **Additional Languages Integration**: More research for integrating more languages if time permits for the final demonstration.
  - *Assignee:* [ Unassigned ]
---

- [No Time] More research on offline and low netwowk
## 👥 Team Assignments

*Use this section to declare who is currently working on what. Update the assignees above as work begins.*

- Vibha: Bluetooth Relay, SMS Override, 112, Classification, Images, Telegram, User based sms
- Tanish: Bluetooth Fallback + Local storage
- Pavan: Bluetooth Fallback + Local storage
- Sangam: Bluetooth Fallback + Local storage
