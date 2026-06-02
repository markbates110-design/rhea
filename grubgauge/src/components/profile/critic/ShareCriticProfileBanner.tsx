"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ShareCriticProfileBannerProps {
  username: string;
  displayName?: string;
}

function buildPublicProfileUrl(username: string): string {
  const path = `/u/${encodeURIComponent(username)}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function ShareCriticProfileBanner({
  username,
  displayName,
}: ShareCriticProfileBannerProps) {
  const [url, setUrl] = useState(() => buildPublicProfileUrl(username));
  const [message, setMessage] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setUrl(buildPublicProfileUrl(username));
  }, [username]);

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2500);
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied");
      return;
    } catch {
      // fall through to legacy copy
    }
    try {
      const input = document.createElement("textarea");
      input.value = url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      flash("Link copied");
    } catch {
      flash("Could not copy");
    }
  }

  async function shareLink() {
    if (!url || sharing) return;
    setSharing(true);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: displayName
            ? `${displayName} on GrubGauge`
            : "My GrubGauge critic page",
          text: "Check out my food critic portfolio",
          url,
        });
        flash("Shared");
        return;
      }
      await copyLink();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copyLink();
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="gg-prose-column w-full rounded-xl border border-primary/30 bg-primary/5 px-md py-sm">
      <p className="font-label-sm text-label-sm text-on-surface">
        Your public critic page — share this link to build your following.{" "}
        <Link href="/profile" className="font-semibold text-primary hover:underline">
          Edit profile
        </Link>
      </p>

      <div className="mt-sm flex w-full flex-col gap-xs sm:flex-row sm:items-stretch">
        <a
          href={url}
          className="min-w-0 flex-1 truncate rounded-lg border border-outline-variant/60 bg-surface/80 px-sm py-xs font-label-sm text-label-sm text-primary underline-offset-2 hover:underline"
          title={url}
        >
          {url}
        </a>
        <div className="flex shrink-0 items-center gap-xs">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex flex-1 items-center justify-center gap-xs rounded-lg border border-outline-variant bg-surface px-sm py-xs font-label-sm text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container sm:flex-initial"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden>
              content_copy
            </span>
            Copy
          </button>
          <button
            type="button"
            onClick={() => void shareLink()}
            disabled={sharing}
            className="inline-flex flex-1 items-center justify-center gap-xs rounded-lg bg-primary px-sm py-xs font-label-sm text-label-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70 sm:flex-initial"
          >
            <span
              className={`material-symbols-outlined text-[16px] ${sharing ? "animate-spin" : ""}`}
              aria-hidden
            >
              {sharing ? "progress_activity" : "ios_share"}
            </span>
            Share
          </button>
        </div>
      </div>

      {message && (
        <p className="font-label-sm text-label-sm text-on-surface-variant" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
