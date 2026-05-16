"use client";

import type { CSSProperties } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  venueName: string;
  deleting: boolean;
  onDismiss: () => void;
  onConfirmDelete: () => void;
};

/**
 * Delete confirmation rendered in its own portal with inline layout only.
 * Avoids Tailwind + flex %-width combos that have produced min-content width
 * (one word / one glyph per line) in Chrome for nested overlays.
 */
export function DeleteRatingConfirm({
  open,
  venueName,
  deleting,
  onDismiss,
  onConfirmDelete,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleting) onDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, deleting, onDismiss]);

  if (typeof document === "undefined" || !open) return null;

  const panel: CSSProperties = {
    boxSizing: "border-box",
    flexShrink: 0,
    width: "min(384px, calc(100vw - 32px))",
    minWidth: 280,
    maxWidth: 384,
    padding: 24,
    borderRadius: 16,
    border: "1px solid var(--color-outline-variant)",
    backgroundColor: "var(--color-surface-container-high)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    display: "block",
    writingMode: "horizontal-tb",
    textOrientation: "mixed",
  };

  const title: CSSProperties = {
    margin: 0,
    display: "block",
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.33,
    color: "var(--color-on-surface)",
    fontFamily:
      "var(--font-work-sans, ui-sans-serif, system-ui, sans-serif)",
    whiteSpace: "normal",
  };

  const body: CSSProperties = {
    marginTop: 12,
    marginBottom: 0,
    display: "block",
    fontSize: 16,
    lineHeight: 1.5,
    fontWeight: 400,
    color: "var(--color-on-surface-variant)",
    fontFamily:
      "var(--font-work-sans, ui-sans-serif, system-ui, sans-serif)",
    whiteSpace: "normal",
    overflowWrap: "break-word",
    wordBreak: "normal",
    width: "100%",
  };

  const row: CSSProperties = {
    marginTop: 16,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
    width: "100%",
    boxSizing: "border-box",
  };

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
      onClick={() => !deleting && onDismiss()}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="grub-delete-rating-title"
        style={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="grub-delete-rating-title" style={title}>
          Delete this rating?
        </h2>
        <p style={body}>
          This removes your review for {venueName}. This cannot be undone.
        </p>
        <div style={row}>
          <button
            type="button"
            disabled={deleting}
            onClick={onDismiss}
            style={{
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.45 : 1,
              borderRadius: 8,
              border: "1px solid var(--color-outline)",
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 500,
              fontFamily:
                "var(--font-work-sans, ui-sans-serif, system-ui, sans-serif)",
              background: "transparent",
              color: "var(--color-on-surface-variant)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirmDelete}
            style={{
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.45 : 1,
              borderRadius: 8,
              border: "none",
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily:
                "var(--font-work-sans, ui-sans-serif, system-ui, sans-serif)",
              backgroundColor: "var(--color-error)",
              color: "var(--color-on-error)",
            }}
          >
            {deleting ? "Removing…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
