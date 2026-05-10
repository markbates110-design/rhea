"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/identity/deviceId";
import { useAuth } from "@/lib/auth/useAuth";
import { applyRatingsOwnerScope } from "@/lib/ratings/scope";
import {
  DEFAULT_SCORE,
  VENUE_CRITERIA,
  VENUE_META,
  calcWeightedScore,
  normalizeVenueType,
  type VenueType,
} from "@/lib/ratings/scoring";
import { uploadMealPhoto } from "@/lib/storage/mealPhoto";
import { DeleteRatingConfirm } from "@/components/history/DeleteRatingConfirm";

export interface EditableRatingRow {
  id: string;
  place_id: string;
  venue_name: string;
  venue_address: string;
  venue_type: string;
  meal_type: string;
  visit_date: string;
  weighted_score: number;
  notes: string | null;
  meal_photo_url: string | null;
  criteria_scores: Record<string, number> | null;
  created_at: string;
}

type InnerProps = {
  rating: EditableRatingRow;
  onClose: () => void;
  onSaved: (row: EditableRatingRow) => void;
  onDeleted: (id: string) => void;
};

type Props = {
  rating: EditableRatingRow | null;
  onClose: () => void;
  onSaved: (row: EditableRatingRow) => void;
  onDeleted: (id: string) => void;
};

function scoreBadge(score: number): { label: string; colorClass: string } {
  if (score >= 9.0) return { label: "Exceptional", colorClass: "text-primary" };
  if (score >= 7.5) return { label: "Great Value", colorClass: "text-primary" };
  if (score >= 6.0) return { label: "Good", colorClass: "text-tertiary" };
  if (score >= 4.5) return { label: "Fair", colorClass: "text-tertiary" };
  return { label: "Poor", colorClass: "text-error" };
}

function buildInitialScores(r: EditableRatingRow): Record<string, number> {
  const stored = r.criteria_scores && typeof r.criteria_scores === "object" ? r.criteria_scores : {};
  const vt = normalizeVenueType(r.venue_type);
  const crit = VENUE_CRITERIA[vt];
  const nextScores: Record<string, number> = {};
  for (const c of crit) {
    const v = stored[c.key];
    nextScores[c.key] = typeof v === "number" && Number.isFinite(v) ? v : DEFAULT_SCORE;
  }
  return nextScores;
}

/** Mounted with key={rating.id} so hooks initialize from rating without effect sync */
function RatingEditSheetInner({ rating, onClose, onSaved, onDeleted }: InnerProps) {
  // Same auth-aware ownership scope used by History / Dashboard reads — keeps
  // edit/delete from succeeding cross-account or failing for a signed-in
  // user who rated on a different device.
  const { user } = useAuth();
  const venueType: VenueType = normalizeVenueType(rating.venue_type);
  const criteria = useMemo(() => VENUE_CRITERIA[venueType], [venueType]);
  const meta = VENUE_META[venueType];

  const [visitDate, setVisitDate] = useState(rating.visit_date);
  const [mealType, setMealType] = useState(rating.meal_type);
  const [notes, setNotes] = useState(rating.notes ?? "");
  const [scores, setScores] = useState(() => buildInitialScores(rating));
  const [mealPhotoFile, setMealPhotoFile] = useState<File | null>(null);
  const [mealPhotoPreviewUrl, setMealPhotoPreviewUrl] = useState<string | null>(null);
  const [photoCleared, setPhotoCleared] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const weightedScore = useMemo(() => calcWeightedScore(criteria, scores), [criteria, scores]);
  const { label: badge, colorClass } = scoreBadge(weightedScore);

  useEffect(() => {
    return () => {
      if (mealPhotoPreviewUrl) URL.revokeObjectURL(mealPhotoPreviewUrl);
    };
  }, [mealPhotoPreviewUrl]);

  function getScore(key: string): number {
    return scores[key] ?? DEFAULT_SCORE;
  }

  function setScore(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  function handleMealPhotoPick(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Photo must be JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be 5 MB or smaller.");
      return;
    }
    setError("");
    setPhotoCleared(false);
    setMealPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setMealPhotoFile(file);
  }

  function clearLocalPhotoPreview() {
    setMealPhotoFile(null);
    setMealPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const supabase = createClient();
      const deviceId = getDeviceId();
      const criteriaScores = Object.fromEntries(criteria.map((c) => [c.key, getScore(c.key)]));

      let mealPhotoUrl: string | null = rating.meal_photo_url;
      if (photoCleared) {
        mealPhotoUrl = null;
      }
      if (mealPhotoFile) {
        try {
          mealPhotoUrl = await uploadMealPhoto(supabase, mealPhotoFile, deviceId);
        } catch (uploadErr) {
          console.error(uploadErr);
          setError("Photo upload failed. Remove the photo or try a smaller image.");
          setSaving(false);
          return;
        }
      }

      const updateBase = supabase
        .from("ratings")
        .update({
          meal_type: mealType,
          visit_date: visitDate,
          criteria_scores: criteriaScores,
          weighted_score: parseFloat(weightedScore.toFixed(1)),
          notes: notes.trim() || null,
          meal_photo_url: mealPhotoUrl,
        })
        .eq("id", rating.id);
      const { data, error: upErr } = await applyRatingsOwnerScope(updateBase, {
        user,
        deviceId,
      })
        .select(
          "id, place_id, venue_name, venue_address, venue_type, meal_type, visit_date, weighted_score, notes, meal_photo_url, criteria_scores, created_at"
        )
        .single();

      if (upErr) {
        console.error(upErr);
        setError(upErr.message || "Could not update rating.");
        return;
      }
      if (!data) {
        setError("Update returned no row. You may no longer own this rating.");
        return;
      }

      clearLocalPhotoPreview();
      setPhotoCleared(false);
      onSaved(data as EditableRatingRow);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError("");
    setDeleting(true);
    try {
      const supabase = createClient();
      const deviceId = getDeviceId();
      const deleteBase = supabase
        .from("ratings")
        .delete()
        .eq("id", rating.id);
      const { data: deletedRows, error: delErr } = await applyRatingsOwnerScope(deleteBase, {
        user,
        deviceId,
      }).select("id");

      if (delErr) {
        console.error(delErr);
        setError(delErr.message || "Could not delete rating.");
        return;
      }
      if (!deletedRows?.length) {
        setError("Nothing was deleted — this rating may not belong to this device.");
        return;
      }
      onDeleted(rating.id);
      setConfirmDelete(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const displayPhoto =
    mealPhotoPreviewUrl ?? (!photoCleared && rating.meal_photo_url ? rating.meal_photo_url : null);

  const sheetMarkup = (
    <>
      <div className="fixed inset-0 z-[100]">
        <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="absolute inset-x-0 bottom-0 z-[1] flex max-h-[100dvh] justify-center p-0 sm:inset-0 sm:items-center sm:p-md">
          <div className="relative flex max-h-[min(92dvh,760px)] w-full min-w-[280px] max-w-lg shrink-0 flex-col overflow-hidden rounded-t-2xl border border-outline-variant bg-surface-container-high shadow-xl sm:min-w-[400px] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-sm border-b border-outline-variant px-md py-sm">
          <div className="min-w-0 flex-1 pr-sm">
            <h2 className="font-title-sm text-title-sm font-semibold text-on-surface">Edit rating</h2>
            <p className="mt-0.5 truncate font-label-sm text-label-sm text-on-surface-variant">
              {rating.venue_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-xs text-on-surface-variant hover:bg-surface-container"
            aria-label="Close editor"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-md py-md">
          <div className="flex min-w-0 flex-col gap-md">
            <div className="rounded-xl border border-outline-variant/80 bg-surface-container-low px-sm py-xs">
              <div className="flex items-start gap-xs">
                <span
                  className="material-symbols-outlined mt-0.5 text-[18px] text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {meta.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-body-md text-body-md font-medium text-on-surface">{rating.venue_name}</p>
                  {rating.venue_address ? (
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{rating.venue_address}</p>
                  ) : null}
                  <span className="mt-xs inline-flex rounded-full bg-primary-container px-xs py-0.5 font-label-sm text-label-sm font-semibold text-on-primary-container">
                    {meta.label}
                  </span>
                </div>
              </div>
            </div>

            <section className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md">
              <h3 className="flex min-w-0 items-center gap-xs font-title-sm text-title-sm text-primary">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  info
                </span>
                Visit details
              </h3>
              <div className="grid grid-cols-2 gap-md">
                <div className="flex flex-col gap-base">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Date of Visit</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="rounded-lg border border-outline-variant bg-surface-container px-sm py-xs font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]"
                  />
                </div>
                <div className="flex flex-col gap-base">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Meal Type</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="appearance-none rounded-lg border border-outline-variant bg-surface-container px-sm py-xs font-body-md text-body-md capitalize text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {["Dinner", "Lunch", "Breakfast", "Brunch"].map((m) => (
                      <option key={m} value={m.toLowerCase()}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-lg rounded-xl border border-outline-variant bg-surface-container-low p-md">
              <div className="flex min-w-0 items-center justify-between gap-sm">
                <div className="min-w-0 flex-1">
                  <h3 className="flex min-w-0 items-center gap-xs font-title-sm text-title-sm text-primary">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      tune
                    </span>
                    {meta.label}
                  </h3>
                  <p className="mt-xs font-label-sm text-label-sm italic text-on-surface-variant">{meta.tagline}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-bold tabular-nums text-[24px] leading-none ${colorClass}`}>{weightedScore.toFixed(1)}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">/10 · {badge}</p>
                </div>
              </div>
              <div className="flex flex-col gap-md">
                {criteria.map((c) => (
                  <div key={c.key} className="flex flex-col gap-base">
                    <div className="flex items-center justify-between gap-sm">
                      <label className="min-w-0 flex-1 font-body-md text-body-md font-medium text-on-surface">
                        {c.label}
                      </label>
                      <span className="shrink-0 font-title-sm text-title-sm tabular-nums text-primary-container">
                        {getScore(c.key).toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.1}
                      value={getScore(c.key)}
                      onChange={(e) => setScore(c.key, parseFloat(e.target.value))}
                      className="grub-slider w-full"
                    />
                    <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                      <span>{c.low}</span>
                      <span>{c.high}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-xs rounded-xl border border-outline-variant bg-surface-container-low p-md">
              <label className="font-label-sm text-label-sm text-on-surface-variant">
                Notes <span className="text-on-surface-variant/50">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything memorable about this visit…"
                rows={3}
                className="resize-none rounded-lg border border-outline-variant bg-surface-container px-sm py-xs font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </section>

            <section className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md">
              <h3 className="flex min-w-0 items-center gap-xs font-title-sm text-title-sm text-primary">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  photo_camera
                </span>
                Meal photo <span className="font-body-md text-body-md font-normal text-on-surface-variant">(optional)</span>
              </h3>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                id={`edit-meal-photo-${rating.id}`}
                disabled={saving}
                onChange={(e) => {
                  handleMealPhotoPick(e.target.files);
                  e.target.value = "";
                }}
              />
              {displayPhoto ? (
                <div className="flex flex-col gap-sm">
                  <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={displayPhoto}
                      alt="Meal"
                      className="aspect-[4/3] max-h-[200px] w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-wrap gap-xs">
                    <label
                      htmlFor={`edit-meal-photo-${rating.id}`}
                      className={`inline-flex cursor-pointer items-center gap-xs rounded-lg border border-outline-variant px-sm py-xs font-label-sm text-label-sm text-on-surface hover:bg-surface-container ${saving ? "pointer-events-none opacity-40" : ""}`}
                    >
                      Replace photo
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        clearLocalPhotoPreview();
                        setPhotoCleared(true);
                        setError("");
                      }}
                      disabled={saving}
                      className="rounded-lg border border-outline-variant px-sm py-xs font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor={`edit-meal-photo-${rating.id}`}
                  className={`inline-flex w-fit cursor-pointer items-center gap-xs rounded-xl border border-outline-variant bg-surface-container px-md py-xs font-label-sm text-label-sm text-on-surface transition-colors hover:border-primary hover:bg-surface-container-high ${saving ? "pointer-events-none opacity-40" : ""}`}
                >
                  <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                  Add photo
                </label>
              )}
            </section>

            {error ? (
              <p className="rounded-lg border border-error-container bg-error-container/20 px-sm py-xs font-label-sm text-label-sm text-error">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-sm border-t border-outline-variant bg-surface-container-high px-md py-sm pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex flex-wrap items-center gap-xs">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={saving || deleting}
              className="rounded-lg border border-error/40 bg-error/10 px-sm py-xs font-label-sm text-label-sm font-semibold text-error hover:bg-error/20 disabled:opacity-40"
            >
              Delete rating
            </button>
            <div className="ml-auto flex flex-wrap gap-xs">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className="rounded-lg border border-outline-variant px-md py-xs font-label-sm text-label-sm text-on-surface hover:bg-surface-container disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || deleting}
                className="rounded-lg bg-primary-container px-md py-xs font-label-sm text-label-sm font-bold text-on-primary-container hover:bg-primary-fixed disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

      <DeleteRatingConfirm
        open={confirmDelete}
        venueName={rating.venue_name}
        deleting={deleting}
        onDismiss={() => !deleting && setConfirmDelete(false)}
        onConfirmDelete={handleDelete}
      />
    </>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(sheetMarkup, document.body);
}

export function RatingEditSheet({ rating, onClose, onSaved, onDeleted }: Props) {
  if (!rating) return null;
  return (
    <RatingEditSheetInner key={rating.id} rating={rating} onClose={onClose} onSaved={onSaved} onDeleted={onDeleted} />
  );
}
