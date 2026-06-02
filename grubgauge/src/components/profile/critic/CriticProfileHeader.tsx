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
 * Public critic identity block. Uses block layout (not flex-col items-center)
 * so copy always spans the full readable column width — flex centering was
 * collapsing the column to pill-width and stacking one word per line.
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
    <header className="block w-full min-w-[280px] self-stretch text-center">
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

      <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-y-xs text-center">
        <p className="col-span-1 w-full font-label-sm text-label-sm uppercase tracking-widest text-primary">
          Food critic
        </p>
        <h1 className="col-span-1 w-full font-headline-md text-headline-md font-bold text-on-surface">
          {displayName}
        </h1>
        <p className="col-span-1 w-full font-label-sm text-label-sm text-on-surface-variant">
          @{profile.username}
        </p>

        {(founderBadge || topCriticBadge) && (
          <div className="col-span-1 flex w-full flex-wrap items-center justify-center gap-xs">
            {founderBadge && <FounderBadge badge={founderBadge} size="compact" />}
            {topCriticBadge && (
              <CriticBadgePill badge={topCriticBadge} size="compact" />
            )}
          </div>
        )}

        <p className="gg-readable-text col-span-1 w-full font-body-md text-body-md text-on-surface-variant">
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
    </header>
  );
}
