import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RegistrationScreen from './src/screens/RegistrationScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import SOSScreen from './src/screens/SOSScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { EmergencyProvider } from './src/context/EmergencyContext';
import ConnectivityMonitor from './src/services/connectivityMonitor';
import { initI18n } from './src/core/i18n';
import { useLanguageStore } from './src/store/languageStore';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Loading');
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await initI18n();
        const initLang = useLanguageStore.getState().initLanguage;
        await initLang();
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
    <SafeAreaProvider>
      <EmergencyProvider>
        <ConnectivityMonitor />
        <View style={styles.root}>
          <StatusBar style="dark" />
          {currentScreen === 'Registration' && (
            <RegistrationScreen onRegister={handleRegister} />
          )}
          {currentScreen === 'Home' && (
            <HomeScreen
              onNavigateToMap={() => setCurrentScreen('Map')}
              userData={userData}
            />
          )}
          {currentScreen === 'Map' && (
            <MapScreen onBack={() => setCurrentScreen('Home')} />
          )}
          {currentScreen === 'SOS' && (
            <SOSScreen onBack={() => setCurrentScreen('Home')} />
          )}
          {currentScreen === 'Settings' && (
            <SettingsScreen onBack={() => setCurrentScreen('Home')} />
          )}
        </View>
      </EmergencyProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});
