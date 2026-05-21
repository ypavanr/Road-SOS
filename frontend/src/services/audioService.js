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

    const formData = new FormData();
    formData.append('file', {
      uri: filePath.startsWith('file://') ? filePath : `file://${filePath}`,
      name: 'emergency_audio.m4a',
      type: 'audio/m4a',
    });

    const response = await fetch(`${API_GATEWAY_URL}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }
};
