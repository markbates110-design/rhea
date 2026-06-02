export interface GeoCoords {
  latitude: number;
  longitude: number;
}

const CACHE_KEY = "grubgauge_last_coords";
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Browser geolocation with a short session cache so dashboard revisits
 * within 30 minutes do not re-prompt the OS dialog.
 */
export function readCachedCoords(): GeoCoords | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat: number; lng: number; at: number };
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
    return { latitude: parsed.lat, longitude: parsed.lng };
  } catch {
    return null;
  }
}

export function writeCachedCoords(coords: GeoCoords): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      lat: coords.latitude,
      lng: coords.longitude,
      at: Date.now(),
    }),
  );
}

export function requestCurrentCoords(): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not available."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        writeCachedCoords(coords);
        resolve(coords);
      },
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: CACHE_TTL_MS },
    );
  });
}
