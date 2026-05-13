"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { useAuth } from "@/lib/auth/useAuth";
import { getAvatarUrl, getUsername, setAvatarUrl } from "@/lib/identity/deviceId";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  // Local override — set only after the uploader settles, so we can show
  // the new URL before `user_metadata.avatar_url` resolves through the
  // useAuth refresh. `null` means "use canonical". Computing the displayed
  // URL in render (rather than mirroring user_metadata into state via
  // useEffect) keeps us inside the react-hooks/set-state-in-effect rule.
  const [localOverride, setLocalOverride] = useState<string | null>(null);
  const [persisting, setPersisting] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);

  async function handleAvatarChange(nextUrl: string) {
    setLocalOverride(nextUrl);
    setAvatarUrl(nextUrl);
    setPersistError(null);
    setPersisting(true);
    try {
      const supabase = createClient();
      // Persist to user_metadata so the avatar travels with the account.
      // The uploader already wrote the Storage object + local mirror —
      // this is the canonical commit.
      const { error } = await supabase.auth.updateUser({ data: { avatar_url: nextUrl } });
      if (error) {
        setPersistError(error.message || "Couldn't save photo to your profile.");
      }
    } catch (err) {
      setPersistError(err instanceof Error ? err.message : "Couldn't save photo.");
    } finally {
      setPersisting(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // Clear local avatar mirror so a guest reusing the device doesn't
      // see the prior user's photo in any fast-path render.
      setAvatarUrl("");
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageShell variant="form" className="pt-lg pb-10">
        <div className="flex items-center gap-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          <span className="font-body-md text-body-md">Loading…</span>
        </div>
      </PageShell>
    );
  }

  // ── Guest (no Supabase user) ─────────────────────────────────────────────

  if (!user) {
    const guestName = typeof window !== "undefined" ? getUsername() : "";
    return (
      <PageShell variant="form" className="pt-lg pb-10">
        <div className="flex flex-col gap-lg">
          <div>
            <h1 className="font-headline-md text-headline-md font-semibold text-on-surface">Profile</h1>
            <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
              You&apos;re browsing as a guest{guestName ? `, ${guestName}` : ""}.
            </p>
          </div>

          <div className="flex flex-col gap-sm rounded-xl border border-primary/30 bg-primary/5 p-md">
            <div className="flex items-center gap-sm">
              <span
                className="material-symbols-outlined text-[22px] text-primary shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock_open
              </span>
              <p className="font-title-sm text-title-sm font-semibold text-on-surface">Save your ratings forever</p>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Sign up for a free account to access your history from any device and never lose a rating.
            </p>
            <Link
              href="/onboarding/signup?mode=signup"
              className="mt-xs flex w-full items-center justify-center gap-xs rounded-xl bg-primary py-[12px] font-title-sm text-title-sm font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                person_add
              </span>
              Sign Up
            </Link>
          </div>

          <Link
            href="/onboarding/profile"
            className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm transition-colors hover:bg-surface-container"
          >
            <span className="font-body-md text-body-md text-on-surface">Update preferences</span>
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">chevron_right</span>
          </Link>
        </div>
      </PageShell>
    );
  }

  // ── Signed in ────────────────────────────────────────────────────────────

  // Username lives on Supabase user_metadata (cross-device source of truth);
  // fall back to email's local part if the user hasn't set a screen name
  // yet, and finally to the bullet glyph so the avatar initials never empty.
  const metaUsername =
    typeof user.user_metadata?.username === "string" ? user.user_metadata.username.trim() : "";
  const emailLocal = (user.email ?? "").split("@")[0];
  const displayName = metaUsername || emailLocal || "there";
  const initial = (metaUsername || user.email || "•").trim().charAt(0).toUpperCase() || "•";
  // Canonical avatar URL from user_metadata, with localStorage as a
  // fast-path fallback for the first render after sign-in. localOverride
  // wins so the just-uploaded photo paints instantly.
  const metaAvatar =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "";
  const avatarUrl =
    localOverride !== null
      ? localOverride
      : metaAvatar || (typeof window !== "undefined" ? getAvatarUrl() : "");

  return (
    <PageShell variant="form" className="pt-lg pb-10">
      <div className="flex flex-col gap-lg">
        {/* Avatar above name — uploader doubles as Edit/Remove affordance. */}
        <div className="flex flex-col items-start gap-sm">
          <AvatarUploader
            currentUrl={avatarUrl}
            initial={initial}
            onChange={handleAvatarChange}
          />
          {persisting && (
            <p className="font-label-sm text-label-sm text-on-surface-variant">Saving…</p>
          )}
          {persistError && (
            <p className="font-label-sm text-label-sm text-error" role="alert">
              {persistError}
            </p>
          )}
        </div>

        <div>
          <h1 className="font-headline-md text-headline-md font-semibold text-on-surface">
            Hey, {displayName}
          </h1>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant truncate">
            {user.email}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-sm">
          <Link
            href="/onboarding/profile"
            className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm transition-colors hover:bg-surface-container"
          >
            <span className="font-body-md text-body-md text-on-surface">Update preferences</span>
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">chevron_right</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center justify-center gap-xs rounded-xl border border-outline-variant bg-surface-container-low py-[14px] font-title-sm text-title-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {signingOut ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                Signing out…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign out
              </>
            )}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
