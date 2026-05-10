"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav";

export function HomeBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full justify-around gap-1 rounded-t-xl border-t border-outline-variant bg-surface-container px-2 py-3 shadow-lg md:hidden">
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
    </nav>
  );
}
