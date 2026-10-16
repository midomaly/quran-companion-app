import { useEffect, useMemo, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Worship tracker (phase 2): a daily checklist for the acts each Muslim
 * already keeps track of — salāh, Qur'an pages, adhkār, fasting, good deeds.
 * Users choose which activities are tracked; everything is device-local and
 * can be deleted in one tap.
 */

interface DayLog {
  /** Per-prayer: Fajr, Dhuhr, Asr, Maghrib, Isha. */
  prayers: boolean[];
  quranPages: number;
  adhkar: boolean;
  fasting: boolean;
  charity: number;
  memorized: number;
}

interface TrackerStore {
  enabled: string[];
  days: Record<string, DayLog>;
}

const ACTIVITIES = [
  { id: "prayers", label: "Five daily prayers" },
  { id: "quran", label: "Qur'an pages" },
  { id: "adhkar", label: "Morning & evening adhkār" },
  { id: "fasting", label: "Fasting" },
  { id: "charity", label: "Charity" },
  { id: "memorization", label: "Memorization" },
] as const;

const PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const STORAGE_KEY = "noor:tracker";

const EMPTY_DAY: DayLog = {
  prayers: [false, false, false, false, false],
  quranPages: 0,
  adhkar: false,
  fasting: false,
  charity: 0,
  memorized: 0,
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadStore(): TrackerStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TrackerStore>;
      const enabled = Array.isArray(parsed.enabled)
        ? parsed.enabled.filter((id) => ACTIVITIES.some((a) => a.id === id))
        : [...ACTIVITIES.map((a) => a.id)];
      const days: Record<string, DayLog> = {};
      if (parsed.days && typeof parsed.days === "object") {
        for (const [k, v] of Object.entries(parsed.days)) {
          if (!v || typeof v !== "object") continue;
          const log = v as Partial<DayLog>;
          days[k] = {
            prayers: PRAYER_NAMES.map((_, i) => Array.isArray(log.prayers) && !!log.prayers[i]),
            quranPages: typeof log.quranPages === "number" ? log.quranPages : 0,
            adhkar: !!log.adhkar,
            fasting: !!log.fasting,
            charity: typeof log.charity === "number" ? log.charity : 0,
            memorized: typeof log.memorized === "number" ? log.memorized : 0,
          };
        }
      }
      return { enabled, days };
    }
  } catch {
    /* storage unavailable */
  }
  return { enabled: [...ACTIVITIES.map((a) => a.id)], days: {} };
}

function saveStore(store: TrackerStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable */
  }
}

export default function Tracker() {
  const [store, setStore] = useState<TrackerStore>(loadStore);
  const [confirmClear, setConfirmClear] = useState(false);
  const today = dayKey(new Date());

  useEffect(() => saveStore(store), [store]);

  const log = store.days[today] ?? EMPTY_DAY;
  const on = (id: string) => store.enabled.includes(id);

  const setLog = (patch: Partial<DayLog>) => {
    setStore((prev) => ({
      ...prev,
      days: { ...prev.days, [today]: { ...(prev.days[today] ?? EMPTY_DAY), ...patch } },
    }));
  };

  const toggleActivity = (id: string) => {
    setStore((prev) => ({
      ...prev,
      enabled: prev.enabled.includes(id)
        ? prev.enabled.filter((x) => x !== id)
        : [...prev.enabled, id],
    }));
  };

  // Last 7 days completion: for each enabled activity, was it done?
  const week = useMemo(() => {
    const rows: { key: string; label: string; done: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const entry = store.days[key] ?? EMPTY_DAY;
      const checks: boolean[] = [];
      if (on("prayers")) checks.push(...entry.prayers);
      if (on("quran")) checks.push(entry.quranPages > 0);
      if (on("adhkar")) checks.push(entry.adhkar);
      if (on("fasting")) checks.push(entry.fasting);
      if (on("charity")) checks.push(entry.charity > 0);
      if (on("memorization")) checks.push(entry.memorized > 0);
      rows.push({
        key,
        label: d.toLocaleDateString("en-GB", { weekday: "short" }),
        done: checks.filter(Boolean).length,
        total: checks.length,
      });
    }
    return rows;
  }, [store, store.enabled]);

  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const entry = store.days[dayKey(d)];
      const perfect =
        entry && entry.prayers.every(Boolean) && (entry.quranPages > 0 || !on("quran"));
      if (perfect) count++;
      else if (i > 0) break;
      else continue; // today may still be in progress
    }
    return count;
  }, [store, store.enabled]);

  const totals = useMemo(() => {
    const all = Object.values(store.days);
    return {
      pages: all.reduce((s, d) => s + d.quranPages, 0),
      fasts: all.filter((d) => d.fasting).length,
      memorized: all.reduce((s, d) => s + d.memorized, 0),
      charity: all.reduce((s, d) => s + d.charity, 0),
    };
  }, [store.days]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Amal
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Worship tracker</h1>
        <p className="text-sm text-muted-foreground">
          A gentle daily checklist — track only what you want, stored on this
          device. {streak > 0 && ` ${streak}-day prayer streak 🔥`}
        </p>
      </header>

      {/* Today's checklist */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Today</CardTitle>
          <span className="text-xs text-muted-foreground">{today}</span>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {on("prayers") && (
            <div className="grid grid-cols-5 gap-1.5">
              {PRAYER_NAMES.map((name, i) => {
                const done = log.prayers[i];
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={done}
                    onClick={() => {
                      const prayers = [...log.prayers];
                      prayers[i] = !prayers[i];
                      setLog({ prayers });
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-xs font-medium transition-colors",
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <Check className={cn("size-4", done ? "opacity-100" : "opacity-25")} />
                    {name}
                  </button>
                );
              })}
            </div>
          )}

          {on("quran") && (
            <CounterRow
              label="Qur'an pages read"
              value={log.quranPages}
              onChange={(v) => setLog({ quranPages: v })}
            />
          )}
          {on("memorization") && (
            <CounterRow
              label="Verses memorized"
              value={log.memorized}
              onChange={(v) => setLog({ memorized: v })}
            />
          )}
          {on("charity") && (
            <CounterRow
              label="Charity amount (any currency)"
              value={log.charity}
              step={5}
              onChange={(v) => setLog({ charity: v })}
            />
          )}
          {on("adhkar") && (
            <ToggleRow
              label="Morning & evening adhkār done"
              checked={log.adhkar}
              onChange={(v) => setLog({ adhkar: v })}
            />
          )}
          {on("fasting") && (
            <ToggleRow
              label="Fasted today"
              checked={log.fasting}
              onChange={(v) => setLog({ fasting: v })}
            />
          )}
          {store.enabled.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              All activities are off — enable some below.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Week view */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Last 7 days</CardTitle>
          <CardDescription>Filled bars mean every enabled item was done</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-2">
          {week.map((row) => {
            const pct = row.total === 0 ? 0 : row.done / row.total;
            return (
              <div key={row.key} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-24 w-full items-end rounded-md bg-muted">
                  <div
                    className="w-full rounded-md bg-primary transition-[height] duration-500"
                    style={{ height: `${Math.round(pct * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{row.label}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Lifetime totals */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All time</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Pages" value={String(totals.pages)} />
          <Stat label="Fasts" value={String(totals.fasts)} />
          <Stat label="Verses" value={String(totals.memorized)} />
          <Stat label="Charity" value={String(totals.charity)} />
        </CardContent>
      </Card>

      {/* Activity controls */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Track these activities</CardTitle>
          <CardDescription>Turn off anything you don&apos;t want monitored</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {ACTIVITIES.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-3.5 py-2.5"
            >
              <span className="text-sm">{a.label}</span>
              <Switch
                checked={on(a.id)}
                onCheckedChange={() => toggleActivity(a.id)}
                aria-label={`Track ${a.label}`}
              />
            </div>
          ))}
          <Button
            variant="outline"
            className="mt-2 cursor-pointer gap-2 text-destructive hover:text-destructive"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="size-4" />
            Delete all tracker data
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all tracker data?</AlertDialogTitle>
            <AlertDialogDescription>
              Every logged day, streak and total on this device will be removed.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={() => {
                const fresh: TrackerStore = { enabled: store.enabled, days: {} };
                setStore(fresh);
                saveStore(fresh);
                toast.success("Tracker data deleted.");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CounterRow({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(0, value - step))}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          −
        </button>
        <span className="w-10 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + step)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          +
        </button>
      </span>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-3.5 py-2.5">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
