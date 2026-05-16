"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/useAuth";
import { useProfile } from "@/lib/profile/useProfile";
import { updateProfile, upsertProfile } from "@/lib/profile/profile";
import { displayNameForProfile, initialForName } from "@/lib/profile/names";
import { applyPendingFollow } from "@/lib/follows/applyPending";
import { PageShell } from "@/components/layout/PageShell";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { UsernameClaimField } from "@/components/onboarding/UsernameClaimField";
import {
  getAvatarUrl,
  getFoodPrefs,
  getUsername,
  setAvatarUrl,
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
  // After the profiles cutover, username/display_name/avatar_url come from
  // public.profiles (read via useProfile). food_prefs still lives on
  // user_metadata, so we keep reading it from `user` directly.
  const { profile, loading: profileLoading } = useProfile();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  // Avatar URL state lives on the page so it can be batched into the
  // profiles upsert call alongside the username. The AvatarUploader
  // handles the Storage write + local mirror itself; this page is
  // responsible for persisting the URL to public.profiles.
  const [avatarUrl, setAvatarUrlState] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate the form once auth + profile resolve. Signed-in: read handle,
  // display name + avatar_url from public.profiles (canonical cross-device
  // source) and food_prefs from user_metadata. Guest: fall back to the
  // local handle mirror. This
  // is a genuine one-shot async hydration — values depend on async
  // resources, so `useState` lazy init can't replace it. The `hydrated`
  // flag prevents a re-fire from clobbering user edits.
  useEffect(() => {
    if (authLoading || hydrated) return;
    if (user && profileLoading) return;

    const meta = user?.user_metadata ?? {};
    const metaPrefs = Array.isArray(meta.food_prefs) ? (meta.food_prefs as string[]) : [];
    const profileUsername = profile?.username ?? "";
    const profileDisplayName = profile?.display_name ?? "";
    const profileAvatar = profile?.avatar_url ?? "";

    const nextHandle = (user && profileUsername) || getUsername();
    const nextDisplayName = user ? profileDisplayName : "";
    const nextPrefs = user && metaPrefs.length > 0 ? metaPrefs : getFoodPrefs();
    const nextAvatar = (user && profileAvatar) || getAvatarUrl();
    /* eslint-disable react-hooks/set-state-in-effect */
    setHandle(nextHandle);
    setDisplayName(nextDisplayName);
    setSelected(nextPrefs);
    setAvatarUrlState(nextAvatar);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [authLoading, hydrated, user, profile, profileLoading]);

  function togglePref(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleFinish() {
    if (saving) return;
    setSaving(true);
    try {
      const trimmedHandle = handle.trim();
      const trimmedDisplayName = displayName.trim();

      // Local mirror — kept for guest sessions and as a fast-path hydration
      // source on subsequent visits. Identity is additive: writing to
      // localStorage never replaces the auth-backed user_metadata, only
      // shadows it on this device.
      if (trimmedHandle) setUsername(trimmedHandle);
      setFoodPrefs(selected);
      setOnboarded();

      // Canonical cross-device sources for signed-in users — survive
      // sign-out / sign-in and travel with the account. Username is the
      // unique @ handle; display_name is the friendly label shown in UI;
      // avatar_url lives beside them in public.profiles. food_prefs stays
      // on user_metadata.
      if (user) {
        const supabase = createClient();
        const resolvedUsername = (trimmedHandle || profile?.username || "").trim();
        const profilePatch = {
          display_name: trimmedDisplayName || null,
          avatar_url: avatarUrl || null,
        };
        await Promise.all([
          resolvedUsername
            ? upsertProfile(supabase, {
                username: resolvedUsername,
                ...profilePatch,
              })
            : updateProfile(supabase, profilePatch),
          supabase.auth.updateUser({ data: { food_prefs: selected } }),
        ]);
        // Keep the local mirror aligned with the canonical write — covers
        // the edge where the avatar URL changed but the user hit Skip
        // without triggering an AvatarUploader update flow.
        setAvatarUrl(avatarUrl);
      }

      // Signed-up users land on their actual profile so the just-saved
      // profile identity is immediately visible; guests reach this screen via
      // the "Update preferences" link on /profile, so /profile is the
      // correct return target for them too.
      //
      // If a guest tapped Follow on someone before signup, honor that
      // intent now: applyPendingFollow runs the follow on the now-active
      // session and returns the path the user originally wanted to land
      // back on. Guests (no `user`) skip this — the helper short-circuits
      // because applyPendingFollow internally requires an auth session.
      const supabase = createClient();
      const next = user ? await applyPendingFollow(supabase) : null;
      router.push(next ?? "/profile");
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

      {/* Photo — signed-in only. Guests see the existing handle /
          food-prefs flow unchanged; the avatar feature is gated behind a
          real account so RLS-owned Storage writes always have an auth.uid()
          to bind to. */}
      {user && hydrated && (
        <div className="mb-lg flex flex-col gap-xs">
          <label
            className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
          >
            Profile photo
          </label>
          <AvatarUploader
            currentUrl={avatarUrl}
            initial={initialForName(
              displayName.trim() || displayNameForProfile(profile, handle || user.email || "•"),
            )}
            onChange={(next) => setAvatarUrlState(next)}
          />
        </div>
      )}

      {/* Display name — friendly, mutable identity label. Only shown for
          signed-in users because guests do not have a canonical profile row
          to persist it to yet. */}
      {user && hydrated && (
        <div className="mb-lg flex flex-col gap-xs">
          <label
            htmlFor="display-name"
            className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
          >
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            placeholder="What should people call you?"
            autoComplete="name"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-[13px] font-body-md text-body-md text-on-surface placeholder-on-surface-variant/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Shown on your profile, ratings, and follow lists. You can change it anytime.
          </p>
        </div>
      )}

      {/* Handle — same UsernameClaimField as /onboarding welcome so the
          live availability + scarcity messaging carries through to the
          post-signup setup step. If the user pre-claimed on welcome, the
          value pre-fills from localStorage via the `handle` state seeded by
          the hydration effect above; no retyping. handle_new_user trigger
          will resolve any collision at write time. */}
      <div className="mb-lg">
        <UsernameClaimField
          value={handle}
          onChange={(next) => setHandle(next)}
          label="Your @ handle"
          excludeUserIdFromAvailability={user?.id ?? null}
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
