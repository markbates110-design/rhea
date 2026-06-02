import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { createClient } from "@/lib/supabase/server";
import {
  buildCityIndex,
  fetchValuePageRatings,
} from "@/lib/ratings/valuePages";

export const metadata: Metadata = {
  title: "Best value dining by city | GrubGauge",
  description:
    "Browse community-rated spots by city — find the best value restaurants, cafes, and food trucks near you.",
};

export default async function CityIndexPage() {
  const supabase = await createClient();
  const rows = await fetchValuePageRatings(supabase);
  const cities = buildCityIndex(rows);

  return (
    <PageShell variant="feed" className="pt-lg pb-10">
      <div className="flex flex-col gap-lg">
        <div>
          <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">
            Value by city
          </h1>
          <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
            Community scores for the best value spots — pick a city, then a
            cuisine.
          </p>
        </div>

        {cities.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            No city data yet. Ratings with a city will appear here as the
            community grows.
          </p>
        ) : (
          <ul className="flex flex-col gap-sm">
            {cities.map((entry) => (
              <li key={entry.citySlug}>
                <Link
                  href={`/city/${entry.citySlug}`}
                  className="flex items-center justify-between gap-sm rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm transition-colors hover:bg-surface-container"
                >
                  <span className="font-title-sm text-title-sm font-semibold text-on-surface">
                    {entry.city}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {entry.placeCount}{" "}
                    {entry.placeCount === 1 ? "spot" : "spots"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
