import type { CriticSpecialty } from "@/lib/profile/criticPortfolio";
import { VENUE_META } from "@/lib/ratings/scoring";
import type { VenueType } from "@/lib/ratings/scoring";

interface CriticSpecialtiesProps {
  specialties: CriticSpecialty[];
  topVenueType: VenueType | null;
}

export function CriticSpecialties({
  specialties,
  topVenueType,
}: CriticSpecialtiesProps) {
  if (specialties.length === 0 && !topVenueType) return null;

  return (
    <section aria-labelledby="critic-specialties-heading" className="flex flex-col gap-sm">
      <h2
        id="critic-specialties-heading"
        className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
      >
        Specialties
      </h2>
      <div className="flex flex-wrap gap-xs">
        {topVenueType && (
          <span className="inline-flex items-center gap-xs rounded-full bg-primary/10 px-sm py-xs font-label-sm text-label-sm font-semibold text-primary">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {VENUE_META[topVenueType].icon}
            </span>
            {VENUE_META[topVenueType].label}
          </span>
        )}
        {specialties.map((item) => (
          <span
            key={item.cuisine}
            className="inline-flex items-center rounded-full bg-surface-variant px-sm py-xs font-label-sm text-label-sm text-on-surface-variant"
          >
            {item.label}
            <span className="ml-xs tabular-nums text-on-surface">
              {item.count}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
