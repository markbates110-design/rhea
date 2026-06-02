import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ValueSpotList } from "@/components/value/ValueSpotList";
import { createClient } from "@/lib/supabase/server";
import {
  cityDisplayName,
  cuisineLabel,
  cuisineSegmentFor,
} from "@/lib/seo/slugs";
import {
  buildCitySlugMap,
  buildCuisineLinksForCity,
  fetchValuePageRatings,
  rankSpotsFromRows,
  resolveCityFromSlug,
} from "@/lib/ratings/valuePages";

type PageProps = {
  params: Promise<{ citySlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const supabase = await createClient();
  const rows = await fetchValuePageRatings(supabase);
  const city = resolveCityFromSlug(citySlug, buildCitySlugMap(rows));
  if (!city) return { title: "City not found | GrubGauge" };
  return {
    title: `Best value dining in ${cityDisplayName(city)} | GrubGauge`,
    description: `Top community-rated value spots in ${city}. Browse by cuisine and see scores from real diners.`,
  };
}

export default async function CityHubPage({ params }: PageProps) {
  const { citySlug } = await params;
  const supabase = await createClient();
  const rows = await fetchValuePageRatings(supabase);
  const slugMap = buildCitySlugMap(rows);
  const city = resolveCityFromSlug(citySlug, slugMap);
  if (!city) notFound();

  const cityRows = rows.filter(
    (row) => row.city?.trim().toLowerCase() === city.trim().toLowerCase(),
  );
  const topSpots = rankSpotsFromRows(cityRows).slice(0, 12);
  const budgetSpots = rankSpotsFromRows(cityRows, { maxPriceLevel: 1 }).slice(
    0,
    8,
  );
  const cuisineLinks = buildCuisineLinksForCity(
    rows,
    city,
    cuisineSegmentFor,
    cuisineLabel,
  );

  return (
    <PageShell variant="feed" className="pt-lg pb-10">
      <div className="flex flex-col gap-lg">
        <div>
          <Link
            href="/city"
            className="font-label-sm text-label-sm text-primary hover:underline"
          >
            All cities
          </Link>
          <h1 className="mt-sm font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">
            Best value in {cityDisplayName(city)}
          </h1>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
            Ranked by community GrubGauge scores — tap a spot to rate it
            yourself.
          </p>
        </div>

        <section className="flex flex-col gap-sm">
          <h2 className="font-title-sm text-title-sm font-bold text-on-surface">
            Top spots
          </h2>
          <ValueSpotList spots={topSpots} />
        </section>

        {budgetSpots.length > 0 && (
          <section className="flex flex-col gap-sm">
            <h2 className="font-title-sm text-title-sm font-bold text-on-surface">
              Budget-friendly picks
            </h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Spots tagged $ or free on Google, still ranked by community
              score.
            </p>
            <ValueSpotList spots={budgetSpots} showRank={false} />
          </section>
        )}

        {cuisineLinks.length > 0 && (
          <section className="flex flex-col gap-sm">
            <h2 className="font-title-sm text-title-sm font-bold text-on-surface">
              By cuisine
            </h2>
            <div className="flex flex-wrap gap-xs">
              {cuisineLinks.map((link) => (
                <Link
                  key={link.cuisine}
                  href={`/city/${citySlug}/${link.cuisineSegment}`}
                  className="inline-flex items-center gap-xs rounded-full border border-outline-variant bg-surface-container-low px-sm py-xs font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container"
                >
                  {link.label}
                  <span className="tabular-nums text-on-surface-variant">
                    {link.placeCount}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
