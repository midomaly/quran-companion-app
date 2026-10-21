import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { loadPrayerSettings, playReminderSound } from "@/lib/prayerSettings";
import { Plus, RotateCcw, Target, Trash2, Undo2, Volume2, Vibrate } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Dhikr {
  id: string;
  arabic: string;
  translit: string;
  meaning: string;
  /** true when the user added it on this device */
  custom?: boolean;
}

const BUILTIN_DHIKRS: Dhikr[] = [
  { id: "subhan", arabic: "سُبْحَانَ ٱللَّٰه", translit: "Subḥānallāh", meaning: "Glory be to Allah" },
  { id: "hamd", arabic: "ٱلْحَمْدُ لِلَّٰه", translit: "Al-ḥamdu lillāh", meaning: "All praise is for Allah" },
  { id: "akbar", arabic: "ٱللَّٰهُ أَكْبَر", translit: "Allāhu akbar", meaning: "Allah is the Greatest" },
  { id: "tawhid", arabic: "لَا إِلٰهَ إِلَّا ٱللَّٰه", translit: "Lā ilāha illā Allāh", meaning: "There is no god but Allah" },
  { id: "istighfar", arabic: "أَسْتَغْفِرُ ٱللَّٰه", translit: "Astaghfirullāh", meaning: "I seek forgiveness from Allah" },
  { id: "salawat", arabic: "ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّد", translit: "Allāhumma ṣalli ʿalā Muḥammad", meaning: "O Allah, send blessings upon Muhammad" },
];

const TARGETS = [33, 99, 100] as const;

const STORAGE_KEY = "noor:tasbih";
const MAX_SESSIONS = 120;
const MAX_CUSTOM = 24;

export interface TasbihSession {
  id: string;
  translit: string;
  arabic: string;
  count: number;
  target: number;
  /** ms epoch the session ended (reset / switch) */
  endedAt: number;
}

interface StoredState {
  dhikrId: string;
  count: number;
  target: number;
  total: number;
  vibrate: boolean;
  sound: boolean;
  customDhikrs: Dhikr[];
  sessions: TasbihSession[];
}

const DEFAULT_STATE: StoredState = {
  dhikrId: BUILTIN_DHIKRS[0].id,
  count: 0,
  target: 33,
  total: 0,
  vibrate: true,
  sound: true,
  customDhikrs: [],
  sessions: [],
};

function sanitizeDhikr(raw: unknown): Dhikr | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<Dhikr>;
  if (typeof d.id !== "string" || !d.id) return null;
  if (typeof d.translit !== "string" || !d.translit.trim()) return null;
  return {
    id: d.id,
    translit: d.translit.trim().slice(0, 80),
    arabic: typeof d.arabic === "string" ? d.arabic.trim().slice(0, 120) : "",
    meaning: typeof d.meaning === "string" ? d.meaning.trim().slice(0, 120) : "",
    custom: true,
  };
}

function sanitizeSession(raw: unknown): TasbihSession | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<TasbihSession>;
  if (typeof s.id !== "string" || typeof s.translit !== "string") return null;
  if (typeof s.count !== "number" || s.count <= 0) return null;
  return {
    id: s.id,
    translit: s.translit.slice(0, 80),
    arabic: typeof s.arabic === "string" ? s.arabic.slice(0, 120) : "",
    count: Math.round(s.count),
    target: typeof s.target === "number" && s.target > 0 ? Math.round(s.target) : 33,
    endedAt: typeof s.endedAt === "number" ? s.endedAt : Date.now(),
  };
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredState>;
      const customDhikrs = Array.isArray(parsed.customDhikrs)
        ? parsed.customDhikrs.map(sanitizeDhikr).filter((d): d is Dhikr => d !== null).slice(0, MAX_CUSTOM)
        : [];
      const all = [...BUILTIN_DHIKRS, ...customDhikrs];
      return {
        dhikrId: all.some((d) => d.id === parsed.dhikrId) ? (parsed.dhikrId as string) : DEFAULT_STATE.dhikrId,
        count: typeof parsed.count === "number" && parsed.count >= 0 ? Math.floor(parsed.count) : 0,
        target: typeof parsed.target === "number" && parsed.target >= 1 && parsed.target <= 9999
          ? Math.floor(parsed.target)
          : 33,
        total: typeof parsed.total === "number" && parsed.total >= 0 ? Math.floor(parsed.total) : 0,
        vibrate: parsed.vibrate !== false,
        sound: parsed.sound !== false,
        customDhikrs,
        sessions: Array.isArray(parsed.sessions)
          ? parsed.sessions.map(sanitizeSession).filter((s): s is TasbihSession => s !== null).slice(-MAX_SESSIONS)
          : [],
      };
    }
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_STATE;
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Tasbih (phase 2): tap-to-count dhikr with target rings, haptics, undo,
 * custom phrases and targets, session history and daily stats. Everything is
 * stored on this device and works fully offline.
 */
export default function Tasbih() {
  const [state, setState] = useState<StoredState>(loadState);
  const [now, setNow] = useState(() => new Date());
  const [pulse, setPulse] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [adding, setAdding] = useState(false);
  const [customTarget, setCustomTarget] = useState("");
  const [targetMode, setTargetMode] = useState<"preset" | "custom">("preset");
  const [newDhikr, setNewDhikr] = useState({ arabic: "", translit: "", meaning: "" });
  const completingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state]);

  const dhikr = useMemo(() => {
    return (
      [...BUILTIN_DHIKRS, ...state.customDhikrs].find((d) => d.id === state.dhikrId) ??
      BUILTIN_DHIKRS[0]
    );
  }, [state.dhikrId, state.customDhikrs]);

  const done = state.count >= state.target;
  const progress = Math.min(1, state.count / state.target);

  /** End the current count as a logged session (no-op at 0). */
  const logSession = useCallback((s: StoredState, dhikrToLog: Dhikr): TasbihSession[] => {
    if (s.count <= 0) return s.sessions;
    const session: TasbihSession = {
      id: `s${Date.now()}${Math.floor(Math.random() * 1e4)}`,
      translit: dhikrToLog.translit,
      arabic: dhikrToLog.arabic,
      count: s.count,
      target: s.target,
      endedAt: Date.now(),
    };
    return [...s.sessions, session].slice(-MAX_SESSIONS);
  }, []);

  const increment = useCallback(() => {
    setState((prev) => {
      if (prev.count >= prev.target) return prev;
      const currentDhikr =
        [...BUILTIN_DHIKRS, ...prev.customDhikrs].find((d) => d.id === prev.dhikrId) ??
        BUILTIN_DHIKRS[0];
      const count = prev.count + 1;
      const complete = count >= prev.target;
      // Haptics: light tap per count, celebratory pattern at the target.
      try {
        if (prev.vibrate) {
          if (complete) navigator.vibrate?.([40, 60, 40, 60, 120]);
          else navigator.vibrate?.(12);
        }
      } catch {
        /* vibration unsupported */
      }
      if (complete && prev.sound && !completingRef.current) {
        completingRef.current = true;
        // Completion chime follows the user's alarm tone when they picked one;
        // adhan/silent selections fall back to the serene bells tone.
        const chosen = loadPrayerSettings().reminders.sound;
        playReminderSound(chosen === "bells" || chosen === "melody" ? chosen : "bells");
        window.setTimeout(() => {
          completingRef.current = false;
        }, 800);
      }
      return {
        ...prev,
        count,
        total: prev.total + 1,
        // Hitting the target closes the round: log it and start the next one.
        sessions: complete ? logSession({ ...prev, count: prev.count }, currentDhikr) : prev.sessions,
      };
    });
    setPulse((p) => p + 1);
  }, [logSession]);

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.count <= 0) return prev;
      return { ...prev, count: prev.count - 1, total: Math.max(0, prev.total - 1) };
    });
  }, []);

  /** Reset the count, logging the session first. */
  const doReset = useCallback(() => {
    setState((prev) => ({ ...prev, count: 0, sessions: logSession(prev, dhikr) }));
    setConfirmReset(false);
  }, [dhikr, logSession]);

  const switchDhikr = (id: string) => {
    setState((prev) => ({
      ...prev,
      dhikrId: id,
      count: 0,
      sessions: logSession(prev, dhikr),
    }));
  };

  const setTarget = (t: number) => {
    setState((prev) => ({
      ...prev,
      target: t,
      count: 0,
      sessions: logSession(prev, dhikr),
    }));
  };

  const addCustomDhikr = () => {
    const translit = newDhikr.translit.trim();
    if (!translit) {
      return;
    }
    const d: Dhikr = {
      id: `custom-${Date.now()}`,
      translit,
      arabic: newDhikr.arabic.trim(),
      meaning: newDhikr.meaning.trim(),
      custom: true,
    };
    setState((prev) => ({
      ...prev,
      customDhikrs: [...prev.customDhikrs, d].slice(-MAX_CUSTOM),
      dhikrId: d.id,
      count: 0,
      sessions: logSession(prev, dhikr),
    }));
    setNewDhikr({ arabic: "", translit: "", meaning: "" });
    setAdding(false);
  };

  const removeCustomDhikr = (id: string) => {
    setState((prev) => ({
      ...prev,
      customDhikrs: prev.customDhikrs.filter((d) => d.id !== id),
      dhikrId: prev.dhikrId === id ? BUILTIN_DHIKRS[0].id : prev.dhikrId,
      count: prev.dhikrId === id ? 0 : prev.count,
    }));
  };

  // Space/Enter anywhere taps the counter (desktop convenience).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.code === "Space" || e.code === "Enter") {
        const el = document.getElementById("tasbih-tap");
        if (document.activeElement && document.activeElement !== document.body && document.activeElement !== el) return;
        e.preventDefault();
        increment();
      }
      if (e.code === "KeyZ" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [increment, undo]);

  // Clock for the day-based stats: kept in state so render stays pure
  // (Date.now() is not allowed during render) and ticked once a minute.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Daily statistics from session history + the live count.
  const stats = useMemo(() => {
    const nowMs = now.getTime();
    const today = dayKey(nowMs);
    const yesterday = dayKey(nowMs - 86400000);
    const perDay = new Map<string, number>();
    for (const s of state.sessions) {
      const k = dayKey(s.endedAt);
      perDay.set(k, (perDay.get(k) ?? 0) + s.count);
    }
    // Today's in-progress count isn't in the log yet — include it.
    const todayLogged = perDay.get(today) ?? 0;
    const todayTotal = todayLogged + state.count;
    const yesterdayTotal = perDay.get(yesterday) ?? 0;
    let best = 0;
    for (const v of perDay.values()) best = Math.max(best, v);
    // Last 7 days as bars (oldest → today).
    const week: { day: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const k = dayKey(nowMs - i * 86400000);
      week.push({ day: k, total: k === today ? todayTotal : (perDay.get(k) ?? 0) });
    }
    return { todayTotal, yesterdayTotal, best, week, sessions: state.sessions.length };
  }, [state.sessions, state.count, now]);

  const R = 118;
  const C = 2 * Math.PI * R;
  const allDhikrs = [...BUILTIN_DHIKRS, ...state.customDhikrs];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Dhikr
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Tasbih</h1>
        <p className="text-sm text-muted-foreground">
          Repeat your remembrance — counts persist on this device, offline.
        </p>
      </header>

      {/* Dhikr picker */}
      <div className="grid grid-cols-2 gap-2">
        {allDhikrs.map((d) => {
          const active = d.id === dhikr.id;
          return (
            <div key={d.id} className="relative">
              <button
                type="button"
                onClick={() => switchDhikr(d.id)}
                aria-pressed={active}
                className={
                  "flex w-full flex-col items-start gap-0.5 rounded-xl border px-3 py-2 pr-8 text-left transition-colors " +
                  (active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40")
                }
              >
                <span className="font-quran text-lg" dir="rtl">
                  {d.arabic || d.translit}
                </span>
                <span
                  className={
                    "text-[11px] " + (active ? "text-primary" : "text-muted-foreground")
                  }
                >
                  {d.translit}
                </span>
              </button>
              {d.custom && (
                <button
                  type="button"
                  onClick={() => removeCustomDhikr(d.id)}
                  aria-label={`Delete custom dhikr ${d.translit}`}
                  className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}
        {/* Add custom */}
        {adding ? (
          <div className="col-span-2 flex flex-col gap-2 rounded-xl border border-primary/50 bg-card p-3">
            <Input
              value={newDhikr.translit}
              onChange={(e) => setNewDhikr((s) => ({ ...s, translit: e.target.value }))}
              placeholder="Transliteration (e.g. Yā Allāh)"
              aria-label="Dhikr transliteration"
              maxLength={80}
            />
            <Input
              value={newDhikr.arabic}
              onChange={(e) => setNewDhikr((s) => ({ ...s, arabic: e.target.value }))}
              placeholder="Arabic (optional) — يَا ٱللَّٰه"
              aria-label="Dhikr Arabic text"
              dir="rtl"
              maxLength={120}
            />
            <Input
              value={newDhikr.meaning}
              onChange={(e) => setNewDhikr((s) => ({ ...s, meaning: e.target.value }))}
              placeholder="Meaning (optional)"
              aria-label="Dhikr meaning"
              maxLength={120}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button size="sm" className="cursor-pointer" onClick={addCustomDhikr}>
                Add dhikr
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="size-3.5" />
            Custom dhikr
          </button>
        )}
      </div>

      {/* Counter */}
      <Card className="border-border/70 shadow-none">
        <CardContent className="flex flex-col items-center gap-3 pt-6 pb-6">
          <p className="text-sm text-muted-foreground">{dhikr.meaning || dhikr.translit}</p>
          <button
            id="tasbih-tap"
            type="button"
            onClick={increment}
            aria-label={`Count ${dhikr.translit}`}
            className="relative flex size-64 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <svg viewBox="0 0 260 260" className="absolute inset-0 size-full -rotate-90">
              <circle
                cx="130"
                cy="130"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-border"
              />
              <circle
                cx="130"
                cy="130"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - progress)}
                className="text-primary transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <span
              key={pulse}
              className="flex flex-col items-center gap-1 animate-in fade-in zoom-in-95 duration-150"
            >
              <span className="text-6xl font-bold tabular-nums">{state.count}</span>
              <span className="text-sm text-muted-foreground">of {state.target}</span>
            </span>
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {TARGETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTargetMode("preset");
                  setTarget(t);
                }}
                aria-pressed={!targetMode || targetMode === "preset" ? state.target === t : false}
                className={
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors " +
                  (state.target === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground")
                }
              >
                <Target className="size-3.5" />
                {t}
              </button>
            ))}
            {targetMode === "custom" ? (
              <span className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  max={9999}
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  onBlur={() => {
                    const n = Number(customTarget);
                    if (Number.isInteger(n) && n >= 1 && n <= 9999) setTarget(n);
                    setTargetMode("preset");
                  }}
                  autoFocus
                  aria-label="Custom target count"
                  className="h-8 w-20 text-center tabular-nums"
                />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setTargetMode("custom")}
                aria-label="Set a custom target"
                className={
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors " +
                  (TARGETS.every((t) => t !== state.target)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground")
                }
              >
                <Target className="size-3.5" />
                Custom
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={undo}
              disabled={state.count === 0}
              aria-label="Undo last count"
            >
              <Undo2 className="size-3.5" />
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setConfirmReset(true)}
              disabled={state.count === 0}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>

          {done && (
            <p className="text-center text-sm font-semibold text-primary">
              {state.target} complete — jazāk Allāhu khayran. The next round has
              begun automatically.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Feedback toggles */}
      <Card className="border-border/70 shadow-none">
        <CardContent className="flex flex-col gap-3 pt-6">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <Vibrate className="size-4 text-primary" /> Vibration
            </span>
            <Switch
              checked={state.vibrate}
              onCheckedChange={(checked) => setState((prev) => ({ ...prev, vibrate: checked }))}
              aria-label="Vibrate on each count"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <Volume2 className="size-4 text-primary" /> Chime at target
            </span>
            <Switch
              checked={state.sound}
              onCheckedChange={(checked) => setState((prev) => ({ ...prev, sound: checked }))}
              aria-label="Play a chime when the target is reached"
            />
          </label>
        </CardContent>
      </Card>

      {/* History & stats */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">History & statistics</CardTitle>
          <CardDescription>
            Finished rounds are saved on this device so your wird follows you
            between visits.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="mt-0.5 font-semibold tabular-nums">{stats.todayTotal}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Yesterday</p>
              <p className="mt-0.5 font-semibold tabular-nums">{stats.yesterdayTotal}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Lifetime</p>
              <p className="mt-0.5 font-semibold tabular-nums">{state.total}</p>
            </div>
          </div>

          {/* Last 7 days */}
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              Last 7 days
            </p>
            <div className="mt-2 flex h-20 items-end gap-1.5" role="img" aria-label="Daily counts for the last 7 days">
              {stats.week.map((d) => {
                const max = Math.max(1, ...stats.week.map((w) => w.total));
                const h = Math.max(4, Math.round((d.total / max) * 100));
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {d.total > 0 ? d.total : ""}
                    </span>
                    <div
                      className={
                        "w-full rounded-md " +
                        (d.total > 0 ? "bg-primary/70" : "bg-muted")
                      }
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {d.day.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent sessions */}
          {state.sessions.length > 0 ? (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                  Recent rounds
                </p>
                <button
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, sessions: [] }))}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
                >
                  Clear history
                </button>
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {state.sessions
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs"
                    >
                      <span className="truncate font-medium">{s.translit}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {s.count}/{s.target} ·{" "}
                        {new Date(s.endedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              No finished rounds yet — complete a target or tap reset with a
              count to save one.
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the counter?</AlertDialogTitle>
            <AlertDialogDescription>
              {state.count > 0
                ? `This round (${state.count} of ${state.target}) will be saved to your history, then the counter returns to zero.`
                : "The counter will return to zero."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction className="cursor-pointer" onClick={doReset}>
              Reset counter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
