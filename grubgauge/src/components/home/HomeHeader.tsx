"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { BrandMark } from "@/components/brand/BrandMark";
import { navItems } from "@/lib/nav";
import { useAuth } from "@/lib/auth/useAuth";

function initialFor(user: User): string {
  const source = user.user_metadata?.username ?? user.email ?? "";
  const ch = source.trim().charAt(0).toUpperCase();
  return ch || "•";
}

function ProfileAvatar({ user }: { user: User }) {
  return (
    <Link
      href="/profile"
      aria-label="Profile and settings"
      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-high font-label-sm text-label-sm font-bold text-on-surface transition-colors hover:bg-surface-variant active:scale-95"
    >
      {initialFor(user)}
    </Link>
  );
}

/**
 * Two text-only entry points so members aren't pushed through a Create
 * Account funnel they don't need. Each link deep-links the dual-mode auth
 * page directly to its mode (`?mode=signin|signup`), bypassing the
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
        Sign in
      </Link>
      <span aria-hidden className="font-label-sm text-label-sm text-outline-variant">·</span>
      <Link
        href="/onboarding/signup?mode=signup"
        className="font-label-sm text-label-sm font-semibold text-primary hover:brightness-110 transition-all"
      >
        Create account
      </Link>
    </div>
  );
}

/**
 * Auth-aware right slot:
 * - `loading` → fixed-size placeholder (prevents CTA flicker on first paint)
 * - signed-in → profile avatar → /profile
 * - signed-out → text-only "Sign in · Create account" pair (both deep-link
 *   into the dual-mode auth page at the appropriate mode)
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
