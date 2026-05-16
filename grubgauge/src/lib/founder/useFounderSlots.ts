"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAvailableFounderSlots } from "./founder";

/**
 * Live counter of remaining Founding Member slots (100 - len(founding_members)).
 *
 * Mount-time fetch only in v1 — no realtime subscription. The number
 * shown is fresh per page navigation, which is "close enough" for the
 * FOMO copy ("47 founding member spots left"). Upgrading to Supabase Realtime
 * (broadcast / postgres_changes channel) is a low-effort follow-up if
 * we want the counter to tick down live in front of a guest.
 */
export function useFounderSlots(): { remaining: number; loading: boolean } {
  const [remaining, setRemaining] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const n = await getAvailableFounderSlots(supabase);
      if (cancelled) return;
      setRemaining(n);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { remaining, loading };
}
