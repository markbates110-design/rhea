"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useFollowState } from "@/lib/follows/useFollowState";
import { setPendingFollow } from "@/lib/follows/pendingFollow";
import {
  PILL_COMPACT_GAP_CLASS,
  PILL_COMPACT_ICON_SIZE_CLASS,
  PILL_COMPACT_SIZE_CLASSES,
} from "@/lib/ui/pillSizes";
import { FollowGateSheet, type FollowGateTarget } from "./FollowGateSheet";

export type FollowButtonSize = "md" | "sm";

interface Props {
  /**
   * Identity + display fields for the follow target. The id drives the
   * mutation; the display fields seed the FollowGateSheet content for
   * guests, so callers should pass the same display name / avatar shown
   * elsewhere on the surface (matches user expectation in the sheet).
   */
  target: FollowGateTarget;
  size?: FollowButtonSize;
}

/**
 * Three-state Follow control reused across profile pages, list rows, and
 * future surfaces (suggested users, rater chip popovers).
 *
 *   - Self  → renders nothing. The signed-in user can't follow themselves;
 *             omitting the control is more readable than disabling it.
 *   - Guest → "Follow" affordance, but tap stashes a pending intent and
 *             opens FollowGateSheet (no DB mutation).
 *   - Member → "Follow" / "Following" toggle with optimistic update via
 *              `useFollowState`.
 *
 * The hook handles optimistic state, rollback on failure, and the
 * `follow:changed` cross-component sync; this component owns the gate
 * branch and the visual variants only.
 */
export function FollowButton({ target, size = "md" }: Props) {
  const pathname = usePathname() ?? "/";
  const { kind, isFollowing, loading, toggle } = useFollowState(target.userId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (kind === "self") return null;

  async function handleClick() {
    if (pending) return;
    if (kind === "guest") {
      setPendingFollow({ targetUserId: target.userId, returnTo: pathname });
      setSheetOpen(true);
      return;
    }
    setPending(true);
    try {
      await toggle();
    } finally {
      setPending(false);
    }
  }

  const labelText = isFollowing ? "Following" : "Follow";
  const iconName = isFollowing ? "check" : "person_add";
  // `sm` matches the shared compact pill size so Follow and Founder
  // pills read as a matched set in close-proximity contexts (rating
  // cards, UserListRow, SuggestedUsersRow). `md` is the larger
  // profile-page CTA size and stays unchanged.
  const sizeClass =
    size === "sm"
      ? PILL_COMPACT_SIZE_CLASSES
      : "px-md py-xs font-label-sm text-label-sm";
  const iconSize = size === "sm" ? PILL_COMPACT_ICON_SIZE_CLASS : "text-[16px]";
  const gapClass = size === "sm" ? PILL_COMPACT_GAP_CLASS : "gap-xs";
  const baseClass = isFollowing
    ? "border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-variant"
    : "bg-primary-container text-on-primary-container hover:brightness-110";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || loading}
        aria-pressed={isFollowing}
        aria-label={isFollowing ? `Unfollow ${target.displayName}` : `Follow ${target.displayName}`}
        className={`inline-flex shrink-0 items-center rounded-full font-semibold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${gapClass} ${sizeClass} ${baseClass}`}
      >
        <span
          className={`material-symbols-outlined ${iconSize}`}
          style={{ fontVariationSettings: isFollowing ? "'FILL' 1" : "'FILL' 0" }}
          aria-hidden
        >
          {iconName}
        </span>
        {labelText}
      </button>
      <FollowGateSheet
        open={sheetOpen}
        target={target}
        onDismiss={() => setSheetOpen(false)}
      />
    </>
  );
}
