"use client";

import Link from "next/link";
import { useFollowState } from "@/lib/follows/useFollowState";

interface Props {
  /**
   * The user the stats belong to. We need both id (for live counts via
   * useFollowState) and username (for the list-page links).
   */
  userId: string;
  username: string;
}

/**
 * Two tappable stats — Following and Followers — for placement under the
 * profile header on `/u/[username]` and `/profile`. Each tile links to the
 * matching list page; the third "Ratings" / aggregate stat is left to the
 * parent because each surface formats it differently (likes vs avg vs
 * count) and we want a single source of truth for those numbers.
 *
 * Counts come from `useFollowState` so an optimistic Follow tap on the
 * same page updates the Followers number in real time without a refetch
 * (the FOLLOW_CHANGED_EVENT keeps independent mounts in sync).
 */
export function FollowStatRow({ userId, username }: Props) {
  const { followerCount, followingCount, loading } = useFollowState(userId);

  return (
    <div className="flex items-center justify-center gap-lg">
      <StatTile
        href={`/u/${username}/following`}
        label="Following"
        value={followingCount}
        loading={loading}
      />
      <span className="h-6 w-px bg-outline-variant" aria-hidden />
      <StatTile
        href={`/u/${username}/followers`}
        label="Followers"
        value={followerCount}
        loading={loading}
      />
    </div>
  );
}

function StatTile({
  href,
  label,
  value,
  loading,
}: {
  href: string;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-0.5 rounded-md px-sm py-xs text-center transition-colors hover:bg-surface-container active:scale-95"
    >
      <span className="font-title-md text-title-md font-bold tabular-nums text-on-surface group-hover:text-primary">
        {loading ? "—" : value}
      </span>
      <span className="font-label-sm text-label-sm text-on-surface-variant">
        {label}
      </span>
    </Link>
  );
}
