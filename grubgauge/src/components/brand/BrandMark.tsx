/**
 * Canonical GrubGauge brand lockup — flat raster wordmark + gauge from
 * `public/brand/grubgauge-logo.png` (orthographic 2D art matching the
 * physical sign colors: terracotta + forest green, serif stack).
 *
 * Use `as="h1"` when this lockup is the page’s main document title (e.g.
 * onboarding welcome or dashboard hero). Use default `div` in the app
 * shell header where the surrounding page already owns the document `<h1>`.
 *
 * `size="sm"` fits the header chrome; `size="lg"` is for onboarding /
 * marketing hero surfaces; `size="hero"` matches the dashboard title band.
 */
const BRAND_LOGO_SRC = "/brand/grubgauge-logo.png";

export function BrandMark({
  as: Tag = "div",
  size = "sm",
}: {
  as?: "h1" | "div";
  /** `sm` — header height band; `lg` — centered hero on onboarding; `hero` — dashboard main title */
  size?: "sm" | "lg" | "hero";
}) {
  const imgClass =
    size === "lg"
      ? "mx-auto h-[4.5rem] w-auto max-w-[min(100%,18rem)] object-contain sm:h-24"
      : size === "hero"
        ? "h-10 w-auto max-h-11 object-contain object-left md:h-11"
        : "h-9 w-auto max-h-10 object-contain object-left md:h-10";

  return (
    <div
      className={`flex shrink-0 items-center ${size === "lg" ? "justify-center w-full" : ""}`}
    >
      <Tag className="m-0 block p-0 leading-none">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset from /public; dimensions stabilize CLS */}
        <img
          src={BRAND_LOGO_SRC}
          alt="GrubGauge"
          width={320}
          height={160}
          className={imgClass}
          decoding="async"
        />
      </Tag>
    </div>
  );
}
