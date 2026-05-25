import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../core/i18n/hooks/useLanguage';

export default function SettingsScreen() {
  const { t } = useLanguage();
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />
      <LinearGradient colors={['#080808', '#0A001A', '#080808']} style={StyleSheet.absoluteFill} />
      <View style={s.content}>
        <Text style={s.heading}>CONFIGURATION</Text>
        <Text style={s.text}>
          Configuration for SMS numbers, Telegram bot tokens, and user details has been moved to the backend.
        </Text>
        <Text style={s.text}>
          Please edit `backend/services/sos-service/.env` to configure your settings and restart the backend services.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080808' },
  content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 64 : 48, paddingBottom: 40, flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 4, marginBottom: 20 },
  text: { color: '#AAA', fontSize: 14, textAlign: 'center', marginBottom: 15, lineHeight: 22 },
});
