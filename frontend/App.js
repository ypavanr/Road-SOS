import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ActivityIndicator, ScrollView,
  TouchableOpacity, Linking, Alert, SectionList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import {
  HOSPITAL_SERVICE_URL,
  ROADSIDE_SERVICE_URL,
  EMERGENCY_CONTACTS_SERVICE_URL,
} from './config';
import { startRecording, stopRecording, uploadAudio } from './src/services/audioService';

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

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
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

  useEffect(() => {
    let subscriber;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Please enable it in Settings.');
        setLocationLoading(false);
        return;
      }
      // Request microphone permissions
      // Note: React Native Audio Recorder Player might need separate permission handlers, 
      // but in Expo, permissions are often requested via the module or Expo modules. 
      // For bare React Native we would use PermissionsAndroid. 
      
      subscriber = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
        (loc) => { setLocation(loc); setLocationLoading(false); }
      );
    })();
    return () => subscriber?.remove();
  }, []);

  const findNearby = useCallback(async (forceRefresh = false) => {
    if (!location) return;
    const { latitude: lat, longitude: lon } = location.coords;

    setLoading(true);
    setErrors({});

    const body = JSON.stringify({ lat, lon, radius_m: 10000, force_refresh: forceRefresh });
    const headers = { 'Content-Type': 'application/json' };

    const [medicalRes, roadsideRes, contactsRes] = await Promise.allSettled([
      fetch(`${HOSPITAL_SERVICE_URL}/nearby`, { method: 'POST', headers, body }),
      fetch(`${ROADSIDE_SERVICE_URL}/nearby`, { method: 'POST', headers, body }),
      fetch(`${EMERGENCY_CONTACTS_SERVICE_URL}/contacts?lat=${lat}&lon=${lon}`),
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
  }, [location]);

  const handleRecordSOS = async () => {
    if (isRecording) {
      // Stop recording
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
          // Note: In real system, we'd send this to classifier-service next.
        } else {
          setRecordingError(result.error || 'Transcription failed');
          setTranscribedText(null);
        }
      } else {
        setRecordingError('Failed to capture audio.');
      }
    } else {
      // Start recording
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
      <Text style={styles.title}>Road SOS</Text>

      {/* Location strip */}
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

      {/* Emergency contacts strip — always show if loaded */}
      {emergencyContacts.length > 0 && (
        <View style={styles.contactsSection}>
          <Text style={styles.contactsSectionTitle}>Emergency Numbers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {emergencyContacts.map((c, i) => (
              <EmergencyContactChip key={i} contact={c} />
            ))}
          </ScrollView>
        </View>
      )}
      {errors.contacts ? (
        <Text style={styles.error}>Emergency numbers: {errors.contacts}</Text>
      ) : null}

      {/* Find Nearby Help button */}
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

      {/* Record SOS Audio Button */}
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

      {/* Transcription Result */}
      {transcribedText ? (
        <View style={styles.transcriptionBox}>
          <Text style={styles.transcriptionText}>{transcribedText}</Text>
        </View>
      ) : null}
      
      {recordingError ? (
        <Text style={styles.error}>{recordingError}</Text>
      ) : null}

      {/* Results */}
      {fetchedOnce && (
        <>
          {/* Medical & Safety */}
          <SectionHeader
            title="Medical & Safety"
            count={medicalFacilities.length}
            cached={meta.medicalCached}
          />
          {errors.medical ? (
            <Text style={styles.error}>{errors.medical}</Text>
          ) : medicalFacilities.length === 0 ? (
            <Text style={styles.empty}>No facilities found nearby.</Text>
          ) : (
            medicalFacilities.map((f) => <FacilityCard key={f.id} facility={f} />)
          )}

          {/* Roadside Assistance */}
          <SectionHeader
            title="Roadside Assistance"
            count={roadsideFacilities.length}
            cached={meta.roadsideCached}
          />
          {errors.roadside ? (
            <Text style={styles.error}>{errors.roadside}</Text>
          ) : roadsideFacilities.length === 0 ? (
            <Text style={styles.empty}>No roadside services found nearby.</Text>
          ) : (
            roadsideFacilities.map((f) => <FacilityCard key={f.id} facility={f} />)
          )}
        </>
      )}

      <StatusBar style="auto" />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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

  // Emergency contacts
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

  // SOS button
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

  // Facility card
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
