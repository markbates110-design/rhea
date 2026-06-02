import { CUISINES, type Cuisine } from "@/lib/places/cuisine";

export const VALUE_CUISINE_PREFIX = "value-";

export function cityToSlug(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function cuisineSegmentFor(cuisine: Cuisine): string {
  return `${VALUE_CUISINE_PREFIX}${cuisine}`;
}

export function parseCuisineSegment(segment: string): Cuisine | null {
  if (!segment.startsWith(VALUE_CUISINE_PREFIX)) return null;
  const key = segment.slice(VALUE_CUISINE_PREFIX.length);
  if ((CUISINES as readonly string[]).includes(key)) {
    return key as Cuisine;
  }
  return null;
}

export function cuisineLabel(cuisine: Cuisine): string {
  if (cuisine === "tex-mex") return "Tex-Mex";
  return cuisine.charAt(0).toUpperCase() + cuisine.slice(1).replace(/-/g, " ");
}

export function cityDisplayName(city: string): string {
  return city.trim();
}
