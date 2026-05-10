"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { setOnboarded } from "@/lib/identity/deviceId";

export default function OnboardingSignupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When Supabase project has "Confirm email" enabled, signUp returns success
  // with `session: null`. Surface a "check your inbox" state instead of
  // silently routing the user into a flow that assumes they're authenticated
  // — that path was the source of the post-signup loop on prod.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // If the user lands here already signed in (e.g. clicked an old CTA after
  // a successful verification), bounce them to /profile — never re-show
  // the signup form to an authenticated account.
  useEffect(() => {
    if (!authLoading && user) router.replace("/profile");
  }, [authLoading, user, router]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const emailRedirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/profile` : undefined;
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data.session) {
        // Email confirmation disabled (or already auto-confirmed) → real
        // session in hand, proceed to the quick preferences setup.
        router.push("/onboarding/profile");
        return;
      }
      // Email confirmation required → no session yet. Mark device as
      // onboarded so the welcome gate doesn't re-trap them, and show the
      // "check your inbox" state on this page.
      setOnboarded();
      setPendingEmail(email);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGuest() {
    setOnboarded();
    router.push("/");
  }

  // ── Awaiting email verification ───────────────────────────────────────────

  if (pendingEmail) {
    return (
      <PageShell variant="form" className="pt-lg pb-10">
        <Link
          href="/onboarding"
          className="mb-lg inline-flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </Link>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 mb-md">
          <span
            className="material-symbols-outlined text-[26px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            mark_email_read
          </span>
        </div>

        <h1 className="font-headline-md text-headline-md font-semibold text-on-surface">
          Check your inbox
        </h1>
        <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
          We sent a verification link to <span className="text-on-surface font-medium">{pendingEmail}</span>.
          Click it to finish setting up your account — you&apos;ll land back here signed in.
        </p>

        <div className="mt-xl flex flex-col gap-sm">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-xs rounded-xl border border-outline-variant bg-surface-container-low py-[14px] font-title-sm text-title-sm font-semibold text-on-surface-variant transition-all hover:bg-surface-container active:scale-95"
          >
            Continue browsing
          </Link>
          <button
            type="button"
            onClick={() => {
              setPendingEmail(null);
              setEmail("");
              setPassword("");
            }}
            className="w-full text-center font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Use a different email
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Default signup form ───────────────────────────────────────────────────

  return (
    <PageShell variant="form" className="pt-lg pb-10">
      {/* Back */}
      <Link
        href="/onboarding"
        className="mb-lg inline-flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back
      </Link>

      {/* Heading */}
      <div className="mb-xl">
        <h1 className="font-headline-md text-headline-md font-semibold text-on-surface">
          Create your account
        </h1>
        <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
          Save your ratings and access your history from any device.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSignUp} className="flex flex-col gap-md">
        <div className="flex flex-col gap-xs">
          <label htmlFor="email" className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-[13px] font-body-md text-body-md text-on-surface placeholder-on-surface-variant/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label htmlFor="password" className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-[13px] font-body-md text-body-md text-on-surface placeholder-on-surface-variant/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-error/40 bg-error-container/20 px-md py-sm">
            <p className="font-body-md text-body-md text-error">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-xs flex w-full items-center justify-center gap-xs rounded-xl bg-primary py-[14px] font-title-sm text-title-sm font-bold text-on-primary transition-all hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              Creating account…
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-lg flex items-center gap-sm">
        <div className="h-px flex-1 bg-outline-variant" />
        <span className="font-label-sm text-label-sm text-on-surface-variant">or</span>
        <div className="h-px flex-1 bg-outline-variant" />
      </div>

      {/* Guest */}
      <button
        type="button"
        onClick={handleGuest}
        className="w-full rounded-xl border border-outline-variant bg-surface-container-low py-[14px] font-title-sm text-title-sm font-semibold text-on-surface-variant transition-all hover:bg-surface-container active:scale-95"
      >
        Skip, continue as guest
      </button>
    </PageShell>
  );
}
