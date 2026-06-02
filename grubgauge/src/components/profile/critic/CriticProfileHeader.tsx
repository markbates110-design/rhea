import type { CSSProperties } from "react";
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

/** Same width contract as ShareCriticProfileBanner — inline so it cannot lose to Tailwind %/flex. */
const IDENTITY_COLUMN_STYLE: CSSProperties = {
  display: "block",
  boxSizing: "border-box",
  width: "min(28rem, 100%)",
  minWidth: 280,
  maxWidth: "28rem",
  marginInline: "auto",
  textAlign: "center",
};

const TAGLINE_STYLE: CSSProperties = {
  display: "block",
  width: "100%",
  margin: 0,
  marginTop: 12,
  fontSize: 16,
  lineHeight: 1.5,
  fontWeight: 400,
  whiteSpace: "normal",
  overflowWrap: "normal",
  wordBreak: "normal",
  writingMode: "horizontal-tb",
};

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
    <div className="gg-prose-column w-full">
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

      <div style={IDENTITY_COLUMN_STYLE}>
        <p className="font-label-sm text-label-sm uppercase tracking-wide text-primary">
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

        <p
          className="text-on-surface-variant"
          style={TAGLINE_STYLE}
        >
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
