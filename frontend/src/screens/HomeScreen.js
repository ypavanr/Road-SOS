import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { API_GATEWAY_URL } from '../../config';
import { startRecording, stopRecording, uploadAudio } from '../services/audioService';
import { sendSOSViaSMS } from '../services/smsService';
import {
  useEmergency,
  getPrimaryFacilityType,
  facilityTypeToFilter,
  rankFacility,
} from '../context/EmergencyContext';

const { width } = Dimensions.get('window');

const HIGH_CONFIDENCE_THRESHOLD = 0.75;

const SERVICES = [
  { id: 'ambulance', name: 'Ambulance', icon: 'medical', color: '#ef4444' },
  { id: 'police', name: 'Police', icon: 'shield-checkmark', color: '#3b82f6' },
  { id: 'fire', name: 'Fire Station', icon: 'flame', color: '#f97316' },
  { id: 'hospital', name: 'Hospitals', icon: 'business', color: '#ec4899' },
  { id: 'trauma', name: 'Trauma Center', icon: 'heart-half', color: '#8b5cf6' },
  { id: 'fuel', name: 'Gas Station', icon: 'water', color: '#eab308' },
  { id: 'towing', name: 'Towing Service', icon: 'car', color: '#6366f1' },
  { id: 'tyre', name: 'Puncture Shop', icon: 'hammer', color: '#14b8a6' },
];

const SERVICE_TO_PHONE = {
  trauma: '+91 7259654930',
  ambulance: '+91 7259654930',
  hospital: '+91 8722273804',
  fuel: '+91 8722273804',
  police: '+91 7892978757',
  towing: '+91 7892978757',
  fire: '+91 6360843513',
  tyre: '+91 6360843513',
};

const SERVICE_LABEL = {
  hospital: 'Hospital',
  trauma_center: 'Trauma Center',
  ambulance: 'Ambulance',
  clinic: 'Clinic',
  police: 'Police',
  fire_station: 'Fire Station',
  towing: 'Towing Service',
  tyre_shop: 'Puncture Shop',
  car_repair: 'Car Repair',
  fuel_station: 'Gas Station',
  roadside_assistance: 'Roadside Assistance',
};

const SERVICE_ICON = {
  hospital: 'business',
  trauma_center: 'heart-half',
  ambulance: 'medical',
  clinic: 'medkit',
  police: 'shield-checkmark',
  fire_station: 'flame',
  towing: 'car',
  tyre_shop: 'hammer',
  car_repair: 'construct',
  fuel_station: 'water',
  roadside_assistance: 'construct',
};

const LOADING_MESSAGES = [
  'Analyzing emergency...',
  'Finding nearest services...',
  'Calculating fastest route...',
  'Fetching emergency services...',
];

export default function HomeScreen({ onNavigateToMap, userData }) {
  const {
    setClassification,
    facilities,
    setFacilities,
    setSelectedService,
    setIsEmergencyMode,
    setLoadingMessage,
    clearEmergency,
  } = useEmergency();

  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [translation, setTranslation] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  // Text input
  const [isTextInputMode, setIsTextInputMode] = useState(false);
  const [manualText, setManualText] = useState('');
  const preloadPromiseRef = useRef(null);

  // Low-confidence confirmation state
  const [pendingClassification, setPendingClassification] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setLocationLoading(false);
      if (loc?.coords) {
        preloadPromiseRef.current = preloadFacilities(loc.coords.latitude, loc.coords.longitude);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { latitude, longitude } = location?.coords || {};

  const setContextLoadingMsg = (msg) => {
    setLoadingMsg(msg);
    setLoadingMessage(msg);
  };

  // ── Fetch exactly 6km on mount (Preload) ──────────
  const preloadFacilities = useCallback(async (lat, lon) => {
    try {
      setContextLoadingMsg('Preloading nearby emergency services...');
      const headers = { 'Content-Type': 'application/json' };
      const body = JSON.stringify({ lat, lon, radius_m: 6000 });

      const [medRes, roadRes] = await Promise.allSettled([
        fetch(`${API_GATEWAY_URL}/nearby/medical`, { method: 'POST', headers, body }),
        fetch(`${API_GATEWAY_URL}/nearby/roadside`, { method: 'POST', headers, body }),
      ]);

      let freshFacilities = [];
      if (medRes.status === 'fulfilled' && medRes.value.ok) {
        const d = await medRes.value.json();
        freshFacilities = freshFacilities.concat(d.facilities || []);
      }
      if (roadRes.status === 'fulfilled' && roadRes.value.ok) {
        const d = await roadRes.value.json();
        freshFacilities = freshFacilities.concat(d.facilities || []);
      }

      setFacilities(freshFacilities);
      setContextLoadingMsg(null);
      return freshFacilities;
    } catch (e) {
      console.error('Preload failed', e);
      setContextLoadingMsg(null);
      return [];
    }
  }, [setFacilities]);

  // ── Incremental fetch for missing types (Fallback) ──────────
  const incrementalFetchFacilities = useCallback(async (lat, lon, missingTypes, existingFacilities, clsData = null) => {
    try {
      setContextLoadingMsg('Searching wider area for specific services...');
      let allFacilities = [...existingFacilities];
      let currentRadius = 11000; // Next step after 6km is 6+5=11km
      const MAX_RADIUS = 20000;
      const headers = { 'Content-Type': 'application/json' };

      while (currentRadius <= MAX_RADIUS) {
        setContextLoadingMsg(`Searching within ${currentRadius / 1000}km...`);
        const bodyObj = { 
          lat, 
          lon, 
          radius_m: currentRadius,
          patient_gender: clsData?.patient_gender,
          patient_demographic: clsData?.patient_demographic,
          injury_type: clsData?.injury_type
        };
        const body = JSON.stringify(bodyObj);

        const [medRes, roadRes] = await Promise.allSettled([
          fetch(`${API_GATEWAY_URL}/nearby/medical`, { method: 'POST', headers, body }),
          fetch(`${API_GATEWAY_URL}/nearby/roadside`, { method: 'POST', headers, body }),
        ]);

        let freshFacilities = [];
        if (medRes.status === 'fulfilled' && medRes.value.ok) {
          const d = await medRes.value.json();
          freshFacilities = freshFacilities.concat(d.facilities || []);
        }
        if (roadRes.status === 'fulfilled' && roadRes.value.ok) {
          const d = await roadRes.value.json();
          freshFacilities = freshFacilities.concat(d.facilities || []);
        }

        // Merge keeping unique ids
        const existingIds = new Set(allFacilities.map(f => f.id));
        const newUnique = freshFacilities.filter(f => !existingIds.has(f.id));
        allFacilities = [...allFacilities, ...newUnique];

        let stillMissing = false;
        for (const type of missingTypes) {
           const matching = allFacilities.filter(f => f.type === type);
           if (matching.length < 2) {
             stillMissing = true;
             break;
           }
        }
        
        if (!stillMissing) break;
        currentRadius += 5000; // Increment by 5km
      }

      setFacilities(allFacilities);
      setContextLoadingMsg(null);
      return allFacilities;
    } catch (e) {
      console.error('Incremental fetch failed', e);
      setContextLoadingMsg(null);
      return existingFacilities;
    }
  }, [setFacilities]);

  // Mapping of category filters to their respective dummy authority phone numbers
  const FILTER_TO_AUTHORITY = {
    trauma: '+91 7259654930',
    hospital: '+91 8722273804',
    ambulance: '+91 8722273804',
    police: '+91 7892978757',
    fire: '+91 6360843513',
    towing: '+91 7892978757',
    tyre: '+91 7892978757',
    fuel: '+91 7892978757',
  };

  // ── Act on a confirmed (or high-confidence) classification ────
  const applyClassification = useCallback(
    async (data, lat, lon) => {
      setClassification(data);

      const primaryType = getPrimaryFacilityType(data.specific_facilities || []);
      const filterId = facilityTypeToFilter(primaryType);
      setSelectedService(filterId);
      setIsEmergencyMode(true);

      setContextLoadingMsg('Checking preloaded data...');
      let currentFacilities = facilities;
      if (preloadPromiseRef.current) {
         currentFacilities = await preloadPromiseRef.current;
      }
      
      const isSpecialized = (data.patient_demographic && data.patient_demographic !== 'adult') || 
                            (data.injury_type && data.injury_type !== 'general');
      const missingTypes = [];
      
      if (!isSpecialized) {
        for (const requiredType of (data.specific_facilities || [])) {
           const matching = currentFacilities.filter(f => f.type === requiredType);
           if (matching.length < 2) { 
               missingTypes.push(requiredType);
           }
        }
      } else {
        // If specialized, ignore preloaded general facilities to force a strict API fetch
        currentFacilities = [];
        for (const requiredType of (data.specific_facilities || [])) {
           missingTypes.push(requiredType);
        }
      }

      let updatedFacilities = currentFacilities;
      if (missingTypes.length > 0) {
         const fetched = await incrementalFetchFacilities(lat, lon, missingTypes, currentFacilities, data);
         if (fetched && fetched.length > 0) {
           updatedFacilities = fetched;
         }
      }

      // Collect all relevant authority and trauma center numbers
      const authorityNumbers = [];
      const requiredTypes = data.specific_facilities || [];
      const matchedNearby = updatedFacilities.filter(f => requiredTypes.includes(f.type));

      const traumaCenters = matchedNearby.filter(f => f.type === 'trauma_center');
      const hospitals = matchedNearby.filter(f => f.type === 'hospital' || f.type === 'clinic');
      const policeStations = matchedNearby.filter(f => f.type === 'police');
      const fireStations = matchedNearby.filter(f => f.type === 'fire_station');

      const rankAndSort = (list, fId) => {
        return list
          .map(f => ({ facility: f, score: rankFacility(f, fId) }))
          .sort((a, b) => b.score - a.score)
          .map(item => item.facility);
      };

      const sortedTraumas = rankAndSort(traumaCenters, 'trauma');
      const sortedHospitals = rankAndSort(hospitals, 'hospital');
      const sortedPolice = rankAndSort(policeStations, 'police');
      const sortedFire = rankAndSort(fireStations, 'fire');

      // Trauma centers pool of dummy numbers
      const traumaDummyPool = [
        '+91 7259654930', // Primary trauma center
        '+91 8722273804', // Fallback/reused from hospital
        '+91 7892978757', // Fallback/reused from police
        '+91 6360843513'  // Fallback/reused from fire
      ];

      if (sortedTraumas.length > 0) {
        // Send to all trauma centers involved
        sortedTraumas.forEach((facility, index) => {
          const dummyNum = traumaDummyPool[index % traumaDummyPool.length];
          authorityNumbers.push(dummyNum);
        });
      } else if (requiredTypes.includes('trauma_center')) {
        authorityNumbers.push('+91 7259654930');
      }

      // Hospital numbers
      if (sortedHospitals.length > 0) {
        authorityNumbers.push('+91 8722273804');
      } else if (requiredTypes.includes('hospital') || requiredTypes.includes('clinic') || requiredTypes.includes('ambulance')) {
        authorityNumbers.push('+91 8722273804');
      }

      // Police numbers
      if (sortedPolice.length > 0) {
        authorityNumbers.push('+91 7892978757');
      } else if (requiredTypes.includes('police') || requiredTypes.includes('towing') || requiredTypes.includes('roadside_assistance')) {
        authorityNumbers.push('+91 7892978757');
      }

      // Fire numbers
      if (sortedFire.length > 0) {
        authorityNumbers.push('+91 6360843513');
      } else if (requiredTypes.includes('fire_station')) {
        authorityNumbers.push('+91 6360843513');
      }

      // Remove duplicates
      const uniqueAuthorityNumbers = [...new Set(authorityNumbers)];

      if (location?.coords) {
        sendSOSViaSMS(
          { latitude: lat, longitude: lon, accuracy: location.coords.accuracy },
          userData,
          uniqueAuthorityNumbers,
          data.user_role || 'victim'
        ).catch((err) => console.error('Auto SMS failed:', err));
      }

      onNavigateToMap();
    },
    [setClassification, setSelectedService, setIsEmergencyMode, incrementalFetchFacilities, location, userData, onNavigateToMap, facilities],
  );

  // ── Classify text and decide what to do ──────────────────────
  const handleClassify = useCallback(
    async (textToClassify, lat, lon) => {
      if (!textToClassify) return;
      try {
        setContextLoadingMsg('Analyzing emergency...');
        const response = await fetch(`${API_GATEWAY_URL}/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToClassify }),
        });
        if (!response.ok) {
          setContextLoadingMsg(null);
          return;
        }
        const data = await response.json();
        setContextLoadingMsg(null);

        if (!data.is_emergency) {
          setClassification(data);
          onNavigateToMap();
          return;
        }

        if ((data.confidence_score || 0) >= HIGH_CONFIDENCE_THRESHOLD) {
          // High confidence → auto-route
          await applyClassification(data, lat, lon);
        } else {
          // Low confidence → ask user to confirm
          setPendingClassification({ data, lat, lon });
        }
      } catch (e) {
        console.error('Classification failed:', e);
        setContextLoadingMsg(null);
      }
    },
    [applyClassification],
  );

  const handleManualSubmit = () => {
    if (!manualText.trim()) return;
    setTranslation(manualText);
    setIsTextInputMode(false);
    if (latitude && longitude) handleClassify(manualText, latitude, longitude);
    setManualText('');
  };

  const handleRecordSOS = async () => {
    setIsTextInputMode(false);
    if (isRecording) {
      setIsRecording(false);
      const filePath = await stopRecording();
      if (filePath) {
        setLoading(true);
        setTranslation('Analyzing audio...');
        const result = await uploadAudio(filePath);
        setLoading(false);
        if (result.success) {
          const transcribedText = result.text?.trim() || '';
          if (!transcribedText) {
            setTranslation('No speech detected.');
            return;
          }
          setTranslation(transcribedText);
          if (latitude && longitude) handleClassify(transcribedText, latitude, longitude);
        } else {
          setTranslation('Transcription failed.');
        }
      }
    } else {
      setTranslation('Recording...');
      const started = await startRecording();
      if (started) setIsRecording(true);
      else setTranslation('Microphone permission denied.');
    }
  };

  // ── Manual service card tap → navigate directly and send SMS ───────────────
  const dispatchServiceSMS = async (serviceId, attachmentUri = null) => {
    let currentLoc = location;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        currentLoc = await Location.getCurrentPositionAsync({});
        setLocation(currentLoc);
      }
    } catch (e) {
      console.error("Failed to get location dynamically in dispatchServiceSMS:", e);
    }

    const targetPhone = SERVICE_TO_PHONE[serviceId];
    if (targetPhone && currentLoc?.coords) {
      sendSOSViaSMS(
        { 
          latitude: currentLoc.coords.latitude, 
          longitude: currentLoc.coords.longitude, 
          accuracy: currentLoc.coords.accuracy || 0,
          timestamp: currentLoc.timestamp || Date.now()
        },
        userData,
        [targetPhone],
        'bystander',
        attachmentUri
      ).catch((err) => console.error('Service manual SMS failed:', err));
    }
  };

  const handlePhotoSelection = async (serviceId, type) => {
    try {
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permissions are required to take an incident photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          await dispatchServiceSMS(serviceId, result.assets[0].uri);
        } else {
          Alert.alert(
            'No Photo Captured',
            'Send the SOS message without a photo?',
            [
              { text: 'Yes, Send Text Only', onPress: () => dispatchServiceSMS(serviceId, null) },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permissions are required to choose an incident photo.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          await dispatchServiceSMS(serviceId, result.assets[0].uri);
        } else {
          Alert.alert(
            'No Photo Selected',
            'Send the SOS message without a photo?',
            [
              { text: 'Yes, Send Text Only', onPress: () => dispatchServiceSMS(serviceId, null) },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      }
    } catch (e) {
      console.error("Error picking image:", e);
      Alert.alert('Error', 'An error occurred while getting the photo. Sending text-only SOS...');
      await dispatchServiceSMS(serviceId, null);
    }
  };

  const handleServiceTap = async (serviceId) => {
    clearEmergency();
    setSelectedService(serviceId);

    // Prompt user for attaching photo
    Alert.alert(
      'Attach Incident Photo',
      'Would you like to capture or select a photo of the incident to send to the trauma centre?',
      [
        {
          text: 'Take Photo',
          onPress: () => handlePhotoSelection(serviceId, 'camera'),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => handlePhotoSelection(serviceId, 'gallery'),
        },
        {
          text: 'Send Text Only',
          onPress: () => dispatchServiceSMS(serviceId, null),
        },
      ],
      { cancelable: true }
    );

    if (preloadPromiseRef.current) {
       setContextLoadingMsg('Waiting for preloaded data...');
       await preloadPromiseRef.current;
       setContextLoadingMsg(null);
    }
    onNavigateToMap();
  };

  // ── Low-confidence confirmation handlers ──────────────────────
  const confirmServices = async (specificFacilities) => {
    if (!pendingClassification) return;
    const { data, lat, lon } = pendingClassification;
    setPendingClassification(null);
    await applyClassification(
      { ...data, specific_facilities: specificFacilities },
      lat,
      lon,
    );
  };

  const dismissConfirmation = () => setPendingClassification(null);

  // ── Render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Coordinates Strip */}
        <View style={styles.coordStrip}>
          <Ionicons name="location" size={16} color="#475569" style={{ marginRight: 6 }} />
          {locationLoading ? (
            <ActivityIndicator size="small" color="#475569" />
          ) : (
            <Text style={styles.coordText}>
              Lat: {latitude ? latitude.toFixed(5) : 'Unknown'}, Lng:{' '}
              {longitude ? longitude.toFixed(5) : 'Unknown'}
            </Text>
          )}
        </View>

        {/* Loading Banner */}
        {(loading || loadingMsg) && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.loadingBannerText}>{loadingMsg || 'Processing...'}</Text>
          </View>
        )}

        {/* Low-Confidence Confirmation Card */}
        {pendingClassification && (
          <View style={styles.confirmCard}>
            <View style={styles.confirmHeader}>
              <Ionicons name="alert-circle" size={22} color="#f97316" />
              <Text style={styles.confirmTitle}>Possible Emergency Services</Text>
            </View>
            <Text style={styles.confirmSubtitle}>
              AI confidence is low. Please confirm which services you need:
            </Text>
            {(pendingClassification.data.specific_facilities || []).map((svc) => (
              <TouchableOpacity
                key={svc}
                style={styles.confirmServiceBtn}
                onPress={() => confirmServices([svc])}
              >
                <Ionicons
                  name={SERVICE_ICON[svc] || 'help-circle'}
                  size={18}
                  color="#ef4444"
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.confirmServiceText}>{SERVICE_LABEL[svc] || svc}</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ))}
            {(pendingClassification.data.specific_facilities || []).length > 1 && (
              <TouchableOpacity
                style={[styles.confirmServiceBtn, { backgroundColor: '#fef2f2' }]}
                onPress={() => confirmServices(pendingClassification.data.specific_facilities)}
              >
                <Ionicons name="git-merge" size={18} color="#ef4444" style={{ marginRight: 10 }} />
                <Text style={[styles.confirmServiceText, { color: '#ef4444', fontWeight: '700' }]}>
                  All of the above
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={dismissConfirmation} style={styles.confirmDismiss}>
              <Text style={styles.confirmDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Voice / Text Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.voiceBtn, isRecording && { backgroundColor: '#7f1d1d' }]}
            onPress={handleRecordSOS}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name={isRecording ? 'square' : 'mic'} size={24} color="#fff" />
            )}
            <Text style={[styles.actionText, { color: '#fff' }]}>
              {isRecording ? 'STOP' : 'VOICE'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.textBtn, isTextInputMode && { backgroundColor: '#f1f5f9' }]}
            onPress={() => setIsTextInputMode(!isTextInputMode)}
          >
            <Ionicons name="chatbubble" size={24} color="#0f172a" />
            <Text style={styles.actionText}>{isTextInputMode ? 'CANCEL' : 'TEXT'}</Text>
          </TouchableOpacity>
        </View>

        {/* Translation / Text Input Box */}
        <View style={styles.translationBox}>
          {isTextInputMode ? (
            <View style={{ width: '100%' }}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your emergency here..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={manualText}
                onChangeText={setManualText}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={handleManualSubmit}>
                <Text style={styles.submitBtnText}>CLASSIFY TEXT</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.translationLabel}>Translation of voice</Text>
              <Text style={styles.translationValue}>{translation || '...'}</Text>
            </>
          )}
        </View>

        {/* Emergency Services Grid */}
        <Text style={styles.sectionTitle}>Emergency Services</Text>
        <View style={styles.servicesGrid}>
          {SERVICES.map((srv) => (
            <TouchableOpacity
              key={srv.id}
              style={styles.serviceCard}
              onPress={() => handleServiceTap(srv.id)}
            >
              <View style={[styles.iconWrap, { backgroundColor: srv.color + '15' }]}>
                <Ionicons name={srv.icon} size={28} color={srv.color} />
              </View>
              <Text style={styles.serviceName}>{srv.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Map Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity style={styles.mapBtn} onPress={async () => {
             if (preloadPromiseRef.current) {
                setContextLoadingMsg('Waiting for preloaded data...');
                await preloadPromiseRef.current;
                setContextLoadingMsg(null);
             }
             onNavigateToMap();
          }}>
            <Text style={styles.mapBtnText}>Go to Map View</Text>
            <Ionicons name="map" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  coordStrip: {
    backgroundColor: '#e2e8f0', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  coordText: { fontSize: 14, fontWeight: '600', color: '#475569', letterSpacing: 0.5 },

  loadingBanner: {
    backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
  },
  loadingBannerText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },

  confirmCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 2, borderColor: '#f97316',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  confirmHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  confirmSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  confirmServiceBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  confirmServiceText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1e293b' },
  confirmDismiss: { alignItems: 'center', marginTop: 4 },
  confirmDismissText: { color: '#94a3b8', fontSize: 13 },

  actionRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  actionBtn: {
    flex: 1, backgroundColor: '#cbd5e1', borderRadius: 16,
    paddingVertical: 24, alignItems: 'center', justifyContent: 'center',
  },
  voiceBtn: { backgroundColor: '#ef4444' },
  textBtn: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#ef4444' },
  actionText: { marginTop: 8, fontSize: 16, fontWeight: '700', color: '#0f172a' },

  translationBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24, minHeight: 100,
    borderWidth: 2, borderColor: '#ef4444',
  },
  translationLabel: { fontSize: 14, color: '#475569', marginBottom: 6 },
  translationValue: { fontSize: 18, fontWeight: '600', color: '#0f172a', textAlign: 'center' },
  textInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#0f172a', minHeight: 80,
    textAlignVertical: 'top', marginBottom: 12, width: '100%',
  },
  submitBtn: { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  serviceCard: {
    width: '31%', backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, marginBottom: 12,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  serviceName: { fontSize: 11, fontWeight: '700', color: '#1e293b', textAlign: 'center' },

  footerContainer: { marginTop: 20 },
  mapBtn: {
    backgroundColor: '#ef4444', borderRadius: 100, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  mapBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
