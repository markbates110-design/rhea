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

/** Uploads image to Storage; returns public URL. Throws on validation or Storage errors. */
export async function uploadMealPhoto(
  supabase: SupabaseClient,
  file: File,
  deviceId: string
): Promise<string> {
  const ext = extForMime(file.type);
  if (!ext) throw new Error("unsupported image type");

  const size = typeof file.size === "number" ? file.size : 0;
  if (size <= 0 || size > MAX_BYTES)
    throw new Error("unsupported image size");

  const filename = crypto.randomUUID() + "." + ext;
  const path = `${deviceId}/${filename}`;
  const { error } = await supabase.storage
    .from(MEAL_PHOTOS_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from(MEAL_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
