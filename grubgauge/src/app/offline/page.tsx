import { BrandMark } from "@/components/brand/BrandMark";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-background px-margin-edge py-xl text-on-background">
      <div className="mx-auto flex max-w-md flex-col gap-lg rounded-2xl border border-outline-variant bg-surface-container-low p-lg text-center">
        <div className="flex justify-center">
          <BrandMark size="lg" />
        </div>
        <div className="flex flex-col gap-xs">
          <h1 className="font-headline-md text-headline-md font-semibold text-on-surface">
            You&apos;re offline
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            GrubGauge is installed, but live ratings and profile data need a
            connection. Reconnect and we&apos;ll pick up where you left off.
          </p>
        </div>
      </div>
    </main>
  );
}
