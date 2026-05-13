import Link from "next/link";
import type { RaterFields } from "@/lib/profile/raters";

interface RaterBadgeProps {
  /**
   * The rater fields fetched from `public.profiles`, or `null` when the
   * rating has no associated user (guest rating with `user_id is null`)
   * or the join missed (orphaned rating from a deleted profile).
   */
  rater: RaterFields | null;
}

/**
 * Inline attribution badge for a rating card: small round avatar + display
 * name (falling back to username). Links to `/u/[username]` when a rater
 * is present; renders a no-link "Deleted user" fallback otherwise.
 *
 * Sizing + chrome mirror `HomeHeader.ProfileAvatar` (h-8 w-8, rounded-full,
 * border-outline-variant, bg-surface-container-high, initial fallback) so
 * the header avatar and the card-level attribution avatars feel like a
 * matched set rather than two variants.
 *
 * Note: the `/u/[username]` route does not exist yet — taps will 404. This
 * is intentional (the route lands in a follow-up); when added, the existing
 * Link wrapper will resolve without any change to this component.
 */
export function RaterBadge({ rater }: RaterBadgeProps) {
  if (!rater) {
    return <RaterBadgeContent name="Deleted user" avatarUrl={null} initial="•" muted />;
  }

  const displayName = rater.display_name?.trim() || rater.username;
  const initial = initialFor(displayName);

  return (
    <Link
      href={`/u/${rater.username}`}
      className="group inline-flex items-center gap-xs rounded-full px-0.5 py-0.5 transition-colors hover:bg-surface-container active:scale-[0.98]"
      aria-label={`View ${displayName}'s ratings`}
    >
      <RaterBadgeContent name={displayName} avatarUrl={rater.avatar_url} initial={initial} />
    </Link>
  );
}

function RaterBadgeContent({
  name,
  avatarUrl,
  initial,
  muted = false,
}: {
  name: string;
  avatarUrl: string | null;
  initial: string;
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
          initial
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
