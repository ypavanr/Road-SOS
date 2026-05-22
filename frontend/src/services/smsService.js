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
    `Person: ${userInfo.name}\n` +
    `Phone: ${userInfo.phone}\n` +
    `Medical: ${userInfo.medicalNotes}\n` +
    `Address: ${userInfo.address}\n\n` +
    `📍 Location (±${Math.round(accuracy)}m):\n` +
    `${mapsLink}\n\n` +
    `🕐 Time: ${time} IST\n\n` +
    `PLEASE RESPOND IMMEDIATELY.`
  );
};

export const sendSOSViaSMS = async (locationData) => {
  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('SMS is not available on this device.');
  }

  let configData;
  try {
    const res = await fetch(`${API_GATEWAY_URL}/sos/config`);
    configData = await res.json();
  } catch (err) {
    throw new Error('Failed to fetch SMS config from backend.');
  }

  const { user_info, sms_numbers } = configData;

  const validNumbers = sms_numbers.filter(
    (n) => n && !n.startsWith('+91XXXXXXXXXX')
  );

  if (validNumbers.length === 0) {
    throw new Error('No SMS numbers configured in backend.');
  }

  const body = buildSMSBody(locationData, user_info);

  const { result } = await SMS.sendSMSAsync(validNumbers, body);
  return { result };
};
