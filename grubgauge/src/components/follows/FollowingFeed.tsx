"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/useAuth";
import { FOLLOW_CHANGED_EVENT, getFollowingIds } from "@/lib/follows/follows";
import { getTrendingRatings, type TrendingRatingRow } from "@/lib/ratings/trending";
import { attachRaters } from "@/lib/profile/raters";
import { getRatingsLikeCounts, getUserLikedRatings } from "@/lib/ratings/likes";
import { RatingCard, type RatingCardRating } from "@/components/ratings/RatingCard";
import { FeedRatingCard } from "./FeedRatingCard";

type Mode = "member-with-follows" | "member-no-follows" | "guest";

interface FeedRow extends RatingCardRating {
  user_id: string | null;
  created_at: string;
}

/**
 * Network-driven feed for the dashboard. Three branches, one component:
 *
 *   - "member-with-follows" → ratings from the viewer's followees, newest
 *                              first, capped at 10. Real personalised feed.
 *   - "member-no-follows"   → a small nudge card pointing back to the
 *                              SuggestedUsersRow above ("Follow raters to
 *                              fill this with their newest ratings").
 *   - "guest"               → trending ratings from the last 30 days +
 *                              a sticky section banner with a sign-up CTA.
 *                              Each card uses FeedRatingCard so every
 *                              rater chip becomes a 1-tap Follow that
 *                              opens the FollowGateSheet.
 *
 * The component owns its full fetch pipeline (followees → ratings →
 * raters → like hydration), mirroring the existing /explore + /u/[username]
 * patterns. Re-fetches on follow-change events so a tap on the row above
 * immediately populates the member feed.
 */
export function FollowingFeed() {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("guest");
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [likedSet, setLikedSet] = useState<Set<string>>(() => new Set());
  const [countMap, setCountMap] = useState<Map<string, number>>(() => new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      const supabase = createClient();

      if (!user) {
        const trending = await getTrendingRatings(supabase, { limit: 10 });
        if (cancelled) return;
        await hydrate(trending);
        if (cancelled) return;
        setMode("guest");
        setLoading(false);
        return;
      }

      const followeeIds = await getFollowingIds(supabase, user.id);
      if (cancelled) return;

      if (followeeIds.length === 0) {
        setMode("member-no-follows");
        setRows([]);
        setLikedSet(new Set());
        setCountMap(new Map());
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("ratings")
        .select(
          "id, place_id, venue_name, venue_address, venue_type, visit_date, weighted_score, notes, meal_photo_url, created_at, user_id",
        )
        .in("user_id", followeeIds)
        .order("created_at", { ascending: false })
        .limit(10);
      if (cancelled) return;
      if (error || !data) {
        setMode("member-with-follows");
        setRows([]);
        setLikedSet(new Set());
        setCountMap(new Map());
        setLoading(false);
        return;
      }
      await hydrate(data as TrendingRatingRow[]);
      if (cancelled) return;
      setMode("member-with-follows");
      setLoading(false);
    }

    async function hydrate(rawRows: TrendingRatingRow[]) {
      const supabase = createClient();
      const withRaters = await attachRaters(supabase, rawRows);
      // RatingCardRating doesn't carry created_at, but our local FeedRow
      // does — keep it via the spread.
      const feedRows: FeedRow[] = withRaters.map((r) => ({
        ...r,
        rater: r.rater,
      })) as FeedRow[];
      const ids = feedRows.map((r) => r.id);
      const [liked, counts] = await Promise.all([
        getUserLikedRatings(supabase, ids),
        getRatingsLikeCounts(supabase, ids),
      ]);
      if (cancelled) return;
      setRows(feedRows);
      setLikedSet(liked);
      setCountMap(counts);
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

  if (loading) return null;

  // Member with follows but no recent ratings from them: render a quiet
  // single-line state instead of hiding entirely, so the user knows the
  // section is reactive rather than missing.
  if (mode === "member-with-follows" && rows.length === 0) {
    return (
      <section aria-labelledby="following-feed-heading" className="flex flex-col gap-sm">
        <h2
          id="following-feed-heading"
          className="font-title-sm text-title-sm font-bold text-on-surface"
        >
          From people you follow
        </h2>
        <p className="rounded-xl border border-outline-variant bg-surface-container-low p-md font-body-md text-body-md text-on-surface-variant">
          Nothing new from people you follow yet.
        </p>
      </section>
    );
  }

  if (mode === "member-no-follows") {
    return (
      <section aria-labelledby="following-feed-heading" className="flex flex-col gap-sm">
        <h2
          id="following-feed-heading"
          className="font-title-sm text-title-sm font-bold text-on-surface"
        >
          Start your feed
        </h2>
        <div className="flex flex-col gap-xs rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <p className="font-body-md text-body-md text-on-surface">
            Follow raters above to fill this with their newest ratings — your
            own trusted-taste feed, no algorithm.
          </p>
        </div>
      </section>
    );
  }

  if (mode === "guest") {
    return (
      <section aria-labelledby="following-feed-heading" className="flex flex-col gap-sm">
        <div className="flex flex-col gap-xs rounded-xl border border-tertiary/40 bg-tertiary-container/40 p-md">
          <p className="font-title-sm text-title-sm font-bold text-on-tertiary-container">
            Build your own feed of trusted raters.
          </p>
          <p className="font-body-md text-body-md text-on-tertiary-container/90">
            Sign up to follow anyone below. We&apos;ll finish the follow for
            you once you&apos;re in.
          </p>
          <div>
            <Link
              href="/onboarding/signup?mode=signup"
              className="inline-flex items-center gap-xs rounded-lg bg-primary-container px-md py-xs font-title-sm text-title-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95"
            >
              Sign Up
            </Link>
          </div>
        </div>

        <h2
          id="following-feed-heading"
          className="font-title-sm text-title-sm font-bold text-on-surface"
        >
          Trending from raters you&apos;ll want to follow
        </h2>
        <div className="flex flex-col gap-sm">
          {rows.map((r) => (
            <FeedRatingCard
              // Re-mount on hydration shifts so LikeButton re-seeds, same
              // trick used on /explore + /u/[username].
              key={`${r.id}|${likedSet.has(r.id)}|${countMap.get(r.id) ?? 0}`}
              rating={r}
              liked={likedSet.has(r.id)}
              likeCount={countMap.get(r.id) ?? 0}
            />
          ))}
        </div>
      </section>
    );
  }

  // mode === "member-with-follows" && rows.length > 0
  return (
    <section aria-labelledby="following-feed-heading" className="flex flex-col gap-sm">
      <h2
        id="following-feed-heading"
        className="font-title-sm text-title-sm font-bold text-on-surface"
      >
        From people you follow
      </h2>
      <div className="flex flex-col gap-sm">
        {rows.map((r) => (
          <RatingCard
            key={`${r.id}|${likedSet.has(r.id)}|${countMap.get(r.id) ?? 0}`}
            rating={r}
            liked={likedSet.has(r.id)}
            likeCount={countMap.get(r.id) ?? 0}
          />
        ))}
      </div>
    </section>
  );
}
