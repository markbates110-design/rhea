"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  USERNAME_MAX,
  isUsernameAvailable,
  validateUsername,
} from "@/lib/profile/username";

interface Props {
  /** Controlled value (no `@` prefix). */
  value: string;
  /** Receives the new value (no `@` prefix). Persistence is the caller's job. */
  onChange: (next: string) => void;
  /**
   * Optional id for the field's accessible label. Defaults to a stable
   * literal so the page-level label/input pair is wired without ceremony,
   * but pages embedding two pickers (unlikely) can disambiguate.
   */
  id?: string;
  /**
   * Optional label text. Defaults to "Your handle" — the welcome page may
   * pass a more contextual label ("Claim your @ name").
   */
  label?: string;
  /**
   * When true, suppress the default "Lock it in before someone else does."
   * idle-state hint so callers that provide their own surrounding copy
   * don't double up.
   */
  hideIdleHint?: boolean;
}

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken" }
  | { kind: "too_short" }
  | { kind: "too_long" }
  | { kind: "invalid_chars" };

const DEBOUNCE_MS = 300;

/**
 * Onboarding "stake your handle" input — `@` prefix, live availability
 * check against `public.profiles`, inline scarcity copy. The point is to
 * make claiming a handle feel concrete and time-bounded *before* the
 * user commits to the signup form, mirroring the FOMO mechanic that
 * drove Twitter/Instagram early adoption.
 *
 * Validation runs locally first (length + character set); availability
 * query runs after a 300ms debounce so a typing user isn't pelting the
 * DB. Empty input collapses to a quiet idle state with the default
 * scarcity hint — never an aggressive "invalid!" while the user is
 * mid-thought.
 *
 * Reused on both the welcome page (autoDetected entry point) and the
 * post-signup profile setup page (consistency); persistence is the
 * caller's job — onChange surfaces the latest value, and pages stash
 * to localStorage / public.profiles per their own write path.
 */
export function UsernameClaimField({
  value,
  onChange,
  id = "username-claim",
  label = "Your handle",
  hideIdleHint = false,
}: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const trimmed = value.trim();

    /* eslint-disable react-hooks/set-state-in-effect */
    if (trimmed.length === 0) {
      setStatus({ kind: "idle" });
      return;
    }

    const validation = validateUsername(trimmed);
    if (!validation.ok) {
      setStatus({ kind: validation.reason });
      return;
    }

    setStatus({ kind: "checking" });
    /* eslint-enable react-hooks/set-state-in-effect */

    const requestId = ++reqRef.current;
    timerRef.current = setTimeout(async () => {
      const supabase = createClient();
      const available = await isUsernameAvailable(supabase, trimmed);
      // Drop the response if a later keystroke superseded this one — keeps
      // the visible status in sync with the latest input even when an
      // earlier request is still in flight.
      if (requestId !== reqRef.current) return;
      setStatus({ kind: available ? "available" : "taken" });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  const trimmed = value.trim();
  const statusIcon = statusGlyph(status);
  const statusLine = statusText(status, trimmed, hideIdleHint);

  return (
    <div className="flex flex-col gap-xs">
      <label
        htmlFor={id}
        className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
      >
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant"
        >
          @
        </span>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={USERNAME_MAX}
          placeholder="yourname"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="w-full rounded-xl border border-outline-variant bg-surface-container-low pl-[34px] pr-[40px] py-[13px] font-body-md text-body-md text-on-surface placeholder-on-surface-variant/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {statusIcon && (
          <span
            aria-hidden
            className={`material-symbols-outlined pointer-events-none absolute right-md top-1/2 -translate-y-1/2 text-[20px] ${statusIcon.tint} ${statusIcon.animate ?? ""}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {statusIcon.name}
          </span>
        )}
      </div>
      {statusLine && (
        <p
          role="status"
          aria-live="polite"
          className={`font-label-sm text-label-sm ${statusToneClass(status)}`}
        >
          {statusLine}
        </p>
      )}
    </div>
  );
}

function statusGlyph(
  status: Status,
): { name: string; tint: string; animate?: string } | null {
  switch (status.kind) {
    case "checking":
      return {
        name: "progress_activity",
        tint: "text-on-surface-variant",
        animate: "animate-spin",
      };
    case "available":
      return { name: "check_circle", tint: "text-primary" };
    case "taken":
    case "too_short":
    case "too_long":
    case "invalid_chars":
      return { name: "error", tint: "text-error" };
    case "idle":
    default:
      return null;
  }
}

function statusText(status: Status, trimmed: string, hideIdleHint: boolean): string {
  switch (status.kind) {
    case "idle":
      return hideIdleHint ? "" : "Lock it in before someone else does.";
    case "checking":
      return "Checking…";
    case "available":
      return `@${trimmed} is yours. Claim it.`;
    case "taken":
      return `@${trimmed} is taken. Try a different one.`;
    case "too_short":
      return "Too short — at least 3 characters.";
    case "too_long":
      return "Too long — 30 characters max.";
    case "invalid_chars":
      return "Use letters, numbers, and underscores only.";
  }
}

function statusToneClass(status: Status): string {
  switch (status.kind) {
    case "available":
      return "text-primary font-semibold";
    case "taken":
    case "too_short":
    case "too_long":
    case "invalid_chars":
      return "text-error";
    case "checking":
    case "idle":
    default:
      return "text-on-surface-variant";
  }
}
