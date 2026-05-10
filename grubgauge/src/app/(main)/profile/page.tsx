"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { useAuth } from "@/lib/auth/useAuth";
import { getUsername } from "@/lib/identity/deviceId";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
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
              Create a free account to access your history from any device and never lose a rating.
            </p>
            <Link
              href="/onboarding/signup"
              className="mt-xs flex w-full items-center justify-center gap-xs rounded-xl bg-primary py-[12px] font-title-sm text-title-sm font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                person_add
              </span>
              Create Account
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

  const initial = (user.email ?? "•").trim().charAt(0).toUpperCase() || "•";

  return (
    <PageShell variant="form" className="pt-lg pb-10">
      <div className="flex flex-col gap-lg">
        <div>
          <h1 className="font-headline-md text-headline-md font-semibold text-on-surface">Profile</h1>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
            Account and preferences.
          </p>
        </div>

        {/* Identity card */}
        <div className="flex items-center gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high font-headline-md text-headline-md font-bold text-on-surface">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Signed in as</p>
            <p className="mt-1 font-body-md text-body-md font-medium text-on-surface truncate">{user.email}</p>
          </div>
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
