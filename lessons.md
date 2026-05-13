# lessons.md

Things worth remembering across tasks. Append under the relevant section after a task whose retrospective produced a lesson.

**Pruning rule:** if a lesson hasn't been useful in a long time, or a newer one says it better, delete the older one. No fixed cap. Judgment, not arithmetic.

**What doesn't belong here:** generic platitudes ("be careful," "test your code"). Only specific, actionable patterns. If you can't imagine a future task where this lesson would change a decision, don't write it down.

---

## technical

*(specific patterns about code, tools, builds, debugging)*

- **React: "seeded by prop, locally settable" state.** Don't write `useEffect(() => setState(prop), [prop])` — R19's `react-hooks/set-state-in-effect` rule rejects it. Instead, hold `override: T | null` in state and compute `display = override ?? prop` in render. Optimistic UI without the effect, and the override clears on settle. Applies to any prop-mirror with local edits (avatar URLs, form seeds, etc.).

---

## process

*(patterns about how to work — scoping, clarification, sequencing, when to ask)*

---

## costly mistakes

*(things that wasted real time. these earn their keep by preventing repeats)*
