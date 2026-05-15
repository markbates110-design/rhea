"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { PageShell } from "@/components/layout/PageShell";
import { FounderSlotCounter } from "@/components/founder/FounderSlotCounter";
import { setOnboarded } from "@/lib/identity/deviceId";

const VALUE_PROPS = [
  {
    icon: "analytics",
    label: "Real value scores",
    desc: "Weighted ratings across taste, price, and experience.",
  },
  {
    icon: "explore",
    label: "Discover top spots",
    desc: "See what other diners say is worth your money.",
  },
  {
    icon: "history",
    label: "Your food history",
    desc: "Every meal rated and remembered, all in one place.",
  },
];

export default function OnboardingWelcomePage() {
  const router = useRouter();

  // No auto-redirect for already-onboarded users — `/onboarding` is now a
  // re-entry surface for returning guests routed here from the body `+ Rate`
  // CTA. Auto-redirecting would create a loop with that CTA's new behavior.

  function handleGuest() {
    setOnboarded();
    // Guests proceed straight to the rate screen post-onboarding choice.
    router.push("/rate");
  }

  return (
    <>
      {/* Top spacer (vertical centering within the onboarding layout's flex column) */}
      <div className="flex-1" />

      <PageShell variant="feed" className="pb-10">
        {/* Brand — full lockup includes gauge arc; no separate icon tile */}
        <div className="flex flex-col items-center gap-sm text-center">
          <BrandMark as="h1" size="lg" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Find true culinary value.
          </p>
        </div>

        {/* Founder hook — primary conversion lever for v1 launch. Live
            counter ticks down as slots fill, so the urgency is real
            rather than marketing-flavour. Sits above value props so a
            first-time visitor sees the scarcity message before any
            generic product pitch. */}
        <div className="mt-lg flex flex-col items-center gap-xs rounded-2xl border border-tertiary/40 bg-tertiary-container/60 px-md py-md text-center">
          <p className="font-title-sm text-title-sm font-bold text-on-tertiary-container">
            Be one of the first 100. Forever.
          </p>
          <FounderSlotCounter variant="headline" />
          <p className="font-label-sm text-label-sm text-on-tertiary-container/80">
            Sign up and rate 3 spots — claim a numbered Founding Member badge.
          </p>
        </div>

        {/* Value props */}
        <div className="mt-xl flex flex-col gap-sm">
          {VALUE_PROPS.map((vp) => (
            <div
              key={vp.icon}
              className="flex items-start gap-md rounded-xl border border-outline-variant bg-surface-container-low p-md"
            >
              <span
                className="material-symbols-outlined mt-[2px] shrink-0 text-[22px] text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {vp.icon}
              </span>
              <div>
                <p className="font-title-sm text-title-sm text-on-surface">{vp.label}</p>
                <p className="mt-[2px] font-body-md text-body-md text-on-surface-variant">{vp.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-xl flex flex-col gap-sm">
          <Link
            href="/onboarding/signup"
            className="flex w-full items-center justify-center rounded-xl bg-primary py-[14px] font-title-sm text-title-sm font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
          >
            Get Started
          </Link>
          <button
            type="button"
            onClick={handleGuest}
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low py-[14px] font-title-sm text-title-sm font-semibold text-on-surface-variant transition-all hover:bg-surface-container active:scale-95"
          >
            Continue as Guest
          </button>
        </div>

        {/* Pro teaser */}
        <div className="my-xl flex items-center justify-center">
          <div className="inline-flex items-center gap-xs rounded-full border border-tertiary/30 bg-tertiary/10 px-md py-xs">
            <span
              className="material-symbols-outlined text-[14px] text-tertiary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            <span className="font-label-sm text-label-sm text-tertiary">
              GrubGauge Pro — coming soon
            </span>
          </div>
        </div>
      </PageShell>

      {/* Bottom spacer */}
      <div className="flex-1" />
    </>
  );
}
