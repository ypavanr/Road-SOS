import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// ── Small reusable components ────────────────────────────────────────────────

const SectionHeader = ({ icon, title, color = '#EF4444' }) => (
  <View style={sh.row}>
    <Text style={sh.icon}>{icon}</Text>
    <Text style={[sh.title, { color }]}>{title}</Text>
  </View>
);
const sh = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 24 },
  icon:  { fontSize: 16, marginRight: 8 },
  title: { fontSize: 13, fontWeight: '800', letterSpacing: 3 },
});

const Field = ({ label, value, onChange, placeholder, keyboardType, editable = true, rightSlot }) => (
  <View style={f.wrap}>
    <Text style={f.label}>{label}</Text>
    <View style={[f.inputRow, !editable && f.disabled]}>
      <TextInput
        style={f.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        editable={editable}
        autoCorrect={false}
      />
      {rightSlot}
    </View>
  </View>
);
const f = StyleSheet.create({
  wrap:     { marginBottom: 14 },
  label:    { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 1.5, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 14,
  },
  input:    { flex: 1, fontSize: 15, color: '#0F172A', paddingVertical: 13 },
  disabled: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
});

// ── Location card (auto-filled or manual) ───────────────────────────────────

const LocationCard = ({ icon, title, subtitle, coords, loading, onRefresh, manualAddress, onChangeManual, isAuto }) => (
  <View style={lc.card}>
    <View style={lc.header}>
      <View style={lc.titleRow}>
        <Text style={lc.icon}>{icon}</Text>
        <View>
          <Text style={lc.title}>{title}</Text>
          <Text style={lc.subtitle}>{subtitle}</Text>
        </View>
      </View>
      {isAuto && (
        <TouchableOpacity onPress={onRefresh} style={lc.refreshBtn} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#EF4444" />
            : <Text style={lc.refreshText}>↺ Refresh</Text>}
        </TouchableOpacity>
      )}
    </View>

    {isAuto ? (
      coords
        ? (
          <View style={lc.coordsBox}>
            <View style={lc.coordRow}>
              <Text style={lc.coordLabel}>LATITUDE</Text>
              <Text style={lc.coordValue}>{coords.latitude.toFixed(6)}</Text>
            </View>
            <View style={lc.divider} />
            <View style={lc.coordRow}>
              <Text style={lc.coordLabel}>LONGITUDE</Text>
              <Text style={lc.coordValue}>{coords.longitude.toFixed(6)}</Text>
            </View>
            <View style={lc.divider} />
            <View style={lc.coordRow}>
              <Text style={lc.coordLabel}>ACCURACY</Text>
              <Text style={lc.coordValue}>±{Math.round(coords.accuracy)}m</Text>
            </View>
          </View>
        )
        : (
          <View style={lc.emptyBox}>
            <Text style={lc.emptyText}>
              {loading ? 'Fetching your location…' : 'Tap Refresh to get location'}
            </Text>
          </View>
        )
    ) : (
      <TextInput
        style={lc.manualInput}
        value={manualAddress}
        onChangeText={onChangeManual}
        placeholder="Enter full address…"
        placeholderTextColor="#94A3B8"
        multiline
        numberOfLines={2}
        autoCorrect={false}
      />
    )}
  </View>
);

const lc = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon:        { fontSize: 26 },
  title:       { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  subtitle:    { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  refreshBtn:  {
    backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  refreshText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
  coordsBox:   {
    backgroundColor: '#F8FAFC', borderRadius: 10,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  coordRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  coordLabel:  { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5 },
  coordValue:  { fontSize: 13, fontWeight: '700', color: '#0F172A', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  divider:     { height: 1, backgroundColor: '#E2E8F0' },
  emptyBox:    { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 16, alignItems: 'center' },
  emptyText:   { color: '#94A3B8', fontSize: 13 },
  manualInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A', minHeight: 60, textAlignVertical: 'top',
  },
});

// ── Main Registration Screen ────────────────────────────────────────────────

export default function RegistrationScreen({ onRegister }) {
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [contacts, setContacts] = useState([{ name: '', phone: '' }]);

  // Location states
  const [currentCoords,  setCurrentCoords]  = useState(null);
  const [currentLoading, setCurrentLoading] = useState(false);
  const [homeAddress,    setHomeAddress]    = useState('');
  const [workAddress,    setWorkAddress]    = useState('');

  // Auto-fetch current location on mount
  useEffect(() => { fetchCurrentLocation(); }, []);

  const fetchCurrentLocation = async () => {
    setCurrentLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to prefill your current location.');
        setCurrentLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCurrentCoords({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy:  loc.coords.accuracy,
      });
    } catch (e) {
      Alert.alert('Location Error', 'Could not fetch location. Please try again.');
    } finally {
      setCurrentLoading(false);
    }
  };

  const addContact    = () => setContacts([...contacts, { name: '', phone: '' }]);
  const removeContact = (i) => setContacts(contacts.filter((_, idx) => idx !== i));
  const updateContact = (i, field, val) => {
    const updated = [...contacts];
    updated[i][field] = val;
    setContacts(updated);
  };

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Missing Info', 'Please enter your name and phone number.');
      return;
    }
    const validContacts = contacts.filter(c => c.name.trim() && c.phone.trim());
    if (validContacts.length === 0) {
      Alert.alert('Missing Info', 'Please add at least one emergency contact.');
      return;
    }
    if (!homeAddress.trim()) {
      Alert.alert('Missing Info', 'Please enter your home address.');
      return;
    }

    const userData = {
      name:              name.trim(),
      phone:             phone.trim(),
      emergencyContacts: validContacts,
      locations: {
        current:  currentCoords || null,
        home:     homeAddress.trim(),
        work:     workAddress.trim() || null,
      },
    };

    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      onRegister(userData);
    } catch {
      Alert.alert('Error', 'Failed to save your data. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* ── Header ── */}
      <View style={s.headerBlock}>
        <View style={s.badge}><Text style={s.badgeText}>ROAD SOS</Text></View>
        <Text style={s.title}>Create your{'\n'}safety profile</Text>
        <Text style={s.subtitle}>This information is sent to emergency contacts when you trigger an SOS</Text>
      </View>

      {/* ── Personal Info ── */}
      <SectionHeader icon="👤" title="PERSONAL INFO" color="#EF4444" />

      <Field
        label="FULL NAME"
        value={name}
        onChange={setName}
        placeholder="e.g. Priya Sharma"
      />
      <Field
        label="YOUR PHONE NUMBER"
        value={phone}
        onChange={setPhone}
        placeholder="+91 98765 43210"
        keyboardType="phone-pad"
      />

      {/* ── Emergency Contacts ── */}
      <View style={s.sectionHeaderRow}>
        <SectionHeader icon="🆘" title="EMERGENCY CONTACTS" color="#F97316" />
        <TouchableOpacity onPress={addContact} style={s.addBtn}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {contacts.map((contact, i) => (
        <View key={i} style={s.contactCard}>
          <View style={s.contactCardHeader}>
            <Text style={s.contactNum}>Contact {i + 1}</Text>
            {contacts.length > 1 && (
              <TouchableOpacity onPress={() => removeContact(i)}>
                <Text style={s.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <Field
            label="NAME"
            value={contact.name}
            onChange={(v) => updateContact(i, 'name', v)}
            placeholder="Jane Doe"
          />
          <Field
            label="PHONE"
            value={contact.phone}
            onChange={(v) => updateContact(i, 'phone', v)}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
          />
        </View>
      ))}

      {/* ── Locations ── */}
      <SectionHeader icon="📍" title="LOCATIONS" color="#10B981" />

      {/* Current location — auto filled */}
      <LocationCard
        icon="🔵"
        title="Current Location"
        subtitle="Auto-detected · updates on refresh"
        coords={currentCoords}
        loading={currentLoading}
        onRefresh={fetchCurrentLocation}
        isAuto
      />

      {/* Home — manual */}
      <LocationCard
        icon="🏠"
        title="Home Address"
        subtitle="Your permanent home address"
        manualAddress={homeAddress}
        onChangeManual={setHomeAddress}
        isAuto={false}
      />

      {/* Work — manual, optional */}
      <LocationCard
        icon="🏢"
        title="Work Address"
        subtitle="Optional — your workplace address"
        manualAddress={workAddress}
        onChangeManual={setWorkAddress}
        isAuto={false}
      />

      {/* ── Submit ── */}
      <TouchableOpacity style={s.submitBtn} onPress={handleRegister} activeOpacity={0.85}>
        <Text style={s.submitText}>Save & Continue →</Text>
      </TouchableOpacity>

      <Text style={s.disclaimer}>
        Your data is stored only on this device and sent only when you trigger an SOS.
      </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 48 },

  headerBlock: { marginBottom: 8 },
  badge:       {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 14,
  },
  badgeText: { color: '#EF4444', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title:     { fontSize: 30, fontWeight: '900', color: '#0F172A', lineHeight: 36, marginBottom: 10 },
  subtitle:  { fontSize: 14, color: '#64748B', lineHeight: 21 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn:           {
    backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 4,
  },
  addBtnText: { color: '#2563EB', fontSize: 12, fontWeight: '700' },

  contactCard: {
    backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  contactCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  contactNum:        { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5 },
  removeText:        { color: '#EF4444', fontSize: 12, fontWeight: '700' },

  submitBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 28,
    shadowColor: '#EF4444', shadowRadius: 12, shadowOpacity: 0.35, elevation: 6,
  },
  submitText:  { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  disclaimer:  { color: '#CBD5E1', fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 17 },
});