import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATARS_BUCKET = "avatars";
const MAX_INPUT_BYTES = 3 * 1024 * 1024;
const TARGET_DIM = 512;
const JPEG_QUALITY = 0.85;
const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// Fixed object name — overwriting via upsert keeps the user's folder tidy
// without listing + deleting prior objects. Extension is normalized to
// .jpg because every output of the client-side resize is a JPEG blob.
const AVATAR_FILENAME = "avatar.jpg";

export class AvatarError extends Error {
  constructor(message: string, readonly code: AvatarErrorCode) {
    super(message);
    this.name = "AvatarError";
  }
}

export type AvatarErrorCode =
  | "unauthenticated"
  | "unsupported-type"
  | "too-large"
  | "decode-failed"
  | "upload-failed"
  | "delete-failed";

/**
 * Validates input, resizes / re-encodes to a square ~512px JPEG, uploads
 * to `avatars/{user_id}/avatar.jpg`, and returns a cache-busted public URL.
 *
 * Hard-fails closed if no Supabase session is present — the bucket's RLS
 * policy requires `auth.uid()` to match the first path segment, so an
 * unauthenticated upload would 403 server-side anyway; checking here gives
 * a single canonical error surface for the UI to render.
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  file: File,
): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new AvatarError("Not signed in.", "unauthenticated");
  }
  const userId = authData.user.id;

  if (!ACCEPTED_MIME.has(file.type)) {
    throw new AvatarError("Photo must be JPEG, PNG, or WebP.", "unsupported-type");
  }
  if (typeof file.size !== "number" || file.size <= 0 || file.size > MAX_INPUT_BYTES) {
    throw new AvatarError("Photo must be 3 MB or smaller.", "too-large");
  }

  const blob = await resizeToSquareJpeg(file, TARGET_DIM, JPEG_QUALITY);

  const path = `${userId}/${AVATAR_FILENAME}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, blob, {
      cacheControl: "3600",
      upsert: true,
      contentType: "image/jpeg",
    });
  if (uploadError) {
    throw new AvatarError(uploadError.message || "Upload failed.", "upload-failed");
  }

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  // Cache-bust so the new image appears immediately on every <img src>
  // — public URLs hit Supabase's CDN which caches aggressively.
  return `${data.publicUrl}?v=${Date.now()}`;
}

/** Best-effort delete of the signed-in user's avatar object. */
export async function deleteAvatar(supabase: SupabaseClient): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new AvatarError("Not signed in.", "unauthenticated");
  }
  const path = `${authData.user.id}/${AVATAR_FILENAME}`;
  const { error } = await supabase.storage.from(AVATARS_BUCKET).remove([path]);
  if (error) {
    throw new AvatarError(error.message || "Delete failed.", "delete-failed");
  }
}

// ── Client-side resize ───────────────────────────────────────────────────

async function resizeToSquareJpeg(
  file: File,
  dim: number,
  quality: number,
): Promise<Blob> {
  const bitmap = await decodeImage(file);
  try {
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(dim, dim)
        : document.createElement("canvas");
    if ("width" in canvas) {
      canvas.width = dim;
      canvas.height = dim;
    }

    const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) throw new AvatarError("Could not decode image.", "decode-failed");

    // Center-crop the source to a square, then draw at the target dim.
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, dim, dim);

    if (canvas instanceof OffscreenCanvas) {
      return await canvas.convertToBlob({ type: "image/jpeg", quality });
    }
    return await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => (b ? resolve(b) : reject(new AvatarError("Could not encode image.", "decode-failed"))),
        "image/jpeg",
        quality,
      );
    });
  } finally {
    bitmap.close?.();
  }
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new AvatarError("Could not decode image.", "decode-failed");
  }
}
