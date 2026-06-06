"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, type Profile } from "@/lib/profile/profile";
import { hasLegitimateDisplayName } from "@/lib/profile/names";
import { BLOOD_SUGAR_DISCLAIMER } from "@/lib/ratings/bloodSugarImpact";

interface BloodSugarImpactSettingsProps {
  profile: Profile | null;
}

export function BloodSugarImpactSettings({ profile }: BloodSugarImpactSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  if (!profile) return null;
  const currentProfile = profile;

  if (!hasLegitimateDisplayName(currentProfile)) {
    return (
      <div className="flex flex-col gap-xs rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm">
        <p className="font-body-md text-body-md font-medium text-on-surface">
          Blood sugar impact tracking
        </p>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Set a display name first to unlock private meal tracking for your own
          history.
        </p>
        <Link
          href="/onboarding/profile?focus=display-name"
          className="mt-xs inline-flex w-fit font-label-sm text-label-sm font-semibold text-primary hover:underline"
        >
          Set display name
        </Link>
      </div>
    );
  }

  const enabled = currentProfile.track_blood_sugar_impact;

  async function persist(nextEnabled: boolean, acceptDisclaimer: boolean) {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const patch: Parameters<typeof updateProfile>[1] = {
        track_blood_sugar_impact: nextEnabled,
      };
      if (nextEnabled && acceptDisclaimer) {
        patch.blood_sugar_disclaimer_accepted_at = new Date().toISOString();
      }
      const result = await updateProfile(supabase, patch);
      if (!result.ok) {
        if ("error" in result && result.error === "profile_not_found") {
          setError("Profile not found.");
        } else if ("code" in result && result.code === "unauthenticated") {
          setError("Sign in to update this setting.");
        } else if ("message" in result) {
          setError(result.message ?? "Could not save setting.");
        } else {
          setError("Could not save setting.");
        }
        return;
      }
      setShowDisclaimer(false);
      setAcknowledged(false);
    } finally {
      setSaving(false);
    }
  }

  function handleToggleClick() {
    if (saving) return;
    if (enabled) {
      void persist(false, false);
      return;
    }
    if (currentProfile.blood_sugar_disclaimer_accepted_at) {
      void persist(true, false);
      return;
    }
    setShowDisclaimer(true);
  }

  function handleConfirmEnable() {
    if (!acknowledged || saving) return;
    void persist(true, true);
  }

  return (
    <div className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm">
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="font-body-md text-body-md font-medium text-on-surface">
            Track blood sugar impact
          </p>
          <p className="mt-xs font-label-sm text-label-sm text-on-surface-variant">
            Private to you — recall how meals affected you when you return to a
            restaurant.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={saving}
          onClick={handleToggleClick}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-primary" : "bg-outline-variant"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-surface shadow-sm transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {error && (
        <p className="font-label-sm text-label-sm text-error" role="alert">
          {error}
        </p>
      )}

      {showDisclaimer && (
        <div className="flex flex-col gap-sm rounded-lg border border-primary/20 bg-primary/5 p-sm">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {BLOOD_SUGAR_DISCLAIMER}
          </p>
          <label className="flex items-start gap-xs font-label-sm text-label-sm text-on-surface">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-[2px]"
            />
            I understand
          </label>
          <div className="flex flex-wrap gap-xs">
            <button
              type="button"
              disabled={!acknowledged || saving}
              onClick={handleConfirmEnable}
              className="rounded-lg bg-primary-container px-sm py-xs font-label-sm text-label-sm font-bold text-on-primary-container disabled:opacity-50"
            >
              Turn on tracking
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setShowDisclaimer(false);
                setAcknowledged(false);
              }}
              className="rounded-lg px-sm py-xs font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
