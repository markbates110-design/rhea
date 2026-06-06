"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { createClient } from "@/lib/supabase/client";
import { PROFILE_UPDATED_EVENT, PROFILES_TABLE, type Profile } from "./profile";

/**
 * Reactive `public.profiles` row for the current Supabase user.
 *
 * - `loading` is `true` until the initial fetch resolves; mirror `useAuth`
 *   so call sites can render placeholders without flicker.
 * - `profile` is `null` for guests, sign-outs, or fetch failures.
 * - Refetches in response to:
 *     1. Auth state change (sign-in / sign-out / user-switch via useAuth dep)
 *     2. `profile:updated` window event dispatched by `updateProfile` /
 *        `upsertProfile`,
 *        which keeps the header avatar live when the /profile page
 *        commits a new photo without forcing a full page navigation.
 *
 * setState-in-effect: the fetch is genuinely effectful (depends on the
 * auth user which arrives async), so the scoped disable matches the
 * documented escape hatch used elsewhere in this codebase (see
 * `/onboarding/profile/page.tsx`). A future refactor would move profile
 * state into a context provider mounted in the layout shell.
 */
export function useProfile(): { profile: Profile | null; loading: boolean; error: string | null } {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Documented escape hatch: clearing async-derived state on sign-out
      // is the rule's intended-but-unrecognized case. Future refactor:
      // move profile state into a context that subscribes once.
      /* eslint-disable react-hooks/set-state-in-effect */
      setProfile(null);
      setError(null);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    const userId = user.id;
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from(PROFILES_TABLE)
        .select(
          "id, username, display_name, avatar_url, track_blood_sugar_impact, blood_sugar_disclaimer_accepted_at, created_at, updated_at",
        )
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setProfile(null);
      } else {
        if (data) {
          const row = data as Profile;
          setProfile({
            ...row,
            track_blood_sugar_impact: row.track_blood_sugar_impact ?? false,
            blood_sugar_disclaimer_accepted_at:
              row.blood_sugar_disclaimer_accepted_at ?? null,
          });
        } else {
          setProfile(null);
        }
        setError(null);
      }
      setLoading(false);
    }

    setLoading(true);
    load();

    function handleUpdate() {
      if (!cancelled) load();
    }
    if (typeof window !== "undefined") {
      window.addEventListener(PROFILE_UPDATED_EVENT, handleUpdate);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener(PROFILE_UPDATED_EVENT, handleUpdate);
      }
    };
  }, [authLoading, user]);

  return { profile, loading, error };
}
