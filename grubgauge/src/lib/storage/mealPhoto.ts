import type { SupabaseClient } from "@supabase/supabase-js";

export const MEAL_PHOTOS_BUCKET = "meal-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function extForMime(mime: string): string | null {
  return MIME_TO_EXT[mime] ?? null;
}

/** Some mobile pickers leave `file.type` empty — infer from extension. */
export function resolveMealPhotoContentType(file: File): string | null {
  if (extForMime(file.type)) return file.type;

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return null;
}

export function isAcceptableMealPhoto(file: File): boolean {
  const contentType = resolveMealPhotoContentType(file);
  if (!contentType) return false;
  const size = typeof file.size === "number" ? file.size : 0;
  return size > 0 && size <= MAX_BYTES;
}

/** Uploads image to Storage; returns public URL. Throws on validation or Storage errors. */
export async function uploadMealPhoto(
  supabase: SupabaseClient,
  file: File,
  deviceId: string
): Promise<string> {
  const contentType = resolveMealPhotoContentType(file);
  if (!contentType) throw new Error("Photo must be JPEG, PNG, or WebP.");
  const ext = extForMime(contentType);
  if (!ext) throw new Error("Photo must be JPEG, PNG, or WebP.");

  const size = typeof file.size === "number" ? file.size : 0;
  if (size <= 0 || size > MAX_BYTES) {
    throw new Error("Photo must be 5 MB or smaller.");
  }

  const filename = crypto.randomUUID() + "." + ext;
  const path = `${deviceId}/${filename}`;
  const { error } = await supabase.storage
    .from(MEAL_PHOTOS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });

  if (error) throw new Error(error.message || "Storage upload failed.");

  const { data } = supabase.storage.from(MEAL_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
