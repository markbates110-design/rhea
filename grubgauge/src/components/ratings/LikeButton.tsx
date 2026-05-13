"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toggleLike } from "@/lib/ratings/likes";

interface LikeButtonProps {
  ratingId: string;
  /** Whether the current user has liked this rating at mount time. */
  initialLiked: boolean;
  /** Total like count for this rating at mount time. */
  initialCount: number;
}

/**
 * Thumbs-up like control for a rating card. Owns its own optimistic state;
 * the parent feed batch-hydrates `initialLiked` / `initialCount` via
 * `getUserLikedRatings` + `getRatingsLikeCounts` (no per-card fetch).
 *
 * Unauthenticated taps route to the canonical sign-in entry
 * (`/onboarding/signup?mode=signin`) — same surface the header and the
 * History guest-upsell card use. We deliberately do not invent a modal or
 * a toast for this; the existing route is the single sign-in flow.
 *
 * Concurrent-tap discipline: `pending` blocks a second tap until the
 * server settles, so rapid double-taps can't desync the optimistic state.
 * On failure (network, server) the optimistic flip reverts; on
 * unauthenticated, it reverts and we navigate.
 */
export function LikeButton({ ratingId, initialLiked, initialCount }: LikeButtonProps) {
  const router = useRouter();
  // Local state seeded from props via lazy initial values — never re-synced
  // from prop changes (parent uses key= to remount when the canonical
  // initial values shift, e.g. after a re-fetch). Avoids the
  // react-hooks/set-state-in-effect anti-pattern.
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;

    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setPending(true);

    try {
      const supabase = createClient();
      const result = await toggleLike(supabase, ratingId);

      if (result.ok) {
        // Reconcile with server authoritative state — covers the race
        // where another tab raced ahead and the local optimistic count
        // drifted by 1.
        setLiked(result.liked);
        setCount(result.count);
        return;
      }

      // Failure path: revert optimistic flip, then handle the code.
      setLiked(prevLiked);
      setCount(prevCount);
      if (result.code === "unauthenticated") {
        router.push("/onboarding/signup?mode=signin");
      }
      // result.code === "failed": silent revert. Matches the rest of the
      // app's inline-error posture; toast infra isn't in this codebase.
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Unlike this rating" : "Like this rating"}
      className={`inline-flex items-center gap-xs rounded-full px-xs py-0.5 font-label-sm text-label-sm transition-colors active:scale-95 disabled:opacity-70 ${
        liked
          ? "bg-primary-container text-on-primary-container"
          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
      }`}
    >
      <span
        className="material-symbols-outlined text-[16px]"
        style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}
      >
        thumb_up
      </span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
