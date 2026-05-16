"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/useAuth";
import {
  type SuggestedUser,
  getSuggestedUsers,
} from "@/lib/follows/suggestions";
import { FOLLOW_CHANGED_EVENT } from "@/lib/follows/follows";
import { displayNameForProfile, initialForName } from "@/lib/profile/names";
import { FollowButton } from "./FollowButton";
import { FounderBadge } from "@/components/founder/FounderBadge";

/**
 * Horizontal "People to follow" row on the dashboard. Renders the same
 * card layout for guests and members; the difference is in the tap
 * behaviour of the embedded FollowButton (gate sheet vs. real mutation),
 * which is handled inside FollowButton itself.
 *
 * Empty pool (no users found / brand-new project) collapses to `null`
 * so the surrounding dashboard layout doesn't reserve dead vertical space.
 *
 * Refetches when a follow-change event fires anywhere in the tab — keeps
 * the row's already-followed exclusion accurate after the viewer taps
 * Follow on one of the cards.
 */
export function SuggestedUsersRow() {
  const { user, loading: authLoading } = useAuth();
  const [cards, setCards] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const result = await getSuggestedUsers(supabase, {
        viewerId: user?.id ?? null,
        limit: 6,
      });
      if (cancelled) return;
      setCards(result);
      setLoading(false);
    }

    setLoading(true);
    load();

    function handleFollowChange() {
      if (!cancelled) load();
    }
    if (typeof window !== "undefined") {
      window.addEventListener(FOLLOW_CHANGED_EVENT, handleFollowChange);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener(FOLLOW_CHANGED_EVENT, handleFollowChange);
      }
    };
  }, [authLoading, user]);

  // Initial paint + empty-pool case: render nothing so the dashboard
  // doesn't reserve empty space. Skeleton is intentionally omitted to
  // keep the first-paint layout stable.
  if (loading || cards.length === 0) return null;

  return (
    <section aria-labelledby="suggested-users-heading" className="flex flex-col gap-sm">
      <div className="flex items-baseline justify-between">
        <h2
          id="suggested-users-heading"
          className="font-title-sm text-title-sm font-bold text-on-surface"
        >
          People to follow
        </h2>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {user ? "Picked for you" : "Real raters near you"}
        </span>
      </div>

      <div
        className="flex snap-x snap-mandatory gap-sm overflow-x-auto pb-xs -mx-margin-edge px-margin-edge"
        // Hide the scrollbar visual on Webkit/Blink; the snap behaviour
        // and horizontal swipe gesture do all the navigation work.
        style={{ scrollbarWidth: "thin" }}
      >
        {cards.map((card) => (
          <SuggestedUserCard key={card.profile.id} card={card} />
        ))}
      </div>
    </section>
  );
}

function SuggestedUserCard({ card }: { card: SuggestedUser }) {
  const displayName = displayNameForProfile(card.profile);
  const initial = initialForName(displayName);

  return (
    <div
      className="flex w-44 shrink-0 snap-start flex-col items-center gap-xs rounded-xl border border-outline-variant bg-surface-container-low p-md text-center"
    >
      <Link
        href={`/u/${card.profile.username}`}
        className="flex flex-col items-center gap-xs"
        aria-label={`View ${displayName}'s ratings`}
      >
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-high font-title-sm text-title-sm font-bold text-on-surface"
          aria-hidden
        >
          {card.profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar from Storage; sized 56px, no LCP role
            <img
              src={card.profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            initial
          )}
        </span>
        <div className="flex w-full flex-col items-center gap-0.5">
          <p className="line-clamp-1 max-w-full font-title-sm text-title-sm font-semibold text-on-surface">
            {displayName}
          </p>
          <p className="line-clamp-1 max-w-full font-label-sm text-label-sm text-on-surface-variant">
            @{card.profile.username}
          </p>
        </div>
      </Link>

      <FounderBadge badge={card.founder} size="compact" />

      <p className="line-clamp-2 font-label-sm text-label-sm text-on-surface-variant">
        {card.reason}
      </p>

      <FollowButton
        target={{
          userId: card.profile.id,
          username: card.profile.username,
          displayName,
          avatarUrl: card.profile.avatar_url ?? null,
        }}
        size="sm"
      />
    </div>
  );
}
