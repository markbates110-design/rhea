"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MoodKey =
  | "focused" | "creative" | "calm" | "energized"
  | "reflective" | "brave" | "gentle" | "grateful";

type Mood = { key: MoodKey; label: string };

type AnchorData = {
  date: string;
  intention: string;
  mood: MoodKey;
  completed: boolean;
  reflection?: string; // write-once, hard-capped at REFLECTION_MAX chars
};

type StreakData = { lastCompletedDate: string; count: number };

type HistoryEntry = {
  date: string;
  intention: string;
  mood: MoodKey;
  completed: boolean;
  reflection?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ANCHOR_KEY     = "daily-anchor";
const STREAK_KEY     = "daily-anchor-streak";
const HISTORY_KEY    = "daily-anchor-history";
const HISTORY_DAYS   = 14; // hard ceiling — never exceed
const REFLECTION_MAX = 120; // hard cap — write-once, no expansion

const MOODS: Mood[] = [
  { key: "focused",    label: "Focused"    },
  { key: "creative",   label: "Creative"   },
  { key: "calm",       label: "Calm"       },
  { key: "energized",  label: "Energized"  },
  { key: "reflective", label: "Reflective" },
  { key: "brave",      label: "Brave"      },
  { key: "gentle",     label: "Gentle"     },
  { key: "grateful",   label: "Grateful"   },
];

// Per-mood accent colors for the 14-day timeline dots
const MOOD_ACCENT: Record<MoodKey, string> = {
  focused:    "#4a8cf7",
  creative:   "#c86e08",
  calm:       "#2a7a54",
  energized:  "#e04a0a",
  reflective: "#3a5a78",
  brave:      "#b82040",
  gentle:     "#7830c0",
  grateful:   "#b87818",
};

// Used to sync browser chrome theme-color meta tag
const MOOD_BG: Record<MoodKey, string> = {
  focused:    "#0d1520",
  creative:   "#fdf5e8",
  calm:       "#edf8f2",
  energized:  "#fff4ea",
  reflective: "#f0f4f8",
  brave:      "#fff0f2",
  gentle:     "#f6f0ff",
  grateful:   "#fff8ec",
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateKey(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadAnchor(): AnchorData | null {
  try {
    const raw = localStorage.getItem(ANCHOR_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AnchorData;
    return data.date === dateKey() ? data : null;
  } catch { return null; }
}

function saveAnchor(data: AnchorData): void {
  localStorage.setItem(ANCHOR_KEY, JSON.stringify(data));
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw) as StreakData) : { lastCompletedDate: "", count: 0 };
  } catch { return { lastCompletedDate: "", count: 0 }; }
}

function updateStreak(): number {
  const today = dateKey(), yesterday = dateKey(1);
  const cur = loadStreak();
  if (cur.lastCompletedDate === today) return cur.count;
  const newCount = cur.lastCompletedDate === yesterday ? cur.count + 1 : 1;
  localStorage.setItem(STREAK_KEY, JSON.stringify({ lastCompletedDate: today, count: newCount }));
  return newCount;
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch { return []; }
}

function upsertHistory(entry: HistoryEntry): void {
  const history = loadHistory();
  const idx = history.findIndex((h) => h.date === entry.date);
  if (idx >= 0) history[idx] = entry; else history.push(entry);
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(history.sort((a, b) => a.date.localeCompare(b.date)).slice(-HISTORY_DAYS))
  );
}

function removeFromHistory(date: string): void {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(loadHistory().filter((h) => h.date !== date))
  );
}

// ─── Streak message ───────────────────────────────────────────────────────────

function streakMessage(streak: number): string {
  if (streak >= 30) return "A month. Rare.";
  if (streak >= 21) return "Three weeks of intention.";
  if (streak >= 14) return "Two weeks. This is compounding.";
  if (streak >= 7)  return "A full week of clarity.";
  if (streak >= 5)  return "The anchor is holding.";
  if (streak >= 3)  return "Momentum is forming.";
  if (streak >= 2)  return "Two in a row.";
  return "Well done today.";
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function AnchorIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="22" x2="12" y2="8" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </svg>
  );
}

function MoodBadge({ mood }: { mood: MoodKey }) {
  const label = MOODS.find((m) => m.key === mood)?.label ?? mood;
  return (
    <span
      className="m-pill m-pill-selected pointer-events-none"
      style={{ padding: "0.2rem 0.65rem", fontSize: "0.58rem", letterSpacing: "0.16em" }}
    >
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DailyAnchor() {
  const [anchor,       setAnchor]       = useState<AnchorData | null>(null);
  const [input,        setInput]        = useState("");
  const [loaded,       setLoaded]       = useState(false);
  const [streak,       setStreak]       = useState(0);
  const [history,      setHistory]      = useState<HistoryEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);
  const [step,         setStep]         = useState<"mood" | "intention">("mood");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The active mood — anchor's persisted mood or the in-progress selection
  const currentMood: MoodKey | null = anchor?.mood ?? selectedMood;

  useEffect(() => {
    const data = loadAnchor();
    setAnchor(data);
    setHistory(loadHistory());
    setLoaded(true);
    if (data?.mood) setSelectedMood(data.mood);
    const s = loadStreak();
    if ([dateKey(), dateKey(1)].includes(s.lastCompletedDate)) setStreak(s.count);
  }, []);

  // Sync browser chrome theme-color
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", currentMood ? MOOD_BG[currentMood] : "#fafaf8");
  }, [currentMood]);

  // Auto-focus textarea when entering the intention step
  useEffect(() => {
    if (step === "intention" && !anchor) {
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [step, anchor]);

  const handleMoodSelect = (mood: MoodKey) => {
    setSelectedMood(mood);
    setTimeout(() => setStep("intention"), 320); // brief pause to let background shift
  };

  const handleSet = () => {
    const trimmed = input.trim();
    if (!trimmed || !selectedMood) return;
    const data: AnchorData = { date: dateKey(), intention: trimmed, mood: selectedMood, completed: false };
    saveAnchor(data);
    upsertHistory({ ...data });
    setHistory(loadHistory());
    setAnchor(data);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSet(); }
  };

  const handleComplete = () => {
    if (!anchor) return;
    const updated: AnchorData = { ...anchor, completed: true };
    saveAnchor(updated);
    upsertHistory({ ...updated });
    setStreak(updateStreak());
    setHistory(loadHistory());
    setAnchor(updated);
  };

  // Write-once: only saves if no reflection exists yet
  const handleReflect = (text: string) => {
    if (!anchor || anchor.reflection) return;
    const updated: AnchorData = { ...anchor, reflection: text.slice(0, REFLECTION_MAX) };
    saveAnchor(updated);
    upsertHistory({ ...updated });
    setHistory(loadHistory());
    setAnchor(updated);
  };

  const handleReset = (wasCompleted: boolean) => {
    if (!wasCompleted) {
      removeFromHistory(dateKey());
      setStep("intention"); // keep mood, skip picker
    } else {
      setSelectedMood(null);
      setStep("mood");      // full fresh start
    }
    localStorage.removeItem(ANCHOR_KEY);
    setAnchor(null);
    setInput("");
    setHistory(loadHistory());
  };

  if (!loaded) return null;

  return (
    <main
      data-mood={currentMood ?? undefined}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative"
    >
      {/* Radial texture overlay — adds depth without interfering with transitions */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 28% 18%, rgba(255,255,255,0.16) 0%, transparent 62%)",
        }}
      />

      {/* Header */}
      <header className="absolute top-8 inset-x-0 flex flex-col items-center gap-1.5 z-10">
        <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <AnchorIcon />
          <span className="font-sans font-medium uppercase"
            style={{ fontSize: "0.58rem", letterSpacing: "0.24em", color: "var(--text-muted)" }}>
            Daily Anchor
          </span>
        </div>
        <p className="font-sans" style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
          {formatDisplayDate()}
        </p>
        {streak >= 2 && (
          <p className="font-sans" style={{ fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.06em" }}>
            {streak}-day streak
          </p>
        )}
      </header>

      {/* Core content */}
      <div className="w-full max-w-md flex flex-col items-center relative z-10">
        {!anchor ? (
          step === "mood" ? (
            <MoodPicker selectedMood={selectedMood} onSelect={handleMoodSelect} />
          ) : (
            <IntentionInput
              mood={selectedMood!}
              input={input}
              onChange={setInput}
              onSet={handleSet}
              onKeyDown={handleKeyDown}
              onBack={() => { setSelectedMood(null); setStep("mood"); }}
              textareaRef={textareaRef}
            />
          )
        ) : anchor.completed ? (
          <CompletedState anchor={anchor} streak={streak} onReset={() => handleReset(true)} onReflect={handleReflect} />
        ) : (
          <ActiveState anchor={anchor} onComplete={handleComplete} onReset={() => handleReset(false)} />
        )}
      </div>

      {/* History — last 7 days */}
      <HistoryDots history={history} />
    </main>
  );
}

// ─── Mood Picker ──────────────────────────────────────────────────────────────

function MoodPicker({
  selectedMood,
  onSelect,
}: {
  selectedMood: MoodKey | null;
  onSelect: (mood: MoodKey) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8 w-full"
      style={{ animation: "var(--animate-fade-up)" }}>
      <p className="font-sans uppercase text-center"
        style={{ fontSize: "0.62rem", letterSpacing: "0.18em", color: "var(--text-muted)" }}>
        How are you showing up today?
      </p>
      <div className="grid grid-cols-4 gap-2 w-full">
        {MOODS.map((mood) => (
          <button
            key={mood.key}
            onClick={() => onSelect(mood.key)}
            className={`m-pill ${selectedMood === mood.key ? "m-pill-selected" : ""}`}
          >
            {mood.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Intention Input ──────────────────────────────────────────────────────────

function IntentionInput({
  mood, input, onChange, onSet, onKeyDown, onBack, textareaRef,
}: {
  mood: MoodKey;
  input: string;
  onChange: (v: string) => void;
  onSet: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBack: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="flex flex-col items-center gap-8 w-full"
      style={{ animation: "var(--animate-fade-up)" }}>
      <MoodBadge mood={mood} />

      <p className="font-sans uppercase text-center"
        style={{ fontSize: "0.62rem", letterSpacing: "0.18em", color: "var(--text-muted)" }}>
        What matters most today?
      </p>

      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Write your one intention…"
        rows={3}
        className="w-full bg-transparent text-2xl font-serif italic text-center resize-none outline-none leading-relaxed"
        style={{ color: "var(--text-primary)" }}
      />

      <button onClick={onSet} disabled={!input.trim()} className="m-set-btn">
        Set anchor
      </button>

      <div className="flex flex-col items-center gap-2">
        <p className="font-sans" style={{ fontSize: "0.6rem", color: "var(--text-faint)" }}>
          Press Enter to confirm
        </p>
        <button onClick={onBack} className="m-ghost-btn">← Change mood</button>
      </div>
    </div>
  );
}

// ─── Active State ─────────────────────────────────────────────────────────────

function ActiveState({
  anchor, onComplete, onReset,
}: {
  anchor: AnchorData;
  onComplete: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-10"
      style={{ animation: "var(--animate-fade-up)" }}>
      <MoodBadge mood={anchor.mood} />

      <p className="font-sans uppercase text-center"
        style={{ fontSize: "0.58rem", letterSpacing: "0.22em", color: "var(--text-muted)" }}>
        Today&apos;s anchor
      </p>

      <p className="text-3xl font-serif italic text-center leading-snug max-w-sm"
        style={{ color: "var(--text-primary)" }}>
        {anchor.intention}
      </p>

      <button onClick={onComplete} className="m-complete-btn">
        <span className="m-circle">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round"
            className="m-mini-check" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span>Mark complete</span>
      </button>

      <button onClick={onReset} className="m-ghost-btn">Change intention</button>
    </div>
  );
}

// ─── Completed State ──────────────────────────────────────────────────────────

function CompletedState({
  anchor, streak, onReset, onReflect,
}: {
  anchor: AnchorData;
  streak: number;
  onReset: () => void;
  onReflect: (text: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8"
      style={{ animation: "var(--animate-fade-up)" }}>
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center"
        style={{ background: "var(--accent)", animation: "var(--animate-pop)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="var(--bg-color)"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <MoodBadge mood={anchor.mood} />

      <p className="text-2xl font-serif italic text-center leading-snug max-w-sm line-through"
        style={{ color: "var(--text-muted)", textDecorationColor: "var(--border-color)" }}>
        {anchor.intention}
      </p>

      <div className="flex flex-col items-center gap-1">
        <p className="font-sans font-medium text-sm" style={{ color: "var(--text-primary)" }}>
          Anchored.
        </p>
        <p className="font-sans text-xs" style={{ color: "var(--text-muted)" }}>
          {streakMessage(streak)}
        </p>
      </div>

      {/* Evening reflection — write-once, optional */}
      <ReflectionField reflection={anchor.reflection} onSave={onReflect} />

      <button onClick={onReset} className="m-ghost-btn">Start fresh</button>
    </div>
  );
}

// ─── Reflection Field ─────────────────────────────────────────────────────────

function ReflectionField({
  reflection,
  onSave,
}: {
  reflection: string | undefined;
  onSave: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  // Read-only — reflection already written
  if (reflection) {
    return (
      <p
        className="font-serif italic text-center text-sm max-w-xs leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        &ldquo;{reflection}&rdquo;
      </p>
    );
  }

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xs">
      <p className="font-sans uppercase" style={{ fontSize: "0.58rem", letterSpacing: "0.16em", color: "var(--text-faint)" }}>
        Evening reflection
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, REFLECTION_MAX))}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
        placeholder="A thought to close the day…"
        rows={2}
        className="w-full bg-transparent font-serif italic text-sm text-center resize-none outline-none leading-relaxed"
        style={{ color: "var(--text-primary)" }}
      />
      <div className="flex items-center gap-4">
        <span className="font-sans" style={{ fontSize: "0.55rem", color: "var(--text-faint)" }}>
          {draft.length}/{REFLECTION_MAX}
        </span>
        {draft.trim() && (
          <button onClick={handleSave} className="m-ghost-btn">Save</button>
        )}
      </div>
    </div>
  );
}

// ─── History Dots ─────────────────────────────────────────────────────────────

function HistoryDots({ history }: { history: HistoryEntry[] }) {
  const days = Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const daysAgo = HISTORY_DAYS - 1 - i;
    const date  = dateKey(daysAgo);
    const entry = history.find((h) => h.date === date);
    return { date, entry, isToday: daysAgo === 0 };
  });

  return (
    <div className="absolute bottom-8 inset-x-0 flex justify-center z-10">
      <div className="flex items-center gap-2.5">
        {days.map(({ date, entry, isToday }) => {
          // Use each day's own mood accent — creates a multicolor emotional arc
          const dotColor = entry?.mood ? MOOD_ACCENT[entry.mood] : undefined;

          return (
            <div key={date} className="relative group">
              <div style={{
                width:        isToday ? "10px" : "8px",
                height:       isToday ? "10px" : "8px",
                borderRadius: "50%",
                flexShrink:   0,
                transition:   "transform 0.2s ease",
                background:   entry?.completed
                  ? (dotColor ?? "var(--accent)")
                  : "transparent",
                border:       entry?.completed ? "none"
                  : entry
                    ? `1px solid ${dotColor ?? "var(--text-muted)"}`
                    : isToday
                      ? "1px solid var(--text-faint)"
                      : "1px solid var(--border-color)",
              }} />

              {/* Rich tooltip — shows on hover */}
              {entry && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-20"
                  style={{ minWidth: "140px", maxWidth: "220px" }}>
                  <div className="rounded overflow-hidden"
                    style={{ background: dotColor ?? "var(--accent)" }}>
                    {/* Mood label */}
                    <div className="font-sans px-3 pt-2 pb-0.5"
                      style={{ fontSize: "0.5rem", letterSpacing: "0.16em", color: "rgba(255,255,255,0.65)", textTransform: "uppercase" }}>
                      {entry.mood}
                    </div>
                    {/* Intention */}
                    <div className="font-sans px-3 pb-2 truncate"
                      style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.95)", letterSpacing: "0.01em" }}>
                      {entry.intention}
                    </div>
                    {/* Reflection — if written */}
                    {entry.reflection && (
                      <div className="font-serif italic px-3 pb-2 leading-snug"
                        style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.75)", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "0.4rem" }}>
                        &ldquo;{entry.reflection}&rdquo;
                      </div>
                    )}
                  </div>
                  <div className="w-1.5 h-1.5 rotate-45 mx-auto -mt-[3px]"
                    style={{ background: dotColor ?? "var(--accent)" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
