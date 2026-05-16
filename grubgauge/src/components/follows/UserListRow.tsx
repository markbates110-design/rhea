"use client";

import Link from "next/link";
import type { Profile } from "@/lib/profile/profile";
import type { FounderBadgeInfo } from "@/lib/founder/founder";
import { displayNameForProfile, initialForName } from "@/lib/profile/names";
import { FounderBadge } from "@/components/founder/FounderBadge";
import { FollowButton } from "./FollowButton";

interface Props {
  /**
   * The profile to render — caller has already resolved the join from a
   * follow edge to the corresponding profiles row.
   */
  profile: Profile;
  /**
   * Optional founder badge for this row's user. Caller batch-hydrates via
   * `getFounderBadgesByUserIds`; omit when not needed (the row renders
   * cleanly without the trailing pill).
   */
  founderBadge?: FounderBadgeInfo | null;
}

/**
 * One row in the followers / following list pages. Whole row is a link to
 * `/u/{username}` (the user's ratings page); the trailing FollowButton is
 * stop-propagation'd so a tap on the button doesn't navigate away.
 *
 * Mirrors the avatar chrome used in `RaterBadge` and `HomeHeader` so the
 * follow lists feel like part of the same visual system.
 */
export function UserListRow({ profile, founderBadge = null }: Props) {
  const displayName = displayNameForProfile(profile);
  const initial = initialForName(displayName);

  return (
    <div className="flex items-center gap-sm rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm transition-colors hover:bg-surface-container">
      <Link
        href={`/u/${profile.username}`}
        className="flex min-w-0 flex-1 items-center gap-sm"
        aria-label={`View ${displayName}'s ratings`}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-high font-title-sm text-title-sm font-bold text-on-surface"
          aria-hidden
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar from Storage; sized 40px, no LCP role
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            initial
          )}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-xs min-w-0">
            <span className="truncate font-title-sm text-title-sm font-semibold text-on-surface">
              {displayName}
            </span>
            <FounderBadge badge={founderBadge} size="compact" />
          </span>
          <span className="truncate font-label-sm text-label-sm text-on-surface-variant">
            @{profile.username}
          </span>
        </span>
      </Link>
      {/* Stop propagation so the row's outer Link doesn't fire when the
          user is tapping the Follow / Following toggle. */}
      <span onClick={(e) => e.stopPropagation()} className="shrink-0">
        <FollowButton
          target={{
            userId: profile.id,
            username: profile.username,
            displayName,
            avatarUrl: profile.avatar_url ?? null,
          }}
          size="sm"
        />
      </span>
    </div>
  );
}
