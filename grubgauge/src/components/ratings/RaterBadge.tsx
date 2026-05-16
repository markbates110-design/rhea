import Link from "next/link";
import type { ReactNode } from "react";
import type { RaterFields } from "@/lib/profile/raters";

interface RaterBadgeProps {
  /**
   * The rater fields fetched from `public.profiles`, or `null` for both
   * guest ratings (no user_id at insert) and orphaned ratings (user_id
   * set but profile lookup missed). `isGuest` disambiguates the two.
   */
  rater: RaterFields | null;
  /**
   * True when the rating row was posted without a user_id (intentional
   * guest post). Drives a neutral "Guest rating" chip instead of the
   * alarming "Deleted user" fallback. Ignored when `rater` is non-null.
   */
  isGuest?: boolean;
}

/**
 * Inline attribution badge for a rating card: small round avatar + display
 * name (falling back to username). Three states:
 *
 *   - real rater  → avatar + name, links to /u/[username]
 *   - guest       → neutral person icon + "Guest rating", no link
 *   - deleted     → bullet glyph + "Deleted user" muted, no link
 *
 * Sizing + chrome mirror `HomeHeader.ProfileAvatar` (h-8 w-8, rounded-full,
 * border-outline-variant, bg-surface-container-high, initial fallback) so
 * the header avatar and the card-level attribution avatars feel like a
 * matched set rather than two variants.
 */
export function RaterBadge({ rater, isGuest = false }: RaterBadgeProps) {
  if (!rater) {
    if (isGuest) {
      return (
        <RaterBadgeContent
          name="Guest rating"
          avatarUrl={null}
          glyph={
            <span
              className="material-symbols-outlined text-[18px] text-on-surface-variant"
              style={{ fontVariationSettings: "'FILL' 0" }}
              aria-hidden
            >
              person
            </span>
          }
          muted
        />
      );
    }
    return (
      <RaterBadgeContent name="Deleted user" avatarUrl={null} glyph="•" muted />
    );
  }

  const displayName = rater.display_name?.trim() || rater.username;
  const initial = initialFor(displayName);

  return (
    <Link
      href={`/u/${rater.username}`}
      className="group inline-flex items-center gap-xs rounded-full px-0.5 py-0.5 transition-colors hover:bg-surface-container active:scale-[0.98]"
      aria-label={`View ${displayName}'s ratings`}
    >
      <RaterBadgeContent name={displayName} avatarUrl={rater.avatar_url} glyph={initial} />
    </Link>
  );
}

function RaterBadgeContent({
  name,
  avatarUrl,
  glyph,
  muted = false,
}: {
  name: string;
  avatarUrl: string | null;
  /** Fallback rendered inside the avatar tile when no avatarUrl exists. */
  glyph: ReactNode;
  muted?: boolean;
}) {
  // Mirrors HomeHeader.ProfileAvatar chrome — same border / background /
  // initial typography — so card attribution feels like a smaller sibling
  // of the header avatar rather than a separately-styled element.
  return (
    <>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-high font-label-sm text-label-sm font-bold text-on-surface"
        aria-hidden
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar from Storage; sized 32px, no LCP role
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          glyph
        )}
      </span>
      <span
        className={`font-label-sm text-label-sm font-semibold truncate ${
          muted ? "text-on-surface-variant italic" : "text-on-surface group-hover:text-primary"
        }`}
      >
        {name}
      </span>
    </>
  );
}

function initialFor(source: string): string {
  const ch = source.trim().charAt(0).toUpperCase();
  return ch || "•";
}
