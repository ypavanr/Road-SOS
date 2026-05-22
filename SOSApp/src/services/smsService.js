import * as SMS from 'expo-sms';
import { SMS_NUMBERS, USER_INFO } from '../config/config';

/**
 * Builds the SMS body — kept under ~320 chars so it fits in 2 GSM messages.
 */
const buildSMSBody = ({ latitude, longitude, accuracy, timestamp }) => {
  const time = new Date(timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const mapsLink = `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

  return (
    `🚨 SOS EMERGENCY ALERT 🚨\n` +
    `Person: ${USER_INFO.name}\n` +
    `Phone: ${USER_INFO.phone}\n` +
    `Medical: ${USER_INFO.medicalNotes}\n` +
    `Address: ${USER_INFO.address}\n\n` +
    `📍 Location (±${Math.round(accuracy)}m):\n` +
    `${mapsLink}\n\n` +
    `🕐 Time: ${time} IST\n\n` +
    `PLEASE RESPOND IMMEDIATELY.`
  );
};

/**
 * Sends an SMS to all numbers in SMS_NUMBERS.
 *
 * expo-sms opens the native SMS composer pre-filled with all recipients and
 * the message body. The user taps Send once — the OS dispatches to all numbers.
 *
 * Returns { result: 'sent' | 'cancelled' | 'unknown' }
 */
export const sendSOSViaSMS = async (locationData) => {
  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('SMS is not available on this device.');
  }

  const validNumbers = SMS_NUMBERS.filter(
    (n) => n && !n.startsWith('+91XXXXXXXXXX')
  );

  if (validNumbers.length === 0) {
    throw new Error('No SMS numbers configured. Add numbers to src/config/config.js → SMS_NUMBERS.');
  }

  const body = buildSMSBody(locationData);

  const { result } = await SMS.sendSMSAsync(validNumbers, body);
  return { result }; // 'sent' | 'cancelled' | 'unknown'
};
