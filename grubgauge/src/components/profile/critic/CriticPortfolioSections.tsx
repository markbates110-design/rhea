import Link from "next/link";
import type { CriticPick } from "@/lib/profile/criticPortfolio";
import { cuisineLabel } from "@/lib/seo/slugs";

interface CriticPhotoGridProps {
  picks: CriticPick[];
}

export function CriticPhotoGrid({ picks }: CriticPhotoGridProps) {
  if (picks.length === 0) return null;

  return (
    <section aria-labelledby="critic-photos-heading" className="flex flex-col gap-sm">
      <h2
        id="critic-photos-heading"
        className="font-title-sm text-title-sm font-bold text-on-surface"
      >
        Critic&apos;s gallery
      </h2>
      <div className="grid grid-cols-3 gap-xs">
        {picks.map((pick) => (
          <Link
            key={pick.ratingId}
            href={`/rate?placeId=${encodeURIComponent(pick.placeId)}`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-high"
            aria-label={`${pick.venueName}, rated ${pick.weightedScore.toFixed(1)} out of 10`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- critic meal photos */}
            <img
              src={pick.mealPhotoUrl!}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-xs">
              <p className="line-clamp-1 font-label-sm text-label-sm font-semibold text-white">
                {pick.venueName}
              </p>
              <p className="font-label-sm text-label-sm tabular-nums text-white/90">
                {pick.weightedScore.toFixed(1)}/10
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

interface CriticTopPicksRowProps {
  picks: CriticPick[];
}

export function CriticTopPicksRow({ picks }: CriticTopPicksRowProps) {
  if (picks.length === 0) return null;

  return (
    <section aria-labelledby="critic-top-picks-heading" className="flex flex-col gap-sm">
      <h2
        id="critic-top-picks-heading"
        className="font-title-sm text-title-sm font-bold text-on-surface"
      >
        Top picks
      </h2>
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        Highest scores — one pick per spot.
      </p>
      <div
        className="flex snap-x snap-mandatory gap-sm overflow-x-auto pb-xs -mx-margin-edge px-margin-edge"
        style={{ scrollbarWidth: "thin" }}
      >
        {picks.map((pick, index) => {
          const subtitle = pick.city
            ? pick.city
            : pick.cuisine
              ? cuisineLabel(pick.cuisine)
              : null;
          return (
            <Link
              key={pick.placeId}
              href={`/rate?placeId=${encodeURIComponent(pick.placeId)}`}
              className="relative flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low transition-colors hover:bg-surface-container active:scale-[0.98]"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container-high">
                {pick.mealPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pick.mealPhotoUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span
                      className="material-symbols-outlined text-[32px] text-on-surface-variant"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      restaurant
                    </span>
                  </div>
                )}
                <span className="absolute left-xs top-xs rounded-full bg-surface/90 px-xs py-0.5 font-label-sm text-label-sm font-semibold text-on-surface shadow-sm backdrop-blur-sm">
                  #{index + 1}
                </span>
                <span className="absolute bottom-xs right-xs rounded-md bg-surface/90 px-xs py-0.5 font-label-sm text-label-sm font-bold tabular-nums text-primary shadow-sm backdrop-blur-sm">
                  {pick.weightedScore.toFixed(1)}/10
                </span>
              </div>
              <div className="flex flex-col gap-0.5 p-sm">
                <p className="line-clamp-1 font-title-sm text-title-sm font-semibold text-on-surface">
                  {pick.venueName}
                </p>
                {subtitle && (
                  <p className="line-clamp-1 font-label-sm text-label-sm text-on-surface-variant">
                    {subtitle}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
