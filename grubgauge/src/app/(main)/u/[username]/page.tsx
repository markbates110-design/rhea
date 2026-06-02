"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { CenteredProse } from "@/components/layout/CenteredProse";
import { RatingCard, type RatingCardRating } from "@/components/ratings/RatingCard";
import { getProfileByUsername, type Profile } from "@/lib/profile/profile";
import { displayNameForProfile, initialForName } from "@/lib/profile/names";
import {
  buildCriticPortfolio,
  type CriticPortfolioRating,
} from "@/lib/profile/criticPortfolio";
import { getRatingsLikeCounts, getUserLikedRatings } from "@/lib/ratings/likes";
import { FollowButton } from "@/components/follows/FollowButton";
import { FollowStatRow } from "@/components/follows/FollowStatRow";
import { FounderBadge } from "@/components/founder/FounderBadge";
import { getFounderBadge, type FounderBadgeInfo } from "@/lib/founder/founder";
import { useAuth } from "@/lib/auth/useAuth";
import { CriticStatsStrip } from "@/components/profile/critic/CriticStatsStrip";
import { CriticSpecialties } from "@/components/profile/critic/CriticSpecialties";
import {
  CriticPhotoGrid,
  CriticTopPicksRow,
} from "@/components/profile/critic/CriticPortfolioSections";
import { CriticBadgesSection, CriticBadgePill } from "@/components/profile/critic/CriticBadges";
import { ShareCriticProfileBanner } from "@/components/profile/critic/ShareCriticProfileBanner";
import {
  computeCriticBadges,
  getNextCriticBadgeProgress,
  getTopCriticBadge,
} from "@/lib/profile/criticBadges";

interface Rating extends RatingCardRating {
  place_id: string;
  venue_type: string;
  cuisine: string | null;
  city: string | null;
  created_at: string;
}

function decodeParam(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const RATING_SELECT =
  "id, place_id, venue_name, venue_address, venue_type, cuisine, city, visit_date, weighted_score, notes, meal_photo_url, criteria_scores, created_at";

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeParam(params?.username);
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [founderBadge, setFounderBadge] = useState<FounderBadgeInfo | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [likedSet, setLikedSet] = useState<Set<string>>(() => new Set());
  const [countMap, setCountMap] = useState<Map<string, number>>(() => new Map());
  const [loading, setLoading] = useState(true);
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
        getFounderBadge(supabase, found.id).then((b) => {
          if (!cancelled) setFounderBadge(b);
        });

        const { data, error } = await supabase
          .from("ratings")
          .select(RATING_SELECT)
          .eq("user_id", found.id)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        if (error) {
          console.error("Supabase error:", error.code, error.message);
          setRatings([]);
          return;
        }

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

  const totalLikes = useMemo(
    () => Array.from(countMap.values()).reduce((s, n) => s + n, 0),
    [countMap],
  );

  const portfolio = useMemo(
    () =>
      buildCriticPortfolio(
        ratings as CriticPortfolioRating[],
        totalLikes,
      ),
    [ratings, totalLikes],
  );

  const criticBadges = useMemo(
    () =>
      computeCriticBadges(
        ratings as CriticPortfolioRating[],
        portfolio,
        totalLikes,
      ),
    [ratings, portfolio, totalLikes],
  );

  const nextBadgeProgress = useMemo(() => {
    if (!profile || user?.id !== profile.id) return null;
    return getNextCriticBadgeProgress(
      ratings as CriticPortfolioRating[],
      portfolio,
      totalLikes,
      criticBadges,
    );
  }, [ratings, portfolio, totalLikes, criticBadges, profile, user?.id]);

  if (!loading && missing) {
    notFound();
  }

  if (loading || !profile) {
    return (
      <PageShell variant="feed" className="pt-lg pb-10">
        <div className="flex items-center gap-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] animate-spin">
            progress_activity
          </span>
          <span className="font-body-md text-body-md">Loading critic profile…</span>
        </div>
      </PageShell>
    );
  }

  const name = displayNameForProfile(profile);
  const initial = initialForName(name);
  const isSelf = user?.id === profile.id;
  const topCriticBadge = getTopCriticBadge(criticBadges);

  return (
    <PageShell variant="feed" className="pt-lg pb-10">
      <div className="flex flex-col gap-lg">
        {isSelf && (
          <ShareCriticProfileBanner username={profile.username} displayName={name} />
        )}

        <header className="flex w-full flex-col gap-sm">
          <CenteredProse className="gap-sm">
            <CenteredProse.Item>
              <div
                className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-surface-container-high shadow-sm"
                aria-hidden
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="font-headline-md text-headline-md font-bold text-on-surface">
                    {initial}
                  </span>
                )}
              </div>
            </CenteredProse.Item>

            <CenteredProse maxWidth="md" className="gap-xs">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
                Food critic
              </p>
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
                {name}
              </h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                @{profile.username}
              </p>
              {(founderBadge || topCriticBadge) && (
                <CenteredProse.Item>
                  <div className="mt-xs flex flex-wrap items-center justify-center gap-xs">
                    {founderBadge && (
                      <FounderBadge badge={founderBadge} size="compact" />
                    )}
                    {topCriticBadge && (
                      <CriticBadgePill badge={topCriticBadge} size="compact" />
                    )}
                  </div>
                </CenteredProse.Item>
              )}
              <p className="font-body-md text-body-md text-on-surface-variant text-pretty">
                {portfolio.tagline}
              </p>
            </CenteredProse>

            {!isSelf && (
              <CenteredProse.Item>
                <FollowButton
                  target={{
                    userId: profile.id,
                    username: profile.username,
                    displayName: name,
                    avatarUrl: profile.avatar_url ?? null,
                  }}
                />
              </CenteredProse.Item>
            )}

            <FollowStatRow userId={profile.id} username={profile.username} />
          </CenteredProse>
        </header>

        <CriticStatsStrip portfolio={portfolio} />

        <CriticBadgesSection
          badges={criticBadges}
          nextProgress={nextBadgeProgress}
          isSelf={isSelf}
        />

        <CriticSpecialties
          specialties={portfolio.specialties}
          topVenueType={portfolio.topVenueType}
        />

        <CriticPhotoGrid picks={portfolio.photoHighlights} />

        <CriticTopPicksRow picks={portfolio.topPicks} />

        <section aria-labelledby="all-reviews-heading" className="flex flex-col gap-sm">
          <h2
            id="all-reviews-heading"
            className="font-title-sm text-title-sm font-bold text-on-surface"
          >
            All reviews
          </h2>
          {portfolio.ratingCount === 0 ? (
            <p className="text-center font-body-md text-body-md text-on-surface-variant py-lg">
              No ratings yet — this critic portfolio is just getting started.
            </p>
          ) : (
            <div className="flex flex-col gap-sm">
              {ratings.map((r) => {
                const liked = likedSet.has(r.id);
                const count = countMap.get(r.id) ?? 0;
                return (
                  <RatingCard
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
        </section>
      </div>
    </PageShell>
  );
}
