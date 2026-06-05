export const DISPLAY_NAME_NUDGE_DISMISSED_UNTIL_KEY =
  "grubgauge_display_name_nudge_dismissed_until";

/** Default snooze for dashboard / explore surfaces. */
export const DISPLAY_NAME_NUDGE_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Shorter snooze on profile — still dismissible, reappears sooner. */
export const DISPLAY_NAME_NUDGE_PROFILE_DISMISS_COOLDOWN_MS =
  3 * 24 * 60 * 60 * 1000;

function readDismissedUntil(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DISPLAY_NAME_NUDGE_DISMISSED_UNTIL_KEY);
  if (!raw) return null;
  const until = Number(raw);
  return Number.isFinite(until) ? until : null;
}

export function isDisplayNameNudgeSnoozed(): boolean {
  const until = readDismissedUntil();
  return until !== null && Date.now() < until;
}

export function snoozeDisplayNameNudge(
  cooldownMs = DISPLAY_NAME_NUDGE_DISMISS_COOLDOWN_MS,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    DISPLAY_NAME_NUDGE_DISMISSED_UNTIL_KEY,
    String(Date.now() + cooldownMs),
  );
}

export function clearDisplayNameNudgeSnooze(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DISPLAY_NAME_NUDGE_DISMISSED_UNTIL_KEY);
}
