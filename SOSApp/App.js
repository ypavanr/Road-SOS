import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SOSScreen from './src/screens/SOSScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export default function App() {
  const [tab, setTab] = useState('SOS');

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      <View style={s.screen}>
        {tab === 'SOS' ? <SOSScreen /> : <SettingsScreen />}
      </View>

      {/* Custom tab bar — no navigation library needed */}
      <View style={s.tabBar}>
        <TouchableOpacity style={s.tab} onPress={() => setTab('SOS')}>
          <Ionicons name="warning" size={22} color={tab === 'SOS' ? '#EF4444' : '#444'} />
          <Text style={[s.tabLabel, tab === 'SOS' && s.tabActive]}>SOS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tab} onPress={() => setTab('Settings')}>
          <Ionicons name="settings-outline" size={22} color={tab === 'Settings' ? '#EF4444' : '#444'} />
          <Text style={[s.tabLabel, tab === 'Settings' && s.tabActive]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#080808' },
  screen:   { flex: 1 },
  tabBar:   {
    flexDirection: 'row',
    backgroundColor: '#0E0E0E',
    borderTopColor: '#1A1A1A', borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8, height: Platform.OS === 'ios' ? 80 : 60,
  },
  tab:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  tabActive:{ color: '#EF4444' },
});
