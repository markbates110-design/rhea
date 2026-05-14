/**
 * Browser geolocation helpers for the dashboard "Near You" row.
 *
 * Two-layer cache discipline:
 *   - sessionStorage TTL ≈ 10 min for the actual coords
 *   - permission-state probe via the Permissions API (when available)
 *     so we can render the right UI without firing a prompt
 *
 * Privacy: sessionStorage (not localStorage) so coords clear when the
 * user closes the tab. The MVP does not need cross-session location
 * memory — fresh prompt next session is acceptable UX.
 */

const COORDS_KEY = "gg.nearby.coords";
const COORDS_TTL_MS = 10 * 60 * 1000;

export interface Coords {
  lat: number;
  lng: number;
}

interface CachedCoords {
  coords: Coords;
  ts: number;
}

export type PermissionState = "granted" | "prompt" | "denied" | "unsupported";

/**
 * Reads cached geolocation coords from sessionStorage if fresh (≤ 10 min
 * old). Returns null on cache miss, expired entry, parse failure, or
 * SSR. Prefer this over re-prompting — repeated geolocation prompts on
 * the same tab feel intrusive and Safari may silently deny if fired too
 * quickly after page load.
 */
export function getCachedCoords(): Coords | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCoords;
    if (!parsed?.coords || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > COORDS_TTL_MS) return null;
    return parsed.coords;
  } catch {
    return null;
  }
}

function writeCachedCoords(coords: Coords): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      COORDS_KEY,
      JSON.stringify({ coords, ts: Date.now() } satisfies CachedCoords),
    );
  } catch {
    // Quota / private-mode failure — silently degrade. Worst case: a
    // re-prompt next mount, which is acceptable for a cache layer.
  }
}

/**
 * Probes the current browser permission state for geolocation. Uses the
 * Permissions API where available (all evergreen browsers) with a
 * feature-detect fallback that reports "unsupported" rather than
 * throwing on older runtimes.
 *
 * Distinguishes:
 *   - granted: requestCoords() will not prompt
 *   - prompt:  requestCoords() will trigger the OS-level prompt
 *   - denied:  the user previously denied; do NOT re-prompt automatically
 *   - unsupported: this browser has no geolocation API (rare; treat as
 *                  "section hidden")
 */
export async function getPermissionState(): Promise<PermissionState> {
  if (typeof window === "undefined") return "unsupported";
  if (!("geolocation" in navigator)) return "unsupported";
  if (!("permissions" in navigator)) return "prompt";
  try {
    const result = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    if (
      result.state === "granted" ||
      result.state === "prompt" ||
      result.state === "denied"
    ) {
      return result.state;
    }
    return "prompt";
  } catch {
    return "prompt";
  }
}

/**
 * Wraps `navigator.geolocation.getCurrentPosition` in a Promise with an
 * 8-second timeout. Triggers the OS-level permission prompt the first
 * time it's called for an origin. Caches the resolved coords so a
 * subsequent dashboard mount doesn't re-prompt.
 *
 * IMPORTANT: only invoke this from a user gesture (e.g. tap of "Allow
 * location"). Calling it on page mount before a user interaction is
 * poor UX and Safari may silently deny.
 */
export function requestCoords(): Promise<Coords> {
  return new Promise<Coords>((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: Coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        writeCachedCoords(coords);
        resolve(coords);
      },
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}
