import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const FILTERS = [
  { id: 'hospital', name: 'Hospitals', icon: 'business', color: '#ef4444' },
  { id: 'police', name: 'Police', icon: 'shield-checkmark', color: '#3b82f6' },
  { id: 'fire', name: 'Fire', icon: 'flame', color: '#f97316' },
  { id: 'trauma', name: 'Trauma', icon: 'heart-half', color: '#8b5cf6' },
];

export default function MapScreen({ onBack }) {
  const [location, setLocation] = useState(null);
  const [activeFilter, setActiveFilter] = useState('hospital');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Dummy locations for top 5 nearby
  const [facilities, setFacilities] = useState([]);

  useEffect(() => {
    (async () => {
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      
      // Generate some dummy facilities near user
      if (loc.coords) {
        const { latitude, longitude } = loc.coords;
        setFacilities([
          { id: 1, name: 'City General Hospital', distance: '0.8km', eta: '12 mins', lat: latitude + 0.005, lng: longitude + 0.005, open: true },
          { id: 2, name: 'Metro Health Care', distance: '1.2km', eta: '18 mins', lat: latitude - 0.004, lng: longitude + 0.006, open: true },
          { id: 3, name: 'Community Care', distance: '2.5km', eta: '25 mins', lat: latitude + 0.008, lng: longitude - 0.002, open: true },
          { id: 4, name: 'St. Jude Center', distance: '3.1km', eta: '30 mins', lat: latitude - 0.007, lng: longitude - 0.005, open: true },
          { id: 5, name: 'Sunrise Trauma', distance: '4.0km', eta: '35 mins', lat: latitude + 0.01, lng: longitude + 0.008, open: false },
        ]);
      }
    })();
  }, []);

  const { latitude, longitude } = location?.coords || { latitude: 37.78825, longitude: -122.4324 };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      {!isFullScreen && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <Text style={styles.searchText}>Search emergency services</Text>
          </View>
          <View style={styles.profilePic}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        </View>
      )}

      {/* Filter Row */}
      {!isFullScreen && (
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FILTERS.map(f => {
              const active = activeFilter === f.id;
              return (
                <TouchableOpacity 
                  key={f.id} 
                  style={[styles.filterChip, active && { backgroundColor: f.color, borderColor: f.color }]}
                  onPress={() => setActiveFilter(f.id)}
                >
                  <Ionicons name={f.icon} size={16} color={active ? '#fff' : f.color} style={{ marginRight: 6 }} />
                  <Text style={[styles.filterText, active && { color: '#fff' }]}>{f.name}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Map Section */}
      <View style={[styles.mapContainer, isFullScreen && { flex: 1 }]}>
        {location ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            }}
          >
            {/* User Location */}
            <Marker coordinate={{ latitude, longitude }}>
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner} />
              </View>
            </Marker>
            
            {/* Facilities */}
            {facilities.map(fac => (
              <Marker key={fac.id} coordinate={{ latitude: fac.lat, longitude: fac.lng }}>
                <View style={styles.facMarker}>
                  <Ionicons name="business" size={16} color="#fff" />
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color="#ef4444" />
          </View>
        )}
        
        {/* Expand Map Button */}
        <TouchableOpacity style={styles.expandBtn} onPress={() => setIsFullScreen(!isFullScreen)}>
          <Ionicons name={isFullScreen ? "contract" : "expand"} size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Facilities List (Hidden when fullscreen) */}
      {!isFullScreen && (
        <ScrollView style={styles.listContainer}>
          <Text style={styles.listTitle}>Top 5 Nearest Facilities</Text>
          {facilities.map(fac => (
            <View key={fac.id} style={styles.facCard}>
              <View style={styles.facIconWrap}>
                <Ionicons name="business" size={24} color="#ef4444" />
              </View>
              <View style={styles.facInfo}>
                <Text style={styles.facName}>{fac.name}</Text>
                <View style={styles.facMeta}>
                  <Text style={styles.facDistance}>{fac.distance} away • {fac.eta} est. arrival</Text>
                </View>
              </View>
              <View style={styles.facRight}>
                {fac.open ? (
                  <View style={styles.openBadge}><Text style={styles.openText}>OPEN</Text></View>
                ) : (
                  <View style={styles.closedBadge}><Text style={styles.closedText}>CLOSED</Text></View>
                )}
                <TouchableOpacity style={styles.navBtn}>
                  <Ionicons name="navigate" size={16} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* SOS Floating Action */}
      {isFullScreen && (
        <TouchableOpacity style={styles.sosFloatBtn}>
          <Text style={styles.sosFloatText}>SOS</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 20 },
  backBtn: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, height: 40, marginHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  searchText: { color: '#94a3b8', marginLeft: 8, fontSize: 14 },
  profilePic: { width: 40, height: 40, backgroundColor: '#0f172a', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  
  filterRow: { paddingHorizontal: 16, paddingBottom: 16 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 },
  filterText: { fontSize: 14, fontWeight: '600', color: '#475569' },

  mapContainer: { height: height * 0.35, backgroundColor: '#e2e8f0', position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  expandBtn: { position: 'absolute', top: 16, right: 16, backgroundColor: '#fff', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  
  userMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(59,130,246,0.3)', alignItems: 'center', justifyContent: 'center' },
  userMarkerInner: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#3b82f6', borderWidth: 2, borderColor: '#fff' },
  facMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

  listContainer: { flex: 1, padding: 16 },
  listTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  facCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  facIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  facInfo: { flex: 1, marginLeft: 16 },
  facName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  facDistance: { fontSize: 13, color: '#64748b' },
  facRight: { alignItems: 'flex-end', justifyContent: 'space-between', height: 48 },
  openBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  openText: { color: '#16a34a', fontSize: 10, fontWeight: '800' },
  closedBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  closedText: { color: '#dc2626', fontSize: 10, fontWeight: '800' },
  navBtn: { backgroundColor: '#f1f5f9', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  sosFloatBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOpacity: 0.5, shadowRadius: 16, elevation: 8, borderWidth: 4, borderColor: '#fff' },
  sosFloatText: { color: '#fff', fontSize: 20, fontWeight: '900' }
});
