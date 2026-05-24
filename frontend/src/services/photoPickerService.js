import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

// Request camera permission
export const requestCameraPermission = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Denied',
        'Camera access is required to take photos. Please enable it in your app settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  } catch (err) {
    Alert.alert('Error', `Failed to request camera permission: ${err.message}`);
    return false;
  }
};

// Request gallery/media library permission
export const requestMediaLibraryPermission = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Permission Denied',
        'Photo library access is required to select photos. Please enable it in your app settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  } catch (err) {
    Alert.alert('Error', `Failed to request media library permission: ${err.message}`);
    return false;
  }
};

// Launch camera to take a photo
export const launchCamera = async () => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      return result.assets[0].uri;
    }
    return null;
  } catch (err) {
    Alert.alert('Error', `Failed to capture photo: ${err.message}`);
    return null;
  }
};

// Launch image picker from gallery
export const launchImagePicker = async () => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      return result.assets[0].uri;
    }
    return null;
  } catch (err) {
    Alert.alert('Error', `Failed to pick photo: ${err.message}`);
    return null;
  }
};

// Helper to show photo source selection
export const selectPhotoSource = async () => {
  return new Promise((resolve) => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const uri = await launchCamera();
            resolve(uri);
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const uri = await launchImagePicker();
            resolve(uri);
          },
        },
        {
          text: 'Cancel',
          onPress: () => resolve(null),
          style: 'cancel',
        },
      ]
    );
  });
};
