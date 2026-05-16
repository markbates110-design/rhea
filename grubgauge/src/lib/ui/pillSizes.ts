/**
 * Shared sizing for compact pills that should read as a matched set when
 * they appear in close proximity — currently `FounderBadge` (compact)
 * and `FollowButton` (size="sm"). Both pills carry their own color
 * contracts (founder amber/green; follow primary/outline); this token
 * only owns the layout / typography size so changing it in one place
 * keeps the visual rhythm consistent across rating cards, UserListRow,
 * SuggestedUsersRow cards, and any future surface that pairs them.
 *
 * Sized ~20% tighter than the previous compact pill (was `px-xs py-0` +
 * `text-[10px]`, font weight unchanged) so identity / action chips read
 * as auxiliary to the card's primary content rather than competing
 * with it. `text-[9px]` is borderline on lowest-DPI mobile but stays
 * legible at typical 2x/3x device pixel ratios; if QA finds it too
 * tight, the right escalation is to bump to `text-[10px]` and keep
 * the tighter horizontal padding rather than expanding both axes
 * simultaneously.
 *
 * Icon scaling is the caller's responsibility (icons live next to text
 * but use their own size class via `text-[NN px]` on the inline span).
 * Generally pair `text-[9px]` text with `text-[11px]` or `text-[12px]`
 * icons so the glyph stays visually weighted against the text without
 * overpowering it.
 */
export const PILL_COMPACT_SIZE_CLASSES =
  "px-1 py-0 font-label-sm text-[9px]";
