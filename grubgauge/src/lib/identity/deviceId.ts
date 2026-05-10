const DEVICE_KEY = "grubgauge_device_id";
const ONBOARDED_KEY = "grubgauge_onboarded";
const PREFS_KEY = "grubgauge_food_prefs";
const USERNAME_KEY = "grubgauge_username";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDED_KEY) === "true";
}

export function setOnboarded(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ONBOARDED_KEY, "true");
  }
}

export function getUsername(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(USERNAME_KEY) ?? "";
}

export function setUsername(name: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USERNAME_KEY, name);
  }
}

export function getFoodPrefs(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PREFS_KEY);
  try { return raw ? (JSON.parse(raw) as string[]) : []; } catch { return []; }
}

export function setFoodPrefs(prefs: string[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }
}
