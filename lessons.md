# lessons.md

Things worth remembering across tasks. Append under the relevant section after a task whose retrospective produced a lesson.

**Pruning rule:** if a lesson hasn't been useful in a long time, or a newer one says it better, delete the older one. No fixed cap. Judgment, not arithmetic.

**What doesn't belong here:** generic platitudes ("be careful," "test your code"). Only specific, actionable patterns. If you can't imagine a future task where this lesson would change a decision, don't write it down.

---

## technical

*(specific patterns about code, tools, builds, debugging)*

- **React: "seeded by prop, locally settable" state.** Don't write `useEffect(() => setState(prop), [prop])` — R19's `react-hooks/set-state-in-effect` rule rejects it. Instead, hold `override: T | null` in state and compute `display = override ?? prop` in render. Optimistic UI without the effect, and the override clears on settle. Applies to any prop-mirror with local edits (avatar URLs, form seeds, etc.).
- **Postgres RLS clause by command.** `SELECT` and `DELETE` policies use `USING`; `INSERT` uses `WITH CHECK`; `UPDATE` uses both (`USING` for which rows are visible to update, `WITH CHECK` for what the row may become). When a spec says "delete with check ..." treat it as intent shorthand and translate to `USING`.
- **Auth-gated mutations: return a result, don't throw.** For functions like `toggleLike` where the unauthenticated path is a *routine UI branch* (show sign-in prompt) rather than an exception, return `{ ok: true, ... } | { ok: false, code: "unauthenticated" | "failed", ... }`. The UI dispatches on `code` without a try/catch. Reserve throws for genuinely exceptional / programmer-error paths (e.g. helpers that hard-fail-closed like `uploadAvatar`).
- **Per-card auth state: ship the batched hydrator with the per-item action.** When a feed renders N cards each with auth-aware state (liked, count, owned-by-me, etc.), `Promise.all`-fetch the whole feed's state once in the parent and pass it down. The failure mode is invisible with a 3-row dev set — only at production scale do the N+1 round-trips bite. The batched helper is part of the feature, not a future optimization.
- **Cross-user readable profile fields belong in `public.profiles`, not `auth.users.raw_user_meta_data`.** The line is *"does another user's session need to read this?"*. `auth.users` is locked from `anon`/`authenticated` roles in Supabase, so anything a community feed or `/u/[username]` page must show requires a real table. Migrate with: create table → RLS (public read, own-row write) → `handle_new_user` trigger on `auth.users` for new signups → idempotent backfill (suffix-on-collision, NOTICE the suffixed rows) → strip the migrated keys from `user_metadata`. Keep small private fields (food_prefs, notification toggles) on `user_metadata` — that's still the right store for "only this user reads this".
- **Live profile sync without polling or Realtime: dispatch a window CustomEvent on write, listen for it in the hook.** The mutator (`upsertProfile`) fires `window.dispatchEvent(new CustomEvent("profile:updated"))` after a successful write; `useProfile` subscribes and refetches. Same-tab consistency without Supabase Realtime or a context provider; ~10 lines of code. Cross-tab needs a `BroadcastChannel`, but that's almost always out of scope for an MVP.
- **PostgREST embedded selects need a direct FK between the joined tables.** `from('a').select('..., b(...)')` only resolves if `a` has an FK to `b` (or vice versa). Chains through a third table (e.g. `ratings.user_id → auth.users(id) ← profiles.id`) don't resolve — PostgREST can't pick which path. Either add a parallel FK from the source to the target, or do two queries + a Map-keyed hydrator (`Promise.all` keeps the cost flat). In a codebase that already prefers flat selects + batched hydrators (likes, counts, raters), staying with two queries reads better than introducing a one-off embedded shape.
- **`notFound()` works in client components too — call it from render guarded behind a settled state.** In a client page that resolves data in `useEffect`, distinguish "still loading" from "fetched and missing" with two state flags (`loading: boolean` + `missing: boolean`). In render, branch `if (!loading && missing) notFound()`. The throw routes to the nearest `not-found.tsx` (or the framework's `/_not-found` default). Don't call `notFound()` from inside the effect — by spec it's intended to be called during render, and doing it from an effect can interact poorly with concurrent rendering.
- **Extract a shared component only for the call sites that need it today.** When you find a feed-item block duplicated across N pages, resist the urge to unify all N at once — chances are at least one site (History's edit affordance, Dashboard's "Top Rated" callout) has shape divergence that will force a prop explosion or a fork later. Extract for the 1-2 sites that match exactly, leave the others inline with a top-of-file comment pointing at the spec for future convergence. Premature unification locks in the wrong abstraction.
- **Next.js `useParams()` returns the *undecoded* URL segment in client components.** A `<Link href="/u/mark grout">` becomes `/u/mark%20grout` in the browser; `useParams<{username:string}>()` then hands you `"mark%20grout"`, not `"mark grout"`. Pass that into `.eq("username", ...)` and you'll spuriously 404 against a row that's actually there. Wrap every useParams read that drives a DB lookup with `decodeURIComponent` inside a try/catch (it throws on malformed sequences like a lone `%`). See vercel/next.js#64952 — the inconsistency between `page.tsx`/`useParams` (undecoded) and `route.ts` (decoded) is not on track to be unified. Bonus: constrain identifier columns to a URL-safe alphabet (`^[A-Za-z0-9_-]+$`) at the input layer when you can — it sidesteps this gotcha entirely.

---

## process

*(patterns about how to work — scoping, clarification, sequencing, when to ask)*

---

## costly mistakes

*(things that wasted real time. these earn their keep by preventing repeats)*
