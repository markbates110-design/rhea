// Shared venue criteria and weighted scoring (used by /rate and History edit).

export type VenueType = "fast-food" | "casual" | "fine" | "food-truck";

export interface Criterion {
  key: string;
  label: string;
  weight: number;
  low: string;
  high: string;
}

export const VENUE_META: Record<
  VenueType,
  { label: string; icon: string; tagline: string }
> = {
  "fast-food": {
    label: "Fast Food",
    icon: "fastfood",
    tagline: "Maximum Value in Minimum Time",
  },
  casual: {
    label: "Casual Dining",
    icon: "restaurant",
    tagline: "Reliable, Enjoyable Experience",
  },
  fine: {
    label: "Fine Dining",
    icon: "dining",
    tagline: "Memorable Luxury Experience",
  },
  "food-truck": {
    label: "Food Truck",
    icon: "local_shipping",
    tagline: "Bold Street Experience",
  },
};

export const VENUE_CRITERIA: Record<VenueType, Criterion[]> = {
  "fast-food": [
    { key: "portion", label: "Portion Size vs Price", weight: 0.35, low: "Skimpy", high: "Generous" },
    { key: "taste", label: "Taste & Freshness", weight: 0.25, low: "Bland", high: "Delicious" },
    { key: "speed", label: "Speed of Service", weight: 0.2, low: "Very Slow", high: "Lightning Fast" },
    {
      key: "accuracy",
      label: "Cleanliness & Order Accuracy",
      weight: 0.1,
      low: "Poor",
      high: "Spotless & Perfect",
    },
    { key: "deal", label: "Deal / Combo Value", weight: 0.1, low: "No Value", high: "Excellent Deal" },
  ],
  casual: [
    { key: "quality", label: "Food Quality & Freshness", weight: 0.3, low: "Poor", high: "Exceptional" },
    { key: "service", label: "Service & Friendliness", weight: 0.25, low: "Lacking", high: "Excellent" },
    { key: "portion", label: "Portion Size vs Price", weight: 0.2, low: "Skimpy", high: "Generous" },
    { key: "atmosphere", label: "Atmosphere & Comfort", weight: 0.15, low: "Unpleasant", high: "Wonderful" },
    { key: "value", label: "Overall Value (full check)", weight: 0.1, low: "Poor", high: "Outstanding" },
  ],
  fine: [
    {
      key: "quality",
      label: "Food Quality & Creativity",
      weight: 0.35,
      low: "Disappointing",
      high: "Extraordinary",
    },
    { key: "service", label: "Service Excellence", weight: 0.25, low: "Lacking", high: "Impeccable" },
    { key: "ambiance", label: "Ambiance & Atmosphere", weight: 0.2, low: "Poor", high: "Sublime" },
    { key: "detail", label: "Attention to Detail", weight: 0.1, low: "Careless", high: "Flawless" },
    { key: "value", label: "Value Perception", weight: 0.1, low: "Overpriced", high: "Worth Every Cent" },
  ],
  "food-truck": [
    { key: "taste", label: "Taste & Creativity", weight: 0.35, low: "Generic", high: "Outstanding" },
    { key: "portion", label: "Portion Size vs Price", weight: 0.25, low: "Skimpy", high: "Generous" },
    { key: "freshness", label: "Freshness & Quality", weight: 0.15, low: "Poor", high: "Exceptional" },
    { key: "vibes", label: "Truck Vibes & Cleanliness", weight: 0.15, low: "Grimy", high: "Great Energy" },
    { key: "speed", label: "Speed & Friendliness", weight: 0.1, low: "Slow & Cold", high: "Fast & Warm" },
  ],
};

export const DEFAULT_SCORE = 7.5;

export function calcWeightedScore(criteria: Criterion[], scores: Record<string, number>): number {
  return criteria.reduce((total, c) => {
    const raw = scores[c.key] ?? DEFAULT_SCORE;
    return total + raw * c.weight;
  }, 0);
}

export function normalizeVenueType(raw: string): VenueType {
  if (raw === "fast-food" || raw === "casual" || raw === "fine" || raw === "food-truck") return raw;
  return "casual";
}
