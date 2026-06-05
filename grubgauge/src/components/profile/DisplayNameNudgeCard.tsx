"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { useProfile } from "@/lib/profile/useProfile";
import { hasLegitimateDisplayName } from "@/lib/profile/names";
import { PROFILE_UPDATED_EVENT } from "@/lib/profile/profile";
import {
  clearDisplayNameNudgeSnooze,
  DISPLAY_NAME_NUDGE_DISMISS_COOLDOWN_MS,
  isDisplayNameNudgeSnoozed,
  snoozeDisplayNameNudge,
} from "@/lib/profile/displayNameNudge";

interface DisplayNameNudgeCardProps {
  /** Profile page: always visible when unnamed. Feed surfaces respect snooze. */
  dismissible?: boolean;
  variant?: "inline" | "compact";
}

export function DisplayNameNudgeCard({
  dismissible = true,
  variant = "inline",
}: DisplayNameNudgeCardProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [snoozed, setSnoozed] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (dismissible) {
      setSnoozed(isDisplayNameNudgeSnoozed());
    }
  }, [dismissible]);

  useEffect(() => {
    if (!profile || !hasLegitimateDisplayName(profile)) return;
    clearDisplayNameNudgeSnooze();
    setHidden(true);
  }, [profile]);

  useEffect(() => {
    function handleProfileUpdated() {
      if (profile && hasLegitimateDisplayName(profile)) {
        clearDisplayNameNudgeSnooze();
        setHidden(true);
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
      }
    };
  }, [profile]);

  if (authLoading || profileLoading || !user || hidden) return null;
  if (!profile || hasLegitimateDisplayName(profile)) return null;
  if (dismissible && snoozed) return null;

  function handleDismiss() {
    snoozeDisplayNameNudge(DISPLAY_NAME_NUDGE_DISMISS_COOLDOWN_MS);
    setSnoozed(true);
    setHidden(true);
  }

  const isCompact = variant === "compact";

  return (
    <div
      className={`flex flex-col gap-sm rounded-xl border border-primary/30 bg-primary/5 ${
        isCompact ? "p-sm" : "p-md"
      }`}
      role="status"
    >
      <div className="flex items-start gap-sm">
        <span
          className="material-symbols-outlined mt-[2px] shrink-0 text-[20px] text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden
        >
          badge
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold text-on-surface ${
              isCompact ? "font-label-sm text-label-sm" : "font-title-sm text-title-sm"
            }`}
          >
            Add a display name
          </p>
          <p
            className={`mt-xs text-on-surface-variant ${
              isCompact ? "font-label-sm text-label-sm" : "font-body-md text-body-md"
            }`}
          >
            Your reviews show your @handle in feeds. A display name helps people
            recognize and follow you.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-xs">
        <Link
          href="/onboarding/profile?focus=display-name"
          className="inline-flex items-center gap-xs rounded-lg bg-primary-container px-sm py-xs font-label-sm text-label-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95"
        >
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            edit
          </span>
          Set display name
        </Link>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg px-sm py-xs font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
