# Daily Anchor

One intention. One day. One checkoff.

Daily Anchor is a minimal daily focus tool built inside the Rhea Creation Engine project. Each day you write the single most important thing you intend to do — your anchor — and mark it complete when done. The slate clears automatically at midnight.

---

## Philosophy

Inspired by the Rhea formula **c = e s i²**: capture the one signal that matters (s), let everything else be noise (e), and compound that discipline daily (i²).

---

## Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Fonts:** Geist (UI) · Lora (intention display)
- **State:** `localStorage` only — no backend, no accounts
- **Deployment:** Vercel

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How It Works

| State | Description |
|---|---|
| **Empty** | No intention set yet. Write yours and press Enter or "Set anchor." |
| **Active** | Your anchor is set. The background shifts to a calm blue-gray. |
| **Complete** | Marked done. Background resolves to soft sage. Resets at midnight. |

Data is stored in `localStorage` under the key `daily-anchor` as `{ date, intention, completed }`. If the stored date doesn't match today, the slate is cleared automatically on load.

---

## Project Structure

```
app/
  layout.tsx   — fonts, metadata, viewport theme-color
  page.tsx     — all Daily Anchor logic and UI (single file)
  globals.css  — Tailwind v4 import, theme tokens, keyframe animations
public/
  favicon.ico
design_ideation/   — governance directives and build assessments (not shipped)
```

---

## Governance

This project operates under the **Rhea Governance Agent v1.2** using the formula **c = e s i²**. See `d:\Rhea\design_ideation\` for full directives and build assessments.

---

*Part of the Rhea Creation Engine · v0.1*
