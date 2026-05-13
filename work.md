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

### grubgauge — profile photo upload — 2026-05-12
worked: one storage migration + one reusable AvatarUploader landed cleanly across onboarding, profile, and header; build + tsc + lint on new files all green
didn't: spent a lint cycle on a `useEffect(() => setState(prop))` prop-mirror pattern that R19's new `react-hooks/set-state-in-effect` rule rejects — should have written the override-in-render shape on the first pass
lesson: for "seeded by prop, locally settable" UI state, derive in render via `override: T | null` + `display = override ?? prop`; never `useEffect(() => setState(prop), [prop])`
status: shipped (pending Supabase migration run + git push)
