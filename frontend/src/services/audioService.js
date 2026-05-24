import { Audio } from 'expo-av';
import { API_GATEWAY_URL } from '../../config';

let recording = null;
let currentPath = null;

export const startRecording = async () => {
  try {
    console.log('Requesting permissions..');
    const permission = await Audio.requestPermissionsAsync();
    
    if (permission.status === 'granted') {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recording = newRecording;
      currentPath = recording.getURI();
      console.log('Recording started at', currentPath);
      return true;
    } else {
      console.error('Permission to record audio not granted');
      return false;
    }
  } catch (err) {
    console.error('Failed to start recording', err);
    return false;
  }
};

export const stopRecording = async () => {
  try {
    if (!recording) return null;
    
    console.log('Stopping recording..');
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);
    recording = null;
    currentPath = uri;
    return uri;
  } catch (error) {
    console.error('Failed to stop recording:', error);
    return null;
  }
};

export const uploadAudio = async (filePath) => {
  if (!filePath) return { success: false, error: 'No audio file provided' };
  
  try {
    console.log('Uploading audio from:', filePath);
    
    let FileSystem;
    try {
      FileSystem = require('expo-file-system/legacy');
    } catch(e) {
      FileSystem = require('expo-file-system');
    }

    const finalUri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;

    const response = await FileSystem.uploadAsync(`${API_GATEWAY_URL}/transcribe`, finalUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType ? FileSystem.FileSystemUploadType.MULTIPART : 2,
      fieldName: 'file',
      mimeType: 'audio/m4a',
    });

    if (response.status !== 200) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = JSON.parse(response.body);
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
};
