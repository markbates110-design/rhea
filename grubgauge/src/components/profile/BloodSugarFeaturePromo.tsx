"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { useProfile } from "@/lib/profile/useProfile";
import { hasLegitimateDisplayName } from "@/lib/profile/names";
import { canTrackBloodSugarImpact } from "@/lib/ratings/bloodSugarImpact";

interface BloodSugarFeaturePromoProps {
  /** Tighter padding for feed surfaces like the dashboard. */
  variant?: "welcome" | "feed";
}

/**
 * Surfaces private blood sugar tracking on high-traffic entry pages.
 * Hides once the viewer has already enabled tracking on their profile.
 */
export function BloodSugarFeaturePromo({
  variant = "welcome",
}: BloodSugarFeaturePromoProps) {
  const { user } = useAuth();
  const { profile } = useProfile();

  if (canTrackBloodSugarImpact(profile)) return null;

  const hasDisplayName = hasLegitimateDisplayName(profile);
  const ctaHref = !user
    ? "/onboarding/signup?mode=signup"
    : hasDisplayName
      ? "/profile"
      : "/onboarding/profile?focus=display-name";
  const ctaLabel = !user
    ? "Sign up to try it"
    : hasDisplayName
      ? "Turn on in Profile"
      : "Set display name first";

  const shellClass =
    variant === "welcome"
      ? "rounded-2xl border border-primary/30 bg-primary/5 px-md py-md"
      : "rounded-xl border border-primary/30 bg-primary/5 p-md";

  return (
    <section
      aria-label="Blood sugar tracking"
      className={`flex flex-col gap-sm ${shellClass}`}
    >
      <div className="flex items-start gap-sm">
        <span
          className="material-symbols-outlined mt-[2px] shrink-0 text-[22px] text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden
        >
          monitor_heart
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-title-sm text-title-sm font-bold text-on-surface">
            Blood sugar tracking, kept private
          </p>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant text-pretty">
            Optionally log how a meal affected you — Low, Medium, or High — and
            add personal notes. Only you see them in your history; never on your
            public profile or the feed.
          </p>
          <p className="mt-xs inline-flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]" aria-hidden>
              lock
            </span>
            Personal observation only — not medical advice.
          </p>
        </div>
      </div>
      <Link
        href={ctaHref}
        className="inline-flex w-fit items-center gap-xs rounded-lg bg-primary-container px-sm py-xs font-label-sm text-label-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95"
      >
        {ctaLabel}
        <span className="material-symbols-outlined text-[16px]" aria-hidden>
          arrow_forward
        </span>
      </Link>
    </section>
  );
}
