import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { playChime } from "@/lib/prayerSettings";
import { RotateCcw, Target } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Dhikr {
  id: string;
  arabic: string;
  translit: string;
  meaning: string;
}

const DHIKR_LIST: Dhikr[] = [
  { id: "subhan", arabic: "سُبْحَانَ ٱللَّٰه", translit: "Subḥānallāh", meaning: "Glory be to Allah" },
  { id: "hamd", arabic: "ٱلْحَمْدُ لِلَّٰه", translit: "Al-ḥamdu lillāh", meaning: "All praise is for Allah" },
  { id: "akbar", arabic: "ٱللَّٰهُ أَكْبَر", translit: "Allāhu akbar", meaning: "Allah is the Greatest" },
  { id: "tawhid", arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰه", translit: "Lā ilāha illā Allāh", meaning: "There is no god but Allah" },
  { id: "istighfar", arabic: "أَسْتَغْفِرُ ٱللَّٰه", translit: "Astaghfirullāh", meaning: "I seek forgiveness from Allah" },
  { id: "salawat", arabic: "ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّد", translit: "Allāhumma ṣalli ʿalā Muḥammad", meaning: "O Allah, send blessings upon Muhammad" },
];

const TARGETS = [33, 99, 100] as const;

const STORAGE_KEY = "noor:tasbih";

interface StoredState {
  dhikrId: string;
  count: number;
  target: number;
  total: number;
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredState>;
      return {
        dhikrId:
          DHIKR_LIST.find((d) => d.id === parsed.dhikrId)?.id ?? DHIKR_LIST[0].id,
        count: typeof parsed.count === "number" && parsed.count >= 0 ? parsed.count : 0,
        target: (TARGETS as readonly number[]).includes(parsed.target ?? 0)
          ? (parsed.target as number)
          : 33,
        total: typeof parsed.total === "number" && parsed.total >= 0 ? parsed.total : 0,
      };
    }
  } catch {
    /* storage unavailable */
  }
  return { dhikrId: DHIKR_LIST[0].id, count: 0, target: 33, total: 0 };
}

/**
 * Tasbih (phase 2): tap-to-count dhikr with target rings, haptics, session
 * totals and a chime on completion. State persists on this device.
 */
export default function Tasbih() {
  const [state, setState] = useState<StoredState>(loadState);
  const [pulse, setPulse] = useState(0);
  const completingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state]);

  const dhikr = DHIKR_LIST.find((d) => d.id === state.dhikrId) ?? DHIKR_LIST[0];
  const done = state.count >= state.target;
  const progress = Math.min(1, state.count / state.target);

  const increment = useCallback(() => {
    setState((prev) => {
      if (prev.count >= prev.target) return prev;
      const count = prev.count + 1;
      const complete = count >= prev.target;
      // Haptics: light tap per count, celebratory pattern at the target.
      try {
        if (complete) navigator.vibrate?.([40, 60, 40, 60, 120]);
        else navigator.vibrate?.(12);
      } catch {
        /* vibration unsupported */
      }
      if (complete && !completingRef.current) {
        completingRef.current = true;
        playChime();
        window.setTimeout(() => {
          completingRef.current = false;
        }, 800);
      }
      return { ...prev, count, total: prev.total + 1 };
    });
    setPulse((p) => p + 1);
  }, []);

  const reset = () => setState((prev) => ({ ...prev, count: 0 }));

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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [increment]);

  const R = 118;
  const C = 2 * Math.PI * R;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Dhikr
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Tasbih</h1>
        <p className="text-sm text-muted-foreground">
          Repeat your remembrance — counts persist on this device.
        </p>
      </header>

      {/* Dhikr picker */}
      <div className="grid grid-cols-2 gap-2">
        {DHIKR_LIST.map((d) => {
          const active = d.id === dhikr.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setState((prev) => ({ ...prev, dhikrId: d.id, count: 0 }))}
              aria-pressed={active}
              className={
                "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors " +
                (active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40")
              }
            >
              <span className="font-quran text-lg" dir="rtl">
                {d.arabic}
              </span>
              <span
                className={
                  "text-[11px] " + (active ? "text-primary" : "text-muted-foreground")
                }
              >
                {d.translit}
              </span>
            </button>
          );
        })}
      </div>

      {/* Counter */}
      <Card className="border-border/70 shadow-none">
        <CardContent className="flex flex-col items-center gap-3 pt-6 pb-6">
          <p className="text-sm text-muted-foreground">{dhikr.meaning}</p>
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

          <div className="flex items-center gap-2">
            {TARGETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, target: t }))}
                aria-pressed={state.target === t}
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
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={reset}
              disabled={state.count === 0}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>

          {done && (
            <p className="text-sm font-semibold text-primary">
              {state.target} complete — jazāk Allāhu khayran. Tap reset to begin again.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Session totals</CardTitle>
          <CardDescription>
            Saved on this device so your wird follows you between visits.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-border bg-card px-3.5 py-3">
            <p className="text-xs text-muted-foreground">This count</p>
            <p className="mt-0.5 font-semibold tabular-nums">{state.count}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3.5 py-3">
            <p className="text-xs text-muted-foreground">Lifetime counts</p>
            <p className="mt-0.5 font-semibold tabular-nums">{state.total}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
