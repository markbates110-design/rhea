"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { isOnboarded, setOnboarded } from "@/lib/identity/deviceId";

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

  useEffect(() => {
    if (isOnboarded()) router.replace("/");
  }, [router]);

  function handleGuest() {
    setOnboarded();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top spacer */}
      <div className="flex-1" />

      <div className="mx-auto w-full max-w-5xl px-margin-edge pb-10">
        <main className="mx-auto w-full max-w-2xl">
        {/* Brand */}
        <div className="flex flex-col items-center gap-sm text-center">
          <div className="mb-xs flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            <span
              className="material-symbols-outlined text-[36px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              restaurant
            </span>
          </div>
          <BrandMark as="h1" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Find true culinary value.
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
      </main>
      </div>

      {/* Bottom spacer */}
      <div className="flex-1" />
    </div>
  );
}
