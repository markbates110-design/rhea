# protocols.md

How the agent works. Read at session start. Updated only by user-approved changes.

---

## operating rules

1. **Stay in scope.** If the task drifts, surface the drift; don't silently expand it.
2. **State intent before non-trivial action.** Say what you'll do and why. Ask if uncertain.
3. **Write a retrospective after every completed task.** Format below. No exceptions.
4. **Propose, don't self-amend.** If the same problem recurs, append a change proposal at the bottom of this file. Wait for approval before applying.
5. **Keep responses tight.** Token cost is the only objective resource metric. Don't pad. Don't ceremonially restate what the user already knows.
6. **Project-specific checks belong in the project's README, not here.** Build commands, framework conventions, schema details — those live with the code.

---

## ui layout (grubgauge)

Centered body copy (hero pitch, profile header, empty-state paragraphs):

1. **Do not** stack block paragraphs in `flex-col items-center` — the column sizes to min-content and text wraps one word per line.
2. **Do** use one of: plain **block layout** (`mx-auto w-full max-w-md`, children are block elements); **`<CenteredProse>`** (`items-stretch` + `text-center`, `CenteredProse.Item` only for avatars/icons); or **`items-stretch text-center`** on the flex column (never `items-center` when paragraphs are direct/indirect children).
3. **Page routes** render through **`<PageShell>`** — all variants include `min-w-[280px] self-stretch`.
4. **Badge/chip rows** inside centered headers: full-width container + `flex flex-wrap justify-center` — not a shrink-wrapped `items-center` parent.
5. **Before closing** any UI task with centered multi-line copy, confirm in browser that paragraphs wrap at normal line length (not one word per column). If the symptom persists after utility patches, replace the layout primitive — do not add another layer of `w-full`.

Artifacts: `grubgauge/src/components/layout/PageShell.tsx`, `CenteredProse.tsx`, `CriticProfileHeader.tsx`; `globals.css` safety net for `.flex.flex-col.items-center` children.

---

## what to read at session start

- `work.md` — always, to see the current task.
- `protocols.md` — only if rules aren't already in context.
- `lessons.md` — on demand, when about to do something a past lesson might cover. Not auto-read.

---

## retrospective format

When moving a task to `## done` in `work.md`, append:

```
### [task name] — [YYYY-MM-DD]
worked: [what came out well, one line]
didn't: [what didn't, one line]
lesson: [worth remembering — omit if there isn't one]
status: [shipped / partial / failed / abandoned]
```

If `lesson` is filled, also add it to the relevant section of `lessons.md`.

---

## process change format

When proposing a change to these rules, append below as:

```
### proposed: [YYYY-MM-DD]
problem: [concrete recurrence — what happened, when, how many times]
change: [one paragraph, specific]
```

User either approves (then fold the change into the rules above and delete the proposal) or rejects (then delete the proposal). Don't accumulate stale proposals.

---

## pending changes

*(none)*
