/**
 * Promise-returning singleton loader for the Google Maps JavaScript API
 * (with the `places` library). Multiple call sites (e.g. the dashboard's
 * `NearbyVenuesRow`) can each await this from inside a `useEffect` and
 * a single network fetch will service all of them.
 *
 * Resolves when `window.google.maps.places` is available. Rejects on
 * SSR-context invocation, missing API key, or script load failure.
 *
 * Note on coexistence with `/rate`: the rate page currently has its own
 * inline loader (kept as-is to avoid touching that critical existing
 * flow). That loader uses the same `querySelector('script[src*="…"]')`
 * pattern, so the two coexist safely — whichever fires first wins, the
 * other attaches to the existing script's events. A future task can
 * converge them onto this helper.
 */
let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("ssr"));
  }
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(new Error("missing-api-key"));
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    // Another consumer (e.g. /rate's inline loader) may have injected the
    // script already. Attach to its events rather than double-injecting.
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      // If the existing script already finished loading, `load` has
      // already fired — fall through to a window.google check on the
      // microtask queue rather than waiting forever for a load event
      // that won't fire again.
      if (window.google?.maps?.places) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load-failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("load-failed"));
    document.head.appendChild(script);
  });

  return loadPromise;
}
