"use client";

import { useEffect, useState } from "react";
import {
  INSTALL_CORE_ACTION_EVENT,
  INSTALL_ELIGIBLE_KEY,
} from "@/lib/pwa/installPrompt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

const DISMISSED_KEY = "grubgauge_install_prompt_dismissed";
const INSTALLED_KEY = "grubgauge_install_prompt_installed";
const ENGAGEMENT_DELAY_MS = 30_000;

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

function shouldSuppressPrompt(): boolean {
  return (
    isStandalone() ||
    localStorage.getItem(DISMISSED_KEY) === "true" ||
    localStorage.getItem(INSTALLED_KEY) === "true"
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
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [eligible, setEligible] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (shouldSuppressPrompt()) return;

    setIsIos(isIosDevice());
    if (localStorage.getItem(INSTALL_ELIGIBLE_KEY) === "true") {
      setEligible(true);
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
      localStorage.setItem(INSTALLED_KEY, "true");
      localStorage.removeItem(INSTALL_ELIGIBLE_KEY);
      setVisible(false);
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
  }, []);

  useEffect(() => {
    if (shouldSuppressPrompt()) return;
    if (!eligible) return;
    if (deferredPrompt || isIos) setVisible(true);
  }, [eligible, deferredPrompt, isIos]);

  async function handleInstall() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    localStorage.setItem(
      choice.outcome === "accepted" ? INSTALLED_KEY : DISMISSED_KEY,
      "true",
    );
    localStorage.removeItem(INSTALL_ELIGIBLE_KEY);
    setVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    localStorage.removeItem(INSTALL_ELIGIBLE_KEY);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section
      aria-labelledby="install-prompt-title"
      className="fixed inset-x-margin-edge bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-outline-variant bg-surface-container-high p-md shadow-xl"
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

        {isIos ? (
          <div className="rounded-xl bg-surface-container-low p-sm font-body-md text-body-md text-on-surface-variant">
            Tap Share, then Add to Home Screen.
          </div>
        ) : (
          <button
            type="button"
            onClick={handleInstall}
            className="flex w-full items-center justify-center rounded-xl bg-primary py-[12px] font-title-sm text-title-sm font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
          >
            Install App
          </button>
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
