import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';

export const MOCK_LOCATIONS = [
  { name: "Real Location (Device GPS)", lat: null, lon: null },
  { name: "New York, USA", lat: 40.7128, lon: -74.0060 },
  { name: "London, UK", lat: 51.5074, lon: -0.1278 },
  { name: "Sydney, Australia", lat: -33.8688, lon: 151.2093 },
  { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Mumbai, India", lat: 19.0760, lon: 72.8777 },
];

let currentMockIndex = 0;

export const cycleMockLocation = () => {
  currentMockIndex = (currentMockIndex + 1) % MOCK_LOCATIONS.length;
  return MOCK_LOCATIONS[currentMockIndex];
};

export const getLocationData = async () => {
  const currentMock = MOCK_LOCATIONS[currentMockIndex];
  
  let batteryLevel = null;
  try {
    const level = await Battery.getBatteryLevelAsync();
    batteryLevel = Math.round(level * 100);
  } catch (_) {}

  if (currentMock.lat !== null && currentMock.lon !== null) {
    console.log(`⚠️ USING FAKE MOCK LOCATION: ${currentMock.name} ⚠️`);
    return {
      latitude: currentMock.lat,
      longitude: currentMock.lon,
      accuracy: 5,
      altitude: 10,
      timestamp: Date.now(),
      batteryLevel,
      deviceModel: Device.modelName || Device.deviceName || 'Unknown Device',
      isMock: true,
    };
  }

  // Request foreground permission
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied. Please enable it in Settings to use SOS.');
  }

  // Get current position with high accuracy
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
    maximumAge: 5000,
    timeout: 15000,
  });

  return {
    latitude:     location.coords.latitude,
    longitude:    location.coords.longitude,
    accuracy:     location.coords.accuracy,
    altitude:     location.coords.altitude,
    timestamp:    location.timestamp,
    batteryLevel,
    deviceModel:  Device.modelName || Device.deviceName || 'Unknown Device',
  };
};
