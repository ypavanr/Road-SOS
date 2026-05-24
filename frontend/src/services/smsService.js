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

export const sendSOSViaSMS = async (locationData, userData, additionalNumbers = [], userRole = 'victim', attachmentUri = null) => {
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

  let body = buildSMSBody(locationData, activeUserData || {});

  if (attachmentUri) {
    try {
      const photoUrl = await uploadAttachment(attachmentUri);
      body += `\n\n📷 Incident Photo:\n${photoUrl}`;
    } catch (e) {
      console.error("Failed to upload attachment to backend:", e);
      body += `\n\n📷 (Photo captured but failed to upload to link)`;
    }
  }

  const { result } = await SMS.sendSMSAsync(validNumbers, body);
  return { result };
};

const uploadAttachment = async (uri) => {
  const filename = uri.split('/').pop() || 'photo.jpg';
  let mimeType = 'image/jpeg';
  if (filename.toLowerCase().endsWith('.png')) {
    mimeType = 'image/png';
  } else if (filename.toLowerCase().endsWith('.gif')) {
    mimeType = 'image/gif';
  }

  // 1. Try Catbox.moe (primary reliable public host)
  try {
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", {
      uri: uri,
      name: filename,
      type: mimeType,
    });

    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.ok) {
      const url = await response.text();
      if (url.startsWith('http')) {
        return url.trim();
      }
    }
  } catch (e) {
    console.warn("Catbox upload failed, trying fallback...", e);
  }

  // 2. Try 0x0.st (secondary public host)
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      name: filename,
      type: mimeType,
    });

    const response = await fetch('https://0x0.st', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.ok) {
      const url = await response.text();
      if (url.startsWith('http')) {
        return url.trim();
      }
    }
  } catch (e) {
    console.warn("0x0.st upload failed, trying local upload fallback...", e);
  }

  // 3. Try Local server (LAN backup)
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      name: filename,
      type: mimeType,
    });

    const response = await fetch(`${API_GATEWAY_URL}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return data.url || data.file_url;
      }
    }
  } catch (e) {
    console.error("All upload channels failed:", e);
  }

  throw new Error("Unable to upload image to any hosting service");
};
