"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import {
  getFoodPrefs,
  getUsername,
  setFoodPrefs,
  setOnboarded,
  setUsername,
} from "@/lib/identity/deviceId";

const FOOD_OPTIONS = [
  { id: "fast-food",  label: "Fast Food",     icon: "fastfood" },
  { id: "casual",     label: "Casual Dining", icon: "restaurant" },
  { id: "fine",       label: "Fine Dining",   icon: "dining" },
  { id: "food-truck", label: "Food Trucks",   icon: "local_shipping" },
];

export default function OnboardingProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate the form. Signed-in: read from Supabase user_metadata (canonical
  // cross-device source). Guest: fall back to localStorage. Either case
  // produces a one-shot initial value — we never overwrite local edits on
  // re-render. Guarded by `hydrated` so a slow auth resolution doesn't
  // clobber a user's typed input.
  useEffect(() => {
    if (authLoading || hydrated) return;
    if (user) {
      const meta = user.user_metadata ?? {};
      const metaUsername = typeof meta.username === "string" ? meta.username : "";
      const metaPrefs = Array.isArray(meta.food_prefs) ? (meta.food_prefs as string[]) : [];
      setName(metaUsername || getUsername());
      setSelected(metaPrefs.length > 0 ? metaPrefs : getFoodPrefs());
    } else {
      setName(getUsername());
      setSelected(getFoodPrefs());
    }
    setHydrated(true);
  }, [authLoading, hydrated, user]);

  function togglePref(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleFinish() {
    if (saving) return;
    setSaving(true);
    try {
      const trimmedName = name.trim();

      // Local mirror — kept for guest sessions and as a fast-path hydration
      // source on subsequent visits. Identity is additive: writing to
      // localStorage never replaces the auth-backed user_metadata, only
      // shadows it on this device.
      if (trimmedName) setUsername(trimmedName);
      setFoodPrefs(selected);
      setOnboarded();

      // Canonical cross-device source for signed-in users — survives
      // sign-out / sign-in and travels with the account, not the browser.
      if (user) {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: { username: trimmedName, food_prefs: selected },
        });
      }

      // Signed-up users land on their actual profile so the just-saved
      // screen name is immediately visible; guests reach this screen via
      // the "Update preferences" link on /profile, so /profile is the
      // correct return target for them too.
      router.push("/profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell variant="form" className="pt-lg pb-10">
      {/* Header */}
      <div className="mb-xl flex flex-col gap-xs">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
          <span
            className="material-symbols-outlined text-[22px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <h1 className="font-headline-md text-headline-md font-semibold text-on-surface">
          You&apos;re in!
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Quick setup — takes 10 seconds. All optional.
        </p>
      </div>

      {/* Name */}
      <div className="mb-lg flex flex-col gap-xs">
        <label
          htmlFor="username"
          className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
        >
          What should we call you?
        </label>
        <input
          id="username"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name or nickname"
          autoComplete="given-name"
          className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-[13px] font-body-md text-body-md text-on-surface placeholder-on-surface-variant/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Food prefs */}
      <div className="mb-xl flex flex-col gap-sm">
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
          What do you usually eat?
        </p>
        <div className="grid grid-cols-2 gap-sm">
          {FOOD_OPTIONS.map((opt) => {
            const active = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => togglePref(opt.id)}
                className={`flex flex-col items-center gap-xs rounded-xl border p-md transition-all active:scale-95 ${
                  active
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[26px]"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {opt.icon}
                </span>
                <span className="font-label-sm text-label-sm leading-tight">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleFinish}
        disabled={saving}
        className="flex w-full items-center justify-center gap-xs rounded-xl bg-primary py-[14px] font-title-sm text-title-sm font-bold text-on-primary transition-all hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? (
          <>
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            Saving…
          </>
        ) : (
          <>
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              arrow_forward
            </span>
            Start Rating
          </>
        )}
      </button>

      {/* Skip prefs */}
      <button
        type="button"
        onClick={handleFinish}
        disabled={saving}
        className="mt-md w-full text-center font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-60"
      >
        Skip setup
      </button>
    </PageShell>
  );
}
