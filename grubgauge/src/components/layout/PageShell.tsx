import type { ReactNode } from "react";

type Variant = "form" | "feed" | "wide";

const SHELL_BASE = "mx-auto w-full min-w-[280px] self-stretch";

/**
 * Canonical width-contract tokens — one per page intent.
 *
 * Every variant carries a **280px floor** so block text never collapses to
 * one-glyph-per-line when nested in flex/grid shells. Pair with
 * `<CenteredProse>` (or `items-stretch` + `text-center`) for centered copy.
 */
const VARIANTS: Record<Variant, string> = {
  form: `${SHELL_BASE} max-w-md`,
  feed: `${SHELL_BASE} max-w-2xl`,
  wide: `${SHELL_BASE} max-w-5xl`,
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
