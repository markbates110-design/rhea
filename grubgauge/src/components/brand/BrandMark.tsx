/**
 * Canonical GrubGauge brand lockup — matches Stitch History wireframe:
 * restaurant icon (default size, primary) + headline-md wordmark, gap-xs.
 *
 * Use `as="h1"` only when this is the page’s main document title (e.g. History).
 * On the home page with a separate hero `<h1>`, keep default `div`.
 */
export function BrandMark({
  as: Tag = "div",
}: {
  as?: "h1" | "div";
}) {
  return (
    <div className="flex shrink-0 items-center gap-xs">
      <span className="material-symbols-outlined shrink-0 text-primary dark:text-primary transition active:scale-95 duration-150 ease-in-out">
        restaurant
      </span>
      <Tag className="whitespace-nowrap font-headline-md font-bold leading-snug text-primary dark:text-primary">
        GrubGauge
      </Tag>
    </div>
  );
}
