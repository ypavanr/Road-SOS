import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SOSScreen from './src/screens/SOSScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Duplicate imports removed
// Removed orphaned DashboardScreen code

import RegistrationScreen from './src/screens/RegistrationScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Loading');
  const [userData, setUserData] = useState(null);
  const [facilities, setFacilities] = useState([]);

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
        <HomeScreen 
          onNavigateToMap={() => setCurrentScreen('Map')} 
          setFacilities={setFacilities}
          userData={userData}
        />
      )}
      {currentScreen === 'Map' && (
        <MapScreen 
          onBack={() => setCurrentScreen('Home')} 
          facilities={facilities}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
});
