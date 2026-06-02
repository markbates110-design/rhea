import type { GeoCoords } from "./geolocation";

export interface ReverseGeocodeResult {
  city: string | null;
  state: string | null;
}

/**
 * Free reverse geocode via OpenStreetMap Nominatim. Used only to map the
 * viewer's browser coords to a city/state for filtering community ratings
 * — no Google Places spend.
 */
export async function reverseGeocodeCoords(
  coords: GeoCoords,
): Promise<ReverseGeocodeResult> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(coords.latitude));
  url.searchParams.set("lon", String(coords.longitude));
  url.searchParams.set("zoom", "10");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "GrubGauge/1.0 (community ratings discovery)",
    },
  });
  if (!res.ok) {
    return { city: null, state: null };
  }

  const body = (await res.json()) as {
    address?: {
      city?: string;
      town?: string;
      village?: string;
      hamlet?: string;
      state?: string;
    };
  };

  const address = body.address ?? {};
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.hamlet ??
    null;
  const state = address.state ?? null;

  return { city, state };
}
