import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, ScrollView,
  TouchableOpacity, Linking, Alert, SectionList, TextInput, Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { API_GATEWAY_URL } from './config';
import { startRecording, stopRecording, uploadAudio } from './src/services/audioService';

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

export default function App() {
  const [tab, setTab] = useState('Dashboard');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f1f5f9" />

      <View style={styles.screen}>
        {tab === 'Dashboard' && <DashboardScreen />}
        {tab === 'SOS' && <SOSScreen />}
        {tab === 'Settings' && <SettingsScreen />}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('Dashboard')}>
          <Ionicons name="home" size={22} color={tab === 'Dashboard' ? '#2563eb' : '#475569'} />
          <Text style={[styles.tabLabel, tab === 'Dashboard' && styles.tabActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('SOS')}>
          <Ionicons name="warning" size={22} color={tab === 'SOS' ? '#EF4444' : '#475569'} />
          <Text style={[styles.tabLabel, tab === 'SOS' && { color: '#EF4444' }]}>SOS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('Settings')}>
          <Ionicons name="settings-outline" size={22} color={tab === 'Settings' ? '#2563eb' : '#475569'} />
          <Text style={[styles.tabLabel, tab === 'Settings' && styles.tabActive]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#f1f5f9' },
  screen:   { flex: 1 },
  tabBar:   {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopColor: '#e2e8f0', borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8, height: Platform.OS === 'ios' ? 80 : 60,
  },
  tab:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  tabActive:{ color: '#2563eb' },
  
  bg: { flex: 1, backgroundColor: '#f1f5f9' },
  container: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  title: {
    fontSize: 28, fontWeight: '800', color: '#0f172a',
    marginBottom: 16, textAlign: 'center',
  },

  locationStrip: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    marginBottom: 16, alignItems: 'center',
  },
  locationText: { fontSize: 13, color: '#475569', fontFamily: 'monospace' },

  contactsSection: { marginBottom: 16 },
  contactsSectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#475569',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },
  chipsScroll: { flexDirection: 'row' },
  chip: {
    backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14, marginRight: 10,
    alignItems: 'center', minWidth: 80,
  },
  chipEmoji: { fontSize: 20, marginBottom: 4 },
  chipNumber: { fontSize: 15, fontWeight: '800' },
  chipName: { fontSize: 10, color: '#64748b', marginTop: 2, textAlign: 'center', maxWidth: 72 },

  sos: {
    backgroundColor: '#dc2626', borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#dc2626', shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  recordBtn: {
    backgroundColor: '#0f172a', shadowColor: '#0f172a',
  },
  recordingActive: {
    backgroundColor: '#ef4444',
  },
  transcriptionBox: {
    backgroundColor: '#e0f2fe', padding: 12, borderRadius: 10, marginBottom: 16,
    borderColor: '#38bdf8', borderWidth: 1
  },
  transcriptionText: {
    color: '#0369a1', fontSize: 14, fontWeight: '600', textAlign: 'center'
  },
  sosDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  sosText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },

  error: { color: '#dc2626', textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  empty: { color: '#94a3b8', textAlign: 'center', marginBottom: 12, fontStyle: 'italic' },

  textInputBox: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  textInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#cbd5e1' },
  textInputBtn: { backgroundColor: '#1d4ed8', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 16 },
  textInputBtnText: { color: '#fff', fontWeight: '700' },

  classificationBox: { backgroundColor: '#f0fdf4', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#86efac' },
  classHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  classificationTitle: { fontSize: 16, fontWeight: '800', color: '#166534' },
  classificationText: { fontSize: 13, color: '#15803d', marginBottom: 6 },
  confBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  confBadgeText: { fontSize: 11, fontWeight: '700' },
  broadRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  broadBadge: { backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  broadBadgeText: { fontSize: 12, fontWeight: '700', color: '#1e40af' },
  explanationBox: { backgroundColor: '#ecfdf5', borderRadius: 8, padding: 10, marginBottom: 10 },
  explanationLabel: { fontSize: 11, fontWeight: '700', color: '#065f46', marginBottom: 3 },
  explanationText: { fontSize: 12, color: '#047857', lineHeight: 18 },
  facilitiesNeededLabel: { fontSize: 11, fontWeight: '700', color: '#065f46', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  facBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  facBadgeText: { fontSize: 12, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionCount: { fontSize: 13, color: '#64748b' },
  cachedBadge: {
    backgroundColor: '#fef3c7', color: '#92400e', fontSize: 11,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontWeight: '600',
  },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  cardEmoji: { fontSize: 26 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#0f172a', flexShrink: 1 },
  cardType: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  badge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: '#166534', fontWeight: '700' },

  etaRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  etaBox: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, alignItems: 'center' },
  etaValue: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  etaLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  address: { fontSize: 13, color: '#64748b', marginBottom: 8, lineHeight: 18 },

  phoneBtn: {
    backgroundColor: '#eff6ff', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 4,
  },
  phoneBtnText: { color: '#1d4ed8', fontWeight: '600', fontSize: 14 },

  website: { color: '#2563eb', fontSize: 12, marginTop: 4, textDecorationLine: 'underline' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  specialties: { fontSize: 12, color: '#7c3aed', marginTop: 4, fontStyle: 'italic' },
});
