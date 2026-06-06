"use client";

import { AutoGrowTextarea } from "@/components/forms/AutoGrowTextarea";
import {
  BLOOD_SUGAR_IMPACT_OPTIONS,
  BLOOD_SUGAR_RATE_REMINDER,
  type BloodSugarImpact,
} from "@/lib/ratings/bloodSugarImpact";

interface BloodSugarImpactPickerProps {
  value: BloodSugarImpact | null;
  onChange: (value: BloodSugarImpact | null) => void;
  notesValue?: string;
  onNotesChange?: (notes: string) => void;
  disabled?: boolean;
  idPrefix?: string;
}

export function BloodSugarImpactPicker({
  value,
  onChange,
  notesValue = "",
  onNotesChange,
  disabled = false,
  idPrefix = "bg-impact",
}: BloodSugarImpactPickerProps) {
  return (
    <div className="flex flex-col gap-sm">
      <p className="font-body-md text-body-md font-medium text-on-surface">
        How did this meal affect your blood sugar?
        <span className="font-normal text-on-surface-variant"> (optional)</span>
      </p>
      <div
        className="grid grid-cols-3 gap-xs"
        role="group"
        aria-label="Blood sugar impact"
      >
        {BLOOD_SUGAR_IMPACT_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              id={`${idPrefix}-${option.value}`}
              disabled={disabled}
              onClick={() => onChange(selected ? null : option.value)}
              className={`rounded-xl border px-sm py-sm font-label-sm text-label-sm font-semibold transition-all active:scale-95 disabled:opacity-50 ${
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant bg-surface-container text-on-surface-variant hover:border-primary/40 hover:bg-surface-container-high"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {onNotesChange && (
        <div className="flex flex-col gap-xs">
          <label
            htmlFor={`${idPrefix}-notes`}
            className="font-label-sm text-label-sm text-on-surface-variant"
          >
            Personal notes
            <span className="text-on-surface-variant/50"> (optional, private)</span>
          </label>
          <AutoGrowTextarea
            id={`${idPrefix}-notes`}
            value={notesValue}
            onChange={(e) => onNotesChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g. spike 2 hours later, felt fine with a walk afterward…"
            rows={2}
            className="resize-none overflow-hidden rounded-lg border border-outline-variant bg-surface-container px-sm py-xs font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      <p className="font-label-sm text-label-sm text-on-surface-variant">
        {BLOOD_SUGAR_RATE_REMINDER}
      </p>
    </div>
  );
}
