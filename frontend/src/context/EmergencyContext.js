import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { getCachedFacilities } from '../services/cacheService';

const EmergencyContext = createContext(null);

export function EmergencyProvider({ children }) {
  // AI classification result from classifier-service
  const [classification, setClassification] = useState(null);

  // All fetched facilities (medical + roadside combined)
  const [facilities, setFacilities] = useState([]);

  // Currently active service filter id: 'hospital'|'trauma'|'ambulance'|'police'|'fire'|'towing'|'tyre'|'fuel'
  const [selectedService, setSelectedService] = useState(null);

  // The facility the user (or AI) selected for navigation
  const [selectedFacility, setSelectedFacility] = useState(null);

  // Route data from route-service: { polyline, distance_km, eta_minutes, eta_text, source }
  const [activeRoute, setActiveRoute] = useState(null);

  // True when AI confidence is high and emergency mode is activated
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  // Contextual loading message shown during async operations
  const [loadingMessage, setLoadingMessage] = useState(null);

  // Offline architecture states
  const [isOffline, setIsOffline] = useState(false);
  const [cachedFacilities, setCachedFacilities] = useState([]);

  // Auto-load cache when offline
  useEffect(() => {
    if (isOffline) {
      getCachedFacilities().then(facs => {
         setCachedFacilities(facs);
         // Also push them into general facilities so MapScreen can render them
         setFacilities(facs);
      });
    }
  }, [isOffline]);

  const clearEmergency = useCallback(() => {
    setClassification(null);
    setSelectedFacility(null);
    setActiveRoute(null);
    setIsEmergencyMode(false);
    setSelectedService(null);
    setLoadingMessage(null);
  }, []);

  return (
    <EmergencyContext.Provider
      value={{
        classification,
        setClassification,
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
        loadingMessage,
        setLoadingMessage,
        isOffline,
        setIsOffline,
        cachedFacilities,
        setCachedFacilities,
        clearEmergency,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergency must be used inside <EmergencyProvider>');
  return ctx;
}

// ── Utility: determine the single highest-priority facility type from a list ──

const PRIORITY_ORDER = [
  'trauma_center',
  'ambulance',
  'hospital',
  'clinic',
  'fire_station',
  'police',
  'towing',
  'tyre_shop',
  'car_repair',
  'fuel_station',
  'roadside_assistance',
];

export function getPrimaryFacilityType(specificFacilities = []) {
  for (const type of PRIORITY_ORDER) {
    if (specificFacilities.includes(type)) return type;
  }
  return specificFacilities[0] || null;
}

// ── Utility: map a facility type to the filter id used in MapScreen ──

const TYPE_TO_FILTER = {
  hospital: 'hospital',
  clinic: 'hospital',
  trauma_center: 'trauma',
  ambulance: 'ambulance',
  police: 'police',
  fire_station: 'fire',
  towing: 'towing',
  roadside_assistance: 'towing',
  car_repair: 'towing',
  tyre_shop: 'tyre',
  fuel_station: 'fuel',
};

export function facilityTypeToFilter(facilityType) {
  return TYPE_TO_FILTER[facilityType] || 'hospital';
}

// ── Utility: rank a facility within a given filter category ──

export function rankFacility(facility, filterId) {
  let score = 0;
  if (facility.emergency) score += 100;

  switch (filterId) {
    case 'trauma':
      if (facility.type === 'trauma_center') score += 80;
      if (facility.type === 'hospital') score += 40;
      break;
    case 'ambulance':
      if (facility.type === 'ambulance') score += 80;
      if (facility.type === 'trauma_center') score += 60;
      if (facility.type === 'hospital') score += 40;
      break;
    case 'hospital':
      if (facility.type === 'hospital') score += 60;
      if (facility.type === 'trauma_center') score += 50;
      if (facility.type === 'clinic') score += 20;
      break;
    case 'police':
      if (facility.type === 'police') score += 80;
      break;
    case 'fire':
      if (facility.type === 'fire_station') score += 80;
      break;
    case 'towing':
      if (facility.type === 'towing') score += 80;
      if (facility.type === 'roadside_assistance') score += 50;
      if (facility.type === 'car_repair') score += 40;
      break;
    case 'tyre':
      if (facility.type === 'tyre_shop') score += 80;
      break;
    case 'fuel':
      if (facility.type === 'fuel_station') score += 80;
      break;
    default:
      break;
  }

  // Lower ETA = higher score; penalise missing ETA
  score -= (facility.eta_minutes != null ? facility.eta_minutes : 99) * 2;
  return score;
}
