import * as SMS from 'expo-sms';
import { API_GATEWAY_URL } from '../../config';

const buildSMSBody = ({ latitude, longitude, accuracy, timestamp }, userInfo) => {
  const time = new Date(timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const mapsLink = `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

  return (
    `🚨 SOS EMERGENCY ALERT 🚨\n` +
    `Person: ${userInfo.name || 'Unknown'}\n` +
    `Phone: ${userInfo.phone || 'Unknown'}\n\n` +
    `📍 Location (±${Math.round(accuracy)}m):\n` +
    `${mapsLink}\n\n` +
    `🕐 Time: ${time} IST\n\n` +
    `PLEASE RESPOND IMMEDIATELY.`
  );
};

export const sendSOSViaSMS = async (locationData, userData) => {
  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('SMS is not available on this device.');
  }

  if (!userData || !userData.emergencyContacts || userData.emergencyContacts.length === 0) {
    throw new Error('No emergency contacts found in user registration data.');
  }

  const validNumbers = userData.emergencyContacts
    .map(c => c.phone)
    .filter(n => n && n.trim() !== '');

  if (validNumbers.length === 0) {
    throw new Error('No valid SMS numbers provided in registration data.');
  }

  const body = buildSMSBody(locationData, userData);

  const { result } = await SMS.sendSMSAsync(validNumbers, body);
  return { result };
};
