import * as SMS from 'expo-sms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_GATEWAY_URL } from '../../config';

const buildSMSBody = ({ latitude, longitude, accuracy, timestamp }, userInfo) => {
  const time = new Date(timestamp || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const mapsLink = `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

  return (
    `🚨 SOS EMERGENCY ALERT 🚨\n` +
    `Person: ${userInfo.name || 'Unknown'}\n` +
    `Phone: ${userInfo.phone || 'Unknown'}\n\n` +
    `📍 Location (±${Math.round(accuracy || 0)}m):\n` +
    `${mapsLink}\n\n` +
    `🕐 Time: ${time} IST\n\n` +
    `PLEASE RESPOND IMMEDIATELY.`
  );
};

export const sendSOSViaSMS = async (locationData, userData, additionalNumbers = [], userRole = 'victim') => {
  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('SMS is not available on this device.');
  }

  let activeUserData = userData;
  if (!activeUserData) {
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        activeUserData = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load userData in smsService:", e);
    }
  }

  let validNumbers = [];

  // Role-Based SMS Routing: If Bystander -> do NOT send to emergency contacts
  if (userRole !== 'bystander') {
    if (activeUserData && activeUserData.emergencyContacts) {
      validNumbers = activeUserData.emergencyContacts
        .map(c => c.phone)
        .filter(n => n && n.trim() !== '');
    }
  }

  if (additionalNumbers && additionalNumbers.length > 0) {
    validNumbers = [...validNumbers, ...additionalNumbers];
  }

  // Deduplicate and filter empty numbers
  validNumbers = [...new Set(validNumbers.map(n => n.trim()))].filter(n => n !== '');

  if (validNumbers.length === 0) {
    throw new Error('No valid SMS numbers provided for the emergency alert.');
  }

  const body = buildSMSBody(locationData, activeUserData || {});

  const { result } = await SMS.sendSMSAsync(validNumbers, body);
  return { result };
};

