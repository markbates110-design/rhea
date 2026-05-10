"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { navItems } from "@/lib/nav";

function ProfileAvatar() {
  return (
    <button
      type="button"
      className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-high transition-colors hover:bg-surface-variant active:scale-95"
      aria-label="Account"
    >
      <span className="material-symbols-outlined text-sm text-on-surface-variant">
        person
      </span>
    </button>
  );
}

export function HomeHeader() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-outline-variant bg-surface-container-low text-primary md:hidden">
        <div className="mx-auto flex h-16 w-full min-w-0 max-w-5xl items-center justify-between px-margin-edge">
          <BrandMark />
          <ProfileAvatar />
        </div>
      </header>
      <header className="sticky top-0 z-40 hidden w-full border-b border-outline-variant bg-surface-container-low text-primary shadow-sm md:block">
        <div className="mx-auto flex min-h-16 w-full min-w-0 max-w-5xl items-center justify-between gap-x-4 px-margin-edge py-3 md:py-0">
          <div className="min-w-0 shrink-0">
            <BrandMark />
          </div>
          <nav className="flex min-w-0 flex-1 flex-wrap justify-center gap-x-4 gap-y-1">
            {navItems.map(({ href, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-lg px-4 py-2 transition-colors hover:bg-surface-variant active:scale-95 ${
                    active ? "font-bold text-primary" : "text-on-surface-variant"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center">
            <ProfileAvatar />
          </div>
        </div>
      </header>
    </>
  );
}
