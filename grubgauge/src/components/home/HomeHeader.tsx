"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { BrandMark } from "@/components/brand/BrandMark";
import { navItems } from "@/lib/nav";
import { useAuth } from "@/lib/auth/useAuth";
import { useProfile } from "@/lib/profile/useProfile";
import type { Profile } from "@/lib/profile/profile";
import { displayNameForProfile, initialForName } from "@/lib/profile/names";

function initialFor(user: User, profile: Profile | null): string {
  const source = displayNameForProfile(profile, user.email ?? "");
  return initialForName(source);
}

function avatarUrlFor(profile: Profile | null): string {
  const url = profile?.avatar_url;
  return typeof url === "string" && url.length > 0 ? url : "";
}

function ProfileAvatar({ user }: { user: User }) {
  // useProfile keeps this slot in sync with the canonical row — refetches
  // on a `profile:updated` window event so a photo committed on /profile
  // appears here without a navigation.
  const { profile } = useProfile();
  const url = avatarUrlFor(profile);
  return (
    <Link
      href="/profile"
      aria-label="Profile and settings"
      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-high font-label-sm text-label-sm font-bold text-on-surface transition-colors hover:bg-surface-variant active:scale-95"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar from Storage; sized 32px, no LCP role
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        initialFor(user, profile)
      )}
    </Link>
  );
}

/**
 * Two text-only entry points so members aren't pushed through a sign-up
 * funnel they don't need. Each link deep-links the dual-mode auth page
 * directly to its mode (`?mode=signin|signup`), bypassing the
 * isOnboarded() smart-default — explicit intent wins over inference here
 * because the user clicked a specific link.
 */
function SignedOutLinks() {
  return (
    <div className="flex shrink-0 items-center gap-sm">
      <Link
        href="/onboarding/signup?mode=signin"
        className="font-label-sm text-label-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
      >
        Sign In
      </Link>
      <span aria-hidden className="font-label-sm text-label-sm text-outline-variant">·</span>
      <Link
        href="/onboarding/signup?mode=signup"
        className="font-label-sm text-label-sm font-semibold text-primary hover:brightness-110 transition-all"
      >
        Sign Up
      </Link>
    </div>
  );
}

/**
 * Auth-aware right slot:
 * - `loading` → fixed-size placeholder (prevents CTA flicker on first paint)
 * - signed-in → profile avatar → /profile
 * - signed-out → text-only "Sign In · Sign Up" pair (both deep-link into
 *   the dual-mode auth page at the appropriate mode)
 */
function AuthSlot() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-8 w-8 shrink-0" aria-hidden />;
  }
  return user ? <ProfileAvatar user={user} /> : <SignedOutLinks />;
}

export function HomeHeader() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-outline-variant bg-surface-container-low text-primary md:hidden">
        <div className="mx-auto flex h-16 w-full min-w-0 max-w-5xl items-center justify-between gap-x-3 px-margin-edge">
          <div className="shrink-0">
            <BrandMark />
          </div>
          <AuthSlot />
        </div>
      </header>
      <header className="sticky top-0 z-40 hidden w-full border-b border-outline-variant bg-surface-container-low text-primary shadow-sm md:block">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between gap-x-4 px-margin-edge py-3 md:py-0">
          <div className="shrink-0">
            <BrandMark />
          </div>
          <nav className="flex flex-1 flex-wrap justify-center gap-x-4 gap-y-1">
            {navItems.map(({ href, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-lg px-4 py-2 transition-colors hover:bg-surface-variant active:scale-95 ${
                    active ? "font-bold text-primary" : "text-on-surface-variant"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center">
            <AuthSlot />
          </div>
        </div>
      </header>
    </>
  );
}
