"use client";

import { useAuth } from "@/lib/auth/useAuth";
import { RatingCard, type RatingCardProps } from "@/components/ratings/RatingCard";
import { FollowButton } from "./FollowButton";

/**
 * RatingCard wrapper for the FollowingFeed's guest variant. For signed-in
 * viewers it delegates to the plain RatingCard with no changes. For guests
 * it slots a small inline Follow button into the LikeButton row via the
 * card's `trailingAction` prop, turning every visible rater into a
 * single-tap conversion target via FollowGateSheet.
 *
 * Keeps RatingCard pristine for every other surface (history, explore,
 * /u/[username]) — they pass no `trailingAction` and render unchanged.
 *
 * The Follow button shares its row with LikeButton (right-aligned via
 * justify-between) instead of overlapping the founder pill at top-right.
 */
export function FeedRatingCard(props: RatingCardProps) {
  const { user, loading } = useAuth();

  // Members + loading-state-during-auth-resolve get the standard card.
  // The guest variant only renders once auth has resolved to "no user",
  // so a member never sees the conversion overlay flash.
  if (loading || user) {
    return <RatingCard {...props} />;
  }

  const rater = props.rating.rater;
  const userId = readUserId(props);
  // Cards without a resolved rater (deleted user) or a known user_id
  // (would break the follow mutation since follows are keyed on user_id)
  // render the underlying card with no Follow control. Better to show
  // nothing than the wrong follow target.
  if (!rater || !userId) {
    return <RatingCard {...props} />;
  }

  const displayName = rater.display_name?.trim() || rater.username;

  return (
    <RatingCard
      {...props}
      trailingAction={
        <FollowButton
          target={{
            userId,
            username: rater.username,
            displayName,
            avatarUrl: rater.avatar_url ?? null,
          }}
          size="sm"
        />
      }
    />
  );
}

/**
 * RaterFields doesn't carry the user_id (it's the lookup key, not a field
 * on the badge type). Feeds upstream always set `props.rating.user_id`,
 * so we read it from there via a narrow cast — the RatingCardRating type
 * is intentionally minimal, so a structural extension is the right tool.
 */
function readUserId(props: RatingCardProps): string {
  const candidate = (props.rating as { user_id?: string | null }).user_id;
  return typeof candidate === "string" ? candidate : "";
}
