import { setItem, getItem } from './emergencyStorage';
import { API_GATEWAY_URL } from '../../config';

const CACHE_KEY = 'offline_facilities_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Calculate distance between two lat/lon points in km using Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export const updateCacheIfNeeded = async (lat, lon) => {
  const cachedData = await getItem(CACHE_KEY);
  const now = Date.now();

  if (cachedData) {
    const timeDiff = now - cachedData.timestamp;
    const dist = getDistance(lat, lon, cachedData.location.lat, cachedData.location.lon);

    // If cache is fresh (< 5 mins) and we haven't moved > 1km, skip refresh
    if (timeDiff < CACHE_EXPIRY_MS && dist < 1.0) {
      return false;
    }
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    const body = JSON.stringify({ lat, lon, radius_m: 10000 }); // search within 10km for cache

    const [medRes, roadRes] = await Promise.allSettled([
      fetch(`${API_GATEWAY_URL}/nearby/medical`, { method: 'POST', headers, body }),
      fetch(`${API_GATEWAY_URL}/nearby/roadside`, { method: 'POST', headers, body }),
    ]);

    let freshFacilities = [];
    if (medRes.status === 'fulfilled' && medRes.value.ok) {
      const d = await medRes.value.json();
      freshFacilities = freshFacilities.concat(d.facilities || []);
    }
    if (roadRes.status === 'fulfilled' && roadRes.value.ok) {
      const d = await roadRes.value.json();
      freshFacilities = freshFacilities.concat(d.facilities || []);
    }

    // Filter top 3 of police, trauma, hospital, fire
    const cacheTypes = ['police', 'trauma_center', 'hospital', 'fire_station'];
    const cachedFacilities = [];

    cacheTypes.forEach((type) => {
      const matching = freshFacilities
        .filter((f) => f.type === type)
        // Sort by distance (if available, otherwise by ETA, but assume API returns somewhat sorted)
        .sort((a, b) => (a.distance_km || 99) - (b.distance_km || 99))
        .slice(0, 3);
      cachedFacilities.push(...matching);
    });

    const newCache = {
      timestamp: now,
      location: { lat, lon },
      facilities: cachedFacilities,
    };

    await setItem(CACHE_KEY, newCache);
    return true; // Cache updated
  } catch (e) {
    console.error('Failed to update facility cache', e);
    return false;
  }
};

export const getCachedFacilities = async () => {
  const data = await getItem(CACHE_KEY);
  return data ? data.facilities : [];
};
