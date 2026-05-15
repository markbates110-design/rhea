"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { clearPendingFollow } from "@/lib/follows/pendingFollow";

export interface FollowGateTarget {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Props {
  open: boolean;
  target: FollowGateTarget;
  onDismiss: () => void;
}

/**
 * Guest-tap conversion sheet for "Follow". Triggered by FollowButton when
 * an unauthenticated user taps Follow on a profile / list / suggested-user
 * card. The pending intent (target id + return path) is set by the caller
 * before opening; this component only owns the visual + dismiss surface.
 *
 * Dismiss paths:
 *   - Tap "Continue browsing" → clears pending intent (the user changed
 *     their mind; no auto-follow on a later, unrelated sign-up).
 *   - Tap the backdrop → clears pending intent (same rationale).
 *   - Press Escape → clears pending intent (same).
 *   - Tap "Sign Up" / "Sign In" → leaves intent in place; the success
 *     handler at /onboarding/* will consume + auto-follow.
 *
 * Portal + inline styling mirror DeleteRatingConfirm's escape hatch from
 * Tailwind utility conflicts inside nested overlays — same shape, same
 * design tokens, so the two modals feel like a matched set.
 */
export function FollowGateSheet({ open, target, onDismiss }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        clearPendingFollow();
        onDismiss();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (typeof document === "undefined" || !open) return null;

  function dismissAndClear() {
    clearPendingFollow();
    onDismiss();
  }

  const initial = target.displayName.trim().charAt(0).toUpperCase() || "•";

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
      }}
      onClick={dismissAndClear}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grub-follow-gate-title"
        style={{
          boxSizing: "border-box",
          flexShrink: 0,
          width: "min(384px, calc(100vw - 32px))",
          minWidth: 280,
          maxWidth: 384,
          padding: 24,
          borderRadius: 16,
          border: "1px solid #2e2a21",
          backgroundColor: "#252118",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          aria-hidden
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            width: 64,
            height: 64,
            borderRadius: 9999,
            border: "1px solid #6b6350",
            backgroundColor: "#3a3526",
            color: "#e8dcc4",
            fontSize: 28,
            fontWeight: 700,
            fontFamily:
              "var(--font-work-sans, ui-sans-serif, system-ui, sans-serif)",
          }}
        >
          {target.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar from Storage; sized 64px, no LCP role
            <img
              src={target.avatarUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              referrerPolicy="no-referrer"
            />
          ) : (
            initial
          )}
        </span>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2
            id="grub-follow-gate-title"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.33,
              color: "#e8dcc4",
              fontFamily:
                "var(--font-work-sans, ui-sans-serif, system-ui, sans-serif)",
            }}
          >
            Follow {target.displayName}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.5,
              fontWeight: 400,
              color: "#c4b896",
              fontFamily:
                "var(--font-work-sans, ui-sans-serif, system-ui, sans-serif)",
            }}
          >
            Sign up to follow raters and build a feed of trusted spots.
            We&apos;ll finish the follow for you after you&apos;re in.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            width: "100%",
          }}
        >
          <Link
            href="/onboarding/signup?mode=signup"
            style={{
              display: "block",
              textAlign: "center",
              borderRadius: 10,
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 700,
              fontFamily:
                "var(--font-work-sans, ui-sans-serif, system-ui, sans-serif)",
              backgroundColor: "var(--color-primary-container)",
              color: "var(--color-on-primary-container)",
              textDecoration: "none",
            }}
          >
            Sign Up
          </Link>
          <Link
            href="/onboarding/signup?mode=signin"
            style={{
              display: "block",
              textAlign: "center",
              borderRadius: 10,
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily:
                "var(--font-work-sans, ui-sans-serif, system-ui, sans-serif)",
              border: "1px solid #6b6350",
              color: "#e8dcc4",
              backgroundColor: "transparent",
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
          <button
            type="button"
            onClick={dismissAndClear}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 500,
              color: "#c4b896",
              fontFamily:
                "var(--font-work-sans, ui-sans-serif, system-ui, sans-serif)",
            }}
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
