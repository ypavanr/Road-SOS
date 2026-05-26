import * as Location from 'expo-location';
// import * as TaskManager from 'expo-task-manager';
import geohash from 'ngeohash';
import axios from 'axios';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_GATEWAY_URL } from '../../config';

const NOTIFICATION_SERVICE_URL = (API_GATEWAY_URL || 'http://127.0.0.1:8000').replace('8000', '8008');
const WEBSOCKET_URL = NOTIFICATION_SERVICE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

let activeWebSocket = null;
const alertQueue = [];
let isAlertVisible = false;

const processAlertQueue = () => {
  if (isAlertVisible || alertQueue.length === 0) return;
  
  isAlertVisible = true;
  const data = alertQueue.shift();

  const handleDismiss = () => {
    isAlertVisible = false;
    // Add a slight delay before showing the next popup so it feels natural
    setTimeout(processAlertQueue, 500);
  };

  const buttons = [{ 
    text: "Close", 
    style: "cancel",
    onPress: handleDismiss
  }];
  
  if (data.url) {
    buttons.push({
      text: "View on Map",
      onPress: () => {
        handleDismiss();
        Linking.openURL(data.url);
      }
    });
  }

  Alert.alert(
    "🚨 " + (data.title || "Proximity Alert"),
    data.body,
    buttons
  );
};

const GEOHASH_UPDATE_TASK = 'GEOHASH_UPDATE_TASK';

/*
// Define the background task
TaskManager.defineTask(GEOHASH_UPDATE_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Geohash Update Task Error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const loc = locations[0];
    if (loc) {
      await updateGeohashSubscription(loc.coords.latitude, loc.coords.longitude);
    }
  }
});
*/

export const getPushToken = async () => {
  // Expo Go SDK 53+ removed remote push support. 
  // For the prototype demo, we use a mock token unique to the device.
  return "MOCK_EXPO_TOKEN_DEMO_DEVICE";
};

export const updateGeohashSubscription = async (latitude, longitude) => {
  const token = await getPushToken();
  if (!token) return;

  // Precision 5 roughly equals a 5km x 5km grid
  const currentGeohash = geohash.encode(latitude, longitude, 5);

  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/update-location`, {
      token,
      geohash: currentGeohash
    });
    console.log(`[Geohash Service] Token assigned to grid ${currentGeohash}`);
    
    // Connect to WebSocket for real-time 2-phone demo
    connectGeohashWebSocket(currentGeohash);
  } catch (e) {
    console.error('[Geohash Service] Failed to update location on backend', e.message);
  }
};

export const connectGeohashWebSocket = async (grid) => {
  if (activeWebSocket) {
    activeWebSocket.close();
  }
  
  let phone = "guest";
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      phone = parsed.phone ? parsed.phone.replace(/[^0-9+]/g, '') : "guest";
    }
  } catch (e) {}
  
  const ws = new WebSocket(`${WEBSOCKET_URL}/ws/${grid}/${phone}`);
  
  ws.onopen = () => {
    console.log(`[WebSocket] Connected to grid: ${grid}`);
  };
  
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      alertQueue.push(data);
      processAlertQueue();
    } catch (err) {
      console.error("Failed to parse websocket message", err);
    }
  };
  
  ws.onerror = (e) => {
    console.log('[WebSocket] Error: ', e.message);
  };
  
  activeWebSocket = ws;
};

export const initBackgroundGeohashTracking = async () => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus === 'granted') {
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus === 'granted') {
      console.log('Background geohash tracking disabled temporarily for debugging.');
      /*
      await Location.startLocationUpdatesAsync(GEOHASH_UPDATE_TASK, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 2000, // Update every 2 kilometers
        deferredUpdatesInterval: 60000,
        showsBackgroundLocationIndicator: false,
      });
      */
    }
  }

  // Also do an initial fetch
  const loc = await Location.getLastKnownPositionAsync();
  if (loc) {
    updateGeohashSubscription(loc.coords.latitude, loc.coords.longitude);
  }
};

// Compute 9 surrounding geohashes for broadcasting SOS
export const getTargetGeohashes = (lat, lon) => {
  const center = geohash.encode(lat, lon, 5);
  return geohash.neighbors(center).concat(center);
};

export const broadcastSOSToGeohashes = async (lat, lon, message, targetPhones = [], contactMessage = null) => {
  const grids = getTargetGeohashes(lat, lon);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  
  // Sanitize target phones to ensure they match the connected websocket keys
  const safeTargetPhones = targetPhones.map(p => p.replace(/[^0-9+]/g, ''));
  
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/trigger-sos`, {
      geohashes: grids,
      target_phones: safeTargetPhones,
      message,
      contact_message: contactMessage,
      url: mapUrl
    });
    console.log(`SOS Broadcasted to ${grids.length} nearby grids!`);
  } catch (e) {
    console.error('Failed to broadcast SOS to grids:', e.message);
  }
};
