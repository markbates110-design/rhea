import type { ReactNode } from "react";

interface CenteredProseProps {
  children: ReactNode;
  className?: string;
  /** Optional readable line cap; column still stretches to parent width up to cap. */
  maxWidth?: "sm" | "md" | "lg";
}

const MAX_WIDTH_CLASS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

/**
 * Centered typography stack that keeps block copy at full cross-axis width.
 *
 * Do NOT use `flex-col items-center` for paragraphs — it sizes the column to
 * min-content (often one pill or word wide) and body text stacks vertically.
 * Use `items-stretch` + `text-center` instead; opt individual nodes into
 * horizontal centering via `<CenteredProse.Item>`.
 */
export function CenteredProse({
  children,
  className = "",
  maxWidth,
}: CenteredProseProps) {
  const cap = maxWidth ? MAX_WIDTH_CLASS[maxWidth] : "";
  return (
    <div
      className={`mx-auto flex w-full min-w-0 flex-col items-stretch self-stretch text-center ${cap} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

function CenteredProseItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`self-center ${className}`.trim()}>{children}</div>;
}

CenteredProse.Item = CenteredProseItem;
