import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegistrationScreen({ onRegister }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contacts, setContacts] = useState([{ name: '', phone: '' }]);
  const [currentLocation, setCurrentLocation] = useState({ latitude: null, longitude: null, address: 'Fetching location...' });
  const [homeLocation, setHomeLocation] = useState('');
  const [workLocation, setWorkLocation] = useState('');

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (Platform.OS === 'android') {
      // For Android, you might need to request permissions
      // This is a simplified version - in production, you'd use react-native-permissions
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({
          latitude,
          longitude,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        setCurrentLocation({
          latitude: null,
          longitude: null,
          address: 'Unable to fetch location'
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleRegister = async () => {
    // Validate basics
    if (!name || !phone) {
      Alert.alert('Error', 'Please fill in your name and phone');
      return;
    }

    // Filter out empty contacts
    const validContacts = contacts.filter(c => c.name.trim() !== '' && c.phone.trim() !== '');
    if (validContacts.length === 0) {
      Alert.alert('Error', 'Please add at least one valid emergency contact');
      return;
    }

    const userData = {
      name,
      phone,
      emergencyContacts: validContacts,
      currentLocation,
      homeLocation,
      workLocation
    };

    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      onRegister(userData);
    } catch (e) {
      Alert.alert('Error', 'Failed to save data');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
        <Text style={styles.title}>Welcome to Road-SOS</Text>
        <Text style={styles.subtitle}>Please register to continue</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="John Doe" />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Your Phone Number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1 234 567 8900" keyboardType="phone-pad" />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Current Location</Text>
          <View style={[styles.input, { backgroundColor: '#f1f5f9' }]}>
            <Text style={styles.locationText}>{currentLocation.address}</Text>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Home Location</Text>
          <TextInput style={styles.input} value={homeLocation} onChangeText={setHomeLocation} placeholder="Enter your home address" />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Work Location</Text>
          <TextInput style={styles.input} value={workLocation} onChangeText={setWorkLocation} placeholder="Enter your work address" />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>Emergency Contacts</Text>
          <TouchableOpacity onPress={() => setContacts([...contacts, { name: '', phone: '' }])}>
            <Text style={{ color: '#2563eb', fontWeight: '700' }}>+ Add More</Text>
          </TouchableOpacity>
        </View>

        {contacts.map((contact, index) => (
          <View key={index} style={{ marginBottom: 16, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.label}>Contact {index + 1}</Text>
              {contacts.length > 1 && (
                <TouchableOpacity onPress={() => setContacts(contacts.filter((_, i) => i !== index))}>
                  <Text style={{ color: '#ef4444', fontWeight: '600' }}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput 
              style={[styles.input, { marginBottom: 8 }]} 
              value={contact.name} 
              onChangeText={(text) => {
                const newC = [...contacts];
                newC[index].name = text;
                setContacts(newC);
              }} 
              placeholder="Jane Doe" 
            />
            <TextInput 
              style={styles.input} 
              value={contact.phone} 
              onChangeText={(text) => {
                const newC = [...contacts];
                newC[index].phone = text;
                setContacts(newC);
              }} 
              placeholder="+1 987 654 3210" 
              keyboardType="phone-pad" 
            />
          </View>
        ))}

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register & Save</Text>
        </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 16, marginBottom: 16 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 14, fontSize: 16 },
  locationText: { fontSize: 16, color: '#64748b' },
  button: { backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
