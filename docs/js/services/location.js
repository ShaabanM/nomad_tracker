// Geolocation API + BigDataCloud reverse geocoding
import { jurisdictionForCountry, countryFlag } from '../data/jurisdictions.js';
import { saveLastLocation, getLastLocation } from './storage.js';

export async function detectLocation() {
  // Try GPS first
  if ('geolocation' in navigator) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 min cache
        });
      });

      const { latitude, longitude } = position.coords;
      const geo = await reverseGeocode(latitude, longitude);

      if (geo) {
        const location = {
          countryCode: geo.countryCode,
          country: geo.countryName,
          city: geo.city || geo.locality || '',
          jurisdiction: jurisdictionForCountry(geo.countryCode),
        };
        saveLastLocation(location);
        return location;
      }
    } catch (err) {
      console.warn('GPS failed:', err.message);
    }
  }

  // Fall back to cached location
  const cached = getLastLocation();
  if (cached) {
    cached.jurisdiction = jurisdictionForCountry(cached.countryCode);
    cached.cached = true;
    return cached;
  }

  return null;
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return {
      countryCode: data.countryCode,
      countryName: data.countryName,
      city: data.city,
      locality: data.locality,
    };
  } catch (err) {
    console.warn('Reverse geocode failed:', err.message);
    return null;
  }
}

// Check if last location detection was more than N hours ago
export function isLocationStale(hours = 24) {
  const cached = getLastLocation();
  if (!cached || !cached.timestamp) return true;
  const age = Date.now() - cached.timestamp;
  return age > hours * 3600000;
}
