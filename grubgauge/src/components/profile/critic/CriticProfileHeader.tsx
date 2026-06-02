import { FounderBadge } from "@/components/founder/FounderBadge";
import { FollowButton } from "@/components/follows/FollowButton";
import { FollowStatRow } from "@/components/follows/FollowStatRow";
import { CriticBadgePill } from "@/components/profile/critic/CriticBadges";
import type { CriticBadge } from "@/lib/profile/criticBadges";
import type { FounderBadgeInfo } from "@/lib/founder/founder";
import type { Profile } from "@/lib/profile/profile";

interface CriticProfileHeaderProps {
  profile: Profile;
  displayName: string;
  initial: string;
  tagline: string;
  founderBadge: FounderBadgeInfo | null;
  topCriticBadge: CriticBadge | null;
  isSelf: boolean;
}

/**
 * Public critic identity block.
 *
 * Tagline copy uses the same class pattern as CriticStatsStrip footer text
 * (w-full text-center, no break-word). overflow-wrap: break-word on a grid/flex
 * child lets min-content collapse to one character → one glyph per line.
 */
export function CriticProfileHeader({
  profile,
  displayName,
  initial,
  tagline,
  founderBadge,
  topCriticBadge,
  isSelf,
}: CriticProfileHeaderProps) {
  return (
    <div className="w-full text-center">
      <div
        className="mx-auto mb-sm flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-surface-container-high shadow-sm"
        aria-hidden
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="font-headline-md text-headline-md font-bold text-on-surface">
            {initial}
          </span>
        )}
      </div>

      <div className="mx-auto w-full max-w-md">
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
          Food critic
        </p>
        <h1 className="mt-xs font-headline-md text-headline-md font-bold text-on-surface">
          {displayName}
        </h1>
        <p className="mt-xs font-label-sm text-label-sm text-on-surface-variant">
          @{profile.username}
        </p>

        {(founderBadge || topCriticBadge) && (
          <div className="mt-sm flex flex-wrap items-center justify-center gap-xs">
            {founderBadge && <FounderBadge badge={founderBadge} size="compact" />}
            {topCriticBadge && (
              <CriticBadgePill badge={topCriticBadge} size="compact" />
            )}
          </div>
        )}

        <p className="mt-sm w-full text-center font-body-md text-body-md text-on-surface-variant">
          {tagline}
        </p>
      </div>

      {!isSelf && (
        <div className="mt-sm flex justify-center">
          <FollowButton
            target={{
              userId: profile.id,
              username: profile.username,
              displayName,
              avatarUrl: profile.avatar_url ?? null,
            }}
          />
        </div>
      )}

      <div className="mt-sm">
        <FollowStatRow userId={profile.id} username={profile.username} />
      </div>
    </div>
  );
}
