import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';

let dynamicMock = null;
let cachedLocationData = null;
let lastLocationTime = 0;
const LOCATION_CACHE_MS = 30000; // 30 seconds

export const setManualMockLocation = (lat, lon) => {
  if (!lat || !lon) {
    dynamicMock = null;
  } else {
    dynamicMock = { name: "Manual Pin", lat, lon };
  }
  // Immediately invalidate the cache so the new location takes effect
  cachedLocationData = null;
  lastLocationTime = 0;
};

export const getManualMockLocation = () => dynamicMock;

export const getLocationData = async () => {
  const now = Date.now();
  if (cachedLocationData && (now - lastLocationTime) < LOCATION_CACHE_MS) {
    console.log("Using cached location data (under 30s)");
    return cachedLocationData;
  }

  let batteryLevel = null;
  try {
    const level = await Battery.getBatteryLevelAsync();
    batteryLevel = Math.round(level * 100);
  } catch (_) {}

  let isoCountryCode = null;

  if (dynamicMock && dynamicMock.lat !== null && dynamicMock.lon !== null) {
    console.log(`⚠️ USING FAKE MOCK LOCATION: ${dynamicMock.name} ⚠️`);
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude: dynamicMock.lat, longitude: dynamicMock.lon });
      if (geocode && geocode.length > 0) {
        isoCountryCode = geocode[0].isoCountryCode;
      }
    } catch(e) {}

    return {
      latitude: dynamicMock.lat,
      longitude: dynamicMock.lon,
      accuracy: 5,
      altitude: 10,
      timestamp: Date.now(),
      batteryLevel,
      deviceModel: Device.modelName || Device.deviceName || 'Unknown Device',
      isMock: true,
      isoCountryCode,
    };
  }

  // Request foreground permission
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied. Please enable it in Settings to use SOS.');
  }

  // Get current position with high accuracy
  let location;
  try {
    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      maximumAge: 5000,
    });
    
    // Strict JS-level timeout to prevent Native bridge freezing on Emulators
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('GPS request timed out at JS level')), 5000)
    );

    location = await Promise.race([locationPromise, timeoutPromise]);
  } catch (err) {
    console.warn("GPS lock failed, falling back to last known position:", err.message);
    location = await Location.getLastKnownPositionAsync();
    
    // If still fails (e.g. emulator with no history), provide a default fallback
    if (!location) {
      console.warn("No last known position available. Using fallback location.");
      location = {
        coords: { latitude: 12.9716, longitude: 77.5946, accuracy: 100, altitude: 0 },
        timestamp: Date.now()
      };
    }
  }

  try {
    const geocode = await Location.reverseGeocodeAsync({ latitude: location.coords.latitude, longitude: location.coords.longitude });
    if (geocode && geocode.length > 0) {
      isoCountryCode = geocode[0].isoCountryCode;
    }
  } catch(e) {}

  const finalData = {
    latitude:     location.coords.latitude,
    longitude:    location.coords.longitude,
    accuracy:     location.coords.accuracy,
    altitude:     location.coords.altitude,
    timestamp:    location.timestamp,
    batteryLevel,
    deviceModel:  Device.modelName || Device.deviceName || 'Unknown Device',
    isoCountryCode,
  };

  cachedLocationData = finalData;
  lastLocationTime = Date.now();
  return finalData;
};
