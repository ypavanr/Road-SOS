import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Dimensions, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { API_GATEWAY_URL } from '../../config';
import { startRecording, stopRecording, uploadAudio } from '../services/audioService';
import { sendSOSViaSMS } from '../services/smsService';

const { width } = Dimensions.get('window');

const SERVICES = [
  { id: 'ambulance', name: 'Ambulance', icon: 'medical', color: '#ef4444' },
  { id: 'police', name: 'Police', icon: 'shield-checkmark', color: '#3b82f6' },
  { id: 'fire', name: 'Fire Station', icon: 'flame', color: '#f97316' },
  { id: 'hospital', name: 'Hospitals', icon: 'business', color: '#ec4899' },
  { id: 'trauma', name: 'Trauma Center', icon: 'heart-half', color: '#8b5cf6' },
  { id: 'gas', name: 'Gas Station', icon: 'water', color: '#eab308' },
  { id: 'towing', name: 'Towing Service', icon: 'car', color: '#6366f1' },
  { id: 'puncture', name: 'Puncture Shop', icon: 'hammer', color: '#14b8a6' },
];

export default function HomeScreen({ onNavigateToMap, setFacilities, userData }) {
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [translation, setTranslation] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  // Text input state
  const [isTextInputMode, setIsTextInputMode] = useState(false);
  const [manualText, setManualText] = useState('');

  const findNearby = async (lat, lon, classification) => {
    try {
      const bodyObj = { lat, lon, radius_m: 10000 };
      if (classification?.patient_gender) {
        bodyObj.patient_gender = classification.patient_gender;
      }
      const body = JSON.stringify(bodyObj);
      const headers = { 'Content-Type': 'application/json' };

      const [medicalRes, roadsideRes] = await Promise.allSettled([
        fetch(`${API_GATEWAY_URL}/nearby/medical`, { method: 'POST', headers, body }),
        fetch(`${API_GATEWAY_URL}/nearby/roadside`, { method: 'POST', headers, body })
      ]);

      let allFacilities = [];
      if (medicalRes.status === 'fulfilled' && medicalRes.value.ok) {
        const d = await medicalRes.value.json();
        allFacilities = allFacilities.concat(d.facilities || []);
      }
      if (roadsideRes.status === 'fulfilled' && roadsideRes.value.ok) {
        const d = await roadsideRes.value.json();
        allFacilities = allFacilities.concat(d.facilities || []);
      }
      
      setFacilities(allFacilities);
    } catch (e) {
      console.error("Failed to fetch nearby", e);
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setLocationLoading(false);
      
      // Initial fetch without AI classification filters
      if (loc && loc.coords) {
        findNearby(loc.coords.latitude, loc.coords.longitude);
      }
    })();
  }, []);

  const { latitude, longitude } = location?.coords || {};


  const handleClassify = async (textToClassify, lat, lon) => {
    if (!textToClassify) return;
    try {
      const response = await fetch(`${API_GATEWAY_URL}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToClassify }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.is_emergency) {
          findNearby(lat, lon, data);
          
          if (data.user_role === 'victim') {
            if (location && location.coords && userData) {
              sendSOSViaSMS({
                latitude: lat,
                longitude: lon,
                accuracy: location.coords.accuracy,
                timestamp: location.coords.timestamp
              }, userData).catch(err => console.error("Auto SMS failed:", err));
            }
          }
        }
      }
    } catch (e) {
      console.error("Classification failed:", e);
    }
  };

  const handleManualSubmit = () => {
    if (!manualText.trim()) return;
    setTranslation(manualText);
    setIsTextInputMode(false); // Switch back to read-only view
    if (latitude && longitude) {
      handleClassify(manualText, latitude, longitude);
    }
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
          setTranslation(result.text);
          if (latitude && longitude) {
            handleClassify(result.text, latitude, longitude);
          }
        } else {
          setTranslation('Transcription failed.');
        }
      }
    } else {
      setTranslation('Recording...');
      const started = await startRecording();
      if (started) {
        setIsRecording(true);
      } else {
        setTranslation('Microphone permission denied.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Coordinates Strip */}
        <View style={styles.coordStrip}>
          <Ionicons name="location" size={16} color="#475569" style={{ marginRight: 6 }} />
          {locationLoading ? (
            <ActivityIndicator size="small" color="#475569" />
          ) : (
            <Text style={styles.coordText}>
              Lat: {latitude ? latitude.toFixed(5) : 'Unknown'}, Lng: {longitude ? longitude.toFixed(5) : 'Unknown'}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.voiceBtn, isRecording && { backgroundColor: '#7f1d1d' }]} 
            onPress={handleRecordSOS}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name={isRecording ? "square" : "mic"} size={24} color="#fff" />}
            <Text style={[styles.actionText, { color: '#fff' }]}>{isRecording ? "STOP" : "VOICE"}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.textBtn, isTextInputMode && { backgroundColor: '#f1f5f9' }]} 
            onPress={() => setIsTextInputMode(!isTextInputMode)}
          >
            <Ionicons name="chatbubble" size={24} color="#0f172a" />
            <Text style={styles.actionText}>{isTextInputMode ? "CANCEL" : "TEXT"}</Text>
          </TouchableOpacity>
        </View>

        {/* Translation Box / Text Input */}
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
              <Text style={styles.translationValue}>{translation || '...' }</Text>
            </>
          )}
        </View>

        {/* Services Grid */}
        <Text style={styles.sectionTitle}>Emergency Services</Text>
        <View style={styles.servicesGrid}>
          {SERVICES.map((srv) => (
            <TouchableOpacity key={srv.id} style={styles.serviceCard}>
              <View style={[styles.iconWrap, { backgroundColor: srv.color + '15' }]}>
                <Ionicons name={srv.icon} size={28} color={srv.color} />
              </View>
              <Text style={styles.serviceName}>{srv.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Map Button at bottom of scroll */}
        <View style={styles.footerContainer}>
          <TouchableOpacity style={styles.mapBtn} onPress={onNavigateToMap}>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  coordText: { fontSize: 16, fontWeight: '600', color: '#475569', letterSpacing: 0.5 },
  actionRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  actionBtn: {
    flex: 1, backgroundColor: '#cbd5e1', borderRadius: 16,
    paddingVertical: 24, alignItems: 'center', justifyContent: 'center',
  },
  voiceBtn: {
    backgroundColor: '#ef4444', // Red color for voice
  },
  textBtn: {
    backgroundColor: '#fff', 
    borderWidth: 2, 
    borderColor: '#ef4444', // Red border for text box
  },
  actionText: { marginTop: 8, fontSize: 16, fontWeight: '700', color: '#0f172a' },
  translationBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 32, minHeight: 120,
    borderWidth: 2, borderColor: '#ef4444', // Also red border here just in case this is what they meant
  },
  translationLabel: { fontSize: 16, color: '#475569', marginBottom: 8 },
  translationValue: { fontSize: 20, fontWeight: '600', color: '#0f172a', textAlign: 'center' },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    width: '100%',
  },
  submitBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  servicesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
  },
  serviceCard: {
    width: '31%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, marginBottom: 12,
  },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  serviceName: { fontSize: 12, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  footerContainer: {
    marginTop: 24,
  },
  mapBtn: {
    backgroundColor: '#ef4444', borderRadius: 100, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  mapBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
