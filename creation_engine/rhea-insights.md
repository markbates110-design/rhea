# Rhea Insights & Process Upgrades

**Last Updated:** 2026-05-10 14:30 UTC

This file bookmarks key i² insights, process improvements, and patterns discovered across all creations. 
The Governance Agent must read this file at the start of every major session.

---

### Bookmarked Insights

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

**2026-05-09 — Songwriting**
- Starting with emotional core before hook produces stronger lyrics.
- Negative space phrasing ("You don’t have to fix me") creates more vulnerability than direct pleas.

**2026-05-13 — GrubGauge / Vercel `rhea` Root Directory**
- **Dashboard vs repo:** Vercel UI + session notes cited **Root `./`** (**Sonnet 4.6** aligned). **On `main` this repo has no `package.json` at `./`** — GrubGauge Next.js lives only under **`grubgauge/`**. **`./` is not inferable from filesystem alone**; **`grubgauge`** matches vanilla “app in subfolder” wiring. **Truth test:** latest **Deployment → Building** log (`npm ci`, `next build` working directory).
- **Stale agent copy** alternated **`grubgauge`** vs **`./`** — either can be valid per project; **trust logs + dashboard**, not chat. See **`grubgauge-build-assessment.md`** — **Vercel Root Directory canonical**.
- Deployments UI slugs: **`markbates110-designs-projects`** vs **`markbates110-design`** — org URL variance only.

**2026-05-12 — GrubGauge flex / “vertical text”**
- Site-wide **`min-w-0`** on shells, page `<main>`, and nested flex/grid columns that host **`w-full`** forms — pair with the existing **`<main> mx-auto w-full max-w-*` contract** so block text never resolves to one-character wrapping.

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

### Session Close — 2026-05-12 (explicit `stop`)

- **Bookkeeping flush:** Explicit **`stop`** with current intent already **`completed`** + **`Executed:`** set → append session-close reconciliation (assessment tail + intent **Next** note), not a new Iteration Close.
- **Stale snapshots:** Older **Session Close** rows may reference superseded “current intent”; reconcile by pointer to History + Current, not by rewriting archival blocks.

---

### Session Close — 2026-05-10 (explicit `stop`)

- Saying **`stop`** together with **“execute iteration close”** ties Session Close to Iteration Close in one instruction: flush assessment backlog, refresh stale cross-references in prior assessment steps, and restate intent file **Next:** with a session boundary — without requiring a new Creation Intent.
- When the active intent is already **`completed`** and **`Executed:`** is set, Session Close is bookkeeping (reconcile + stamp), not re-execution; avoid duplicating full Iteration Close blocks unless new work shipped since the last flush.
