"use client";

import { useState } from "react";
import {
  exportShareRatingCard,
  type ShareRatingPayload,
} from "@/lib/ratings/shareCard";
import {
  PILL_COMPACT_GAP_CLASS,
  PILL_COMPACT_ICON_SIZE_CLASS,
  PILL_COMPACT_SIZE_CLASSES,
} from "@/lib/ui/pillSizes";

interface ShareRatingButtonProps {
  payload: ShareRatingPayload;
  /** Compact icon pill for cards; full button for success screens. */
  variant?: "icon" | "button";
  className?: string;
}

/**
 * Generates a branded PNG rating card and opens the native share sheet
 * (mobile) or downloads the image (desktop fallback).
 */
export function ShareRatingButton({
  payload,
  variant = "icon",
  className = "",
}: ShareRatingButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await exportShareRatingCard(payload);
      setMessage(result === "shared" ? "Shared" : "Saved image");
      window.setTimeout(() => setMessage(null), 2500);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessage("Could not share");
      window.setTimeout(() => setMessage(null), 3000);
    } finally {
      setBusy(false);
    }
  }

  if (variant === "button") {
    return (
      <div className={`flex flex-col items-center gap-xs ${className}`.trim()}>
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-xs rounded-xl bg-primary-container px-md py-sm font-title-sm text-title-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-[0.98] disabled:opacity-70"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {busy ? "progress_activity" : "ios_share"}
          </span>
          {busy ? "Creating image…" : "Share rating"}
        </button>
        {message && (
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-xs ${className}`.trim()}>
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={busy}
        aria-label="Share this rating as an image"
        className={`inline-flex items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface active:scale-95 disabled:opacity-70 ${PILL_COMPACT_GAP_CLASS} ${PILL_COMPACT_SIZE_CLASSES}`}
      >
        <span
          className={`material-symbols-outlined ${PILL_COMPACT_ICON_SIZE_CLASS} ${busy ? "animate-spin" : ""}`}
        >
          {busy ? "progress_activity" : "ios_share"}
        </span>
        <span className="font-label-sm text-label-sm">Share</span>
      </button>
      {message && (
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {message}
        </span>
      )}
    </div>
  );
}
