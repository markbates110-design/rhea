export interface ProfileNameFields {
  username: string;
  display_name?: string | null;
}

/**
 * Friendly public name for UI copy. `display_name` is the human label; the
 * unique username only appears as the fallback so older profiles still render.
 */
export function displayNameForProfile(
  profile: ProfileNameFields | null | undefined,
  fallback = "",
): string {
  const displayName = profile?.display_name?.trim();
  if (displayName) return displayName;

  const username = profile?.username?.trim();
  if (username) return username;

  return fallback.trim();
}

export function handleForProfile(profile: ProfileNameFields): string {
  return `@${profile.username}`;
}

export function initialForName(source: string): string {
  return source.trim().charAt(0).toUpperCase() || "•";
}
