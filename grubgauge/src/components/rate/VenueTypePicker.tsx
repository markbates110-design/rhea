"use client";

import { VENUE_META, type VenueType } from "@/lib/ratings/scoring";

interface Props {
  /** Currently-selected venue type (controlled). */
  value: VenueType;
  /** Fires when the user taps a different type. Caller is responsible for
   *  resetting / merging criteria scores since each venue type has its
   *  own criteria set. */
  onChange: (next: VenueType) => void;
  /**
   * When true (default), shows an "Auto-detected" hint + the
   * "Tap to change if wrong" prompt — used on /rate where the type
   * came from Google's classifier. Set false on the edit sheet where
   * the user is correcting a prior choice (not seeing an inference).
   */
  autoDetected?: boolean;
  /** Optional id for the field's accessible label. */
  id?: string;
}

const ORDER: VenueType[] = ["fast-food", "casual", "fine", "food-truck"];

/**
 * Prominent four-button segmented picker for `venue_type`. Replaces the
 * old auto-inferred-then-hidden pattern where the user had no clear
 * affordance to override a wrong classification.
 *
 * Layout: full-width row of four buttons, current selection filled with
 * brand color, others outlined and muted. Wraps to two-up on narrow
 * widths. Each button is a real <button>, not a styled label, so
 * keyboard + a11y is the standard pattern.
 *
 * The weighted score depends on the venue type (different criteria,
 * different weights), so getting this right is foundational to the
 * app's value-driven rating angle — the picker is intentionally
 * visually prominent for that reason.
 */
export function VenueTypePicker({
  value,
  onChange,
  autoDetected = true,
  id = "venue-type-picker",
}: Props) {
  return (
    <div className="flex flex-col gap-xs" role="group" aria-labelledby={`${id}-label`}>
      <div className="flex items-center justify-between gap-xs">
        <label
          id={`${id}-label`}
          className="font-label-sm text-label-sm font-semibold text-on-surface"
        >
          Venue type
        </label>
        {autoDetected && (
          <span className="inline-flex items-center gap-xs rounded-full bg-surface-container-high px-xs py-0.5 font-label-sm text-[11px] font-semibold text-on-surface-variant">
            <span
              className="material-symbols-outlined text-[12px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden
            >
              auto_awesome
            </span>
            Auto-detected
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-xs md:grid-cols-4">
        {ORDER.map((v) => {
          const meta = VENUE_META[v];
          const active = v === value;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              aria-pressed={active}
              className={`flex items-center justify-center gap-xs rounded-lg border px-sm py-sm font-label-sm text-label-sm font-semibold transition-colors active:scale-[0.98] ${
                active
                  ? "border-primary bg-primary-container text-on-primary-container"
                  : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                aria-hidden
              >
                {meta.icon}
              </span>
              <span className="truncate">{meta.label}</span>
            </button>
          );
        })}
      </div>

      {autoDetected && (
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          We picked this from Google. Tap to change if it&apos;s wrong — the
          rating criteria depend on it.
        </p>
      )}
    </div>
  );
}
