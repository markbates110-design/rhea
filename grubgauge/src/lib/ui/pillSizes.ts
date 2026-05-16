/**
 * Shared sizing for compact pills that should read as a matched set when
 * they appear in close proximity on rating cards: Founder, Follow, venue,
 * score descriptor, and Like. Each pill owns its own color contract; this
 * token only owns layout / typography size.
 *
 * This intentionally matches the pre-existing rating descriptor pill
 * ("Exceptional", "Great Value", etc.) so auxiliary chips align to the
 * rating-card baseline instead of introducing another size tier.
 */
export const PILL_COMPACT_SIZE_CLASSES =
  "px-xs py-0.5 font-label-sm text-label-sm";

export const PILL_COMPACT_ICON_SIZE_CLASS = "text-[13px]";
