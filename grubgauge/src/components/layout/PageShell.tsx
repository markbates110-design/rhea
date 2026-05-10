import type { ReactNode } from "react";

type Variant = "form" | "feed" | "wide";

/**
 * Canonical width-contract tokens — one per page intent.
 *
 *  - `form`  — narrow column for inputs & onboarding. Carries a **280px floor**
 *              so block text can never collapse to one-glyph-per-line, even when
 *              an ancestor flex/grid context briefly resolves zero width.
 *  - `feed`  — medium column for dashboards, lists, profile screens. `min-w-0`
 *              is correct here so flex/grid descendants can host `w-full` rows
 *              with `truncate` semantics.
 *  - `wide`  — full application shell for rate / explore / history-feed style
 *              screens that want the full 5xl content column.
 *
 * Codifies the v3.10 width-contract learnings as a single artifact. New pages
 * render through `<PageShell variant=…>` and inherit immunity from the
 * vertical-text class by construction — see Verification Pass row "Page route"
 * in `rhea-governance-agent.md` v3.12.
 */
const VARIANTS: Record<Variant, string> = {
  form: "mx-auto w-full min-w-[280px] max-w-md",
  feed: "mx-auto w-full min-w-0 max-w-2xl",
  wide: "mx-auto w-full min-w-0 max-w-5xl",
};

interface PageShellProps {
  children: ReactNode;
  variant?: Variant;
  /** Extra utility classes for vertical rhythm (`pt-lg pb-10`, `py-xl`, etc.) */
  className?: string;
  /** Defaults to `<main>` — pass `"div"` for non-primary content columns. */
  as?: "main" | "div";
}

export function PageShell({
  children,
  variant = "feed",
  className,
  as: Tag = "main",
}: PageShellProps) {
  const classes = `${VARIANTS[variant]}${className ? ` ${className}` : ""}`;
  return <Tag className={classes}>{children}</Tag>;
}
