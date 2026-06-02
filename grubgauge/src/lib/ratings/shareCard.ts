import { getCriteriaHighlights } from "./criteriaBreakdown";

export interface ShareRatingPayload {
  venueName: string;
  weightedScore: number;
  venueType: string;
  mealPhotoUrl?: string | null;
  notes?: string | null;
  criteriaScores?: Record<string, number> | null;
  raterUsername?: string | null;
  visitDate?: string | null;
}

const WIDTH = 1080;
const HEIGHT = 1350;
const BRAND = {
  cream: "#faf6f1",
  paper: "#ffffff",
  green: "#00754a",
  greenDeep: "#005c39",
  charcoal: "#2c2c2c",
  mid: "#6e6e6e",
  amber: "#b8731c",
  red: "#d22b2b",
};

export function sharePayloadFromRatingCard(rating: {
  venue_name: string;
  venue_type: string;
  weighted_score: number;
  meal_photo_url?: string | null;
  notes?: string | null;
  criteria_scores?: Record<string, number> | null;
  visit_date?: string;
  rater?: { username: string } | null;
}): ShareRatingPayload {
  return {
    venueName: rating.venue_name,
    weightedScore: rating.weighted_score,
    venueType: rating.venue_type,
    mealPhotoUrl: rating.meal_photo_url,
    notes: rating.notes,
    criteriaScores: rating.criteria_scores,
    visitDate: rating.visit_date,
    raterUsername: rating.rater?.username ?? null,
  };
}

function scoreBadgeLabel(score: number): string {
  if (score >= 9.0) return "Exceptional";
  if (score >= 7.5) return "Great Value";
  if (score >= 6.0) return "Good";
  if (score >= 4.5) return "Fair";
  return "Poor";
}

function scoreColor(score: number): string {
  if (score >= 6.0) return BRAND.green;
  if (score >= 4.5) return BRAND.amber;
  return BRAND.red;
}

function slugifyVenue(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "rating"
  );
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image decode failed"));
        img.src = objectUrl;
      });
      return img;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(/\s+/);
  let line = "";
  let lineCount = 0;
  let cursorY = y;

  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = words[i];
      lineCount += 1;
      cursorY += lineHeight;
      if (lineCount >= maxLines - 1) {
        const remainder = words.slice(i).join(" ");
        let clipped = remainder;
        while (
          clipped.length > 0 &&
          ctx.measureText(`${clipped}…`).width > maxWidth
        ) {
          clipped = clipped.slice(0, -1);
        }
        ctx.fillText(`${clipped}…`, x, cursorY);
        return cursorY + lineHeight;
      }
    } else {
      line = test;
    }
  }

  if (line) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * Renders a 1080×1350 PNG suitable for Instagram stories / posts.
 */
export async function renderShareRatingCard(
  payload: ShareRatingPayload,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  const photoHeight = payload.mealPhotoUrl ? 760 : 0;
  const panelTop = photoHeight;
  const panelHeight = HEIGHT - panelTop;
  const pad = 72;

  if (payload.mealPhotoUrl) {
    const photo = await loadImage(payload.mealPhotoUrl);
    if (photo) {
      drawCoverImage(ctx, photo, 0, 0, WIDTH, photoHeight);
    } else {
      ctx.fillStyle = BRAND.greenDeep;
      ctx.fillRect(0, 0, WIDTH, photoHeight);
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(0, photoHeight - 120, WIDTH, 120);
  } else {
    ctx.fillStyle = BRAND.greenDeep;
    ctx.fillRect(0, 0, WIDTH, 280);
  }

  ctx.fillStyle = BRAND.cream;
  ctx.fillRect(0, panelTop, WIDTH, panelHeight);

  let y = panelTop + (payload.mealPhotoUrl ? 56 : 120);
  const scoreColorValue = scoreColor(payload.weightedScore);
  const badge = scoreBadgeLabel(payload.weightedScore);

  ctx.fillStyle = scoreColorValue;
  ctx.font = "bold 120px system-ui, sans-serif";
  ctx.fillText(payload.weightedScore.toFixed(1), pad, y);
  const scoreWidth = ctx.measureText(payload.weightedScore.toFixed(1)).width;

  ctx.fillStyle = BRAND.mid;
  ctx.font = "500 42px system-ui, sans-serif";
  ctx.fillText("/10", pad + scoreWidth + 12, y - 8);

  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillStyle = scoreColorValue;
  ctx.fillText(badge, pad + scoreWidth + 100, y - 8);

  y += 36;
  ctx.fillStyle = BRAND.charcoal;
  ctx.font = "bold 52px Georgia, 'Times New Roman', serif";
  y = wrapText(ctx, payload.venueName, pad, y + 48, WIDTH - pad * 2, 58, 2);

  const highlights = getCriteriaHighlights(
    payload.venueType,
    payload.criteriaScores,
    2,
  );
  if (highlights.length > 0) {
    y += 20;
    ctx.font = "500 34px system-ui, sans-serif";
    ctx.fillStyle = BRAND.mid;
    const breakdown = highlights
      .map((item) => `${item.score.toFixed(1)} ${item.label}`)
      .join("  ·  ");
    ctx.fillText(breakdown, pad, y);
    y += 24;
  }

  if (payload.notes?.trim()) {
    y += 28;
    ctx.font = "italic 36px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = BRAND.mid;
    const quote = `\u201C${payload.notes.trim()}\u201D`;
    y = wrapText(ctx, quote, pad, y, WIDTH - pad * 2, 46, 3);
  }

  const footerY = HEIGHT - 96;
  ctx.strokeStyle = BRAND.mid;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, footerY - 36);
  ctx.lineTo(WIDTH - pad, footerY - 36);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const attribution = payload.raterUsername
    ? `@${payload.raterUsername}`
    : "GrubGauge";
  ctx.font = "600 32px system-ui, sans-serif";
  ctx.fillStyle = BRAND.charcoal;
  ctx.fillText(attribution, pad, footerY);

  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillStyle = BRAND.mid;
  ctx.textAlign = "right";
  ctx.fillText("grubgauge.app", WIDTH - pad, footerY);
  ctx.textAlign = "left";

  const logo = await loadImage("/brand/grubgauge-logo.png");
  if (logo) {
    const logoW = 220;
    const logoH = (logo.height / logo.width) * logoW;
    ctx.drawImage(logo, WIDTH - pad - logoW, footerY - logoH - 52, logoW, logoH);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create image."));
      },
      "image/png",
      1,
    );
  });
}

export async function shareOrDownloadRatingCard(
  blob: Blob,
  payload: ShareRatingPayload,
): Promise<"shared" | "downloaded"> {
  const filename = `${slugifyVenue(payload.venueName)}-grubgauge.png`;
  const file = new File([blob], filename, { type: "image/png" });

  if (
    typeof navigator.share === "function" &&
    (!navigator.canShare || navigator.canShare({ files: [file] }))
  ) {
    try {
      await navigator.share({
        files: [file],
        title: `${payload.venueName} on GrubGauge`,
        text: `I rated ${payload.venueName} ${payload.weightedScore.toFixed(1)}/10 on GrubGauge`,
      });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
  return "downloaded";
}

export async function exportShareRatingCard(
  payload: ShareRatingPayload,
): Promise<"shared" | "downloaded"> {
  const blob = await renderShareRatingCard(payload);
  return shareOrDownloadRatingCard(blob, payload);
}
