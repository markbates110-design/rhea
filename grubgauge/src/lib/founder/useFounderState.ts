"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { createClient } from "@/lib/supabase/client";
import {
  type FounderBadgeInfo,
  type FounderProgress,
  getFounderBadge,
  getFounderProgress,
  isAppFounder,
} from "./founder";

/**
 * Reactive founder/FM status + progress for the signed-in viewer.
 *
 *   - `badge` resolves immediately for The Founder (env match), else from
 *     `public.founding_members`. `null` for non-members.
 *   - `progress` mirrors the trigger's qualifying-day math so the dashboard
 *     progress card can show "2 of 3 ratings done." Skipped for non-members
 *     once `badge` is set (their progress is done by definition).
 *
 * Refetches on auth change. The Founder check is short-circuited so a
 * sign-in flip from guest to Mark resolves the badge without a query.
 */
export interface FounderState {
  badge: FounderBadgeInfo | null;
  progress: FounderProgress;
  loading: boolean;
}

export function useFounderState(): FounderState {
  const { user, loading: authLoading } = useAuth();
  const [badge, setBadge] = useState<FounderBadgeInfo | null>(null);
  const [progress, setProgress] = useState<FounderProgress>({
    qualifyingDays: 0,
    lastQualifyingDayUtc: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setBadge(null);
      setProgress({ qualifyingDays: 0, lastQualifyingDayUtc: null });
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    const userId = user.id;
    let cancelled = false;
    async function load() {
      const supabase = createClient();

      if (isAppFounder(userId)) {
        if (cancelled) return;
        setBadge({ kind: "the-founder", slotNumber: null });
        setProgress({ qualifyingDays: 0, lastQualifyingDayUtc: null });
        setLoading(false);
        return;
      }

      const [fetchedBadge, fetchedProgress] = await Promise.all([
        getFounderBadge(supabase, userId),
        getFounderProgress(supabase, userId),
      ]);
      if (cancelled) return;
      setBadge(fetchedBadge);
      setProgress(fetchedProgress);
      setLoading(false);
    }

    setLoading(true);
    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return { badge, progress, loading };
}
