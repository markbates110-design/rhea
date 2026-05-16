import type { FounderBadgeInfo } from "@/lib/founder/founder";
import {
  PILL_COMPACT_ICON_SIZE_CLASS,
  PILL_COMPACT_SIZE_CLASSES,
} from "@/lib/ui/pillSizes";

interface Props {
  /**
   * The badge state — `null` renders nothing so callers can pipe an
   * unconditional `<FounderBadge badge={...} />` without wrapping in a
   * conditional. Mirrors the RaterBadge ergonomics.
   */
  badge: FounderBadgeInfo | null;
  /**
   * Compact = icon + number/glyph only (rating cards, far-right slot).
   * Full   = icon + label text (profile header, progress card celebration).
   */
  size?: "compact" | "full";
}

/**
 * Distinct, scarce identity marker shown on profile + every rating.
 * Two visual kinds, both using design-system tokens:
 *
 *   - "the-founder"   → amber pill with a crown glyph + "The Founder".
 *                       Singular badge, env-pinned to the app founder's
 *                       user_id. No number — it's THE Founder.
 *   - "founding-member" → green pill with "Founding Member #N".
 *                         Awarded by DB trigger when a user posts 3
 *                         qualifying ratings.
 *
 * Layout pre-allocates a fixed visual height at compact = h-5 so the
 * far-right slot on rating cards doesn't reflow as feeds hydrate.
 */
export function FounderBadge({ badge, size = "compact" }: Props) {
  if (!badge) return null;

  if (badge.kind === "the-founder") {
    return <TheFounderPill size={size} />;
  }
  return <FoundingMemberPill slot={badge.slotNumber ?? 0} size={size} />;
}

// Outline variants keep recognition (icon + amber-or-green hue, distinct
// from any other chip in the system) while dropping the visual shout of
// a solid-filled brand pill. The Founder keeps its crown at every size
// because the crown IS the asset (singular badge, no number to fall back
// on); FoundingMember drops the medal icon at compact size but keeps the
// label explicit so numbered members are never confused with the app founder.

function TheFounderPill({ size }: { size: "compact" | "full" }) {
  const sizeClasses =
    size === "full"
      ? "px-sm py-0.5 font-label-sm text-label-sm"
      : PILL_COMPACT_SIZE_CLASSES;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-xs rounded-full border border-tertiary bg-tertiary/10 text-tertiary font-semibold ${sizeClasses}`}
      aria-label="The Founder badge"
      title="The Founder — the one and only."
    >
      <span
        className={`material-symbols-outlined ${size === "full" ? "text-[12px]" : PILL_COMPACT_ICON_SIZE_CLASS}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden
      >
        crown
      </span>
      The Founder
    </span>
  );
}

function FoundingMemberPill({
  slot,
  size,
}: {
  slot: number;
  size: "compact" | "full";
}) {
  const sizeClasses =
    size === "full"
      ? "px-sm py-0.5 font-label-sm text-label-sm"
      : PILL_COMPACT_SIZE_CLASSES;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-xs rounded-full border border-primary bg-primary/10 text-primary font-semibold ${sizeClasses}`}
      aria-label={`Founding Member number ${slot}`}
      title={`Founding Member #${slot} — one of the first 100.`}
    >
      {size === "full" && (
        <span
          className="material-symbols-outlined text-[12px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden
        >
          workspace_premium
        </span>
      )}
      <span>
        Founding Member <span className="tabular-nums">#{slot}</span>
      </span>
    </span>
  );
}
