"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AvatarError, deleteAvatar, uploadAvatar } from "@/lib/storage/avatar";
import { setAvatarUrl as setLocalAvatarUrl } from "@/lib/identity/deviceId";

interface AvatarUploaderProps {
  /** Current canonical avatar URL (from `public.profiles.avatar_url`). */
  currentUrl: string;
  /** Fallback initial when no avatar set. */
  initial: string;
  /** Called after a successful upload/remove with the new URL (or "" on remove). */
  onChange: (nextUrl: string) => void;
}

/**
 * Reusable avatar upload surface — used by `/onboarding/profile` and
 * `/profile`. Owns the upload/remove lifecycle (Storage write + mirror to
 * localStorage); persistence to `public.profiles.avatar_url` is the
 * caller's job so the parent screen can batch saves alongside other
 * profile fields (e.g. the onboarding screen upserts the avatar + username
 * in one `upsertProfile` call).
 *
 * Identity discipline:
 *   - Storage write happens immediately (so the user sees the image),
 *     mirrors to localStorage for fast-path hydration.
 *   - Caller must persist `nextUrl` to `public.profiles.avatar_url` via
 *     `updateProfile({ avatar_url })` (or `upsertProfile` on onboarding) —
 *     otherwise the local mirror falls
 *     out of sync with the canonical store on the next cross-device login.
 */
export function AvatarUploader({ currentUrl, initial, onChange }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Optimistic override — only set during an in-flight upload (object URL
  // preview) or while a delete is awaiting confirmation. When null, render
  // falls through to `currentUrl`. This shape lets us derive the displayed
  // image entirely in render (no useEffect mirror) and still show an
  // instant preview when the user picks a file.
  const [overrideUrl, setOverrideUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const previewUrl = overrideUrl !== null ? overrideUrl : currentUrl;

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || pending) return;
      setError(null);
      setPending(true);
      // Optimistic local preview via object URL so the UI updates the
      // instant the user picks a file. Replaced with the public URL once
      // upload settles; revoked in either branch.
      const tempUrl = URL.createObjectURL(file);
      setOverrideUrl(tempUrl);
      try {
        const supabase = createClient();
        const publicUrl = await uploadAvatar(supabase, file);
        setLocalAvatarUrl(publicUrl);
        onChange(publicUrl);
        // Caller's currentUrl will update on the next render; clear the
        // override so we don't pin a stale value.
        setOverrideUrl(null);
      } catch (err) {
        const message =
          err instanceof AvatarError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Upload failed.";
        setError(message);
        setOverrideUrl(null);
      } finally {
        URL.revokeObjectURL(tempUrl);
        setPending(false);
      }
    },
    [onChange, pending],
  );

  async function handleRemove() {
    if (pending) return;
    setError(null);
    setPending(true);
    // Optimistic blank preview so the UI updates immediately.
    setOverrideUrl("");
    try {
      const supabase = createClient();
      await deleteAvatar(supabase);
    } catch (err) {
      // Surface delete errors but proceed with local clear — the row in
      // user_metadata is the canonical state; an orphaned object is
      // tolerable (and rare with upsert semantics on next upload).
      const message =
        err instanceof AvatarError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not remove photo.";
      setError(message);
    } finally {
      setLocalAvatarUrl("");
      onChange("");
      setOverrideUrl(null);
      setPending(false);
    }
  }

  function openPicker() {
    if (pending) return;
    inputRef.current?.click();
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    void handleFile(file);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  }

  function onDragLeave() {
    if (dragOver) setDragOver(false);
  }

  return (
    <div className="flex flex-col gap-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        aria-label={previewUrl ? "Change profile photo" : "Upload profile photo"}
        aria-busy={pending}
        className={`relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center self-start overflow-hidden rounded-full border-2 transition-all active:scale-95 ${
          dragOver
            ? "border-primary bg-primary/10"
            : "border-outline-variant bg-surface-container-low hover:border-primary"
        } ${pending ? "opacity-70 cursor-progress" : ""}`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar from Storage
          <img
            src={previewUrl}
            alt="Profile photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-headline-md text-headline-md font-bold text-on-surface-variant">
            {initial || "•"}
          </span>
        )}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 transition-opacity ${
            previewUrl ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
        >
          <span className="material-symbols-outlined text-[14px] text-white">
            {pending ? "progress_activity" : previewUrl ? "edit" : "add_a_photo"}
          </span>
        </div>
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="material-symbols-outlined animate-spin text-[22px] text-white">
              progress_activity
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-sm">
        <button
          type="button"
          onClick={openPicker}
          disabled={pending}
          className="font-label-sm text-label-sm font-semibold text-primary hover:brightness-110 transition-all disabled:opacity-60"
        >
          {previewUrl ? "Change photo" : "Upload photo"}
        </button>
        {previewUrl && (
          <>
            <span aria-hidden className="font-label-sm text-label-sm text-outline-variant">·</span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="font-label-sm text-label-sm font-semibold text-on-surface-variant hover:text-error transition-colors disabled:opacity-60"
            >
              Remove
            </button>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          void handleFile(file);
          // Clear value so picking the same file twice still fires `change`.
          e.target.value = "";
        }}
      />

      {error && (
        <p className="font-label-sm text-label-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
