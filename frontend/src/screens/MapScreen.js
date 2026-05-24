import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { API_GATEWAY_URL } from '../../config';
import {
  useEmergency,
  rankFacility,
  facilityTypeToFilter,
  getPrimaryFacilityType,
} from '../context/EmergencyContext';

const { width, height } = Dimensions.get('window');

// ── Filter definitions ────────────────────────────────────────────────────────

const FILTERS = [
  {
    id: 'hospital',
    name: 'Hospital',
    icon: 'business',
    color: '#ef4444',
    facilityTypes: ['hospital', 'clinic'],
    endpoint: '/nearby/medical',
  },
  {
    id: 'trauma',
    name: 'Trauma',
    icon: 'heart-half',
    color: '#8b5cf6',
    facilityTypes: ['trauma_center'],
    endpoint: '/nearby/medical',
  },
  {
    id: 'ambulance',
    name: 'Ambulance',
    icon: 'medical',
    color: '#ef4444',
    facilityTypes: ['ambulance'],
    endpoint: '/nearby/medical',
  },
  {
    id: 'police',
    name: 'Police',
    icon: 'shield-checkmark',
    color: '#3b82f6',
    facilityTypes: ['police'],
    endpoint: '/nearby/medical',
  },
  {
    id: 'fire',
    name: 'Fire',
    icon: 'flame',
    color: '#f97316',
    facilityTypes: ['fire_station'],
    endpoint: '/nearby/medical',
  },
  {
    id: 'towing',
    name: 'Towing',
    icon: 'car',
    color: '#6366f1',
    facilityTypes: ['towing', 'roadside_assistance', 'car_repair'],
    endpoint: '/nearby/roadside',
  },
  {
    id: 'tyre',
    name: 'Puncture',
    icon: 'hammer',
    color: '#14b8a6',
    facilityTypes: ['tyre_shop'],
    endpoint: '/nearby/roadside',
  },
  {
    id: 'fuel',
    name: 'Fuel',
    icon: 'water',
    color: '#eab308',
    facilityTypes: ['fuel_station'],
    endpoint: '/nearby/roadside',
  },
];

// ── Style maps ────────────────────────────────────────────────────────────────

const TYPE_COLOR = {
  hospital: '#ef4444',
  trauma_center: '#8b5cf6',
  clinic: '#f87171',
  ambulance: '#ef4444',
  police: '#3b82f6',
  fire_station: '#f97316',
  towing: '#6366f1',
  roadside_assistance: '#6366f1',
  car_repair: '#6366f1',
  tyre_shop: '#14b8a6',
  fuel_station: '#eab308',
};

const TYPE_ICON = {
  hospital: 'business',
  trauma_center: 'heart-half',
  clinic: 'medkit',
  ambulance: 'medical',
  police: 'shield-checkmark',
  fire_station: 'flame',
  towing: 'car',
  roadside_assistance: 'construct',
  car_repair: 'construct',
  tyre_shop: 'hammer',
  fuel_station: 'water',
};

const FILTER_ROUTE_COLOR = {
  hospital: '#ef4444',
  trauma: '#8b5cf6',
  ambulance: '#ef4444',
  police: '#3b82f6',
  fire: '#f97316',
  towing: '#6366f1',
  tyre: '#14b8a6',
  fuel: '#eab308',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function filterFacilitiesByType(facilities, filterId) {
  const cfg = FILTERS.find((f) => f.id === filterId);
  if (!cfg) return [];
  return facilities.filter((f) => cfg.facilityTypes.includes(f.type));
}

function getTopFacilities(facilities, filterId, limit = 6) {
  const filtered = filterFacilitiesByType(facilities, filterId);
  return [...filtered]
    .sort((a, b) => rankFacility(b, filterId) - rankFacility(a, filterId))
    .slice(0, limit);
}

// Returns the best facility per specific_facility type (for multi-service emergencies)
function getBestPerServiceType(facilities, specificFacilities) {
  const result = {};
  for (const svcType of specificFacilities) {
    const filterId = facilityTypeToFilter(svcType);
    const matches = facilities.filter((f) => f.type === svcType);
    if (matches.length === 0) {
      // fallback to filter group
      const group = filterFacilitiesByType(facilities, filterId);
      if (group.length) {
        result[svcType] = [...group].sort(
          (a, b) => rankFacility(b, filterId) - rankFacility(a, filterId),
        )[0];
      }
    } else {
      result[svcType] = [...matches].sort(
        (a, b) => rankFacility(b, filterId) - rankFacility(a, filterId),
      )[0];
    }
  }
  return result;
}

// ── AI Triage Card Component ──────────────────────────────────────────────────

const AITriageCard = ({ classification }) => {
  const [showExplanation, setShowExplanation] = useState(false);

  if (!classification) return null;

  const confPercent = Math.round((classification.confidence_score || 0) * 100);
  const isEmergency = classification.is_emergency;

  const bgColor = isEmergency ? '#f0fdf4' : '#f8fafc';
  const borderColor = isEmergency ? '#bbf7d0' : '#e2e8f0';
  const headerIcon = isEmergency ? 'alert' : 'information-circle';
  const headerColor = isEmergency ? '#166534' : '#334155';
  const confBg = isEmergency ? '#dcfce7' : '#fef3c7';
  const confText = isEmergency ? '#166534' : '#92400e';

  return (
    <View style={[styles.triageCard, { backgroundColor: bgColor, borderColor: borderColor }]}>
      <View style={styles.triageHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={headerIcon} size={20} color={isEmergency ? '#dc2626' : '#64748b'} />
          <Text style={[styles.triageTitle, { color: headerColor }]}>AI Triage Assessment</Text>
        </View>
        <View style={[styles.confPill, { backgroundColor: confBg }]}>
          <Text style={[styles.confPillText, { color: confText }]}>
            {confPercent}% ({classification.engine_used || 'llm'})
          </Text>
        </View>
      </View>

      <Text style={[styles.triageEmergencyText, { color: isEmergency ? '#166534' : '#334155' }]}>
        Emergency: {isEmergency ? '✅ Yes' : '❌ No'}
      </Text>

      {classification.broad_categories?.length > 0 && (
        <View style={styles.triageCategories}>
          {classification.broad_categories.map(cat => (
            <View key={cat} style={styles.broadCatPill}>
              <Ionicons name={cat === 'medical' ? 'medkit' : cat === 'police' ? 'shield-checkmark' : 'build'} size={12} color="#3730a3" />
              <Text style={styles.broadCatText}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
            </View>
          ))}
        </View>
      )}

      {showExplanation ? (
        <View style={[styles.explanationBox, { backgroundColor: isEmergency ? '#ecfdf5' : '#f1f5f9' }]}>
          <Text style={[styles.explanationTitle, { color: isEmergency ? '#064e3b' : '#334155' }]}>Why this classification:</Text>
          <Text style={[styles.explanationText, { color: isEmergency ? '#064e3b' : '#334155' }]}>
            {classification.explanation}
          </Text>
          <TouchableOpacity onPress={() => setShowExplanation(false)} style={{marginTop: 8}}>
            <Text style={{color: '#2563eb', fontWeight: '600'}}>Hide Explanation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={() => setShowExplanation(true)} style={{marginTop: 8, marginBottom: 4}}>
           <Text style={{color: '#2563eb', fontWeight: '600'}}>Show AI Explanation</Text>
        </TouchableOpacity>
      )}

      {classification.specific_facilities?.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={[styles.explanationTitle, { color: isEmergency ? '#064e3b' : '#334155' }]}>Specific assistance needed:</Text>
          <View style={styles.specificFacContainer}>
            {classification.specific_facilities.map(fac => {
              const label = fac.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              const icon = TYPE_ICON[fac] || 'help-circle';
              return (
                <View key={fac} style={styles.specificFacPill}>
                  <Ionicons name={icon} size={14} color="#b91c1c" />
                  <Text style={styles.specificFacText}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function MapScreen({ onBack }) {
  const {
    classification,
    facilities,
    setFacilities,
    selectedService,
    setSelectedService,
    selectedFacility,
    setSelectedFacility,
    activeRoute,
    setActiveRoute,
    isEmergencyMode,
    setIsEmergencyMode,
  } = useEmergency();

  const mapRef = useRef(null);

  const [userLocation, setUserLocation] = useState(null);
  const [activeFilter, setActiveFilter] = useState(selectedService || 'hospital');
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fetchingFacilities, setFetchingFacilities] = useState(false);
  const [multiRoutes, setMultiRoutes] = useState({});

  // Derived: top facilities for the active filter
  const topFacilities = useMemo(
    () => getTopFacilities(facilities, activeFilter),
    [facilities, activeFilter],
  );

  // Derived: best facility per AI-classified service type (for multi-service markers)
  const bestPerService = useMemo(() => {
    if (!classification?.specific_facilities?.length) return {};
    return getBestPerServiceType(facilities, classification.specific_facilities);
  }, [classification, facilities]);

  // ── Location ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation(loc.coords);
    })();
  }, []);

  // ── Apply AI classification on mount ─────────────────────────
  useEffect(() => {
    if (!classification?.specific_facilities?.length) return;

    const primaryType = getPrimaryFacilityType(classification.specific_facilities);
    const filterId = facilityTypeToFilter(primaryType);
    setActiveFilter(filterId);
    setIsEmergencyMode(true);
  }, [classification]);

  // ── Sync selectedService from context (HomeScreen service tap) ──
  useEffect(() => {
    if (selectedService && selectedService !== activeFilter) {
      setActiveFilter(selectedService);
    }
  }, [selectedService]);

  // ── Auto-select best facility and fetch route when filter/facilities change ──
  useEffect(() => {
    if (!topFacilities.length || !userLocation) return;
    const best = topFacilities[0];
    
    // Always trigger primary route selection if changed
    if (selectedFacility?.id !== best.id || !activeRoute) {
      selectFacility(best);
    }

    // Trigger secondary routes fetch for multi-service emergencies
    if (classification?.is_emergency && classification.specific_facilities?.length > 1) {
      fetchMultiRoutes(bestPerService);
    } else {
      setMultiRoutes({});
    }
  }, [topFacilities, userLocation, classification, bestPerService]);

  // ── Fetch multiple secondary routes ─────────────
  const fetchMultiRoutes = useCallback(
    async (bestFacilitiesMap) => {
      if (!userLocation || !classification?.is_emergency) return;
      
      const newMultiRoutes = {};
      const fetchPromises = [];
      const primaryType = getPrimaryFacilityType(classification?.specific_facilities || []);

      Object.entries(bestFacilitiesMap).forEach(([svcType, facility]) => {
        if (!facility || svcType === primaryType) return;

        const p = fetch(`${API_GATEWAY_URL}/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_lat: userLocation.latitude,
            source_lon: userLocation.longitude,
            dest_lat: facility.lat,
            dest_lon: facility.lon,
          }),
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.polyline?.length) {
            newMultiRoutes[svcType] = data;
          }
        })
        .catch(e => console.error(`Multi-route error for ${svcType}:`, e));

        fetchPromises.push(p);
      });

      if (fetchPromises.length > 0) {
        await Promise.all(fetchPromises);
        setMultiRoutes(newMultiRoutes);
      } else {
        setMultiRoutes({});
      }
    },
    [userLocation, classification]
  );

  // ── Fetch additional facilities if the filter returns nothing ──
  const fetchFacilitiesForFilter = useCallback(
    async (filterId, lat, lon) => {
      const cfg = FILTERS.find((f) => f.id === filterId);
      if (!cfg) return;
      setFetchingFacilities(true);
      try {
        let currentRadius = 6000;
        const MAX_RADIUS = 20000;
        let allFresh = [];
        let matchingCount = 0;

        while (currentRadius <= MAX_RADIUS) {
          const bodyObj = { 
            lat, 
            lon, 
            radius_m: currentRadius,
            patient_gender: classification?.patient_gender,
            patient_demographic: classification?.patient_demographic,
            injury_type: classification?.injury_type
          };
          
          const resp = await fetch(`${API_GATEWAY_URL}${cfg.endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyObj),
          });
          
          if (resp.ok) {
            const data = await resp.json();
            allFresh = data.facilities || [];
            matchingCount = allFresh.filter((f) => cfg.facilityTypes.includes(f.type)).length;
            
            if (matchingCount >= 2) {
              break;
            }
          }
          currentRadius += 3000;
        }

        setFacilities((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const merged = [...prev, ...allFresh.filter((f) => !existingIds.has(f.id))];
          return merged;
        });
      } catch (e) {
        console.error('Facility fetch error', e);
      } finally {
        setFetchingFacilities(false);
      }
    },
    [setFacilities],
  );

  // ── Fetch route from API Gateway → route-service ─────────────
  const fetchRoute = useCallback(
    async (facility) => {
      if (!userLocation || !facility) return;
      setRouteLoading(true);
      setRouteError(false);
      try {
        const resp = await fetch(`${API_GATEWAY_URL}/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_lat: userLocation.latitude,
            source_lon: userLocation.longitude,
            dest_lat: facility.lat,
            dest_lon: facility.lon,
          }),
        });
        if (!resp.ok) throw new Error(`Route fetch failed: ${resp.status}`);
        const data = await resp.json();
        setActiveRoute(data);
      } catch (e) {
        console.error('Route fetch error:', e);
        setRouteError(true);
        setActiveRoute(null);
      } finally {
        setRouteLoading(false);
      }
    },
    [userLocation, setActiveRoute],
  );

  // ── Select a facility and route to it ────────────────────────
  const selectFacility = useCallback(
    (facility) => {
      setSelectedFacility(facility);
      fetchRoute(facility);
    },
    [setSelectedFacility, fetchRoute],
  );

  // ── Reactive map fitting for all routes ──────────────────────
  useEffect(() => {
    if (mapRef.current && activeRoute?.polyline?.length && userLocation) {
      const allCoords = [{ latitude: userLocation.latitude, longitude: userLocation.longitude }];
      
      allCoords.push(...activeRoute.polyline.map(p => ({ latitude: p.latitude, longitude: p.longitude })));
      
      Object.values(multiRoutes).forEach(rt => {
         if (rt.polyline) {
            allCoords.push(...rt.polyline.map(p => ({ latitude: p.latitude, longitude: p.longitude })));
         }
      });
      
      mapRef.current.fitToCoordinates(allCoords, { 
        edgePadding: { top: 80, right: 60, bottom: 360, left: 60 }, 
        animated: true 
      });
    }
  }, [activeRoute, multiRoutes, userLocation]);

  // ── Filter tab change ─────────────────────────────────────────
  const handleFilterChange = useCallback(
    (filterId) => {
      setActiveFilter(filterId);
      setSelectedService(filterId);
      setIsEmergencyMode(false);
      setActiveRoute(null);
      setSelectedFacility(null);

      if (!userLocation) return;
      const existing = filterFacilitiesByType(facilities, filterId);
      if (existing.length === 0) {
        fetchFacilitiesForFilter(filterId, userLocation.latitude, userLocation.longitude);
      }
    },
    [facilities, userLocation, setSelectedService, setIsEmergencyMode, setActiveRoute, setSelectedFacility, fetchFacilitiesForFilter],
  );

  // ── Open in Google Maps ───────────────────────────────────────
  const openInGoogleMaps = useCallback((facility) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lon}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  }, []);

  // ── Call facility ─────────────────────────────────────────────
  const callFacility = useCallback((phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  }, []);

  // ── Derived display values ────────────────────────────────────
  const routeColor = FILTER_ROUTE_COLOR[activeFilter] || '#ef4444';
  const activeCfg = FILTERS.find((f) => f.id === activeFilter) || FILTERS[0];
  const { latitude: uLat = 12.97, longitude: uLon = 77.59 } = userLocation || {};

  const polylineCoords = useMemo(
    () =>
      activeRoute?.polyline?.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })) || [],
    [activeRoute],
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Emergency Mode Banner */}
      {isEmergencyMode && !isFullScreen && (
        <View style={[styles.emergencyBanner, { borderColor: routeColor }]}>
          <Ionicons name="alert-circle" size={18} color={routeColor} />
          <Text style={[styles.emergencyBannerText, { color: routeColor }]}>
            AI Emergency Mode — Auto-routing to nearest {activeCfg.name}
          </Text>
        </View>
      )}

      {/* Header */}
      {!isFullScreen && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Emergency Map</Text>
            {fetchingFacilities && (
              <ActivityIndicator size="small" color="#ef4444" style={{ marginLeft: 8 }} />
            )}
          </View>
          <View style={styles.profilePic}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        </View>
      )}

      {/* Filter Row */}
      {!isFullScreen && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: f.color, borderColor: f.color },
                ]}
                onPress={() => handleFilterChange(f.id)}
              >
                <Ionicons
                  name={f.icon}
                  size={15}
                  color={active ? '#fff' : f.color}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.filterText, active && { color: '#fff' }]}>{f.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Map */}
      <View style={[styles.mapContainer, isFullScreen && { flex: 1 }]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: uLat,
            longitude: uLon,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          }}
        >
          {/* User Location Marker */}
          {userLocation && (
            <Marker
              coordinate={{ latitude: uLat, longitude: uLon }}
              zIndex={100}
            >
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner} />
              </View>
            </Marker>
          )}

          {/* Facility Markers (filtered to active type) */}
          {topFacilities.map((fac) => {
            const isSelected = selectedFacility?.id === fac.id;
            const color = TYPE_COLOR[fac.type] || activeCfg.color;
            const icon = TYPE_ICON[fac.type] || activeCfg.icon;
            return (
              <Marker
                key={fac.id}
                coordinate={{ latitude: fac.lat, longitude: fac.lon }}
                onPress={() => selectFacility(fac)}
                zIndex={isSelected ? 90 : 50}
              >
                <View
                  style={[
                    styles.facMarker,
                    { backgroundColor: color },
                    isSelected && styles.facMarkerSelected,
                  ]}
                >
                  <Ionicons name={icon} size={isSelected ? 18 : 14} color="#fff" />
                </View>
              </Marker>
            );
          })}

          {/* AI Best-per-service markers (secondary emergency services) */}
          {Object.entries(bestPerService).map(([svcType, fac]) => {
            if (!fac) return null;
            const filterId = facilityTypeToFilter(svcType);
            if (filterId === activeFilter) return null; // already shown above
            const color = TYPE_COLOR[svcType] || '#64748b';
            const icon = TYPE_ICON[svcType] || 'help-circle';
            return (
              <Marker
                key={`ai-${svcType}`}
                coordinate={{ latitude: fac.lat, longitude: fac.lon }}
                zIndex={40}
              >
                <View style={[styles.secondaryMarker, { borderColor: color }]}>
                  <Ionicons name={icon} size={12} color={color} />
                </View>
              </Marker>
            );
          })}

          {/* Multi-Routes Polylines */}
          {Object.entries(multiRoutes).map(([svcType, rt]) => {
             if (!rt.polyline || rt.polyline.length < 2) return null;
             const color = TYPE_COLOR[svcType] || '#64748b';
             const coords = rt.polyline.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
             return (
               <Polyline
                 key={`route-${svcType}`}
                 coordinates={coords}
                 strokeColor={color}
                 strokeWidth={4}
                 lineDashPattern={undefined}
               />
             );
          })}

          {/* Primary Route Polyline */}
          {polylineCoords.length > 1 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={routeColor}
              strokeWidth={4}
              lineDashPattern={undefined}
            />
          )}
        </MapView>

        {/* Expand / Collapse */}
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setIsFullScreen(!isFullScreen)}
        >
          <Ionicons
            name={isFullScreen ? 'contract' : 'expand'}
            size={20}
            color="#0f172a"
          />
        </TouchableOpacity>

        {/* Route loading overlay on map */}
        {routeLoading && (
          <View style={styles.routeLoadingOverlay}>
            <ActivityIndicator size="small" color="#ef4444" />
            <Text style={styles.routeLoadingText}>Calculating fastest route...</Text>
          </View>
        )}
      </View>

      {/* ── Bottom Sheet ── */}
      {!isFullScreen && (
        <View style={styles.bottomSheet}>
          {/* Active Route Summary Card */}
          {selectedFacility && (activeRoute || routeLoading) && (
            <View style={[styles.routeCard, { borderLeftColor: routeColor }]}>
              {routeLoading ? (
                <View style={styles.routeCardLoading}>
                  <ActivityIndicator size="small" color={routeColor} />
                  <Text style={[styles.routeCardTitle, { color: routeColor, marginLeft: 8 }]}>
                    Finding fastest route...
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.routeCardRow}>
                    <Ionicons name={activeCfg.icon} size={20} color={routeColor} style={{ marginRight: 8 }} />
                    <Text style={styles.routeCardTitle} numberOfLines={1}>
                      {selectedFacility.name}
                    </Text>
                  </View>
                  <View style={styles.routeCardMeta}>
                    <View style={styles.routeCardBadge}>
                      <Ionicons name="time" size={13} color="#64748b" style={{ marginRight: 3 }} />
                      <Text style={styles.routeCardBadgeText}>
                        {activeRoute?.eta_text || '—'}
                      </Text>
                    </View>
                    <View style={styles.routeCardBadge}>
                      <Ionicons name="location" size={13} color="#64748b" style={{ marginRight: 3 }} />
                      <Text style={styles.routeCardBadgeText}>
                        {activeRoute?.distance_km != null
                          ? `${Number(activeRoute.distance_km).toFixed(2)} km`
                          : '—'}
                      </Text>
                    </View>
                    {isEmergencyMode && (
                      <View style={[styles.routeCardBadge, { backgroundColor: '#fef2f2' }]}>
                        <Text style={[styles.routeCardBadgeText, { color: '#ef4444' }]}>
                          Emergency Route Active
                        </Text>
                      </View>
                    )}
                    {activeRoute?.source === 'fallback' && (
                      <View style={[styles.routeCardBadge, { backgroundColor: '#fef9c3' }]}>
                        <Text style={[styles.routeCardBadgeText, { color: '#854d0e' }]}>
                          Est. only
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Route unavailable notice */}
          {routeError && (
            <View style={styles.routeErrorCard}>
              <Ionicons name="warning" size={16} color="#b45309" style={{ marginRight: 6 }} />
              <Text style={styles.routeErrorText}>Unable to calculate route right now</Text>
            </View>
          )}

          {/* Facility List */}
          <ScrollView
            style={styles.facilityList}
            showsVerticalScrollIndicator={false}
          >
            <AITriageCard classification={classification} />

            <Text style={[styles.listTitle, classification && { marginTop: 16 }]}>
              {topFacilities.length > 0
                ? `Top ${topFacilities.length} Nearby — ${activeCfg.name}`
                : `No ${activeCfg.name} facilities found nearby`}
            </Text>

            {topFacilities.length === 0 && !fetchingFacilities && (
              <View style={styles.emptyCard}>
                <Ionicons name="search" size={32} color="#94a3b8" />
                <Text style={styles.emptyText}>
                  No {activeCfg.name} facilities found. Try expanding search radius.
                </Text>
              </View>
            )}

            {topFacilities.map((fac) => {
              const isSelected = selectedFacility?.id === fac.id;
              const color = TYPE_COLOR[fac.type] || activeCfg.color;
              const icon = TYPE_ICON[fac.type] || activeCfg.icon;
              return (
                <TouchableOpacity
                  key={fac.id}
                  style={[
                    styles.facCard,
                    isSelected && { borderColor: color, borderWidth: 2 },
                  ]}
                  onPress={() => selectFacility(fac)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.facIconWrap, { backgroundColor: color + '18' }]}>
                    <Ionicons name={icon} size={22} color={color} />
                  </View>

                  <View style={styles.facInfo}>
                    <Text style={styles.facName} numberOfLines={1}>
                      {fac.name}
                    </Text>
                    <Text style={styles.facMeta}>
                      {fac.distance_km != null ? `${Number(fac.distance_km).toFixed(2)} km` : ''}
                      {fac.eta_text ? ` · ${fac.eta_text}` : ''}
                    </Text>
                    {fac.emergency && (
                      <View style={styles.emergencyBadge}>
                        <Text style={styles.emergencyBadgeText}>24/7 Emergency</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.facActions}>
                    {/* Call Button */}
                    {fac.contact?.phone && (
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: '#f0fdf4' }]}
                        onPress={() => callFacility(fac.contact.phone)}
                      >
                        <Ionicons name="call" size={16} color="#16a34a" />
                      </TouchableOpacity>
                    )}
                    {/* Navigate Button */}
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: '#eff6ff' }]}
                      onPress={() => openInGoogleMaps(fac)}
                    >
                      <Ionicons name="navigate" size={16} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Fullscreen SOS FAB */}
      {isFullScreen && (
        <TouchableOpacity style={styles.sosFloatBtn} onPress={onBack}>
          <Text style={styles.sosFloatText}>←</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  emergencyBanner: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#fff', borderBottomWidth: 2, gap: 8,
  },
  emergencyBannerText: { fontSize: 13, fontWeight: '700', flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  profilePic: {
    width: 40, height: 40, backgroundColor: '#0f172a', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  filterRow: { maxHeight: 52 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, marginRight: 8,
  },
  filterText: { fontSize: 13, fontWeight: '700', color: '#475569' },

  mapContainer: { height: height * 0.35, backgroundColor: '#e2e8f0', position: 'relative' },

  userMarker: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  userMarkerInner: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#3b82f6',
    borderWidth: 2, borderColor: '#fff',
  },
  facMarker: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 4,
  },
  facMarkerSelected: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 3, borderColor: '#fff',
    shadowOpacity: 0.4, shadowRadius: 6,
  },
  secondaryMarker: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, elevation: 3,
  },

  expandBtn: {
    position: 'absolute', top: 12, right: 12, backgroundColor: '#fff',
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  routeLoadingOverlay: {
    position: 'absolute', bottom: 12, left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  routeLoadingText: { color: '#0f172a', fontSize: 13, fontWeight: '600', marginLeft: 6 },

  bottomSheet: { flex: 1, backgroundColor: '#f8fafc' },

  routeCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  routeCardLoading: { flexDirection: 'row', alignItems: 'center' },
  routeCardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  routeCardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', flex: 1 },
  routeCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  routeCardBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  routeCardBadgeText: { fontSize: 12, fontWeight: '600', color: '#475569' },

  routeErrorCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fffbeb', borderRadius: 12,
    marginHorizontal: 16, marginTop: 10, padding: 12,
    borderWidth: 1, borderColor: '#fcd34d',
  },
  routeErrorText: { color: '#92400e', fontSize: 13, fontWeight: '600' },

  facilityList: { flex: 1, paddingHorizontal: 16, marginTop: 10 },
  listTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10 },

  emptyCard: {
    alignItems: 'center', padding: 32, backgroundColor: '#fff',
    borderRadius: 16, marginBottom: 16,
  },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 12 },

  facCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  facIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  facInfo: { flex: 1, marginLeft: 12 },
  facName: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  facMeta: { fontSize: 12, color: '#64748b' },
  emergencyBadge: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#fef2f2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  emergencyBadgeText: { fontSize: 10, fontWeight: '800', color: '#ef4444' },

  facActions: { flexDirection: 'column', gap: 6, marginLeft: 8 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  sosFloatBtn: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#0f172a',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
    borderWidth: 3, borderColor: '#fff',
  },
  sosFloatText: { color: '#fff', fontSize: 22, fontWeight: '900' },

  triageCard: {
    marginBottom: 12, padding: 16,
    borderRadius: 14, borderWidth: 1,
  },
  triageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  triageTitle: { fontSize: 16, fontWeight: '800' },
  confPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  confPillText: { fontSize: 12, fontWeight: '700' },
  triageEmergencyText: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  triageCategories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  broadCatPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e7ff',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4
  },
  broadCatText: { color: '#3730a3', fontSize: 13, fontWeight: '700' },
  explanationBox: { padding: 12, borderRadius: 10 },
  explanationTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  explanationText: { fontSize: 14, lineHeight: 20 },
  specificFacContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  specificFacPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4
  },
  specificFacText: { color: '#b91c1c', fontSize: 13, fontWeight: '700' },
});
