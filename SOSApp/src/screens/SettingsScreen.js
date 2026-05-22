import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Platform, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TELEGRAM_CONFIG, SMS_NUMBERS, USER_INFO } from '../config/config';

export default function SettingsScreen() {
  const [botToken,  setBotToken]  = useState(TELEGRAM_CONFIG.BOT_TOKEN);
  const [chatIds,   setChatIds]   = useState(TELEGRAM_CONFIG.AUTHORITY_CHAT_IDS.join('\n'));
  const [smsNums,   setSmsNums]   = useState(SMS_NUMBERS.join('\n'));
  const [name,      setName]      = useState(USER_INFO.name);
  const [phone,     setPhone]     = useState(USER_INFO.phone);
  const [medical,   setMedical]   = useState(USER_INFO.medicalNotes);
  const [address,   setAddress]   = useState(USER_INFO.address);

  const showSaveNote = () => Alert.alert(
    'How to persist changes',
    'Copy these values into src/config/config.js and rebuild the app. Edits here are preview only.',
    [{ text: 'Got it' }]
  );

  const Field = ({ label, value, onChange, multi }) => (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multi && { height: 80, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange}
        multiline={multi} autoCorrect={false} autoCapitalize="none"
        placeholderTextColor="#333"
      />
    </View>
  );

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <LinearGradient colors={['#080808', '#0A001A', '#080808']} style={StyleSheet.absoluteFill} />

      <Text style={s.heading}>CONFIGURATION</Text>
      <Text style={s.sub}>Edit src/config/config.js to persist changes after rebuild</Text>

      {/* Telegram */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          <Ionicons name="paper-plane-outline" size={13} color="#818CF8" />{'  '}TELEGRAM BOT
        </Text>
        <Field label="Bot Token" value={botToken} onChange={setBotToken} />
        <Field
          label="Authority Chat IDs (one per line)"
          value={chatIds} onChange={setChatIds} multi
        />
        <Text style={s.hint}>
          Message @userinfobot on Telegram to find a Chat ID. For groups use the group's negative ID.
        </Text>
      </View>

      {/* SMS */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          <Ionicons name="chatbox-outline" size={13} color="#34D399" />{'  '}SMS RECIPIENTS
        </Text>
        <Field
          label="Phone numbers to SMS (one per line, international format)"
          value={smsNums} onChange={setSmsNums} multi
        />
        <Text style={s.hint}>
          Example: +919876543210{'\n'}
          These numbers receive an SMS with GPS coordinates and a Google Maps link.
        </Text>
      </View>

      {/* User info */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          <Ionicons name="person-outline" size={13} color="#F87171" />{'  '}PERSON INFO (sent in every alert)
        </Text>
        <Field label="Full Name"        value={name}    onChange={setName} />
        <Field label="Phone Number"     value={phone}   onChange={setPhone} />
        <Field label="Medical Notes"    value={medical} onChange={setMedical} multi />
        <Field label="Home / Permanent Address" value={address} onChange={setAddress} multi />
      </View>

      {/* Setup guide */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          <Ionicons name="help-circle-outline" size={13} color="#FBBF24" />{'  '}QUICK SETUP GUIDE
        </Text>
        {[
          ['1', 'Telegram bot: message @BotFather → /newbot → copy token above'],
          ['2', 'Chat IDs: each authority messages @userinfobot → copy their ID'],
          ['3', 'SMS: add phone numbers in international format (+91...)'],
          ['4', 'Fill in the person info (name, phone, address)'],
          ['5', 'Copy all values into src/config/config.js'],
          ['6', 'Run: npx expo start  (or build APK/IPA via EAS)'],
          ['7', 'Test by pressing SOS — a countdown gives you 5s to cancel'],
        ].map(([n, t]) => (
          <View style={s.step} key={n}>
            <View style={s.stepBadge}><Text style={s.stepNum}>{n}</Text></View>
            <Text style={s.stepText}>{t}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={showSaveNote}>
        <Text style={s.saveBtnText}>How to Save Changes →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080808' },
  content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 64 : 48, paddingBottom: 40 },

  heading: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 4, marginBottom: 4 },
  sub:     { color: '#444', fontSize: 12, marginBottom: 26, letterSpacing: 0.5 },

  section: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    borderRadius: 14, padding: 16, marginBottom: 18,
  },
  sectionTitle: { color: '#666', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginBottom: 14 },

  label: { color: '#555', fontSize: 11, letterSpacing: 0.8, marginBottom: 5, marginTop: 10 },
  input: {
    backgroundColor: '#101010', borderColor: '#222', borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9,
    color: '#EEE', fontSize: 13,
  },
  hint: { color: '#3A3A3A', fontSize: 11, marginTop: 8, lineHeight: 17 },

  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stepBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderColor: '#FBBF24', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, marginTop: 1,
  },
  stepNum:  { color: '#FBBF24', fontSize: 11, fontWeight: '800' },
  stepText: { color: '#666', fontSize: 13, flex: 1, lineHeight: 20 },

  saveBtn: {
    borderColor: '#818CF8', borderWidth: 1, borderRadius: 24,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { color: '#818CF8', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
});
