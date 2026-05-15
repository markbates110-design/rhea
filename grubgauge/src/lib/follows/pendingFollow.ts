/**
 * Cross-page intent stash for guests who tapped "Follow" before signing up.
 *
 * Flow:
 *   1. Guest taps Follow on user X → `setPendingFollow(X.id, currentPath)`.
 *   2. Guest finishes signup/sign-in → success handler reads
 *      `consumePendingFollow()`, runs the follow, and routes back to the
 *      stored returnTo so they land on the same profile already in the
 *      Following state.
 *
 * Lives in localStorage (single key) rather than a cookie because it only
 * needs to survive a same-tab navigation; the auth flow can take several
 * seconds across email confirmation, so sessionStorage is too narrow.
 *
 * Stored payload is intentionally tiny — a target uuid plus the path the
 * sheet was opened from. The path is used as the `next=` parameter on the
 * sign-up link and as the post-success redirect.
 */

const PENDING_FOLLOW_KEY = "grubgauge_pending_follow";

export interface PendingFollow {
  targetUserId: string;
  returnTo: string;
}

/**
 * Stash a follow intent. Overwrites any prior pending intent — the latest
 * tap wins, since older intents almost certainly belong to a previous
 * abandoned sign-up attempt.
 */
export function setPendingFollow(intent: PendingFollow): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_FOLLOW_KEY, JSON.stringify(intent));
  } catch {
    // Quota / storage-disabled environments: silently drop. The auto-follow
    // is a nice-to-have on top of the gate; the gate itself still works.
  }
}

/**
 * Read the current pending intent without clearing it. Used by the
 * sign-up page to render the target user's name/avatar inside the
 * onboarding CTA ("Joining to follow {name}") for conversion lift.
 */
export function getPendingFollow(): PendingFollow | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PENDING_FOLLOW_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingFollow>;
    if (
      parsed &&
      typeof parsed.targetUserId === "string" &&
      typeof parsed.returnTo === "string"
    ) {
      return { targetUserId: parsed.targetUserId, returnTo: parsed.returnTo };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Atomically read-and-clear the pending intent. The sign-up success
 * handler calls this exactly once after auth resolves; clearing inside
 * the same call ensures a refresh of the success page can't replay the
 * follow a second time.
 */
export function consumePendingFollow(): PendingFollow | null {
  const intent = getPendingFollow();
  if (intent !== null) clearPendingFollow();
  return intent;
}

/**
 * Clear without consuming. Called when the gate sheet is dismissed (the
 * "Continue browsing" path) so a stale intent doesn't auto-follow on a
 * later, unrelated sign-up.
 */
export function clearPendingFollow(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_FOLLOW_KEY);
  } catch {
    // Same rationale as setPendingFollow's catch — silently drop.
  }
}
