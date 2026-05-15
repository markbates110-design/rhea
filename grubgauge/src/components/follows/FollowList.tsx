"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import {
  getProfileByUsername,
  PROFILES_TABLE,
  type Profile,
} from "@/lib/profile/profile";
import {
  type FollowEdge,
  getFollowers,
  getFollowing,
} from "@/lib/follows/follows";
import { UserListRow } from "./UserListRow";

type Mode = "followers" | "following";

interface Props {
  mode: Mode;
}

/**
 * Shared body for `/u/[username]/followers` and `/u/[username]/following`.
 * Each route is a thin wrapper that just sets `mode` — keeps the URL
 * structure clear (Next.js owns one page.tsx per path) without
 * duplicating the fetch + render pipeline.
 *
 * Read-only for everyone (the public-read RLS on `follows` and `profiles`
 * means guests see the same lists as members). Tapping the row's Follow
 * button still gates guests through `FollowGateSheet` — the membership
 * boundary lives at the action, not at the visibility.
 *
 * Same client-fetch shape as `/u/[username]/page.tsx`: a single useEffect
 * driven by the `username` param, cancelled flag, and a `notFound()` call
 * gated behind a settled `missing` flag so the boundary fires exactly once.
 */
export function FollowList({ mode }: Props) {
  const params = useParams<{ username: string }>();
  const username = decodeParam(params?.username);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const found = await getProfileByUsername(supabase, username);
        if (cancelled) return;
        if (!found) {
          setMissing(true);
          return;
        }
        setProfile(found);

        const edges: FollowEdge[] =
          mode === "followers"
            ? await getFollowers(supabase, found.id)
            : await getFollowing(supabase, found.id);
        if (cancelled) return;

        // Map each edge to the *other* user's id (the side opposite the
        // anchor profile). Followers list shows `follower_id`s; following
        // list shows `followee_id`s.
        const ids = edges.map((e) => (mode === "followers" ? e.follower_id : e.followee_id));
        const profiles = await fetchProfiles(supabase, ids);
        if (cancelled) return;

        // Preserve the edge ordering (newest follow first) when arranging
        // the rendered rows — fetchProfiles returns a Map keyed by id.
        const ordered = ids
          .map((id) => profiles.get(id))
          .filter((p): p is Profile => p !== undefined);
        setRows(ordered);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [username, mode]);

  if (!loading && missing) notFound();

  if (loading || !profile) {
    return (
      <PageShell variant="feed" className="pt-lg pb-10">
        <div className="flex items-center gap-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          <span className="font-body-md text-body-md">Loading…</span>
        </div>
      </PageShell>
    );
  }

  const displayName = profile.display_name?.trim() || profile.username;
  const heading = mode === "followers" ? "Followers" : "Following";
  const emptyCopy =
    mode === "followers"
      ? `${displayName} doesn't have any followers yet.`
      : `${displayName} isn't following anyone yet.`;

  return (
    <PageShell variant="feed" className="pt-lg pb-10">
      <div className="flex flex-col gap-lg">
        <div className="flex flex-col gap-xs">
          <Link
            href={`/u/${profile.username}`}
            className="inline-flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors w-fit"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            @{profile.username}
          </Link>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
            {heading}
          </h1>
        </div>

        {rows.length === 0 ? (
          <p className="text-center font-body-md text-body-md text-on-surface-variant py-lg">
            {emptyCopy}
          </p>
        ) : (
          <div className="flex flex-col gap-sm">
            {rows.map((p) => (
              <UserListRow key={p.id} profile={p} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * Same decode dance as `/u/[username]/page.tsx`. Next.js's `useParams`
 * returns the *undecoded* path segment for client components; usernames
 * containing spaces / unicode lookups otherwise miss.
 */
function decodeParam(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Batch-fetch profile rows for a list of ids. Returns a Map keyed by id
 * for O(1) ordering at the call site (the caller preserves the edge
 * ordering from the original fetch).
 *
 * Public-read RLS on `public.profiles` means this works unauthenticated.
 */
async function fetchProfiles(
  supabase: ReturnType<typeof createClient>,
  ids: string[],
): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id, username, display_name, avatar_url, created_at, updated_at")
    .in("id", ids);
  if (error || !data) return map;

  for (const row of data as Profile[]) {
    map.set(row.id, row);
  }
  return map;
}
