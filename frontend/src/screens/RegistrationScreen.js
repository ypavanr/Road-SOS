import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegistrationScreen({ onRegister }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const handleRegister = async () => {
    if (!name || !phone || !emergencyContactName || !emergencyContactPhone) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const userData = {
      name,
      phone,
      emergencyContacts: [
        { name: emergencyContactName, phone: emergencyContactPhone }
      ]
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

        <Text style={styles.sectionTitle}>Emergency Contact</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contact Name</Text>
          <TextInput style={styles.input} value={emergencyContactName} onChangeText={setEmergencyContactName} placeholder="Jane Doe" />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contact Phone Number</Text>
          <TextInput style={styles.input} value={emergencyContactPhone} onChangeText={setEmergencyContactPhone} placeholder="+1 987 654 3210" keyboardType="phone-pad" />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register & Save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, flex: 1, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 16, marginBottom: 16 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 14, fontSize: 16 },
  button: { backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
