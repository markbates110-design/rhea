import type { CriticBadge, CriticBadgeProgress } from "@/lib/profile/criticBadges";
import { criticBadgeLabel } from "@/lib/profile/criticBadges";
import {
  PILL_COMPACT_GAP_CLASS,
  PILL_COMPACT_ICON_SIZE_CLASS,
  PILL_COMPACT_SIZE_CLASSES,
} from "@/lib/ui/pillSizes";

interface CriticBadgesSectionProps {
  badges: CriticBadge[];
  nextProgress?: CriticBadgeProgress | null;
  isSelf?: boolean;
}

export function CriticBadgesSection({
  badges,
  nextProgress = null,
  isSelf = false,
}: CriticBadgesSectionProps) {
  return (
    <section
      aria-labelledby="critic-badges-heading"
      className="flex w-full flex-col gap-sm"
    >
      <div className="flex flex-col gap-xs">
        <h2
          id="critic-badges-heading"
          className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
        >
          Critic credentials
        </h2>
      </div>

      {badges.length === 0 ? (
        <p className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface-variant">
          {isSelf
            ? "Rate spots with photos and honest scores to earn critic badges others can trust."
            : "No critic badges yet."}
        </p>
      ) : (
        <div className="flex w-full flex-wrap items-center gap-xs">
          {badges.map((item) => (
            <CriticBadgePill key={item.id} badge={item} size="compact" />
          ))}
        </div>
      )}

      {isSelf && nextProgress && (
        <div className="w-full rounded-xl border border-primary/20 bg-primary/5 px-md py-sm">
          <p className="font-label-sm text-label-sm font-semibold text-on-surface">
            Next badge: {nextProgress.badge.label}
          </p>
          <p className="mt-xs font-label-sm text-label-sm text-on-surface-variant">
            {Math.min(nextProgress.current, nextProgress.target)} of{" "}
            {nextProgress.target} {nextProgress.label}
          </p>
        </div>
      )}
    </section>
  );
}

interface CriticBadgePillProps {
  badge: CriticBadge | null;
  size?: "compact" | "full";
}

export function CriticBadgePill({ badge, size = "full" }: CriticBadgePillProps) {
  if (!badge) return null;
  const sizeClasses =
    size === "full"
      ? "px-sm py-0.5 font-label-sm text-label-sm"
      : PILL_COMPACT_SIZE_CLASSES;
  const gapClass = size === "full" ? "gap-xs" : PILL_COMPACT_GAP_CLASS;
  const iconClass =
    size === "full" ? "text-[12px]" : PILL_COMPACT_ICON_SIZE_CLASS;
  const label = criticBadgeLabel(badge);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-secondary bg-secondary/10 font-semibold text-secondary ${gapClass} ${sizeClasses}`}
      aria-label={`${label} — ${badge.description}`}
      title={badge.description}
    >
      <span
        className={`material-symbols-outlined ${iconClass}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden
      >
        {badge.icon}
      </span>
      {label}
    </span>
  );
}
