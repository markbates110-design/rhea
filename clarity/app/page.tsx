'use client';

import { useState, useEffect, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

type Weight = 1 | 2 | 3;
type EmotionalWeight = 1 | 2 | 3;
type ScenarioType = 'best' | 'worst' | 'likely' | 'wildcard';
type LifeArea = 'Health' | 'Relationships' | 'Growth' | 'Career' | 'Finance' | 'Home' | 'Creative' | 'Other';
type Tab = 'options' | 'scenarios' | 'deeper';

interface WeightedItem {
  id: string;
  text: string;
  weight: Weight;
}

interface Option {
  id: string;
  label: string;
  pros: WeightedItem[];
  cons: WeightedItem[];
}

interface Scenario {
  type: ScenarioType;
  notes: string;
}

interface Decision {
  id: string;
  title: string;
  question: string;
  context: string;
  stakeholders: string;
  emotionalWeight: EmotionalWeight;
  deadline: string;
  lifeArea: LifeArea;
  options: Option[];
  scenarios: Scenario[];
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'clarity-decisions';
const WEIGHT_LABELS: Record<Weight, string> = { 1: 'Low', 2: 'Mid', 3: 'High' };
const LIFE_AREAS: LifeArea[] = ['Health', 'Relationships', 'Growth', 'Career', 'Finance', 'Home', 'Creative', 'Other'];

const LIFE_AREA_EMOJI: Record<LifeArea, string> = {
  Health: '🌿', Relationships: '🤝', Growth: '📈', Career: '💼',
  Finance: '💰', Home: '🏠', Creative: '🎨', Other: '✦',
};

const EMOTIONAL_WEIGHT_LABELS: Record<EmotionalWeight, string> = {
  1: 'Low stakes', 2: 'Medium stakes', 3: 'High stakes',
};

const SCENARIO_META: Record<ScenarioType, { label: string; icon: string; prompt: string }> = {
  best:     { label: 'Best Case',    icon: '🌟', prompt: 'Everything goes right. What does that world look like?' },
  worst:    { label: 'Worst Case',   icon: '⚡', prompt: 'The worst happens. What do you need to be prepared for?' },
  likely:   { label: 'Most Likely',  icon: '⚖', prompt: 'Realistically, what will probably happen?' },
  wildcard: { label: 'Wildcard',     icon: '🌀', prompt: 'An unexpected development changes everything. What might it be?' },
};

const SECOND_ORDER_PROMPTS = [
  'If this works, what does it enable or unlock next?',
  'What will this decision make harder six months from now?',
  'Who else is affected, and how will they respond?',
  'What new problems or responsibilities does this create?',
  'What would you need to stop doing to make this work?',
];

const THIRD_ORDER_PROMPTS = [
  'What do those second-order effects then trigger or prevent?',
  'What kind of person does this decision move you toward becoming?',
  'In five years, will this feel like an important decision?',
  'What would a calm, wise version of yourself choose?',
  'What are you avoiding thinking about with this decision?',
];

// ── Storage & Helpers ──────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function defaultScenarios(): Scenario[] {
  return [
    { type: 'best', notes: '' },
    { type: 'worst', notes: '' },
    { type: 'likely', notes: '' },
    { type: 'wildcard', notes: '' },
  ];
}

function migrateDecision(raw: Partial<Decision>): Decision {
  return {
    id: raw.id ?? uid(),
    title: raw.title ?? '',
    question: raw.question ?? '',
    context: raw.context ?? '',
    stakeholders: raw.stakeholders ?? '',
    emotionalWeight: raw.emotionalWeight ?? 2,
    deadline: raw.deadline ?? '',
    lifeArea: raw.lifeArea ?? 'Other',
    options: raw.options ?? [],
    scenarios: raw.scenarios?.length === 4 ? raw.scenarios : defaultScenarios(),
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

function loadDecisions(): Decision[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return (raw as Partial<Decision>[]).map(migrateDecision);
  } catch {
    return [];
  }
}

function saveDecisions(decisions: Decision[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

function calcScore(option: Option): number {
  return option.pros.reduce((s, p) => s + p.weight, 0) - option.cons.reduce((s, c) => s + c.weight, 0);
}

function formatDeadline(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff <= 14) return `Due in ${diff}d`;
  return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

// ── Icons ──────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path d="M1.5 3h10M4.5 3V2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M5.5 6v3.5M7.5 6v3.5M2.5 3l.6 7.2a.8.8 0 0 0 .8.8h5.2a.8.8 0 0 0 .8-.8L10.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Weight Picker ──────────────────────────────────────────────────────────

function WeightPicker({ value, onChange }: { value: Weight; onChange: (w: Weight) => void }) {
  return (
    <div className="flex gap-0.5">
      {([1, 2, 3] as Weight[]).map((w) => (
        <button
          key={w}
          onClick={() => onChange(w)}
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
            value === w ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
          }`}
        >
          {WEIGHT_LABELS[w]}
        </button>
      ))}
    </div>
  );
}

// ── Add Item Row ───────────────────────────────────────────────────────────

function AddItemRow({ type, onAdd }: { type: 'pro' | 'con'; onAdd: (text: string, weight: Weight) => void }) {
  const [text, setText] = useState('');
  const [weight, setWeight] = useState<Weight>(2);
  const ref = useRef<HTMLInputElement>(null);
  const isPro = type === 'pro';

  function submit() {
    if (!text.trim()) return;
    onAdd(text.trim(), weight);
    setText('');
    setWeight(2);
    ref.current?.focus();
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className={`text-xs font-bold w-3 shrink-0 ${isPro ? 'text-emerald-500' : 'text-red-400'}`}>
        {isPro ? '+' : '−'}
      </span>
      <input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={isPro ? 'Add a pro…' : 'Add a con…'}
        className="flex-1 text-sm bg-transparent outline-none placeholder-stone-300 text-stone-700 min-w-0"
      />
      <WeightPicker value={weight} onChange={setWeight} />
      <button
        onClick={submit}
        disabled={!text.trim()}
        className="text-stone-300 hover:text-stone-600 disabled:opacity-0 transition-colors ml-1 shrink-0"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

// ── Score Bar ──────────────────────────────────────────────────────────────

function ScoreBar({ score, max }: { score: number; max: number }) {
  const clampedMax = Math.max(max, 1);
  const pct = Math.round(((score + clampedMax) / (2 * clampedMax)) * 100);
  const clamped = Math.max(2, Math.min(98, pct));
  const positive = score > 0;
  const neutral = score === 0;

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            neutral ? 'bg-stone-200' : positive ? 'bg-emerald-400' : 'bg-red-400'
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums w-7 text-right ${
        neutral ? 'text-stone-300' : positive ? 'text-emerald-600' : 'text-red-500'
      }`}>
        {score > 0 ? `+${score}` : score}
      </span>
    </div>
  );
}

// ── Option Card ────────────────────────────────────────────────────────────

function OptionCard({
  option, score, maxScore, isLeading, onChange, onDelete,
}: {
  option: Option; score: number; maxScore: number; isLeading: boolean;
  onChange: (o: Option) => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasItems = option.pros.length + option.cons.length > 0;

  function addPro(text: string, weight: Weight) {
    onChange({ ...option, pros: [...option.pros, { id: uid(), text, weight }] });
  }
  function addCon(text: string, weight: Weight) {
    onChange({ ...option, cons: [...option.cons, { id: uid(), text, weight }] });
  }
  function removePro(id: string) {
    onChange({ ...option, pros: option.pros.filter((p) => p.id !== id) });
  }
  function removeCon(id: string) {
    onChange({ ...option, cons: option.cons.filter((c) => c.id !== id) });
  }

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      isLeading && hasItems ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200 bg-white'
    }`}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left px-4 pt-4 pb-3 focus:outline-none">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-stone-800 text-sm leading-snug">{option.label}</span>
          <div className="flex items-center gap-2 shrink-0">
            {isLeading && hasItems && (
              <span className="text-[10px] font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                Leading
              </span>
            )}
            <span className="text-stone-300 text-xs select-none">{expanded ? '↑' : '↓'}</span>
          </div>
        </div>
        <ScoreBar score={score} max={maxScore} />
        {!expanded && (
          <p className="text-[11px] text-stone-400 mt-1.5">
            {option.pros.length} pro{option.pros.length !== 1 ? 's' : ''} · {option.cons.length} con{option.cons.length !== 1 ? 's' : ''}
          </p>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-stone-100 pt-3 space-y-4 animate-fade-in">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">Pros</p>
            <div className="divide-y divide-stone-50">
              {option.pros.map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 group">
                  <span className="text-xs font-bold text-emerald-500 w-3 shrink-0">+</span>
                  <span className="flex-1 text-sm text-stone-700 min-w-0">{p.text}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                    p.weight === 3 ? 'bg-emerald-100 text-emerald-700' :
                    p.weight === 2 ? 'bg-stone-100 text-stone-500' : 'bg-stone-50 text-stone-400'
                  }`}>{WEIGHT_LABELS[p.weight]}</span>
                  <button onClick={() => removePro(p.id)} className="text-stone-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
            <AddItemRow type="pro" onAdd={addPro} />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">Cons</p>
            <div className="divide-y divide-stone-50">
              {option.cons.map((c) => (
                <div key={c.id} className="flex items-center gap-2 py-1.5 group">
                  <span className="text-xs font-bold text-red-400 w-3 shrink-0">−</span>
                  <span className="flex-1 text-sm text-stone-700 min-w-0">{c.text}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                    c.weight === 3 ? 'bg-red-100 text-red-600' :
                    c.weight === 2 ? 'bg-stone-100 text-stone-500' : 'bg-stone-50 text-stone-400'
                  }`}>{WEIGHT_LABELS[c.weight]}</span>
                  <button onClick={() => removeCon(c.id)} className="text-stone-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
            <AddItemRow type="con" onAdd={addCon} />
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={onDelete} className="flex items-center gap-1 text-xs text-stone-300 hover:text-red-400 transition-colors">
              <TrashIcon /> Remove option
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scenarios Tab ──────────────────────────────────────────────────────────

function ScenariosTab({ scenarios, onChange }: { scenarios: Scenario[]; onChange: (s: Scenario[]) => void }) {
  function updateNotes(type: ScenarioType, notes: string) {
    onChange(scenarios.map((s) => (s.type === type ? { ...s, notes } : s)));
  }

  const order: ScenarioType[] = ['best', 'worst', 'likely', 'wildcard'];

  return (
    <div className="space-y-3">
      {order.map((type) => {
        const scenario = scenarios.find((s) => s.type === type) ?? { type, notes: '' };
        const meta = SCENARIO_META[type];
        return (
          <div key={type} className="border border-stone-200 rounded-xl p-4 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base leading-none">{meta.icon}</span>
              <p className="text-sm font-medium text-stone-800">{meta.label}</p>
            </div>
            <p className="text-xs text-stone-400 italic mb-3">{meta.prompt}</p>
            <textarea
              value={scenario.notes}
              onChange={(e) => updateNotes(type, e.target.value)}
              placeholder="Write your thoughts here…"
              rows={3}
              className="w-full text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-2 resize-none outline-none focus:bg-white focus:ring-1 focus:ring-stone-200 transition-all placeholder-stone-300"
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Think Deeper Tab ───────────────────────────────────────────────────────

function ThinkDeeperTab() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1">Second-Order Effects</p>
        <p className="text-xs text-stone-400 mb-4">What happens as a result of what happens?</p>
        <div className="space-y-2">
          {SECOND_ORDER_PROMPTS.map((prompt, i) => (
            <div key={i} className="flex gap-3 items-start bg-white border border-stone-100 rounded-xl px-4 py-3">
              <span className="text-[10px] font-bold text-stone-300 mt-0.5 shrink-0 tabular-nums">{i + 1}</span>
              <p className="text-sm text-stone-600 leading-relaxed">{prompt}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1">Third-Order Effects</p>
        <p className="text-xs text-stone-400 mb-4">What happens as a result of those effects?</p>
        <div className="space-y-2">
          {THIRD_ORDER_PROMPTS.map((prompt, i) => (
            <div key={i} className="flex gap-3 items-start bg-white border border-stone-100 rounded-xl px-4 py-3">
              <span className="text-[10px] font-bold text-stone-300 mt-0.5 shrink-0 tabular-nums">{i + 1}</span>
              <p className="text-sm text-stone-600 leading-relaxed">{prompt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Decision View ──────────────────────────────────────────────────────────

function DecisionView({ decision, onUpdate, onBack }: {
  decision: Decision; onUpdate: (d: Decision) => void; onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('options');
  const [showDetails, setShowDetails] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function patch(fields: Partial<Decision>) {
    onUpdate({ ...decision, ...fields });
  }

  const scores = decision.options.map(calcScore);
  const maxScore = Math.max(...scores.map(Math.abs), 1);
  const bestScore = Math.max(...scores);
  const deadlineLabel = formatDeadline(decision.deadline);
  const stakeholderTags = decision.stakeholders.split(',').map((s) => s.trim()).filter(Boolean);

  function addOption() {
    if (!newLabel.trim()) return;
    patch({ options: [...decision.options, { id: uid(), label: newLabel.trim(), pros: [], cons: [] }] });
    setNewLabel('');
    inputRef.current?.focus();
  }

  function updateOption(index: number, option: Option) {
    const options = [...decision.options];
    options[index] = option;
    patch({ options });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'options', label: 'Options' },
    { id: 'scenarios', label: 'Scenarios' },
    { id: 'deeper', label: 'Think Deeper' },
  ];

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-10">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-700 transition-colors mb-6">
        <ChevronLeftIcon /> All decisions
      </button>

      {/* Header */}
      <div className="mb-6">
        <input
          value={decision.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="w-full text-2xl font-semibold text-stone-900 tracking-tight bg-transparent outline-none placeholder-stone-300 mb-1"
          placeholder="Decision title"
        />
        <input
          value={decision.question}
          onChange={(e) => patch({ question: e.target.value })}
          className="w-full text-sm text-stone-500 bg-transparent outline-none placeholder-stone-300"
          placeholder="Frame it as a question… (optional)"
        />

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
            {LIFE_AREA_EMOJI[decision.lifeArea]} {decision.lifeArea}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            decision.emotionalWeight === 3 ? 'bg-red-50 text-red-600' :
            decision.emotionalWeight === 2 ? 'bg-amber-50 text-amber-600' :
            'bg-stone-100 text-stone-500'
          }`}>
            {EMOTIONAL_WEIGHT_LABELS[decision.emotionalWeight]}
          </span>
          {deadlineLabel && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              deadlineLabel.includes('overdue') ? 'bg-red-50 text-red-600' :
              deadlineLabel.includes('today') ? 'bg-amber-50 text-amber-600' :
              'bg-stone-100 text-stone-500'
            }`}>
              {deadlineLabel}
            </span>
          )}
          {stakeholderTags.length > 0 && stakeholderTags.map((s) => (
            <span key={s} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>

        {/* Details toggle */}
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="mt-3 text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          {showDetails ? '↑ Hide details' : '↓ Edit details'}
        </button>

        {showDetails && (
          <div className="mt-3 space-y-3 border border-stone-200 rounded-xl p-4 bg-white animate-fade-in">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">Life Area</p>
              <div className="flex flex-wrap gap-1.5">
                {LIFE_AREAS.map((area) => (
                  <button
                    key={area}
                    onClick={() => patch({ lifeArea: area })}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      decision.lifeArea === area
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                  >
                    {LIFE_AREA_EMOJI[area]} {area}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">Emotional Stakes</p>
              <div className="flex gap-1.5">
                {([1, 2, 3] as EmotionalWeight[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => patch({ emotionalWeight: w })}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      decision.emotionalWeight === w
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                  >
                    {EMOTIONAL_WEIGHT_LABELS[w]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">Deadline</p>
              <input
                type="date"
                value={decision.deadline}
                onChange={(e) => patch({ deadline: e.target.value })}
                className="text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-stone-200 transition-all"
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">Stakeholders</p>
              <input
                value={decision.stakeholders}
                onChange={(e) => patch({ stakeholders: e.target.value })}
                placeholder="Comma-separated names…"
                className="w-full text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-stone-200 transition-all placeholder-stone-300"
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1.5">Background Context</p>
              <textarea
                value={decision.context}
                onChange={(e) => patch({ context: e.target.value })}
                placeholder="What led to this decision? What do you need to remember?"
                rows={4}
                className="w-full text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-2 resize-none outline-none focus:ring-1 focus:ring-stone-200 transition-all placeholder-stone-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-0 border-b border-stone-200 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-stone-800 text-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'options' && (
        <div className="animate-fade-in">
          <div className="space-y-3 mb-5">
            {decision.options.map((option, i) => (
              <OptionCard
                key={option.id}
                option={option}
                score={scores[i]}
                maxScore={maxScore}
                isLeading={scores[i] === bestScore}
                onChange={(o) => updateOption(i, o)}
                onDelete={() => patch({ options: decision.options.filter((_, idx) => idx !== i) })}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 border border-dashed border-stone-200 rounded-xl px-4 py-3 bg-stone-50 focus-within:border-stone-300 transition-colors">
            <span className="text-stone-300"><PlusIcon /></span>
            <input
              ref={inputRef}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addOption()}
              placeholder="Add an option…"
              className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder-stone-300"
            />
            {newLabel.trim() && (
              <button onClick={addOption} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                Add
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'scenarios' && (
        <div className="animate-fade-in">
          <ScenariosTab
            scenarios={decision.scenarios}
            onChange={(scenarios) => patch({ scenarios })}
          />
        </div>
      )}

      {activeTab === 'deeper' && (
        <div className="animate-fade-in">
          <ThinkDeeperTab />
        </div>
      )}
    </div>
  );
}

// ── Home View ──────────────────────────────────────────────────────────────

function HomeView({ decisions, onCreate, onSelect, onDelete }: {
  decisions: Decision[];
  onCreate: (title: string, question: string, lifeArea: LifeArea) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [lifeArea, setLifeArea] = useState<LifeArea>('Other');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showForm) titleRef.current?.focus();
  }, [showForm]);

  function submit() {
    if (!title.trim()) return;
    onCreate(title.trim(), question.trim(), lifeArea);
    setTitle('');
    setQuestion('');
    setLifeArea('Other');
    setShowForm(false);
  }

  function cancel() {
    setShowForm(false);
    setTitle('');
    setQuestion('');
    setLifeArea('Other');
  }

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-10">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Clarity</h1>
          <p className="text-stone-400 text-sm mt-1">Make better decisions.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-stone-800 hover:bg-stone-700 px-3.5 py-2 rounded-lg transition-colors"
          >
            <PlusIcon /> New
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 border border-stone-200 rounded-xl p-5 bg-white animate-fade-in">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-3">New decision</p>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="What are you deciding?"
            className="w-full text-base font-medium text-stone-900 bg-transparent outline-none placeholder-stone-300 mb-2"
          />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Frame it as a question… (optional)"
            className="w-full text-sm text-stone-500 bg-transparent outline-none placeholder-stone-300 mb-4"
          />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">Life Area</p>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {LIFE_AREAS.map((area) => (
              <button
                key={area}
                onClick={() => setLifeArea(area)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  lifeArea === area ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {LIFE_AREA_EMOJI[area]} {area}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={!title.trim()}
              className="flex-1 text-sm font-medium text-white bg-stone-800 hover:bg-stone-700 disabled:opacity-30 px-4 py-2 rounded-lg transition-colors"
            >
              Create
            </button>
            <button onClick={cancel} className="text-sm text-stone-400 hover:text-stone-700 px-4 py-2 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {decisions.length === 0 && !showForm && (
        <div className="text-center py-24 text-stone-300 select-none">
          <p className="text-5xl mb-4">⚖</p>
          <p className="text-sm">No decisions yet.</p>
          <p className="text-sm mt-1">Create one to start thinking clearly.</p>
        </div>
      )}

      <div className="space-y-2">
        {decisions.map((d) => {
          const scores = d.options.map(calcScore);
          const totalItems = d.options.reduce((s, o) => s + o.pros.length + o.cons.length, 0);
          const leadingIndex = scores.length ? scores.indexOf(Math.max(...scores)) : -1;
          const leadingOption = leadingIndex >= 0 ? d.options[leadingIndex] : undefined;
          const deadlineLabel = formatDeadline(d.deadline);

          return (
            <div
              key={d.id}
              onClick={() => onSelect(d.id)}
              className="group flex items-center gap-3 border border-stone-100 rounded-xl px-4 py-4 bg-white hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-stone-800 text-sm truncate">{d.title}</p>
                  <span className="text-[10px] text-stone-400 shrink-0">{LIFE_AREA_EMOJI[d.lifeArea]}</span>
                </div>
                <p className="text-xs text-stone-400 truncate">
                  {d.options.length} option{d.options.length !== 1 ? 's' : ''} · {totalItems} item{totalItems !== 1 ? 's' : ''}
                  {leadingOption && totalItems > 0 && (
                    <> · <span className="text-emerald-600">leaning: {leadingOption.label}</span></>
                  )}
                  {deadlineLabel && (
                    <> · <span className={deadlineLabel.includes('overdue') ? 'text-red-500' : 'text-stone-400'}>{deadlineLabel}</span></>
                  )}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(d.id); }}
                className="text-stone-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                aria-label="Delete decision"
              >
                <TrashIcon />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function ClarityApp() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDecisions(loadDecisions());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveDecisions(decisions);
  }, [decisions, mounted]);

  function createDecision(title: string, question: string, lifeArea: LifeArea) {
    const d: Decision = {
      id: uid(), title, question, context: '', stakeholders: '',
      emotionalWeight: 2, deadline: '', lifeArea,
      options: [], scenarios: defaultScenarios(),
      createdAt: new Date().toISOString(),
    };
    setDecisions((prev) => [d, ...prev]);
    setActiveId(d.id);
  }

  function updateDecision(updated: Decision) {
    setDecisions((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function deleteDecision(id: string) {
    setDecisions((prev) => prev.filter((d) => d.id !== id));
    if (activeId === id) setActiveId(null);
  }

  const activeDecision = decisions.find((d) => d.id === activeId) ?? null;
  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#F8F7F4]">
      {activeDecision ? (
        <DecisionView decision={activeDecision} onUpdate={updateDecision} onBack={() => setActiveId(null)} />
      ) : (
        <HomeView decisions={decisions} onCreate={createDecision} onSelect={setActiveId} onDelete={deleteDecision} />
      )}
    </main>
  );
}
