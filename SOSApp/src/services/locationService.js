import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';

export const getLocationData = async () => {
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

  // Try to get battery level (may not be available on all devices)
  let batteryLevel = null;
  try {
    const level = await Battery.getBatteryLevelAsync();
    batteryLevel = Math.round(level * 100);
  } catch (_) {}

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
