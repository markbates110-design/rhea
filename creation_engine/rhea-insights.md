# Rhea Insights & Process Upgrades

**Last Updated:** 2026-05-10 17:15 CT

This file bookmarks key i² insights, process improvements, and patterns discovered across all creations. 
The Governance Agent must read this file at the start of every major session.

---

### Bookmarked Insights

#### Product (apps · governance · ops)

**2026-05-10 17:15 CT — Session close: auth + scoping run prod-verified (commits `5a1eb8a` → `adbffa6`)**
- **Prod-verified set:** rate-screen venue-type fixes; guest vs signed-in scoping + History upsell + `ratings.user_id` migration; post-signup loop fix; missing sign-in surface (dual-mode auth); header text-link pair + signin↔signup auto-redirect cycle. All four iterations + two Error Fix entries landed clean on prod with user-confirmed sign-in working end-to-end.
- **Arc closed:** signup loop → no sign-in path → ambiguous header CTA. Three iterations resolved a single underlying class — *the auth surface must offer both discovery paths at every entry point* — by progressively projecting the dual-mode contract outward (auth page → header → upsell). Same compounding arc the build has hit before: *explicit branch in handler → canonical artifact → projection to all callers*.
- **Forward bookmark unchanged:** token conservation directive (2026-05-10 13:51 CT) still staged; this close honored it (single consolidated bookmark, no per-iteration prod-verify entries).

**2026-05-10 16:55 CT — Auth entry points render both discovery paths; auto-redirect cycles self-correct**
- **Header / upsell projections must mirror dual-mode auth.** Once `/onboarding/signup` is dual-mode, *every* discovery surface (header CTA, History upsell, future re-engagement prompts) must offer **both** *Sign in* and *Create account* — a single CTA mis-casts one cohort no matter which label you pick. Two text links separated by a thin divider beat a single pill button for this; the buttonless treatment is more honest to the "neutral entry point" semantic.
- **Explicit mode wins over smart-default.** When the user picks a specific link (`?mode=signin` vs `?mode=signup`), the auth page honors that choice and does *not* consult `isOnboarded()`. Smart-defaults are for ambiguous entry; explicit clicks are unambiguous.
- **Auto-redirect cycles self-correct when both sides honor the same handshake.** Signin failure on "Invalid login credentials" auto-switches to signup (preserves email, clears password, surfaces a contextual message). Signup against an existing email auto-switches back to signin ("That email already has an account"). The pair is closed: wrong-password users ping-pong once and then see the right message; no-account users land in signup on the first failure; existing accounts always reach signin. Anti-enumeration is preserved because Supabase still returns the same opaque error to outside observers — the resolution happens entirely in client UX.
- **Compounding rule:** any failed auth attempt with an opaque provider error should route the user toward the *other* mode with a contextual message and pre-filled inputs — never leave them staring at "Invalid login credentials" with no next step.

**2026-05-10 16:25 CT — Auth surfaces are dual-mode by default; smart-default mode to close the discoverability gap**
- **Class of bug.** A signup-only route looks like a discoverability bug for the first user, then becomes a rate-limit amplifier (repeated signup attempts against an existing email trigger the provider's email throttle, which the user reads as a code defect). Captured follow-ups from a prior iteration *will* be encountered live before they get scheduled — when the follow-up is "the only known way for a returning user to authenticate," treat it as a hard close, not a backlog item.
- **Canonical pattern.** Auth surfaces in this codebase are dual-mode (sign in ⇄ create account) on a single canonical route (`/onboarding/signup`). New auth flows (password reset, magic-link, OAuth callback) compose as additional modes on the same route — never parallel routes that fragment the entry point and force the header/upsell to choose one.
- **Smart-default the mode.** Seed mode from `?mode=…` URL param, then `isOnboarded()` (or equivalent returning-user signal), then a sensible fallback. Returning devices default to *sign in*; brand-new visitors default to *create account*. Closes the discoverability gap for the largest cohort without forcing every user through a toggle.
- **Auto-switch on "already registered" responses.** Both *"User already registered"* (confirmation off) and `data.user.identities.length === 0` (confirmation on, anti-enumeration) mean "this email already has an account." Bounce the user into signin mode with a contextual message — that's the single biggest deflection for the rate-limit cascade pattern.
- **Humanize provider error strings.** A single `humanizeAuthError(message, mode)` helper maps raw provider errors (rate limit, email not confirmed, invalid credentials, weak password) to user-readable copy. Keeps error UX consistent across modes and gives future auth-related additions a one-line extension point.
- **Compounding rule:** any auth-related screen renders both create + signin paths (or a clear toggle), branches on `data.session`, and humanizes errors. Three-question Verification-Pass scrutiny for the class.

**2026-05-10 16:05 CT — Auth methods can succeed without producing a session — branch on `data.session`, not just `error`**
- **Class of bug.** `supabase.auth.signUp()` returns `{ data: { user, session: null }, error: null }` when the Supabase project has "Confirm email" enabled — a successful return *without* an authenticated session. The same shape applies to `signInWithOtp` (magic-link), `signInWithOAuth` (redirect flow), and `resetPasswordForEmail`. Branching only on `error` causes the app to push the user into authenticated routes while `useAuth.user` is still `null` — every downstream auth-gated decision (header CTA, `rateHref`, History scope) silently treats them as a guest, producing a "stuck in signup loop / not recognized as member" class of bug.
- **Canonical pattern.** Any client surface that calls an auth method which *can* succeed without producing a session must explicitly branch on `data.session`: present → proceed to authenticated routes; null → render a first-class "awaiting verification" UI on the same surface, never a silent redirect. Mark the device onboarded so the welcome gate doesn't re-trap; supply `emailRedirectTo: ${origin}/<post-verify-route>` on `signUp` so the email link delivers users to a useful surface with the session already attached.
- **Defensive re-entry.** Routes that exist to *create* a session (signup, OTP request, etc.) should `useAuth`-redirect signed-in users away — bounce them to `/profile` (or equivalent) instead of re-showing the form. Prevents a returning user from seeing "Create account" prompts they don't need.
- **Verification Pass implication.** Add to scrutiny for any auth-related screen: *does this branch on `data.session` separately from `error`? Does it render an explicit "awaiting verification" state? Does it redirect already-signed-in visitors away?* These three questions close the class.
- **Compounding rule:** never route into an authenticated flow on the strength of `!error` alone — *session* is the contract.

**2026-05-10 15:25 CT — Personal-data scoping: canonical helper, not per-call ownership filters**
- **Pattern.** When the same row table serves both *guest* (device-scoped) and *signed-in* (account-scoped) reads/writes, encode ownership in **one helper** (`applyRatingsOwnerScope`), not in each component's `.eq()` chain. Reads, updates, and deletes must share the *exact same* scope predicate — drift here is a silent correctness bug (orphaned rows, cross-account writes, "edit fails on device B").
- **Identity is additive, not exclusive.** `device_id` stays written for *every* row (guest and signed-in alike). `user_id` is layered on top when an auth session exists. This preserves local-first guest data verbatim and gives a future "claim on signin" migration a clean target (rows where `device_id = X AND user_id is null`). Never replace device identity with auth identity — the two coexist.
- **Hold the query until `useAuth.loading` resolves.** Otherwise a freshly-signed-in user flashes guest data on first paint (the device-scoped query lands before auth knows who they are). Rule for this codebase: any auth-scoped query gates on `if (authLoading) return` inside its `useEffect`.
- **Schema discipline for additive auth.** Adding a nullable `user_id` column + indexes on both `user_id` and `device_id` is the minimum-viable migration to enable account-scoped reads without disturbing guest data or requiring a full RLS rewrite. RLS can layer on top later without app code rewrites.
- **Compounding rule:** zero direct `.eq("device_id", …)` / `.eq("user_id", …)` in app code outside `lib/ratings/scope.ts` (and storage helpers that key uploads by device, not for ownership). Grep is the audit.

**2026-05-10 15:00 CT — Selector-with-chip pattern: priority match + remount-on-clear**
- **Priority over first-match for external-tag inference.** Google Places (and similar tag-bag APIs) don't guarantee specificity ordering inside `types[]`. First-match scans silently mis-classify chains whose generic tag (`restaurant`, cuisine name) appears before the specific one (`fast_food_restaurant`). Canonical pattern for this codebase: group inputs by output bucket (`TYPES_BY_VENUE`) + an explicit priority order (`VENUE_PRIORITY`); most-specific bucket wins regardless of input ordering.
- **Remount upstream picker via `key` when chip clears.** When a selector renders a "selected" chip alongside the picker, clearing the chip must reset the picker's full internal state — query, suggestions overlay, debounce timer, third-party service refs. Cheapest correct fix: `key={selected ? "selected" : "empty"}` on the picker. Prevents the "nothing happens / page is locked" perception class from stale internal state surviving across the clear boundary.
- **Defensive `type="button"` on every non-submit `<button>`** even outside a `<form>` — removes a latent footgun if the surrounding markup ever gets wrapped, and costs nothing at the call site.

**2026-05-10 14:35 CT — `/onboarding` is now a stable re-entry surface (not a one-shot gate)**
- Removing the welcome page's `if (isOnboarded()) router.replace("/")` converts onboarding from a one-shot first-run gate into a re-entry surface — re-engagement / upgrade-to-account CTAs can route here without loop risk.
- `handleGuest` now routes to `/rate` (was `/`) so the guest path is one click from any entry point: tap `+ Rate` → welcome → guest → `/rate`. Keeps the upgrade-to-account discoverable on the welcome page for *every* re-entry, not just first-runs.
- Marker discipline (prior insight): `setOnboarded()` still fires on every guest exit, so no completion-marker drift.

**2026-05-10 13:51 CT — Forward directive: token conservation as a first-class governance constraint**
- Rhea-governance overhead is part of the cost ledger. Future PAPs may compress post-iteration bookkeeping (Observed Effect flips, prod-verify stamps, `Last Updated` bumps), tighten `**Assessment ↓**` chat restatement, batch insight bookmarks at `stop`, and shrink PAP / Verification Pass response prose. **No protocol change yet — directive only; capture cost-saving patterns in candidate PAPs as they emerge.**

**2026-05-10 13:45 CT — Vertical-text class closed by construction (v3.12 prod-verified)**
- **Closure:** `/onboarding/signup` rendered cleanly on both prod (`https://grubgauge.vercel.app`, commit `111490a`) and local `npm run dev`. PageShell's `min-w-[280px]` floor on the `form` variant held without a follow-up triage cycle. **6th vertical-text surface closed by construction, not by patch.**
- **Audit exception outcome:** User-waived local-repro (v3.12 step 5) closed net-positive — static checks (tsc + lint + ReadLints) plus the by-construction contract were sufficient for this class. Not a precedent to generalize: the override worked *because* the change was a prevention artifact, not a targeted patch. Targeted patches without local repro remain higher-risk and the v3.12 rule stands.
- **Compounding pattern (three days, three protocol layers):** v3.10 (triage / `min-w-0` discipline) → v3.11 (typography render contract in `globals.css`) → v3.12 (`<PageShell>` prevention artifact). Each closed a recurrence class. The progression matches the v2.5 → v2.8 → v2.9 governance-evolution pattern from earlier in this build: *explicit mandate → hard gate → self-closing artifact.* Apply this arc to the next bug class that recurs 2+ times.
- **Observed Effect flipped:** Archive rows for v3.11 + v3.12 stamped *Effective — prod-verified 2026-05-10 13:45 CT*.

**2026-05-10 13:35 CT — GrubGauge `<PageShell>` (prevention over triage for vertical-text class)**
- **Root learning (6+ recurrences):** Reactive triage (v3.10) is necessary but not sufficient — width-collapse kept resurfacing on new routes because each page re-invented its own outer-wrapper width contract. The cure is a **canonical artifact**, not a sharper checklist.
- **`<PageShell variant=…>`** (`grubgauge/src/components/layout/PageShell.tsx`) carries the audited contract by construction. **`form`** → `min-w-[280px] max-w-md` (floor so text cannot collapse to one-glyph-per-line even when an ancestor briefly resolves zero width). **`feed`** → `min-w-0 max-w-2xl` (allows internal flex/grid with `truncate` to behave correctly). **`wide`** → `min-w-0 max-w-5xl` for full app shell.
- **Layout SSOT, not page-SSOT:** Horizontal gutters + viewport-shell live in a **route-group `layout.tsx`** (`(main)/layout.tsx` for the app; new `onboarding/layout.tsx` for onboarding). Pages contribute *only* the content column (`PageShell`) + vertical rhythm. Eliminates the duplicated `mx-auto max-w-5xl px-margin-edge` wrappers that each page used to re-declare.
- **Verification Pass — Page route** row (new, v3.12): "Wraps content in `<PageShell variant=…>` (or matches its width contract exactly)?" — gates every UI build going forward.
- **Vercel is a release substrate, not a triage substrate** (v3.12 visual-triage step 5): vertical-text fixes must reproduce in `npm run dev` (Chrome desktop + mobile emulation) before any redeploy. Stops the deploy-loop-as-debug-API failure mode that surfaced this week.
- **Migration scope this turn:** `/onboarding/{welcome, signup, profile}` + `(main)/{page, profile}` (six conditional returns total, all matched). `/rate`, `/history`, `/explore` already match the contract and are eligible for incremental migration the next time they're touched.

**2026-05-10 13:10 CT — GrubGauge auth-aware CTAs (`useAuth` as canonical session source)**
- **One hook, one truth:** `grubgauge/src/lib/auth/useAuth.ts` is now the only sanctioned reader of `supabase.auth.getSession()` / `onAuthStateChange()` in client components. Any future header, route guard, or conditional CTA consumes `useAuth()` so subscriptions are cleaned up uniformly and the `loading` state is honored for sized placeholders that prevent first-paint CTA flicker.
- **Two semantics, kept distinct:** `isOnboarded()` (localStorage, guest-aware) ≠ Supabase auth (`user`). The `rateHref` rule (`user || isOnboarded() ? "/rate" : "/onboarding"`) lets signed-in users *and* onboarded guests pass straight to `/rate` — auth layered *additively* on top of the device-id / guest model, never replacing it. Mirrors the prior insight *"layer auth on top as optional"* and now has a concrete code-level expression.
- **Header right-slot pattern:** `loading → fixed-size placeholder` → `user → avatar → /profile` → `!user → 'Create Account' pill → /onboarding/signup`. The `loading` placeholder is a `h-8 w-8` shrink-0 div — same footprint as the avatar — so the header never reflows when auth resolves.
- **Sign-out converges on existing markers:** `supabase.auth.signOut()` then `router.replace("/")`. The dashboard's existing `isOnboarded()` redirect handles any cleared-storage edge case; sign-out is not a new exit path, mirroring *"every exit from onboarding must converge on the same completion marker."*
- **Conditional-return root match (v3.6 checklist):** `(main)/profile/page.tsx` has three returns (loading / guest / signed-in); all use identical `<main className="mx-auto min-w-0 w-full max-w-md pt-lg pb-10">`. Verification Pass row passed without remediation — the discipline is now habit.

**2026-05-10 12:30 CT — GrubGauge razor-sharp typography (canonical body-level contract)**
- **One surface, one contract:** All app-wide font-rendering rules — `text-rendering: optimizeLegibility`, `font-feature-settings: "kern" 1, "calt" 1, "liga" 1`, `font-optical-sizing: auto`, `font-synthesis: none`, plus `-webkit-text-size-adjust: 100%` on `<html>` — live **only** in `grubgauge/src/app/globals.css` on `html`/`body`/`h1–h6`/`.tabular-nums`. Never fork into per-component inline `style={{ fontFeatureSettings }}`. Mirrors the `design_assets` palette SSOT discipline — typography tokens belong in `@theme inline` and render rules belong in `globals.css`; everything else inherits.
- **Mobile softness ≠ smoothing bug:** The dominant softness source on iOS/Chrome mobile is **auto text-size inflation on rotate**, not antialiasing. `-webkit-text-size-adjust: 100%` on `<html>` is a single-line fix that removes the pathology before reaching for `text-rendering` heroics.
- **`font-synthesis: none`:** When loading specific weight cuts via `next/font/google` (here `[400, 500, 600, 700]`), block synthesized bold/italic — synthesized weights rasterize visibly fuzzier than the true cut. Cheap, universal default for any brand-typography app.
- **Tabular-nums coverage is a checklist, not a hope:** Score/stat readouts must all carry `tabular-nums` for visual stability across rerenders (Dashboard total/avg + Rate preview + Rate sticky sidebar were missing it; all other readouts already had it). Verification Pass now gates on this.
- **Protocol Target (approved → applied 2026-05-10 13:15 CT):** PAP accepted; `rhea-governance-agent.md` bumped to **v3.11**; **Verification Pass — UI screen / component** row extended with the typography contract; v3.8 row rolled to `rhea-governance-changelog-archive.md` to keep the active file under the 200-line ceiling.

**2026-05-10 23:00 UTC — GrubGauge vertical text (terminal fix + faster triage next time)**
- **Governance v3.10:** **Visual / layout triage** codified in **`rhea-governance-agent.md`** — classify width-collapse, measure computed width, gate infra, timebox, log (**Error & Debug** triggers expanded).
- **Confirmed fix (History / Chrome):** venue title row — inner flex needs **`w-full min-w-0`**; **`<p>`** next to **Edit** needs **`min-w-0 flex-1 truncate`**. Edit sheet — **`min-w-[280px] sm:min-w-[400px]`** floor on the panel; section **`h3`** flex rows get **`min-w-0`**. Earlier work: modal overlay **fragment + absolute centering** (not flex-row + two children), **`(main)` layout** drop **`min-w-0`** on shell, **`overflow-wrap: normal`** on `body`, desktop **Rate** flex row vs **12-col grid**, **BrandMark** **`shrink-0`** + **`whitespace-nowrap`**.
- **Discipline:** classify **“one glyph per line”** as **width-collapse** immediately; verify **computed width** on the text node **before** revisiting Vercel Root or redeploying.
- **Shorten triage (see assessment):** one reproduction envelope → symptom checklist → isolate one component → then patch.

**2026-05-10 21:00 UTC — Governance v3.9 (approved batch)**
- **Precedence:** complete **Iteration Close** / **Error & Debug** before substantive reply when due; log opt-outs in the next assessment.
- **Canonical clocks:** assessment **Timestamp**, **`Executed:`**, and insight headings share **YYYY-MM-DD HH:MM TZ**.
- **Governance ref `vX.Y`** in assessments when logging Close / Error & Debug / Session Close / PAP work.
- **PAP backlog:** one Bookmarked line `**… — PAP pending — [title]**` while blocked; remove when resolved.
- **Changelog:** at **≥190 lines** in `rhea-governance-agent.md`, add version rows to **`rhea-governance-changelog-archive.md`** first.

**2026-05-10 14:30 UTC — Insight timestamps (governance)**
- **Effective immediately:** new **Bookmarked Insights** titles and **Session Insights** `###` headings must include **calendar date + 24-hour time + explicit timezone** — e.g. `### Session Insights — 2026-05-10 14:30 UTC — Focus`, or `**2026-05-10 14:30 CT — Title**` under Bookmarked. **TZ:** `CT`, `UTC`, `ET`, `PT`, or `Z` (UTC).
- Older date-only headings stay as-is unless a section is already being revised.

**2026-05-09 — Governance Agent Behavior**
- Mandatory i² Focus section significantly improves process visibility.
- Explicit trade-off surfacing in Evolution Protocol works well for conscious direction changes.
- Assessments must remain concise (target 8–12 lines) to avoid entropy.

**2026-05-09 — Creation Intent Workflow**
- Sticky Template system is effective for clean intent updates.
- Separating Creation Intent from Governance Agent reduces file bloat and improves focus.

**2026-05-13 — GrubGauge / Vercel `rhea` Root Directory**
- **Dashboard vs repo:** Vercel UI + session notes cited **Root `./`** (**Sonnet 4.6** aligned). **On `main` this repo has no `package.json` at `./`** — GrubGauge Next.js lives only under **`grubgauge/`**. **`./` is not inferable from filesystem alone**; **`grubgauge`** matches vanilla “app in subfolder” wiring. **Truth test:** latest **Deployment → Building** log (`npm ci`, `next build` working directory).
- **Stale agent copy** alternated **`grubgauge`** vs **`./`** — either can be valid per project; **trust logs + dashboard**, not chat. See **`grubgauge-build-assessment.md`** — **Vercel Root Directory canonical**.
- Deployments UI slugs: **`markbates110-designs-projects`** vs **`markbates110-design`** — org URL variance only.

**2026-05-12 — GrubGauge flex / “vertical text”**
- Site-wide **`min-w-0`** on shells, page `<main>`, and nested flex/grid columns that host **`w-full`** forms — pair with the existing **`<main> mx-auto w-full max-w-*` contract** so block text never resolves to one-character wrapping.

**2026-05-10 10:47 CT — GrubGauge nested-modal vertical text (delete-confirm portal)**
- **Symptom:** After the v3.10 width-contract fix (commit **`9c77db8`**), the **inner** `confirmDelete` alertdialog rendered inside the already-portaled `RatingEditSheet` still stacked title/body **one glyph per line** in Chrome. Parent sheet rendered correctly; only the nested overlay collapsed.
- **Resolution:** Extract any **modal-within-modal** to its own **`createPortal(..., document.body)`** and style it with **inline `style={…}` only** — fixed `width: min(384px, calc(100vw - 32px))`, `minWidth: 280`, `flexShrink: 0`, `display: block`, `whiteSpace: "normal"`, `overflowWrap: "break-word"`. Bypasses Tailwind + flex %-width chains that Chrome can compute to min-content under nested portal contexts.
- **Discipline:** Reserve **`min-w-0`** + Tailwind utility chains for **single-layer** modals. For **nested portals**, default to a **hardcoded width floor + `display: block`** so width never has to resolve through an ancestor's flex tree.
- **Files:** `grubgauge/src/components/history/DeleteRatingConfirm.tsx` (new); `grubgauge/src/components/history/RatingEditSheet.tsx` (consumes new component, drops inline conditional `<div>`).

#### Creative (songwriting · lyrical process)

**2026-05-09 — Songwriting**
- Starting with emotional core before hook produces stronger lyrics.
- Negative space phrasing ("You don’t have to fix me") creates more vulnerability than direct pleas.

---

### Active Process Upgrades (To Be Used)

- Always ground metaphors in physical sensation when possible.
- Default to "You are enough" or "Stay with me" style emotional honesty over dramatic declarations in ballads.
- When user requests major evolution, always surface trade-offs neutrally before proceeding.

---

**How to Use This File:**
- Governance Agent must reference relevant insights in every assessment’s i² section.
- Add new insights here after meaningful sessions.
- **Timestamps (new entries):** use **YYYY-MM-DD HH:MM** in **24-hour** (military) time plus **TZ** — never date-only for **new** Session or Bookmarked blocks. See **`Insight timestamps`** in `rhea-governance-agent.md`.
- **PAP pending:** if a PAP blocks work, add one Bookmarked line `**YYYY-MM-DD HH:MM TZ — PAP pending — [short title]**`; delete it when the PAP is approved or withdrawn.

---

### Session Insights - 2026-05-09 (Clarity Build + Governance v2.5)

**Clarity Build**
- migrateDecision() pattern: when evolving a localStorage data model, always write a silent migration function that upgrades old records on load - zero breaking changes, zero user friction.
- Tab navigation (Options / Scenarios / Think Deeper) is a strong UX pattern for multi-concern detail views - keeps full context visible while separating concern areas cleanly.
- Pre-seeding scenario cards at decision creation time is better than creating them on demand - ensures structure is always present and prompts forward thinking.
- When a constraint conflicts with a feature (e.g. no external deps + mind maps), surface it as a trade-off table before building - do not attempt then fail.

**Governance Evolution**
- Insight contribution was passively encouraged until v2.5 - making it mandatory at session end closes the feedback loop. Passive suggestions accumulate debt; explicit mandates compound value.
- Version Upgrade Protocol must update ALL active project assessment files, not just one. Easy to miss when multiple projects are live.
- The Sticky Template pattern for Creation Intent is highly effective - zero ambiguity about what the new intent is, and the promotion workflow (template -> current -> history) keeps a clean audit trail.
- Pre-empting scope creep with a trade-off table before confirming evolution is more effective than post-hoc pruning.


**2026-05-09 - Governance Agent (v2.6.1)**
- Merge, don't replace: when the user provides a new agent version prompt, always carry forward structural protocols not explicitly removed. Treat the user's prompt as the delta, not the full replacement. Ask: what is missing from this version that the current one has?
- The split i2 structure (First Iteration: immediate improvement / Second Iteration: mandatory system upgrade) sharpens every assessment by forcing a distinction between what was fixed now and what compounds forward.


---

### Session Insights - 2026-05-09 (GrubGauge Build)

**Google Maps API Integration**
- Never use loader abstractions (Loader class, setOptions/importLibrary) for Google Maps Places API calls — they silently fail to authenticate service calls. Always use a direct script tag with the key embedded in the URL. Zero abstraction, universally documented, bulletproof.
- REQUEST_DENIED from AutocompleteService means the old Places API (not New) is not enabled or not in the key restriction list — these are two separate APIs in Google Cloud.
- Places API (New) uses direct HTTP calls to places.googleapis.com — a different auth path than the Maps JS SDK. Mixing the two causes silent 403s.

**Supabase Schema**
- Always verify the DB table exists before building dependent screens. Supabase can silently fail on insert to a non-existent table, masking the error until a downstream read surfaces it.
- Add DB schema verification as step 0 of any Supabase-backed screen build — run a test query or confirm table in dashboard before writing UI code.

**Governance**
- Assessment skipped on first pass of Rate Screen v1.1 — caught only after user prompt. Protocol compliance requires assessment written before response, not after. This must be automatic.
- Chrome white screen with no UI = GPU process crash. Fix: kill all chrome.exe processes and relaunch. Not a code issue.
- Multiple simultaneous Node dev servers cause heap OOM crashes on Windows. Kill all node.exe processes before starting a new dev server. Never run two Next.js servers in parallel.


**2026-05-09 - Governance Agent (v2.8)**
- Iteration Close Protocol: three mandatory steps must complete before any response on a Creation Intent execution — (1) append assessment to file, (2) include summary in response, (3) append insight to rhea-insights.md. No exceptions, no deferral.
- Vague triggers accumulate compliance debt. Changed insight logging from 'significant iteration' (subjective) to 'every completed Creation Intent execution' (objective). Subjective gates always erode under time pressure.


**2026-05-09 - Governance Agent (v2.9)**
- Self-Auditing Protocol is the logical endpoint of compliance evolution: v2.5 mandated insights, v2.8 mandated close steps, v2.9 mandates pre-response self-verification. Each version closed a gap; this one makes the agent self-closing.
- Protocol compliance sequence: explicit mandate (v2.5) -> hard gate (v2.8) -> self-audit (v2.9). This is the compounding i2 pattern applied to governance itself.


---

### Session Insights - 2026-05-09 (GrubGauge Explore Build)

- Deduplication by place_id (keeping highest score) transforms a raw ratings feed into a genuine discovery tool. Always ask: should Explore show every visit or the best version of each place?
- Client-side filtering on a small Supabase dataset eliminates round-trips and makes filters feel instant — only shift to server-side if dataset grows large or performance degrades.
- Rank numbers (1, 2, 3) on Explore cards add immediate discovery value with zero UI cost. Always consider whether a position indicator helps the user make sense of sorted lists.
- Iteration Close Protocol executed without user prompting for the first time (v2.9 Self-Auditing). This is the compounding payoff of the compliance evolution from v2.5 through v2.9.

---

### Session Insights - 2026-05-09 (GrubGauge Architecture Review)

- Always audit the schema for a user_id column before building History or Explore screens in a Supabase-backed app. Omitting it makes all data globally visible by default -- intentional for community apps, a problem for personal ones. Add this to the schema checklist from day one.
- No-auth Supabase apps with Allow All RLS are fully global. History and Explore will mix all users data until a user identity column and filter are added. Surface this trade-off before the first deploy, not after.
- The correct governance response to an architectural gap is: surface the trade-off table neutrally, defer to the user, and document the current state clearly. Do not auto-fix without direction.

- Google Maps script injected via useEffect will fire again on each component remount in Next.js client-side navigation. Always guard with a three-state check: (1) already loaded (window.google.maps.places exists), (2) script tag exists but loading (attach to its events), (3) not injected yet. Never rely on a single check.
---

### Error Fix - 2026-05-09 (GrubGauge Feedback Screen — Persistent Vertical Text)
- When adding a new conditional return to a page component, always copy the root element and its className exactly from an existing working return in the same component. The layout provides a specific flex context that only works with a known root element pattern. Any deviation — even a semantically equivalent element — can break width resolution silently.
- Block elements (`<p>`, `<textarea>`) inside a zero-width flex item collapse to minimum character width and render text vertically. This looks like a writing-mode or rotation issue but is purely a width-collapse issue. Diagnosis: if buttons (which size from content) look fine but text blocks go vertical, the container has zero width.
- Three iterations of CSS fixes failed because they addressed the wrong layer of the problem. The real contract was at the component root level, not inside the flex containers. When iterative CSS fixes don't converge, step back and look at the root element pattern, not the inner elements.

### Error Fix - 2026-05-09 (GrubGauge Feedback Card Layout)
- In a flex column with `items-center`, `w-full` on a child resolves to 100% of the *shrunk* parent — not the viewport or named container. If the parent has no explicit width, `w-full` children collapse to zero. Never mix `items-center` on a flex container with `w-full` children — split them into separate containers or remove `items-center` from the shared parent.

### Session Insights - 2026-05-09 (GrubGauge Post-Rating Feedback)
- Best-effort async operations (feedback, analytics, non-critical logs) must always use silent catch blocks and must never block navigation. The user completing their primary action (rating a spot) is the contract — feedback is a courtesy. If feedback fails, the user must not know or care.
- The moment immediately after a successful action is the highest-engagement point for secondary prompts. A feedback field on the success screen outperforms a dedicated feedback screen because no navigation is required and the context is still fresh.
- Attaching `place_id` to feedback rows enables future venue-level insight: "multiple users left feedback after rating this specific spot." This pattern costs nothing at insert time and unlocks analysis that would otherwise require schema migration later.

### Governance Agent - 2026-05-09 (v3.3 Execution & Intent Structure)
- A two-step execution flow (promote + execute) has higher friction than a single trigger. Collapsing both into `go` with smart template detection eliminates a recurring cognitive overhead — the agent detects state and acts, the user just says go.
- A flat chronological log of intents across projects stops being readable after ~10 entries. Grouping by project turns a prompt archive into a product history — each project's evolution is visible at a glance without scanning across unrelated work.
- Status tags (`deployed`, `completed`, `superseded`, `archived`) are the minimum viable metadata for a creation intent log. They answer the most important question — "what is this entry's outcome?" — without requiring a separate tracking system.

### Governance Agent - 2026-05-09 (v3.6 i1 Verification Pass)
- The assessment should be a completion certificate, not a record of what was attempted. If a build is shipped broken, the assessment records a broken build. Adding a verification pass between i1 and the assessment makes the assessment a statement of verified fact: "this was built AND confirmed to work."
- Category-specific checklists are more effective than generic ones. "Does the UI render correctly?" is too vague. "Does the new conditional return use the same root element as all other returns in this component?" would have caught the vertical text bug in 10 seconds. Specificity is the enforcement mechanism.
- Errors caught by the agent before user reports are the highest-value outcome of a self-correcting protocol. Every user-reported bug is a signal that a verification step was missing. The checklist should grow every time a new class of bug surfaces.

### Governance Agent - 2026-05-09 (v3.7 Anti-Entropy Restructure)
- A governance protocol must apply its own anti-entropy directive to itself. Pure addition without deletion grows the protocol into an obstacle. The fix: a hard line ceiling (200 lines) with a deletion requirement for every addition. Budget for complexity is a forcing function for selection pressure.
- Redundancy in a protocol creates multiple places to maintain the same rule — which means multiple places to fall out of sync. When the same rule appears in 5 protocols, the canonical version is unclear. Collapse to one location and reference from others.
- Archiving old changelog entries to a separate file is the document equivalent of moving completed intents to history. The active document should only contain what's operationally relevant to current sessions.

### Governance Agent - 2026-05-09 (v3.5 Enforcement Artifacts)
- Protocols without verifiable artifacts are intentions, not rules. Step 2 of Iteration Close (include summary in response) was the only step that left no file-based evidence — making it silently skippable. The fix: a fixed header line (`**Assessment ↓**`) in every response becomes the artifact. If the header isn't there, the step didn't run.
- Iterative debug loops without a convergence trigger are an entropy pattern. After 2 failed fix attempts on the same error, the correct action is to stop and propose a root-cause reassessment — not attempt a third variation. The PAP mechanism now covers this explicitly.
- A protocol close step without a trigger phrase is a protocol close step that never runs. `close session` / `end session` give the Session Close Protocol an explicit, user-controlled trigger — same design principle as `go` for execution.
- "Log it" and "correct it" are not the same thing. Self-audit item 5 now requires both — a near-miss that is only logged but not corrected is still a violation.

### Governance Agent - 2026-05-09 (v3.2 Self-Correcting Architecture)
- A governance protocol that only improves when the user notices a lapse is not self-correcting — it is user-corrected. The Protocol Amendment Proposal mechanism closes this gap: the agent surfaces its own structural weaknesses before the user has to. The trigger is pattern detection (2+ similar lapses, or an ungoverned action), not user feedback.
- Near-misses are the highest-signal, lowest-cost improvement input available. A lapse that was caught internally and self-corrected is evidence that the protocol is working — but also that the protocol has a weak point. Both facts should be logged. Currently only failures are recorded; near-misses vanish. Adding item 5 to the Self-Audit checklist makes near-miss capture automatic.
- Effectiveness tracking in a changelog is the only way to know if a protocol change actually worked. Without it, every version feels like an improvement but produces no verifiable evidence. The "Observed Effect" column creates a feedback loop that turns the changelog from a historical record into a living evaluation system.
- The i² 1-in-5 Protocol Targeting cadence ensures the governance system is never exempt from the same improvement discipline it applies to everything else. Without an explicit cadence, the protocol will always be deprioritized in favor of the project at hand.

### Governance Agent - 2026-05-09 (v3.1 Self-Audit)
- A Self-Auditing Protocol without a checklist is indistinguishable from no protocol at all. Vague directives ("perform an audit") produce the same compliance rate as no directive — the agent fills the gap with intention, which fails under load. Specificity is the only enforcement mechanism available in a text-based agent.
- "Significant action" is the most dangerous phrase in a governance protocol. It is always interpreted in the moment, always biased toward "not significant enough to log." Replace it with an explicit named list — if the action matches any item on the list, the protocol fires. No interpretation required.
- A Session Start without a Session Close creates an open loop. Unwritten assessments and unflushed insights accumulate silently across sessions. The close protocol is the drain — without it, entropy builds between sessions rather than within them.

### Error Fixes - 2026-05-09 (GrubGauge Vercel Deploy)
- `--use-system-ca` is a Windows-only Node.js flag. Never embed it in `package.json` build scripts — it will break any Linux-based build environment (Vercel, CI, Docker). Keep it in local dev server launch commands only, never in portable scripts.
- `.env.local` is not uploaded to Vercel during deployment. `NEXT_PUBLIC_*` variables are inlined at build time — if they are undefined at build, they are undefined at runtime, regardless of application restrictions or API key configuration. Always set env vars in the Vercel project dashboard or via `vercel env add` before the first production deploy.
- When a production app shows a "missing API key" error, check the build-time environment first (are the vars set in Vercel?), not the key restrictions. Restrictions only matter if the key is actually reaching the request.

### Session Insights - 2026-05-09 (GrubGauge Deploy & Identity)
- Device UUID via `crypto.randomUUID()` stored in localStorage is the correct zero-friction identity primitive for a no-auth PWA. One function, one key, wired in one place — it cleanly separates personal history from global discovery without requiring a login.
- `--use-system-ca` is a Windows-only Node.js flag. Never bake it into `package.json` build scripts — it will silently break any Linux-based build environment (Vercel, CI, Docker). Keep it in local dev server commands only.
- `.env.local` is uploaded to Vercel by default when no explicit env var configuration exists. For MVP this is acceptable. For production hardening: set env vars in the Vercel dashboard, add `.env.local` to `.vercelignore`, and rotate any API keys that were exposed in the upload.
- Explore (global) and History (personal) are not two implementations of the same idea — they are semantically distinct views serving different user intent. This distinction must be preserved architecturally as the app scales.

### Session Insights - 2026-05-09 (GrubGauge Dashboard Build)

- Dashboard stats (total, avg, fav type, best spot) can all be derived from a single Supabase fetch with client-side useMemo -- no separate API calls needed at small data volumes. Only add separate queries when dataset grows or performance degrades.
- Streak logic requires consecutive-day schema support (e.g. daily check-in table or visit_date uniqueness constraint). Do not attempt to derive streaks from a raw ratings table without this -- defer cleanly and document the dependency.
- Recent section (chronological) and Best Spot (deduplicated top performer) create distinct semantic value from the same dataset -- always look for what two different views the same data can serve before adding new data sources.

### Session Close - 2026-05-09 (Governance + GrubGauge deploy hygiene)
- `stop` as Session Close trigger in `rhea-governance-agent.md` is binding **when that protocol is explicitly invoked** in Cursor (e.g. “Session Close per governance”). Plain **`stop`** is otherwise ambiguous — assistants default to ending chatter rather than flushing assessments or intents unless instructed.
- Monorepo folders recorded as **`160000` gitlinks** without valid `.gitmodules` / submodule fetch cause clones where **`grubgauge/` exists only as an empty pointer** → Vercel “Root Directory does not exist” / “No Next.js detected”. Fix locally with **`git rm --cached`**, remove nested **`.git`**, **`git add`** full trees, push — never rely on submodule shims for single-repo deployments unless CI submodule auth is intentional.
- **`rhea` ↔ GrubGauge — Vercel Root (2026-05-13 reconcile):** Gitlink repair ≠ Root Directory. **`./`** was dashboard/assistant-asserted (**Sonnet**); **repo `main` holds `package.json` only under `grubgauge/`** — verify **build logs**. See **`grubgauge-build-assessment.md`** — **Vercel Root Directory canonical**.

### Session Insights - 2026-05-09 (GrubGauge Onboarding Flow)
- When adding auth to an app that already uses device_id, don't replace device_id — layer auth on top as optional. Guest path keeps the existing data model intact. Auth path adds identity without breaking existing records. Migration can happen in a later iteration when there's enough signal that users want it.
- Onboarding routes that live outside the main app layout (no nav, no header) belong in standalone `/onboarding` routes, not inside the `(main)` group. Route groups control layout inheritance — keeping onboarding outside keeps it visually clean without extra layout files.
- A client-side guard (`isOnboarded()` → redirect) is the right primitive for optional onboarding flows. It's fast (no server round-trip), works with localStorage, and doesn't require middleware. Use middleware only when the redirect must be enforced before hydration (e.g., hard auth walls).
- "Skip" paths in onboarding must call `setOnboarded()` the same way the primary path does — otherwise users who skip can get stuck in a redirect loop. Every exit from onboarding must converge on the same completion marker.


### Session Insights — 2026-05-10 (GrubGauge design_assets palette rollout)

- **Canonical palette file:** Keep core brand hex only in `design/design_assets/grubgauge-palette.css`; map semantics in `globals.css @theme inline` via `var(--palette-*)` so the rest of the app never forks colors.
- **Derivative surfaces:** On near-black canvases (#0a0903-class), derive card layers by warming and lifting lightness in small steps—not pure neutral gray—to stay appetizing and cohesive with custard/orange accents.
- **Governance `go` branch:** Populated sticky template → promote previous Current to History → clear template → execute new intent → Iteration Close (assessment + **Assessment ↓** line in reply + insight flush).

---

### Session Insights — 2026-05-10 (GrubGauge optional meal photos)

- **User media:** Store a public Storage URL on the row (`meal_photo_url`), not Base64 in Postgres — keeps rows small, leverages CDN, and matches how other clients will fetch images.
- **Upload order:** Upload first, insert second; on upload failure, block submit with a clear message so you never get ratings without promised photos or orphan-only storage objects where avoidable.
- **Deduped feeds:** When merging rows (e.g. Explore by `place_id`), define tie-breakers (e.g. same score → keep row with `meal_photo_url`) so discovery surfaces richer cards without extra queries.
- **Governance apply:** When the user says “apply governance” without a fresh sticky intent, **Session Start** + **Iteration Close** still run for shippable work done in-thread; formal `rhea-creation-intent.md` promotion remains `go` + template to avoid silent intent drift.

---

### Session Insights — 2026-05-11 (GrubGauge layout shell)

- **Single outer shell:** Put `max-w-*` + horizontal gutter once on the route-group layout (or shared header/body wrapper) so every page’s `<main>` only controls *inner* max width — eliminates double `px-*` and aligns sticky nav with scrolling content.
- **Bottom nav on wide phones:** Fix the bar to the same `max-w-5xl px-margin-edge` column as the page body (with `env(safe-area-inset-bottom)` padding) so thumbs and content share one vertical rhythm.
- **Desktop header:** Constrain the header row to that same column; never full-bleed flex nav when body is a centered column — it reads “misaligned” on ultrawide displays.

---

### Session Insights — 2026-05-11 (GrubGauge History edit/delete)

- **Shared scoring module:** When edit flows mirror submit flows, extract `VENUE_CRITERIA` + `calcWeightedScore` to one module so reweighted scores never drift between create and update.
- **Form reset without effects:** Mount the editor with `key={rating.id}` (or pass a fresh `revision` key) so initial state is derived on mount; avoids syncing props→state in `useEffect` and keeps lint clean under React 19 rules.
- **Delete confirmation + representation:** Pair a human confirm dialog with a `delete().select("id")` (or count) check so “success with zero rows” does not look like a deleted rating in the UI.

---

### Session Insights — 2026-05-12 (GrubGauge width contract / “vertical text”)

- **`min-w-0` everywhere it matters:** On flex/grid children that must host `w-full` paragraphs, inputs, or textareas, set **`min-w-0`** (and keep **`mx-auto min-w-0 w-full`** on page `<main>`) so intrinsic minimum width never traps layout at effectively zero usable width — the “vertical stacking” symptom.
- **`items-center` + full-width siblings:** Prefer splitting centered hero stacks from **`w-full` cards** (`items-center`-free wrapper for the wide block), *and* add **`min-w-0`** on ancestors so **`w-full`** always resolves correctly.
- **Regression guard:** Match the **exact `<main>` pattern** across conditional returns **and** propagate **`min-w-0`** up the ancestor chain whenever a screen adds nested flex/grid.
- **Flex-row nuance:** **`min-w-0` without `flex-1` (or explicit `shrink-0`)** on a sibling in **`justify-between`** can let that item **shrink to zero width** → one-character wrapping; pair **`min-w-0 flex-1`** for text cells that should consume free space. Prefer **`createPortal(..., document.body)`** for modal chrome.
- **Modal shell vs inner scroll:** Put **`shrink-0`** (or a **`min-w-[…]`** floor) on the **outer sheet panel** when it is a **`flex` row-only child** (default shrink); keep **`min-w-0`** for **inner** overflow/scroll columns only. **`w-screen`** on fullscreen overlay roots avoids percentage-width ambiguity.

---

### Session Insights — 2026-05-13 (GrubGauge Vercel Root Directory reconciliation)

- **Facts:** **`./`** appears in dashboard/session guidance; **cloned `main`** has **no root `package.json`** — Next app paths are **`grubgauge/next.config.ts`** etc.
- **`./` vs `grubgauge`:** Resolves only with **successful Vercel build logs** / install path; naive monorepo default for this layout is **`grubgauge`**.
- **Lesson:** Logs and assistants contradicted → wasted triage until **truth** anchored on **filesystem + deployment output**, not rhetoric.

---

### Session Insights — 2026-05-10 23:00 UTC — GrubGauge vertical text (resolved)

- **Symptom = physics:** “Vertical text” on block copy is almost always **effective width → ~0** (flex/grid **`minmax(0,1fr)`**, misplaced **`min-w-0`**, **`items-center`** starving **`w-full` siblings). Not writing-mode, not deploy **Ready** alone.
- **Browser truth:** Reproduce in **named browser**; **Chrome** needed **`min-w-0` on the flex child that carries `truncate`** on History cards — generic site pass missed that row.
- **Modals:** **Backdrop + sheet** should not share a **flex row** with ambiguous shrink; **absolute** centering + **`shrink-0`** panel + **min-width floor** beats iterative CSS whack-a-mole.
- **Stop rule:** After **two** failed layout hypotheses, **open DevTools → computed width** on the stacking element; if `< ~12px**, stop and fix parents — do not add more `min-w-0` at random.

---

### Session Close — 2026-05-12 (explicit `stop`)

- **Bookkeeping flush:** Explicit **`stop`** with current intent already **`completed`** + **`Executed:`** set → append session-close reconciliation (assessment tail + intent **Next** note), not a new Iteration Close.
- **Stale snapshots:** Older **Session Close** rows may reference superseded “current intent”; reconcile by pointer to History + Current, not by rewriting archival blocks.

---

### Session Close — 2026-05-10 (explicit `stop`)

- Saying **`stop`** together with **“execute iteration close”** ties Session Close to Iteration Close in one instruction: flush assessment backlog, refresh stale cross-references in prior assessment steps, and restate intent file **Next:** with a session boundary — without requiring a new Creation Intent.
- When the active intent is already **`completed`** and **`Executed:`** is set, Session Close is bookkeeping (reconcile + stamp), not re-execution; avoid duplicating full Iteration Close blocks unless new work shipped since the last flush.

---

### Session Close — 2026-05-10 11:01 CT (explicit `stop` after prod verify)

- **Production verification is the canonical close marker for visual-collapse fixes.** `lint` + `tsc` clean is necessary but not sufficient — the close-out signal is the user confirming the fix on the deployed URL in the originally-failing browser. Future **Visual / layout triage** Session Closes should include a `**Verified on prod:**` line in the Error Fix entry it closes.
- **Nested-portal width contract (resolved + verified):** `DeleteRatingConfirm` extracted as inline-style `createPortal` — confirmed working on **https://grubgauge.vercel.app** from Chrome desktop on commit **`eb3d004`**. Pattern is now durable: single-layer modals use the Tailwind / `min-w-0` / `shrink-0` chain; nested portals use a hardcoded inline width floor + `display: block` + `whiteSpace: normal`.
- **Bookkeeping cadence:** Today's `stop` follows an Error & Debug already settled in the same turn (assessment + insight + commit + push). Session Close adds only a closure row + this insight block; no new Iteration Close, no `Executed:` re-stamp on the active intent.
