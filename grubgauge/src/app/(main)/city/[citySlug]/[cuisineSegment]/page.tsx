import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ValueSpotList } from "@/components/value/ValueSpotList";
import { createClient } from "@/lib/supabase/server";
import {
  cityDisplayName,
  cuisineLabel,
  parseCuisineSegment,
} from "@/lib/seo/slugs";
import {
  buildCitySlugMap,
  fetchValuePageRatings,
  rankSpotsFromRows,
  resolveCityFromSlug,
} from "@/lib/ratings/valuePages";

type PageProps = {
  params: Promise<{ citySlug: string; cuisineSegment: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { citySlug, cuisineSegment } = await params;
  const cuisine = parseCuisineSegment(cuisineSegment);
  const supabase = await createClient();
  const rows = await fetchValuePageRatings(supabase);
  const city = resolveCityFromSlug(citySlug, buildCitySlugMap(rows));
  if (!city || !cuisine) return { title: "Not found | GrubGauge" };
  const label = cuisineLabel(cuisine);
  return {
    title: `Best value ${label} in ${cityDisplayName(city)} | GrubGauge`,
    description: `Community-rated ${label} spots in ${city}, ranked by value score.`,
  };
}

export default async function CityCuisineValuePage({ params }: PageProps) {
  const { citySlug, cuisineSegment } = await params;
  const cuisine = parseCuisineSegment(cuisineSegment);
  if (!cuisine) notFound();

  const supabase = await createClient();
  const rows = await fetchValuePageRatings(supabase);
  const city = resolveCityFromSlug(citySlug, buildCitySlugMap(rows));
  if (!city) notFound();

  const cityRows = rows.filter(
    (row) => row.city?.trim().toLowerCase() === city.trim().toLowerCase(),
  );
  const spots = rankSpotsFromRows(cityRows, { cuisine }).slice(0, 20);
  const label = cuisineLabel(cuisine);

  return (
    <PageShell variant="feed" className="pt-lg pb-10">
      <div className="flex flex-col gap-lg">
        <div>
          <Link
            href={`/city/${citySlug}`}
            className="font-label-sm text-label-sm text-primary hover:underline"
          >
            {cityDisplayName(city)}
          </Link>
          <h1 className="mt-sm font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">
            Best value {label}
          </h1>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
            {spots.length}{" "}
            {spots.length === 1 ? "spot" : "spots"} ranked by community
            scores in {cityDisplayName(city)}.
          </p>
        </div>

        <ValueSpotList spots={spots} />

        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Scores come from weighted criteria (taste, portion, service, and
          more) — not a single star rating.
        </p>
      </div>
    </PageShell>
  );
}
