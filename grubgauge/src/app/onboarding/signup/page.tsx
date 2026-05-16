"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/useAuth";
import { PageShell } from "@/components/layout/PageShell";
import { isOnboarded, setOnboarded } from "@/lib/identity/deviceId";
import { applyPendingFollow } from "@/lib/follows/applyPending";
import { notifyCoreActionCompleted } from "@/lib/pwa/installPrompt";

type Mode = "signup" | "signin";

/**
 * Next.js 15 / 16 requires `useSearchParams()` to live inside a
 * `<Suspense>` boundary so the page can be prerendered. Split the page
 * into a thin export wrapper + the inner component that owns the search
 * params hook. The fallback mirrors the form shell so layout doesn't
 * flicker between SSR and hydration.
 */
export default function OnboardingAuthPage() {
  return (
    <Suspense
      fallback={
        <PageShell variant="form" className="pt-lg pb-10">
          <div className="h-[420px]" aria-hidden />
        </PageShell>
      }
    >
      <OnboardingAuthPageInner />
    </Suspense>
  );
}

function OnboardingAuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  // Default mode: returning user (onboarded device) → sign in; new visitor →
  // sign up. URL param `?mode=signin|signup` overrides for deep-links
  // (e.g. the History upsell card). isOnboarded() is localStorage-backed and
  // safe to call here because the route is client-rendered.
  const [mode, setMode] = useState<Mode>(() => {
    const param = searchParams?.get("mode");
    if (param === "signin" || param === "signup") return param;
    if (typeof window !== "undefined" && isOnboarded()) return "signin";
    return "signup";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when a signUp succeeded with no session (Supabase project has
  // "Confirm email" enabled). Drives the inline "Check your inbox" state
  // — never silently redirect into authenticated flows when session is null.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Email-confirmation path lands here already authenticated. If the
  // visitor opened the FollowGateSheet before verifying, honor that
  // intent before falling through to the canonical /profile landing.
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const next = await applyPendingFollow(supabase);
      if (cancelled) return;
      router.replace(next ?? "/profile");
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) {
          // Supabase doesn't distinguish "wrong password" from "no account"
          // (anti-enumeration), so on `Invalid login credentials` we bounce
          // into signup mode with the email preserved — per user spec, a
          // failed signin should route would-be members into account
          // creation. Password is cleared (force re-entry) and the
          // segmented toggle remains visible so a typo can be corrected.
          if (/invalid login credentials/i.test(authError.message)) {
            setMode("signup");
            setPassword("");
            setError("We couldn't find that account. Create one below, or switch back to Sign in.");
            return;
          }
          setError(humanizeAuthError(authError.message, "signin"));
          return;
        }
        if (!data.session) {
          // Defensive: signInWithPassword normally creates a session on
          // success. If it doesn't (account not yet confirmed, etc.),
          // surface that explicitly rather than redirecting blind.
          setError(
            "Signed in but no session was created. Your email may not be verified yet — check your inbox.",
          );
          return;
        }
        setOnboarded();
        notifyCoreActionCompleted();
        const next = await applyPendingFollow(supabase);
        router.push(next ?? "/profile");
        return;
      }

      // mode === "signup"
      const emailRedirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/profile` : undefined;
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (authError) {
        // Supabase returns "User already registered" when confirmation is
        // off and the email exists. Nudge into signin mode automatically.
        const msg = authError.message ?? "";
        if (/already (registered|exists)/i.test(msg)) {
          setMode("signin");
          setError("That email already has an account. Sign in below to continue.");
          return;
        }
        setError(humanizeAuthError(msg, "signup"));
        return;
      }
      // Supabase confirmation-on response shape: when an email already
      // exists with confirmation pending, `data.user.identities` is empty
      // (anti-enumeration). Treat that as "already has an account."
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setMode("signin");
        setError("That email already has an account. Sign in below to continue.");
        return;
      }
      if (data.session) {
        notifyCoreActionCompleted();
        router.push("/onboarding/profile");
        return;
      }
      setOnboarded();
      notifyCoreActionCompleted();
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

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
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
              setMode("signin");
              setPassword("");
            }}
            className="w-full text-center font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            I already verified — sign in
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Auth form (signup ⇄ signin) ──────────────────────────────────────────

  const isSignup = mode === "signup";

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
      <div className="mb-lg">
        <h1 className="font-headline-md text-headline-md font-semibold text-on-surface">
          {isSignup ? "Sign up for GrubGauge" : "Welcome back"}
        </h1>
        <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
          {isSignup
            ? "Save your ratings and access your history from any device."
            : "Sign in to access your ratings from any device."}
        </p>
      </div>

      {/* Mode toggle (segmented) */}
      <div className="mb-lg grid grid-cols-2 gap-base rounded-xl border border-outline-variant bg-surface-container-low p-[3px]">
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={`rounded-lg py-xs font-label-sm text-label-sm font-semibold transition-colors ${
            !isSignup
              ? "bg-primary-container text-on-primary-container"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`rounded-lg py-xs font-label-sm text-label-sm font-semibold transition-colors ${
            isSignup
              ? "bg-primary-container text-on-primary-container"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-md">
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
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 6 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignup ? "Min. 6 characters" : "Your password"}
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
              {isSignup ? "Signing up…" : "Signing in…"}
            </>
          ) : isSignup ? (
            "Sign Up"
          ) : (
            "Sign In"
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function humanizeAuthError(message: string, mode: Mode): string {
  const m = message.toLowerCase();
  if (m.includes("email rate limit")) {
    return "Too many verification emails sent recently. Please wait a few minutes and try again, or use a different email.";
  }
  if (m.includes("email not confirmed")) {
    return "Your email isn't verified yet. Check your inbox for the verification link, then try signing in again.";
  }
  if (m.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (mode === "signup" && /weak password|password should be/i.test(message)) {
    return "Password is too weak — use at least 6 characters.";
  }
  return message || "Something went wrong. Please try again.";
}
