"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav";

export function HomeBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 md:hidden"
    >
      <div className="mx-auto w-full min-w-0 max-w-5xl px-margin-edge">
        <div className="flex justify-around gap-1 rounded-t-xl border border-outline-variant bg-surface-container px-2 py-3 shadow-lg">
          {navItems.map(({ href, label, icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-w-0 flex-1 basis-0 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-center transition-all active:scale-90 ${
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {icon}
                </span>
                <span className="mt-1 max-w-full whitespace-normal break-words font-label-sm text-label-sm leading-tight">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
