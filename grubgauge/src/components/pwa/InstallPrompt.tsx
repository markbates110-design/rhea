"use client";

import { useEffect, useState } from "react";
import {
  INSTALL_CORE_ACTION_EVENT,
  INSTALL_DISMISS_COOLDOWN_MS,
  INSTALL_DISMISSED_UNTIL_KEY,
  INSTALL_ELIGIBLE_KEY,
  INSTALL_INSTALLED_KEY,
} from "@/lib/pwa/installPrompt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

const ENGAGEMENT_DELAY_MS = 30_000;

type Platform = "ios" | "android" | "unsupported";
type InstallPromptVariant = "floating" | "inline";

interface InstallPromptProps {
  variant?: InstallPromptVariant;
  showImmediately?: boolean;
  ignoreDismissCooldown?: boolean;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosDevice(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();
  const touchMac = platform === "macintel" && window.navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/.test(ua) || touchMac;
}

function detectPlatform(): Platform {
  if (isIosDevice()) return "ios";
  if (/android/i.test(window.navigator.userAgent)) return "android";
  return "unsupported";
}

function isDismissedInCooldown(): boolean {
  const raw = localStorage.getItem(INSTALL_DISMISSED_UNTIL_KEY);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && Date.now() < until;
}

function shouldSuppressPrompt(ignoreDismissCooldown = false): boolean {
  return (
    isStandalone() ||
    (!ignoreDismissCooldown && isDismissedInCooldown()) ||
    localStorage.getItem(INSTALL_INSTALLED_KEY) === "true"
  );
}

/**
 * Conversion prompt for PWA installs.
 *
 * Android/Chrome exposes `beforeinstallprompt`, which lets us show a custom
 * card and trigger the native install sheet from a button. iOS Safari has no
 * equivalent event, so the best UX is clear manual instructions after the user
 * has already shown intent.
 */
export function InstallPrompt({
  variant = "floating",
  showImmediately = false,
  ignoreDismissCooldown = false,
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [eligible, setEligible] = useState(showImmediately);
  const [platform] = useState<Platform>(() => {
    if (typeof window === "undefined") return "unsupported";
    return detectPlatform();
  });
  const visible = eligible && (platform === "ios" || platform === "android");

  useEffect(() => {
    if (shouldSuppressPrompt(ignoreDismissCooldown)) return;

    if (localStorage.getItem(INSTALL_ELIGIBLE_KEY) === "true") {
      queueMicrotask(() => setEligible(true));
    }

    const timer = window.setTimeout(() => {
      setEligible(true);
    }, ENGAGEMENT_DELAY_MS);

    function handleCoreAction() {
      localStorage.setItem(INSTALL_ELIGIBLE_KEY, "true");
      setEligible(true);
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      localStorage.setItem(INSTALL_INSTALLED_KEY, "true");
      localStorage.removeItem(INSTALL_ELIGIBLE_KEY);
      localStorage.removeItem(INSTALL_DISMISSED_UNTIL_KEY);
      setEligible(false);
    }

    window.addEventListener(INSTALL_CORE_ACTION_EVENT, handleCoreAction);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(INSTALL_CORE_ACTION_EVENT, handleCoreAction);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [ignoreDismissCooldown]);

  async function handleInstall() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(INSTALL_INSTALLED_KEY, "true");
      localStorage.removeItem(INSTALL_DISMISSED_UNTIL_KEY);
    } else {
      localStorage.setItem(
        INSTALL_DISMISSED_UNTIL_KEY,
        String(Date.now() + INSTALL_DISMISS_COOLDOWN_MS),
      );
    }
    localStorage.removeItem(INSTALL_ELIGIBLE_KEY);
    setEligible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem(
      INSTALL_DISMISSED_UNTIL_KEY,
      String(Date.now() + INSTALL_DISMISS_COOLDOWN_MS),
    );
    localStorage.removeItem(INSTALL_ELIGIBLE_KEY);
    setEligible(false);
  }

  if (!visible) return null;

  const sectionClasses =
    variant === "inline"
      ? "block rounded-2xl border border-primary/30 bg-primary/5 p-md"
      : "fixed bottom-20 left-1/2 z-50 block -translate-x-1/2 rounded-2xl border border-outline-variant bg-surface-container-high p-md shadow-xl";
  const sectionStyle =
    variant === "inline"
      ? undefined
      : { width: "min(448px, calc(100vw - 40px))", minWidth: "280px" };

  return (
    <section
      aria-labelledby="install-prompt-title"
      className={sectionClasses}
      style={sectionStyle}
    >
      <div className="flex flex-col gap-sm">
        <div className="flex items-start gap-sm">
          <span
            className="material-symbols-outlined mt-0.5 shrink-0 text-[22px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden
          >
            install_mobile
          </span>
          <div className="min-w-0">
            <h2
              id="install-prompt-title"
              className="font-title-sm text-title-sm font-bold text-on-surface"
            >
              Install GrubGauge
            </h2>
            <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
              Faster access, offline fallback, and future notification support.
            </p>
          </div>
        </div>

        {platform === "ios" ? (
          <div className="rounded-xl bg-surface-container-low p-sm font-body-md text-body-md text-on-surface-variant">
            Tap Share, then Add to Home Screen.
          </div>
        ) : deferredPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            className="flex w-full items-center justify-center rounded-xl bg-primary py-[12px] font-title-sm text-title-sm font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
          >
            Install App
          </button>
        ) : (
          <div className="rounded-xl bg-surface-container-low p-sm font-body-md text-body-md text-on-surface-variant">
            Open your browser menu, then choose Install app or Add to Home screen.
          </div>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="w-full text-center font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          Maybe later
        </button>
      </div>
    </section>
  );
}
