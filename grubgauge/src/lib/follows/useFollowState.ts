"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { createClient } from "@/lib/supabase/client";
import {
  FOLLOW_CHANGED_EVENT,
  type FollowChangedDetail,
  followUser,
  getFollowCounts,
  isFollowing,
  unfollowUser,
} from "./follows";

/**
 * Reactive follow relationship + counts for a target user.
 *
 * Returns a `toggle()` so call sites (FollowButton + signup auto-follow)
 * share one optimistic-update pipeline. Optimistic updates flip
 * `isFollowing` and adjust the follower count immediately; on mutation
 * failure we re-fetch the canonical state to recover.
 *
 * `kind`:
 *   - `"self"` → the target IS the signed-in user; toggle() is a no-op
 *     and `isFollowing` is always false (UI shows no Follow button).
 *   - `"guest"` → no auth session; toggle() returns a `gated` outcome so
 *     the FollowButton can open the FollowGateSheet.
 *   - `"member"` → signed-in non-self viewer; toggle() mutates.
 *
 * Refetches in response to:
 *   1. Auth state change (sign-in / sign-out, via useAuth deps)
 *   2. The `targetUserId` prop changing (e.g. switching profile cards)
 *   3. A `follow:changed` window event matching this `targetUserId`
 *      (keeps multiple cards consistent in the same tab without each
 *      one issuing its own round-trip).
 */
export type FollowKind = "self" | "guest" | "member";

export type ToggleOutcome =
  | { ok: true; isFollowing: boolean }
  | { ok: false; reason: "gated" }
  | { ok: false; reason: "self" }
  | { ok: false; reason: "error"; message: string };

export interface UseFollowState {
  kind: FollowKind;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  loading: boolean;
  toggle: () => Promise<ToggleOutcome>;
}

export function useFollowState(targetUserId: string | null | undefined): UseFollowState {
  const { user, loading: authLoading } = useAuth();
  const [followingState, setFollowingState] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const kind: FollowKind = !user
    ? "guest"
    : targetUserId && user.id === targetUserId
      ? "self"
      : "member";

  // Initial + post-event fetch. Same shape as useProfile — auth gate first,
  // then a single async load that respects a cancelled flag.
  useEffect(() => {
    if (authLoading) return;
    if (!targetUserId) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setFollowingState(false);
      setFollowerCount(0);
      setFollowingCount(0);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [counts, followingFlag] = await Promise.all([
        getFollowCounts(supabase, targetUserId as string),
        // Self + guest paths return false without a round-trip; safe to call.
        isFollowing(supabase, targetUserId as string),
      ]);
      if (cancelled) return;
      setFollowerCount(counts.followers);
      setFollowingCount(counts.following);
      setFollowingState(followingFlag);
      setLoading(false);
    }

    setLoading(true);
    load();

    function handleExternalChange(event: Event) {
      const detail = (event as CustomEvent<FollowChangedDetail>).detail;
      if (!detail || detail.targetUserId !== targetUserId) return;
      if (!cancelled) load();
    }
    if (typeof window !== "undefined") {
      window.addEventListener(FOLLOW_CHANGED_EVENT, handleExternalChange);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener(FOLLOW_CHANGED_EVENT, handleExternalChange);
      }
    };
  }, [authLoading, user, targetUserId]);

  const toggle = useCallback<UseFollowState["toggle"]>(async () => {
    if (!targetUserId) {
      return { ok: false, reason: "error", message: "Missing target user." };
    }
    if (kind === "self") {
      return { ok: false, reason: "self" };
    }
    if (kind === "guest") {
      return { ok: false, reason: "gated" };
    }

    // Optimistic flip. Counts move by 1 in the followee's "followers" axis;
    // the followee's "following" axis is unrelated to this mutation.
    const next = !followingState;
    const previousFollowing = followingState;
    const previousFollowers = followerCount;
    setFollowingState(next);
    setFollowerCount((c) => Math.max(0, c + (next ? 1 : -1)));

    const supabase = createClient();
    const result = next
      ? await followUser(supabase, targetUserId)
      : await unfollowUser(supabase, targetUserId);

    if (!result.ok) {
      // Rollback to the snapshot we captured before the optimistic flip.
      setFollowingState(previousFollowing);
      setFollowerCount(previousFollowers);
      const message =
        result.code === "unauthenticated"
          ? "You need to be signed in to follow."
          : result.code === "self_follow"
            ? "You can't follow yourself."
            : result.message || "Couldn't update follow.";
      return { ok: false, reason: "error", message };
    }

    return { ok: true, isFollowing: next };
  }, [kind, targetUserId, followingState, followerCount]);

  return {
    kind,
    isFollowing: kind === "self" ? false : followingState,
    followerCount,
    followingCount,
    loading,
    toggle,
  };
}
