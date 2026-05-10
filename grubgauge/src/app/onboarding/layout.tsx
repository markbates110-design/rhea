/**
 * Onboarding route group shell.
 *
 * - Single outer gutter / horizontal-cap, so every onboarding page just renders
 *   its `<PageShell variant=…>` content directly.
 * - `flex flex-col` so a page that wants vertical centering can use `flex-1`
 *   spacers (welcome screen) without owning the outer scaffolding.
 * - `min-w-0` keeps the column from inheriting an unbounded min-content width
 *   from a flex ancestor (per v3.10 / v3.12 width contract).
 */
export default function OnboardingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-5xl flex-col px-margin-edge">
      {children}
    </div>
  );
}
