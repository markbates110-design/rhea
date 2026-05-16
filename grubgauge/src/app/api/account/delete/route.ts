import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";
import { AVATARS_BUCKET } from "@/lib/storage/avatar";
import { MEAL_PHOTOS_BUCKET } from "@/lib/storage/mealPhoto";

type DeleteMode = "delete-all" | "anonymize-ratings";

interface DeleteAccountBody {
  mode?: DeleteMode;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Account deletion is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as DeleteAccountBody;
  const mode = body.mode;
  if (mode !== "delete-all" && mode !== "anonymize-ratings") {
    return NextResponse.json({ error: "Invalid deletion mode." }, { status: 400 });
  }

  const userId = authData.user.id;
  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ratings, error: ratingsError } = await admin
    .from("ratings")
    .select("id, meal_photo_url")
    .eq("user_id", userId);
  if (ratingsError) {
    return NextResponse.json({ error: ratingsError.message }, { status: 500 });
  }

  const { data: foundingMember, error: foundingError } = await admin
    .from("founding_members")
    .select("slot_number")
    .eq("user_id", userId)
    .maybeSingle();
  if (foundingError) {
    return NextResponse.json({ error: foundingError.message }, { status: 500 });
  }

  if (foundingMember?.slot_number) {
    const { error } = await admin.from("retired_founding_member_slots").upsert({
      user_id: userId,
      slot_number: foundingMember.slot_number,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await admin.storage.from(AVATARS_BUCKET).remove([`${userId}/avatar.jpg`]);

  if (mode === "delete-all") {
    const mealPhotoPaths = (ratings ?? [])
      .map((rating) => storagePathFromPublicUrl(rating.meal_photo_url, MEAL_PHOTOS_BUCKET))
      .filter((path): path is string => Boolean(path));
    if (mealPhotoPaths.length > 0) {
      await admin.storage.from(MEAL_PHOTOS_BUCKET).remove(mealPhotoPaths);
    }

    const { error } = await admin.from("ratings").delete().eq("user_id", userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await admin
      .from("ratings")
      .update({ user_id: null })
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function storagePathFromPublicUrl(
  publicUrl: string | null,
  bucket: string,
): string | null {
  if (!publicUrl) return null;
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}
