/**
 * Shared sizing for compact pills that should read as a matched set when
 * they appear in close proximity on rating cards: Founder, Follow, venue,
 * score descriptor, and Like. Each pill owns its own color contract; this
 * token only owns layout / typography size.
 *
 * This intentionally pins the pill box to the descriptor's visual height
 * ("Exceptional", "Great Value", etc.). Padding/text classes alone are not
 * enough: bordered pills and Material Symbols can otherwise render taller
 * even when they appear to share the same Tailwind size tokens.
 */
export const PILL_COMPACT_SIZE_CLASSES =
  "h-5 px-xs py-0 font-label-sm text-[10px] leading-none";

export const PILL_COMPACT_ICON_SIZE_CLASS = "text-[10px] leading-none";

export const PILL_COMPACT_GAP_CLASS = "gap-1";
