"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setOnboarded, setUsername, setFoodPrefs } from "@/lib/identity/deviceId";

const FOOD_OPTIONS = [
  { id: "fast-food",  label: "Fast Food",     icon: "fastfood" },
  { id: "casual",     label: "Casual Dining", icon: "restaurant" },
  { id: "fine",       label: "Fine Dining",   icon: "dining" },
  { id: "food-truck", label: "Food Trucks",   icon: "local_shipping" },
];

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  function togglePref(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function handleFinish() {
    if (name.trim()) setUsername(name.trim());
    setFoodPrefs(selected);
    setOnboarded();
    router.push("/");
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-margin-edge">
    <main className="mx-auto w-full max-w-md pt-lg pb-10">
      {/* Header */}
      <div className="mb-xl flex flex-col gap-xs">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
          <span
            className="material-symbols-outlined text-[22px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <h1 className="font-headline-md text-headline-md font-semibold text-on-surface">
          You&apos;re in!
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Quick setup — takes 10 seconds. All optional.
        </p>
      </div>

      {/* Name */}
      <div className="mb-lg flex flex-col gap-xs">
        <label
          htmlFor="username"
          className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant"
        >
          What should we call you?
        </label>
        <input
          id="username"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name or nickname"
          autoComplete="given-name"
          className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-md py-[13px] font-body-md text-body-md text-on-surface placeholder-on-surface-variant/50 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Food prefs */}
      <div className="mb-xl flex flex-col gap-sm">
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
          What do you usually eat?
        </p>
        <div className="grid grid-cols-2 gap-sm">
          {FOOD_OPTIONS.map((opt) => {
            const active = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => togglePref(opt.id)}
                className={`flex flex-col items-center gap-xs rounded-xl border p-md transition-all active:scale-95 ${
                  active
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[26px]"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {opt.icon}
                </span>
                <span className="font-label-sm text-label-sm leading-tight">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleFinish}
        className="flex w-full items-center justify-center gap-xs rounded-xl bg-primary py-[14px] font-title-sm text-title-sm font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
      >
        <span
          className="material-symbols-outlined text-[18px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          arrow_forward
        </span>
        Start Rating
      </button>

      {/* Skip prefs */}
      <button
        type="button"
        onClick={handleFinish}
        className="mt-md w-full text-center font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        Skip setup
      </button>
    </main>
    </div>
  );
}
