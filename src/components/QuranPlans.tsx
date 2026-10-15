import { useMemo, useState } from "react";
import { CalendarCheck, CheckCheck, Flag, RotateCcw, TrendingUp } from "lucide-react";
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
import { useAppState } from "@/lib/app-state";
import { getSurah } from "@/lib/surahs";
import {
  TOTAL_JUZ,
  clearPlan,
  createPlan,
  juzAtPosition,
  loadPlan,
  logProgress,
  planStats,
  type ReadingPlan,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

const PRESETS = [
  { days: 7, label: "7 days", blurb: "One juz a day — intense" },
  { days: 15, label: "15 days", blurb: "Two juz every other day" },
  { days: 30, label: "30 days", blurb: "One juz a month-day — classic" },
  { days: 90, label: "90 days", blurb: "A juz every three days — gentle" },
] as const;

/**
 * Khatmah planner (phase 2): pick a completion target, log juz as you read,
 * and see whether you're on pace. Everything is device-local; nothing is
 * claimed on the user's behalf — progress only moves when they log it.
 */
export function QuranPlans() {
  const { lastRead } = useAppState();
  const [plan, setPlan] = useState<ReadingPlan | null>(() => loadPlan());
  const [confirmReset, setConfirmReset] = useState(false);

  const stats = useMemo(() => (plan ? planStats(plan) : null), [plan]);

  const start = (days: number) => {
    setPlan(createPlan(days));
    toast.success(`Khatmah plan started — finish in ${days} days, in sha Allah.`);
  };

  const addJuz = (delta: number) => {
    if (!plan) return;
    setPlan(logProgress(plan, plan.juzDone + delta));
  };

  const setFromLastRead = () => {
    if (!plan || !lastRead) return;
    const juz = juzAtPosition(lastRead.surah, lastRead.ayah);
    setPlan(logProgress(plan, juz));
    const meta = getSurah(lastRead.surah);
    toast.success(
      `Progress set to juz ${juz} — your last read: ${meta?.translit ?? lastRead.surah} ${lastRead.ayah}.`,
    );
  };

  const reset = () => {
    clearPlan();
    setPlan(null);
    setConfirmReset(false);
    toast.success("Plan removed. Start a new one any time.");
  };

  /* ---------------------------------------------------------------- */
  /* No plan yet                                                       */
  /* ---------------------------------------------------------------- */
  if (!plan || !stats) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-4 py-8 text-center">
          <CalendarCheck className="size-7 text-primary" />
          <h2 className="text-base font-bold tracking-tight">Plan your Khatmah</h2>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Choose a deadline to finish the whole Qur&apos;an, then log each juz
            as you read it. You keep the pace — the plan just keeps count.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => start(p.days)}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-primary/50"
            >
              <span>
                <span className="block text-sm font-bold tracking-tight">{p.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{p.blurb}</span>
              </span>
              <Flag className="size-4 shrink-0 text-primary" />
            </button>
          ))}
        </div>

        <p className="text-center text-[11px] leading-4 text-muted-foreground">
          Dates are your own target — the app cannot see your local moon-sighting
          calendar; adjust any time.
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Active plan                                                       */
  /* ---------------------------------------------------------------- */
  const pct = Math.round((plan.juzDone / TOTAL_JUZ) * 100);
  const ahead = stats.expectedJuz - plan.juzDone;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress hero */}
      <div className="pattern-islamic rounded-2xl border border-border bg-card px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {stats.complete ? "Khatmah complete" : "Current Khatmah"}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
              {plan.juzDone}
              <span className="text-base text-muted-foreground"> / {TOTAL_JUZ} juz</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {stats.complete
                ? "All praise is due to Allah"
                : stats.overdue
                  ? "Target passed"
                  : `${stats.daysLeft} day${stats.daysLeft === 1 ? "" : "s"} left`}
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{pct}%</p>
          </div>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {stats.complete ? (
          <div className="mt-4 flex flex-col items-center gap-2 text-center">
            <CheckCheck className="size-6 text-primary" />
            <p className="text-sm font-semibold">
              MāshāʾAllāh — you finished the Qur&apos;an! 🎉
            </p>
            <Button size="sm" className="mt-1 cursor-pointer" onClick={() => setConfirmReset(true)}>
              Start a new khatmah
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={() => addJuz(1)}
              aria-label="Log one more juz"
            >
              <TrendingUp className="size-3.5" />
              +1 juz read
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={() => addJuz(-1)}
              disabled={plan.juzDone === 0}
            >
              <RotateCcw className="size-3.5" />
              Undo
            </Button>
            {lastRead && (
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={setFromLastRead}
              >
                I&apos;m at my last read
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pace stats */}
      {!stats.complete && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Target"
            value={new Date(plan.targetDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          />
          <Stat label="Left" value={`${stats.juzLeft} juz`} />
          <Stat label="Daily pace" value={`${stats.perDay.toFixed(1)} juz`} />
          <Stat label="≈ pages/day" value={`${stats.pagesPerDay}`} />
        </div>
      )}

      {/* Honest pace commentary */}
      {!stats.complete && (
        <p
          className={cn(
            "rounded-xl border px-3.5 py-3 text-xs leading-5",
            stats.overdue
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : ahead >= 0
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "border-border bg-card text-muted-foreground",
          )}
        >
          {stats.overdue
            ? `The target date has passed with ${stats.juzLeft} juz remaining. Extend the plan by starting again — no guilt, only intention.`
            : ahead >= 2
              ? `You're ${ahead} juz ahead of the ideal pace — may Allah accept it.`
              : ahead >= 0
                ? "You're right on pace to finish by your target, in sha Allah."
                : `You're ${Math.abs(ahead)} juz behind the ideal pace — read a little extra today to catch up.`}
        </p>
      )}

      {/* Recent log */}
      {plan.log.length > 0 && (
        <div className="rounded-xl border border-border bg-card px-3.5 py-3">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
            Recent days
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {plan.log.slice(-10).map((entry) => (
              <li
                key={entry.day}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted-foreground"
              >
                {entry.day.slice(5)} · {entry.juzDone} juz
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer text-muted-foreground hover:text-destructive"
          onClick={() => setConfirmReset(true)}
        >
          Remove plan
        </Button>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this khatmah plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Your reading progress log will be deleted from this device. Your
              bookmarks and last-read position are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction className="cursor-pointer" onClick={reset}>
              Remove plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
