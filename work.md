# work.md

Paste a task under `## sticky` and say `go`. The agent moves it to `## current`, does the work, then moves it to `## done` with a retrospective.

---

## sticky

*(paste new task here, then say go)*

---

## current

*(no active task)*

---

## done

*(completed tasks with retrospectives, most recent first)*

### grubgauge — fix /u/[username] 404 for usernames with URL-encoded characters — 2026-05-12
worked: one-line root cause once the symptom was identified — Next's useParams() returns the undecoded path segment in client components (vercel/next.js#64952), so "mark grout" arrived at the lookup as "mark%20grout" and the .eq("username", ...) missed; added a `decodeParam` helper around the useParams read with a try/catch fallback for malformed sequences; typecheck + build clean
didn't: didn't constrain username chars at the input layer (onboarding profile screen accepts any text) — defensive read-side decode covers all existing rows without a schema/UX change, but a future iteration should validate usernames against `^[A-Za-z0-9_]{3,30}$` so the encode-decode round-trip becomes a non-issue
lesson: Next.js client-side useParams returns the *undecoded* URL segment — wrap with `decodeURIComponent` (try/catch for malformed) before using as a DB key
status: shipped (pending push)

### grubgauge — public profile route `/u/[username]` — 2026-05-12
worked: extracted the Explore inline card into `<RatingCard>` with `rank?` + `hideRater?` props (Explore behaves identically — same key-on-hydration trick, same indent, same render order); added `getProfileByUsername` to `lib/profile/profile.ts` (maybeSingle, returns null on miss); built the route as a client page mirroring Explore's fetch shape (useEffect + Promise.all for likes); used `notFound()` from render guarded behind `!loading` so the 404 only fires once after resolution; skipped `attachRaters` on this page (rater is always the page subject, badge is hidden, so the field is `null` — one round-trip saved); header total computed from `countMap` with an inline comment documenting the post-load drift trade-off (intentional, not bug)
didn't: didn't introduce a custom `not-found.tsx` — the framework's `/_not-found` is fine until there's something profile-specific to show there; didn't refactor History/Dashboard to use `<RatingCard>` (their card shapes diverge — History has an edit affordance, Dashboard has a "Top Rated" callout variant) — left a top-of-file note on Explore so a future convergence pass has the spec
lesson: when extracting a list-item component from one of N near-duplicate inline blocks, ship only the call site you need today plus an in-file note pointing future convergence at the divergent shapes — premature unification across all N sites locks in the wrong abstraction when one of them later needs different chrome
status: shipped (typecheck + build clean; lint shows only the same two pre-existing setLoading-in-effect errors in pages I didn't touch)

### grubgauge — rater attribution on Explore rating card — 2026-05-12
worked: shipped two small reusable pieces — `getRatersByUserIds` / `attachRaters` in `lib/profile/raters.ts` (batched, dedup, Map-keyed) and `<RaterBadge>` that mirrors HomeHeader.ProfileAvatar chrome (h-8 w-8, label-sm fallback) so the header avatar and card-level attribution feel like a matched set; Explore fetches raters in the same Promise.all as likes (3 parallel round-trips total, still O(1) per card render); deleted-user / orphan-rating branches converge on the same `rater === null` rendering (fallback avatar + italic "Deleted user", no Link)
didn't: skipped a PostgREST embedded select because `ratings.user_id` FK targets `auth.users(id)` not `profiles(id)` — PostgREST chains an embed through a direct FK only, and the codebase already prefers flat selects + batched hydrators; added `user_id` to History + Dashboard selects for type consistency even though those surfaces don't render attribution (rater is always the current user there)
lesson: PostgREST embedded selects need a direct FK between the joined tables; chains through a shared third table (here, auth.users) don't resolve — either add a parallel FK or use a batched two-query hydrator (cheaper to maintain in a flat-select codebase)
status: shipped (typecheck + build clean; lint shows only the two pre-existing setLoading-in-effect errors in pages I didn't modify in this iteration)

### grubgauge — public.profiles cutover (migrate username/avatar_url out of user_metadata) — 2026-05-12
worked: single migration handles table + RLS + signup trigger + idempotent backfill (with NOTICE-logged collision suffixes) + targeted strip of the three migrated keys; app side gets a useProfile() hook + upsertProfile() helper with a `profile:updated` window event so the header avatar stays live across writes without a navigation; tsc + build green, lint unchanged from prior baseline
didn't: the lint rule for set-state-in-effect fires unpredictably (line 36 was unflagged in one run then flagged after removing a sibling disable directive) — wasted one cycle figuring out the dependency between disables on different blocks
lesson: ESLint disable directives can suppress reports that share inferred control flow, so removing one disable can surface another — make changes in isolation and re-run rather than removing in bulk
status: shipped (pending paste of migration into Supabase SQL Editor; check NOTICE output for collision list and verification counts)

### grubgauge — like button on rating card (Explore feed) — 2026-05-12
worked: extracted reusable <LikeButton> on Explore (the community feed); batched both liked-set and counts via a new getRatingsLikeCounts companion in likes.ts (parallel to getUserLikedRatings) so each card is hydrated in 2 round-trips total instead of 2N; tsc + build clean
didn't: no extracted rating-card component existed (three feeds render the card JSX inline) — chose Explore because liking your own History rating is bad UX; documented the duplication in a top-of-file comment so a future extraction has the spec
lesson: when a feed needs per-card auth-aware state, ship the batched hydrator alongside the per-item action — N+1 round-trips is the failure mode you can't see in dev with a 3-row test set
status: shipped

### grubgauge — likes server-side functions — 2026-05-12
worked: pre-flight checked for server actions + API routes (neither used) and matched the existing browser-client helper shape from avatar.ts / scope.ts; result-type return for toggleLike keeps the unauth path out of try/catch
didn't: nothing of note — single new file, no edits to existing code, tsc + lint green on first pass
lesson: in browser-client-mutation codebases, use a discriminated-union result type (not thrown errors) for any auth-gated mutation the UI must route around
status: shipped

### grubgauge — rating_likes migration — 2026-05-12
worked: pre-flight confirmed the ratings PK before writing the FK, file matched existing migration shape (timestamp slot, idempotent guards, drop-then-create policy pattern)
didn't: spec said "delete with check user_id = auth.uid()" — Postgres RLS uses USING for DELETE, not WITH CHECK; flagged the translation in the SQL comment
lesson: Postgres RLS clause by command — SELECT/DELETE use USING; INSERT uses WITH CHECK; UPDATE uses both
status: shipped (pending paste into Supabase SQL Editor)

### grubgauge — profile photo upload — 2026-05-12
worked: one storage migration + one reusable AvatarUploader landed cleanly across onboarding, profile, and header; build + tsc + lint on new files all green
didn't: spent a lint cycle on a `useEffect(() => setState(prop))` prop-mirror pattern that R19's new `react-hooks/set-state-in-effect` rule rejects — should have written the override-in-render shape on the first pass
lesson: for "seeded by prop, locally settable" UI state, derive in render via `override: T | null` + `display = override ?? prop`; never `useEffect(() => setState(prop), [prop])`
status: shipped (pending Supabase migration run + git push)
