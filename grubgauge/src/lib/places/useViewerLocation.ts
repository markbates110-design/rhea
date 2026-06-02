"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GeoCoords } from "./geolocation";
import {
  readCachedCoords,
  requestCurrentCoords,
} from "./geolocation";
import { reverseGeocodeCoords } from "./reverseGeocode";

export type ViewerLocationPhase =
  | "loading"
  | "needs-location"
  | "resolving-location"
  | "ready";

export interface ViewerLocationState {
  phase: ViewerLocationPhase;
  coords: GeoCoords | null;
  city: string | null;
  state: string | null;
  label: string | null;
  error: string;
  resolveLocation: () => Promise<void>;
  skipLocation: () => Promise<void>;
}

/**
 * Shared browser-location state for dashboard discovery rows. One hook
 * instance per section avoids duplicate geolocation prompts.
 */
export function useViewerLocation(): ViewerLocationState {
  const [phase, setPhase] = useState<ViewerLocationPhase>("loading");
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [error, setError] = useState("");

  const applyGeo = useCallback((geo: { city: string | null; state: string | null }) => {
    setCity(geo.city);
    setState(geo.state);
  }, []);

  const clearGeo = useCallback(() => {
    setCity(null);
    setState(null);
  }, []);

  const finishReady = useCallback(() => {
    setPhase("ready");
  }, []);

  const resolveLocation = useCallback(async () => {
    setPhase("resolving-location");
    setError("");
    try {
      const cached = readCachedCoords();
      const nextCoords = cached ?? (await requestCurrentCoords());
      setCoords(nextCoords);
      const geo = await reverseGeocodeCoords(nextCoords);
      applyGeo(geo);
      finishReady();
    } catch {
      setError("Location unavailable — showing spots without distance sorting.");
      setCoords(null);
      clearGeo();
      finishReady();
    }
  }, [applyGeo, clearGeo, finishReady]);

  const skipLocation = useCallback(async () => {
    setCoords(null);
    clearGeo();
    setError("");
    finishReady();
  }, [clearGeo, finishReady]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const cached = readCachedCoords();
      if (!cached) {
        if (!cancelled) setPhase("needs-location");
        return;
      }

      setPhase("resolving-location");
      setCoords(cached);
      try {
        const geo = await reverseGeocodeCoords(cached);
        if (cancelled) return;
        applyGeo(geo);
      } catch {
        if (!cancelled) clearGeo();
      }
      if (!cancelled) finishReady();
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [applyGeo, clearGeo, finishReady]);

  const label = useMemo(() => {
    const parts = [city, state].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }, [city, state]);

  return {
    phase,
    coords,
    city,
    state,
    label,
    error,
    resolveLocation,
    skipLocation,
  };
}
