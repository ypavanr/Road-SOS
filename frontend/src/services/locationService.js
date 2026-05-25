import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';

let dynamicMock = null;

export const setManualMockLocation = (lat, lon) => {
  if (!lat || !lon) {
    dynamicMock = null;
  } else {
    dynamicMock = { name: "Manual Pin", lat, lon };
  }
};

export const getManualMockLocation = () => dynamicMock;

export const getLocationData = async () => {
  let batteryLevel = null;
  try {
    const level = await Battery.getBatteryLevelAsync();
    batteryLevel = Math.round(level * 100);
  } catch (_) {}

  if (dynamicMock && dynamicMock.lat !== null && dynamicMock.lon !== null) {
    console.log(`⚠️ USING FAKE MOCK LOCATION: ${dynamicMock.name} ⚠️`);
    return {
      latitude: dynamicMock.lat,
      longitude: dynamicMock.lon,
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
