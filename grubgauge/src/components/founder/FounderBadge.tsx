import type { FounderBadgeInfo } from "@/lib/founder/founder";

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
 *   - "the-founder"   → bold amber pill with a crown glyph + "FOUNDER".
 *                       Singular badge, env-pinned to the app founder's
 *                       user_id. No number — it's THE Founder.
 *   - "founding-member" → green pill with the slot number (#1-100).
 *                         Awarded by DB trigger when a user posts 3
 *                         qualifying ratings.
 *
 * Layout pre-allocates a fixed visual size at compact = ~h-6 so the
 * far-right slot on rating cards doesn't reflow as feeds hydrate.
 */
export function FounderBadge({ badge, size = "compact" }: Props) {
  if (!badge) return null;

  if (badge.kind === "the-founder") {
    return <TheFounderPill size={size} />;
  }
  return <FoundingMemberPill slot={badge.slotNumber ?? 0} size={size} />;
}

function TheFounderPill({ size }: { size: "compact" | "full" }) {
  const padding = size === "full" ? "px-sm py-0.5" : "px-xs py-0.5";
  const textCls = size === "full" ? "font-label-sm text-label-sm" : "font-label-sm text-[11px]";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-xs rounded-full bg-tertiary text-on-tertiary font-semibold ${padding} ${textCls}`}
      aria-label="The Founder badge"
      title="The Founder — the one and only."
    >
      <span
        className="material-symbols-outlined text-[14px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden
      >
        crown
      </span>
      FOUNDER
    </span>
  );
}

function FoundingMemberPill({ slot, size }: { slot: number; size: "compact" | "full" }) {
  const padding = size === "full" ? "px-sm py-0.5" : "px-xs py-0.5";
  const textCls = size === "full" ? "font-label-sm text-label-sm" : "font-label-sm text-[11px]";
  const labelSuffix = size === "full" ? " FOUNDER" : "";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-xs rounded-full bg-primary-container text-on-primary-container font-semibold ${padding} ${textCls}`}
      aria-label={`Founding Member number ${slot}`}
      title={`Founding Member #${slot} — one of the first 100.`}
    >
      <span
        className="material-symbols-outlined text-[14px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden
      >
        workspace_premium
      </span>
      <span className="tabular-nums">#{slot}</span>
      {labelSuffix}
    </span>
  );
}
