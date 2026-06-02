"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { PageShell } from "@/components/layout/PageShell";
import { CenteredProse } from "@/components/layout/CenteredProse";
import { FounderSlotCounter } from "@/components/founder/FounderSlotCounter";
import { UsernameClaimField } from "@/components/onboarding/UsernameClaimField";
import { getUsername, setOnboarded, setUsername } from "@/lib/identity/deviceId";

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

  // Pre-fill from device storage so a returning visitor (came back later
  // to claim) sees their pending handle rather than an empty box. Lazy
  // initializer keeps the read out of every render. Persistence flows
  // back to localStorage on every change so the value travels into
  // /onboarding/profile (post-signup) and into the `handle_new_user`
  // trigger via user_metadata at signup time.
  const [handle, setHandle] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return getUsername();
  });

  function handleHandleChange(next: string) {
    setHandle(next);
    setUsername(next.trim());
  }

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

      <PageShell variant="form" className="pb-10">
        <CenteredProse className="gap-sm">
          <CenteredProse.Item>
            <BrandMark as="h1" size="lg" />
          </CenteredProse.Item>
          <p className="font-headline-md text-headline-md font-semibold text-on-surface">
            Unleash your inner food critic.
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant text-pretty">
            Track the meals that matter, build a following, and earn one of the
            first 100 Founding Member badges.
          </p>
        </CenteredProse>

        {/* Founder hook — primary conversion lever for v1 launch. Live
            counter ticks down as slots fill, so the urgency is real
            rather than marketing-flavour. Sits above value props so a
            first-time visitor sees the scarcity message before any
            generic product pitch. */}
        <CenteredProse className="mt-lg gap-xs rounded-2xl border border-tertiary/40 bg-tertiary-container/60 px-md py-md">
          <p className="font-title-sm text-title-sm font-bold text-on-tertiary-container">
            Earn your permanent spot.
          </p>
          <CenteredProse.Item>
            <FounderSlotCounter variant="headline" />
          </CenteredProse.Item>
          <p className="font-label-sm text-label-sm text-on-tertiary-container/80">
            Sign up and rate 3 spots — claim a numbered Founding Member badge.
          </p>
        </CenteredProse>

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

        {/* Stake-your-handle — sits between value props and CTAs so the
            user has already absorbed why GrubGauge exists before they're
            asked to commit to a name. Persisted to localStorage on every
            keystroke so the value travels through to /onboarding/profile
            (post-signup) and into handle_new_user via user_metadata —
            zero-cost UX for the user, who never has to retype it. */}
        <div className="mt-xl flex w-full flex-col gap-sm rounded-2xl border border-primary/40 bg-primary/5 px-md py-md">
          <p className="font-title-sm text-title-sm font-bold text-on-surface">
            Claim your handle
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Once it&apos;s yours, it&apos;s yours — only one @name per rater on GrubGauge.
          </p>
          <UsernameClaimField
            value={handle}
            onChange={handleHandleChange}
            label="Pick your @"
            hideIdleHint
          />
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
      </PageShell>

      {/* Bottom spacer */}
      <div className="flex-1" />
    </>
  );
}
