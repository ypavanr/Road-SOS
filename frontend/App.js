import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SOSScreen from './src/screens/SOSScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Duplicate imports removed
// ─── Facility metadata ───────────────────────────────────────────────────────

const FACILITY_META = {
  // Medical / Safety
  hospital:            { emoji: '🏥', color: '#dc2626', label: 'Hospital' },
  trauma_center:       { emoji: '🚨', color: '#b91c1c', label: 'Trauma Center' },
  clinic:              { emoji: '🏨', color: '#7c3aed', label: 'Clinic' },
  ambulance:           { emoji: '🚑', color: '#d97706', label: 'Ambulance' },
  police:              { emoji: '🚔', color: '#1d4ed8', label: 'Police Station' },
  fire_station:        { emoji: '🚒', color: '#ea580c', label: 'Fire Station' },
  // Roadside
  towing:              { emoji: '🚛', color: '#0369a1', label: 'Towing Service' },
  roadside_assistance: { emoji: '🔧', color: '#0891b2', label: 'Roadside Assistance' },
  tyre_shop:           { emoji: '🔩', color: '#059669', label: 'Tyre / Puncture Shop' },
  car_repair:          { emoji: '🔨', color: '#65a30d', label: 'Car Repair' },
  fuel_station:        { emoji: '⛽', color: '#ca8a04', label: 'Fuel Station' },
  showroom:            { emoji: '🚗', color: '#4f46e5', label: 'Vehicle Showroom' },
};

const CONTACT_META = {
  emergency: { emoji: '🆘', color: '#dc2626' },
  police:    { emoji: '🚔', color: '#1d4ed8' },
  ambulance: { emoji: '🚑', color: '#d97706' },
  fire:      { emoji: '🚒', color: '#ea580c' },
  highway:   { emoji: '🛣️', color: '#0369a1' },
  women:     { emoji: '👩', color: '#7c3aed' },
  child:     { emoji: '👶', color: '#059669' },
  disaster:  { emoji: '🌊', color: '#0891b2' },
  medical:   { emoji: '💊', color: '#0891b2' },
  senior:    { emoji: '🧓', color: '#64748b' },
};

function facilityMeta(type) {
  return FACILITY_META[type] ?? { emoji: '📍', color: '#475569', label: type };
}

// ─── Components ──────────────────────────────────────────────────────────────

function call(phone) {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  Linking.openURL(`tel:${cleaned}`).catch(() =>
    Alert.alert('Cannot call', 'No phone app found.')
  );
}

function EmergencyContactChip({ contact }) {
  const m = CONTACT_META[contact.type] ?? { emoji: '📞', color: '#475569' };
  return (
    <TouchableOpacity
      style={[styles.chip, { borderColor: m.color }]}
      onPress={() => call(contact.number)}
      activeOpacity={0.7}
    >
      <Text style={styles.chipEmoji}>{m.emoji}</Text>
      <Text style={[styles.chipNumber, { color: m.color }]}>{contact.number}</Text>
      <Text style={styles.chipName} numberOfLines={1}>{contact.name}</Text>
    </TouchableOpacity>
  );
}

function FacilityCard({ facility }) {
  const m = facilityMeta(facility.type);
  return (
    <View style={[styles.card, { borderLeftColor: m.color }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{m.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{facility.name}</Text>
          <Text style={[styles.cardType, { color: m.color }]}>{m.label}</Text>
        </View>
        {facility.emergency && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>24/7</Text>
          </View>
        )}
      </View>

      <View style={styles.etaRow}>
        <View style={styles.etaBox}>
          <Text style={styles.etaValue}>{facility.eta_text ?? '—'}</Text>
          <Text style={styles.etaLabel}>ETA</Text>
        </View>
        <View style={styles.etaBox}>
          <Text style={styles.etaValue}>{facility.distance_km.toFixed(1)} km</Text>
          <Text style={styles.etaLabel}>Distance</Text>
        </View>
      </View>

      {facility.address?.full ? (
        <Text style={styles.address}>{facility.address.full}</Text>
      ) : null}

      {facility.contact?.phone ? (
        <TouchableOpacity style={styles.phoneBtn} onPress={() => call(facility.contact.phone)}>
          <Text style={styles.phoneBtnText}>📞 {facility.contact.phone}</Text>
        </TouchableOpacity>
      ) : null}

      {facility.contact?.phone_alt ? (
        <TouchableOpacity style={[styles.phoneBtn, { marginTop: 4 }]} onPress={() => call(facility.contact.phone_alt)}>
          <Text style={styles.phoneBtnText}>📞 {facility.contact.phone_alt} (alt)</Text>
        </TouchableOpacity>
      ) : null}

      {facility.contact?.website ? (
        <TouchableOpacity onPress={() => Linking.openURL(facility.contact.website)}>
          <Text style={styles.website}>{facility.contact.website}</Text>
        </TouchableOpacity>
      ) : null}

      {facility.opening_hours ? <Text style={styles.meta}>⏰ {facility.opening_hours}</Text> : null}
      {facility.beds ? <Text style={styles.meta}>🛏 {facility.beds} beds</Text> : null}
      {facility.specialties?.length > 0 ? (
        <Text style={styles.specialties}>{facility.specialties.join(' · ')}</Text>
      ) : null}
    </View>
  );
}

function SectionHeader({ title, count, cached }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRight}>
        {count != null && <Text style={styles.sectionCount}>{count}</Text>}
        {cached && <Text style={styles.cachedBadge}>cached</Text>}
      </View>
    </View>
  );
}

// ─── Main App Wrapper ─────────────────────────────────────────────────────────────

function DashboardScreen() {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState(null);
  const [recordingError, setRecordingError] = useState(null);

  const [medicalFacilities, setMedicalFacilities] = useState([]);
  const [roadsideFacilities, setRoadsideFacilities] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [meta, setMeta] = useState({});
  const [fetchedOnce, setFetchedOnce] = useState(false);

  const [textInput, setTextInput] = useState('');
  const [classification, setClassification] = useState(null);
  const [classifying, setClassifying] = useState(false);

  useEffect(() => {
    let subscriber;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Please enable it in Settings.');
        setLocationLoading(false);
        return;
      }
      
      subscriber = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
        (loc) => { setLocation(loc); setLocationLoading(false); }
      );
    })();
    return () => subscriber?.remove();
  }, []);

  const findNearby = useCallback(async (forceRefresh = false, overrideClassification = null) => {
    if (!location) return;
    const { latitude: lat, longitude: lon } = location.coords;

    setLoading(true);
    setErrors({});

    const currentClass = overrideClassification || classification;
    const bodyObj = { lat, lon, radius_m: 10000, force_refresh: forceRefresh };
    if (currentClass && currentClass.patient_gender) {
      bodyObj.patient_gender = currentClass.patient_gender;
    }
    const body = JSON.stringify(bodyObj);
    const headers = { 'Content-Type': 'application/json' };

    const [medicalRes, roadsideRes, contactsRes] = await Promise.allSettled([
      fetch(`${API_GATEWAY_URL}/nearby/medical`, { method: 'POST', headers, body }),
      fetch(`${API_GATEWAY_URL}/nearby/roadside`, { method: 'POST', headers, body }),
      fetch(`${API_GATEWAY_URL}/contacts?lat=${lat}&lon=${lon}`),
    ]);

    const newErrors = {};
    const newMeta = {};

    if (medicalRes.status === 'fulfilled' && medicalRes.value.ok) {
      const d = await medicalRes.value.json();
      setMedicalFacilities(d.facilities);
      newMeta.medicalCached = d.cached;
    } else {
      newErrors.medical = medicalRes.reason?.message ?? `Error ${medicalRes.value?.status}`;
    }

    if (roadsideRes.status === 'fulfilled' && roadsideRes.value.ok) {
      const d = await roadsideRes.value.json();
      setRoadsideFacilities(d.facilities);
      newMeta.roadsideCached = d.cached;
    } else {
      newErrors.roadside = roadsideRes.reason?.message ?? `Error ${roadsideRes.value?.status}`;
    }

    if (contactsRes.status === 'fulfilled' && contactsRes.value.ok) {
      const d = await contactsRes.value.json();
      setEmergencyContacts(d.contacts);
    } else {
      newErrors.contacts = contactsRes.reason?.message ?? `Error ${contactsRes.value?.status}`;
    }

    setErrors(newErrors);
    setMeta(newMeta);
    setLoading(false);
    setFetchedOnce(true);
  }, [location, classification]);

  const handleClassify = async (textToClassify) => {
    if (!textToClassify || !textToClassify.trim()) return;
    setClassifying(true);
    setClassification(null);
    try {
      const response = await fetch(`${API_GATEWAY_URL}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToClassify }),
      });
      if (response.ok) {
        const data = await response.json();
        setClassification(data);
        if (data.is_emergency) {
          findNearby(false, data);
        }
      } else {
        setErrors(prev => ({ ...prev, classification: 'Classification failed.' }));
      }
    } catch (e) {
      setErrors(prev => ({ ...prev, classification: e.message }));
    } finally {
      setClassifying(false);
    }
  };

  const handleRecordSOS = async () => {
    if (isRecording) {
      setIsRecording(false);
      const filePath = await stopRecording();
      if (filePath) {
        setLoading(true);
        setRecordingError(null);
        setTranscribedText('Uploading and analyzing audio...');
        
        const result = await uploadAudio(filePath);
        setLoading(false);
        
        if (result.success) {
          setTranscribedText(`Transcription [${result.provider}, ${result.language}]: "${result.text}"`);
          await handleClassify(result.text);
        } else {
          setRecordingError(result.error || 'Transcription failed');
          setTranscribedText(null);
        }
      } else {
        setRecordingError('Failed to capture audio.');
      }
    } else {
      setRecordingError(null);
      setTranscribedText(null);
      const started = await startRecording();
      if (started) {
        setIsRecording(true);
      } else {
        setRecordingError('Could not start recording. Check permissions.');
      }
    }
  };

  const { latitude, longitude, accuracy } = location?.coords ?? {};

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Road SOS Dashboard</Text>

      <View style={styles.locationStrip}>
        {locationLoading ? (
          <ActivityIndicator color="#2563eb" />
        ) : locationError ? (
          <Text style={styles.error}>{locationError}</Text>
        ) : (
          <Text style={styles.locationText}>
            {latitude?.toFixed(5)}°, {longitude?.toFixed(5)}°
            {accuracy ? `  ±${accuracy.toFixed(0)} m` : ''}
          </Text>
        )}
      </View>

      {emergencyContacts.length > 0 && (
        <View style={styles.contactsSection}>
          <Text style={styles.contactsSectionTitle}>Emergency Numbers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {emergencyContacts
              .filter(c => {
                if (!classification) return true;
                const typeMap = {
                  medical: ['emergency', 'ambulance', 'medical'],
                  police: ['emergency', 'police'],
                  roadside: ['emergency', 'highway'],
                };
                const relevantTypes = new Set(['emergency']);
                classification.broad_categories.forEach(bc => {
                  (typeMap[bc] || []).forEach(t => relevantTypes.add(t));
                });
                if (classification.specific_facilities.includes('fire_station')) {
                  relevantTypes.add('fire');
                }
                return relevantTypes.has(c.type);
              })
              .map((c, i) => (
              <EmergencyContactChip key={i} contact={c} />
            ))}
          </ScrollView>
        </View>
      )}
      {errors.contacts ? (
        <Text style={styles.error}>Emergency numbers: {errors.contacts}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.sos, (!location || loading) && styles.sosDisabled]}
        onPress={() => findNearby(false)}
        disabled={!location || loading}
        activeOpacity={0.8}
      >
        {loading && !isRecording && !transcribedText ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.sosText}>Find Nearby Help</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.sos, 
          styles.recordBtn, 
          isRecording && styles.recordingActive
        ]}
        onPress={handleRecordSOS}
        disabled={!location || (loading && !isRecording)}
        activeOpacity={0.8}
      >
        <Text style={styles.sosText}>
          {isRecording ? '🛑 Stop & Upload SOS Audio' : '🎤 Record SOS Audio'}
        </Text>
      </TouchableOpacity>

      {transcribedText ? (
        <View style={styles.transcriptionBox}>
          <Text style={styles.transcriptionText}>{transcribedText}</Text>
        </View>
      ) : null}
      
      {recordingError ? (
        <Text style={styles.error}>{recordingError}</Text>
      ) : null}

      <View style={styles.textInputBox}>
        <TextInput
          style={styles.textInput}
          placeholder="Or type your emergency here..."
          value={textInput}
          onChangeText={setTextInput}
        />
        <TouchableOpacity
          style={[styles.textInputBtn, (!textInput || classifying) && styles.sosDisabled]}
          onPress={() => {
            setTranscribedText(`Manual Input: "${textInput}"`);
            handleClassify(textInput);
            setTextInput('');
          }}
          disabled={!textInput || classifying}
        >
          {classifying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.textInputBtnText}>Send SOS</Text>}
        </TouchableOpacity>
      </View>

      {classification && (
        <View style={styles.classificationBox}>
          <View style={styles.classHeaderRow}>
            <Text style={styles.classificationTitle}>
              {classification.is_emergency ? '🚨' : 'ℹ️'} AI Triage Assessment
            </Text>
            <View style={[styles.confBadge, { backgroundColor: classification.confidence_score >= 0.7 ? '#dcfce7' : '#fef3c7' }]}>
              <Text style={[styles.confBadgeText, { color: classification.confidence_score >= 0.7 ? '#166534' : '#92400e' }]}>
                {(classification.confidence_score * 100).toFixed(0)}% ({classification.engine_used})
              </Text>
            </View>
          </View>

          <Text style={styles.classificationText}>
            Emergency: {classification.is_emergency ? '✅ Yes' : '❌ No'}
          </Text>

          <View style={styles.broadRow}>
            {classification.broad_categories.map(bc => (
              <View key={bc} style={styles.broadBadge}>
                <Text style={styles.broadBadgeText}>
                  {bc === 'medical' ? '🏥 Medical' : bc === 'police' ? '🚔 Police' : '🔧 Roadside'}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>Why this classification:</Text>
            <Text style={styles.explanationText}>{classification.explanation}</Text>
          </View>

          <Text style={styles.facilitiesNeededLabel}>Specific assistance needed:</Text>
          <View style={styles.badgeRow}>
            {classification.specific_facilities.map(fac => {
              const m = facilityMeta(fac);
              return (
                <View key={fac} style={[styles.facBadge, { backgroundColor: m.color + '18' }]}>
                  <Text style={[styles.facBadgeText, { color: m.color }]}>{m.emoji} {m.label}</Text>
                 </View>
              );
            })}
          </View>
        </View>
      )}

      {fetchedOnce && (
        <>
          {(!classification || classification.broad_categories.includes('medical') || classification.broad_categories.includes('police')) && (
            <>
              <SectionHeader
                title="Medical & Safety"
                count={medicalFacilities.filter(f => !classification || classification.specific_facilities.includes(f.type)).length}
                cached={meta.medicalCached}
              />
              {errors.medical ? (
                <Text style={styles.error}>{errors.medical}</Text>
              ) : medicalFacilities.filter(f => !classification || classification.specific_facilities.includes(f.type)).length === 0 ? (
                <Text style={styles.empty}>No matching facilities found nearby.</Text>
              ) : (
                medicalFacilities
                  .filter(f => !classification || classification.specific_facilities.includes(f.type))
                  .map((f) => <FacilityCard key={f.id} facility={f} />)
              )}
            </>
          )}

          {(!classification || classification.broad_categories.includes('roadside')) && (
            <>
              <SectionHeader
                title="Roadside Assistance"
                count={roadsideFacilities.filter(f => !classification || classification.specific_facilities.includes(f.type)).length}
                cached={meta.roadsideCached}
              />
              {errors.roadside ? (
                <Text style={styles.error}>{errors.roadside}</Text>
              ) : roadsideFacilities.filter(f => !classification || classification.specific_facilities.includes(f.type)).length === 0 ? (
                <Text style={styles.empty}>No matching roadside services found nearby.</Text>
              ) : (
                roadsideFacilities
                  .filter(f => !classification || classification.specific_facilities.includes(f.type))
                  .map((f) => <FacilityCard key={f.id} facility={f} />)
              )}
            </>
          )}
        </>
      )}

      <StatusBar style="auto" />
    </ScrollView>
  );
}

import RegistrationScreen from './src/screens/RegistrationScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Loading');
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await AsyncStorage.getItem('userData');
        if (data) {
          setUserData(JSON.parse(data));
          setCurrentScreen('Home');
        } else {
          setCurrentScreen('Registration');
        }
      } catch (e) {
        setCurrentScreen('Registration');
      }
    })();
  }, []);

  const handleRegister = (data) => {
    setUserData(data);
    setCurrentScreen('Home');
  };

  if (currentScreen === 'Loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {currentScreen === 'Registration' && (
        <RegistrationScreen onRegister={handleRegister} />
      )}
      {currentScreen === 'Home' && (
        <HomeScreen onNavigateToMap={() => setCurrentScreen('Map')} />
      )}
      {currentScreen === 'Map' && (
        <MapScreen onBack={() => setCurrentScreen('Home')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
});
