"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { RatingCard, type RatingCardRating } from "@/components/ratings/RatingCard";
import { getProfileByUsername, type Profile } from "@/lib/profile/profile";
import { displayNameForProfile, initialForName } from "@/lib/profile/names";
import { getRatingsLikeCounts, getUserLikedRatings } from "@/lib/ratings/likes";
import { FollowButton } from "@/components/follows/FollowButton";
import { FollowStatRow } from "@/components/follows/FollowStatRow";
import { FounderBadge } from "@/components/founder/FounderBadge";
import { getFounderBadge, type FounderBadgeInfo } from "@/lib/founder/founder";

// ── Types ──────────────────────────────────────────────────────────────────

// Local rating shape — same fields RatingCard needs, plus `created_at` so
// we can sort. `rater` is set to `null` since the card is rendered with
// `hideRater` and the badge is never inspected; saves a round-trip to
// `attachRaters` on this page.
interface Rating extends RatingCardRating {
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Pulls the username out of `useParams()` and decodes it. Next.js's
 * `useParams` returns the *undecoded* path segment for client components,
 * so a username like "mark grout" arrives here as "mark%20grout" and
 * lookups against `public.profiles.username` (which stores "mark grout")
 * miss — surfaces as a spurious 404. See vercel/next.js#64952.
 *
 * `decodeURIComponent` throws on malformed sequences (e.g., a lone `%`),
 * so we fall back to the raw value rather than the empty string — that
 * way a malformed URL still lookups by something, and the existing
 * not-found path handles a genuine miss.
 */
function decodeParam(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// ── Public profile page ────────────────────────────────────────────────────

/**
 * Public ratings page at `/u/[username]`. Renders a profile header (large
 * avatar, display name, @username, aggregate stats) and the user's full
 * rating list sorted newest-first, using the same <RatingCard> as Explore
 * but with `hideRater` enabled (the header already establishes whose
 * ratings these are).
 *
 * Data-fetch shape mirrors Explore — client component, useEffect, single
 * Supabase client call per logical resource, batched like hydration via
 * `Promise.all`. Server-component conversion is a future optimization
 * (would unlock SSR + opengraph cards) but introducing a second fetch
 * pattern in this codebase is more cost than benefit right now.
 *
 * 404 path: a missing profile triggers `notFound()` from render, which
 * routes to the framework's `_not-found` page. No custom `not-found.tsx`
 * yet — the default is fine until we have something to show there.
 */
export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeParam(params?.username);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [founderBadge, setFounderBadge] = useState<FounderBadgeInfo | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [likedSet, setLikedSet] = useState<Set<string>>(() => new Set());
  const [countMap, setCountMap] = useState<Map<string, number>>(() => new Map());
  const [loading, setLoading] = useState(true);
  // Distinguishes "still fetching" from "fetched and there's no such user"
  // so the render branch can call notFound() exactly once on resolution.
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const found = await getProfileByUsername(supabase, username);
        if (cancelled) return;
        if (!found) {
          setMissing(true);
          return;
        }
        setProfile(found);
        // Founder/FM badge runs in parallel with ratings load below; resolved
        // separately so a failure here doesn't gate the rating list render.
        getFounderBadge(supabase, found.id).then((b) => {
          if (!cancelled) setFounderBadge(b);
        });

        const { data, error } = await supabase
          .from("ratings")
          .select("id, place_id, venue_name, venue_address, venue_type, visit_date, weighted_score, notes, meal_photo_url, created_at")
          .eq("user_id", found.id)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        if (error) {
          console.error("Supabase error:", error.code, error.message);
          // Treat as empty list — the header still renders and the empty
          // state below explains the (lack of) content. A toast/error
          // banner is overkill for a read-only public page.
          setRatings([]);
          return;
        }

        // rater is null on every card here — hideRater is on, so the
        // badge isn't rendered. Skipping attachRaters saves one round-trip.
        const rows: Rating[] = (data ?? []).map((r) => ({
          ...(r as Omit<Rating, "rater">),
          rater: null,
        }));
        setRatings(rows);

        const ids = rows.map((r) => r.id);
        const [liked, counts] = await Promise.all([
          getUserLikedRatings(supabase, ids),
          getRatingsLikeCounts(supabase, ids),
        ]);
        if (cancelled) return;
        setLikedSet(liked);
        setCountMap(counts);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  // 404: render-time throw routes to the framework's not-found boundary.
  // Guarded behind !loading so we don't 404 during the first render.
  if (!loading && missing) {
    notFound();
  }

  if (loading || !profile) {
    return (
      <PageShell variant="feed" className="pt-lg pb-10">
        <div className="flex items-center gap-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          <span className="font-body-md text-body-md">Loading profile…</span>
        </div>
      </PageShell>
    );
  }

  // Header total is the sum of like counts across this user's ratings at
  // page-load. Optimistic toggles inside <LikeButton> on this same page
  // will drift this number until the next navigation refetches — that's
  // intentional (revalidatePath would invalidate the whole route on every
  // toggle, which is a larger network cost than the visual drift).
  const totalLikes = Array.from(countMap.values()).reduce((s, n) => s + n, 0);
  const ratingCount = ratings.length;
  const name = displayNameForProfile(profile);
  const initial = initialForName(name);
  const avgLikes = ratingCount > 0 ? totalLikes / ratingCount : 0;

  return (
    <PageShell variant="feed" className="pt-lg pb-10">
      <div className="flex flex-col gap-lg">

        {/* Header */}
        <div className="flex flex-col items-center gap-sm text-center">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-high"
            aria-hidden
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar from Storage; sized 80px, intentional non-LCP header element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="font-headline-md text-headline-md font-bold text-on-surface">{initial}</span>
            )}
          </div>

          <div className="flex flex-col items-center gap-xs">
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">{name}</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant">@{profile.username}</p>
            {founderBadge && <FounderBadge badge={founderBadge} size="full" />}
          </div>

          <FollowButton
            target={{
              userId: profile.id,
              username: profile.username,
              displayName: name,
              avatarUrl: profile.avatar_url ?? null,
            }}
          />

          <FollowStatRow userId={profile.id} username={profile.username} />

          <div className="flex flex-col items-center gap-0.5">
            <p className="font-body-md text-body-md text-on-surface">
              <span className="tabular-nums font-semibold">{ratingCount}</span>{" "}
              {ratingCount === 1 ? "rating" : "ratings"}{" · "}
              <span className="tabular-nums font-semibold">{totalLikes}</span>{" "}
              {totalLikes === 1 ? "like" : "likes"} received
            </p>
            {ratingCount > 0 && (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                <span className="tabular-nums">{avgLikes.toFixed(1)}</span> likes per rating
              </p>
            )}
          </div>
        </div>

        {/* Ratings list / empty state */}
        {ratingCount === 0 ? (
          <p className="text-center font-body-md text-body-md text-on-surface-variant py-lg">
            No ratings yet.
          </p>
        ) : (
          <div className="flex flex-col gap-sm">
            {ratings.map((r) => {
              const liked = likedSet.has(r.id);
              const count = countMap.get(r.id) ?? 0;
              return (
                <RatingCard
                  // Same remount-on-hydration trick as Explore: when the
                  // batched like fetch resolves after the first paint,
                  // re-key so <LikeButton> re-seeds from the new props.
                  key={`${r.id}|${liked}|${count}`}
                  rating={r}
                  liked={liked}
                  likeCount={count}
                  hideRater
                />
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
