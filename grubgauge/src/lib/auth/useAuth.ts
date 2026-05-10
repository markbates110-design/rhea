"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Reactive Supabase auth state.
 *
 * - `loading` is `true` until the initial `getSession` resolves; render
 *   neutral placeholders (or `null`) for auth-dependent UI during this
 *   window to avoid CTA flicker on first paint.
 * - `user` is the authenticated Supabase user, or `null` for guests /
 *   signed-out visitors.
 * - Subscribes to `onAuthStateChange` so headers / CTAs swap instantly
 *   on sign-in, sign-out, and token refresh.
 */
export function useAuth(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
