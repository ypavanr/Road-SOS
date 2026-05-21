import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscriber;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Please enable it in Settings.');
        setLoading(false);
        return;
      }

      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (loc) => {
          setLocation(loc);
          setLoading(false);
        }
      );
    })();

    return () => subscriber?.remove();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.status}>Acquiring location...</Text>
        </>
      );
    }

    if (errorMsg) {
      return <Text style={styles.error}>{errorMsg}</Text>;
    }

    const { latitude, longitude, accuracy, altitude, speed } = location.coords;

    return (
      <View style={styles.card}>
        <Text style={styles.label}>Latitude</Text>
        <Text style={styles.value}>{latitude.toFixed(6)}°</Text>

        <Text style={styles.label}>Longitude</Text>
        <Text style={styles.value}>{longitude.toFixed(6)}°</Text>

        <Text style={styles.label}>Accuracy</Text>
        <Text style={styles.value}>{accuracy ? `±${accuracy.toFixed(1)} m` : '—'}</Text>

        <Text style={styles.label}>Altitude</Text>
        <Text style={styles.value}>{altitude != null ? `${altitude.toFixed(1)} m` : '—'}</Text>

        <Text style={styles.label}>Speed</Text>
        <Text style={styles.value}>{speed != null ? `${(speed * 3.6).toFixed(1)} km/h` : '—'}</Text>

        <Text style={styles.timestamp}>
          Updated: {new Date(location.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Location</Text>
      {renderContent()}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
  },
  value: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 2,
  },
  timestamp: {
    marginTop: 20,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  status: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  error: {
    fontSize: 15,
    color: '#dc2626',
    textAlign: 'center',
    lineHeight: 22,
  },
});
