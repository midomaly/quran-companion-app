import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Moon, Plus, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DAY_LABELS,
  KIND_LABELS,
  PRESET_REMINDERS,
  addReminder,
  formatUntil,
  loadReminderStore,
  nextOccurrence,
  removeReminder,
  setQuiet,
  updateReminder,
  type Reminder,
  type ReminderKind,
  type ReminderStore,
} from "@/lib/reminders";
import { cn } from "@/lib/utils";

function notifPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

interface Draft {
  id: string | null;
  label: string;
  kind: ReminderKind;
  time: string;
  days: number[];
}

const EMPTY_DRAFT: Draft = {
  id: null,
  label: "",
  kind: "custom",
  time: "07:00",
  days: [],
};

function ReminderDialog({
  open,
  draft,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  draft: Draft;
  onChange: (d: Draft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const valid = draft.label.trim().length > 0 && /^\d{2}:\d{2}$/.test(draft.time);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit reminder" : "New reminder"}</DialogTitle>
          <DialogDescription>
            Rings while the app is open — browsers can&apos;t wake a closed tab
            without a push service.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rem-label">Label</Label>
            <Input
              id="rem-label"
              value={draft.label}
              maxLength={80}
              placeholder="e.g. Read Surah Al-Kahf"
              onChange={(e) => onChange({ ...draft, label: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rem-kind">Type</Label>
            <select
              id="rem-kind"
              value={draft.kind}
              onChange={(e) =>
                onChange({ ...draft, kind: e.target.value as ReminderKind })
              }
              className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {(Object.keys(KIND_LABELS) as ReminderKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rem-time">Time</Label>
            <Input
              id="rem-time"
              type="time"
              value={draft.time}
              onChange={(e) => onChange({ ...draft, time: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Repeat</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ ...draft, days: [] })}
                aria-pressed={draft.days.length === 0}
                className={cn(
                  "cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  draft.days.length === 0
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                Daily
              </button>
              {DAY_LABELS.map((d, i) => {
                const on = draft.days.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...draft,
                        days: on
                          ? draft.days.filter((x) => x !== i)
                          : [...draft.days, i].sort(),
                      })
                    }
                    aria-pressed={on}
                    className={cn(
                      "cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="cursor-pointer" onClick={onClose}>
            Cancel
          </Button>
          <Button className="cursor-pointer" disabled={!valid} onClick={onSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Notification center (phase 2): create/edit/delete reminders, quiet hours,
 * permission management — with an honest description of what browsers allow.
 */
export default function Reminders() {
  const [store, setStore] = useState<ReminderStore>(loadReminderStore);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [permission, setPermission] = useState(notifPermission);
  const [now, setNow] = useState(() => Date.now());

  // Re-render each minute so the “in 2h 14m” labels stay truthful.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const openNew = () => {
    setDraft(EMPTY_DRAFT);
    setDialogOpen(true);
  };

  const openEdit = (r: Reminder) => {
    setDraft({ id: r.id, label: r.label, kind: r.kind, time: r.time, days: [...r.days] });
    setDialogOpen(true);
  };

  const saveDraft = () => {
    if (!draft.label.trim()) return;
    const input = {
      label: draft.label.trim(),
      kind: draft.kind,
      time: draft.time,
      days: draft.days,
      enabled: true,
    };
    if (draft.id) {
      setStore((s) => updateReminder(s, draft.id as string, input));
      toast.success("Reminder updated.");
    } else {
      setStore((s) => addReminder(s, input));
      toast.success("Reminder created.");
    }
    setDialogOpen(false);
  };

  const addPreset = (preset: (typeof PRESET_REMINDERS)[number]) => {
    setStore((s) => addReminder(s, preset));
    toast.success(`Added “${preset.label}”.`);
  };

  const presentKinds = new Set(store.reminders.map((r) => r.kind));
  const missingPresets = PRESET_REMINDERS.filter(
    (p) => !(p.kind !== "custom" && presentKinds.has(p.kind)),
  );

  const sorted = useMemo(
    () => [...store.reminders].sort((a, b) => a.time.localeCompare(b.time)),
    [store.reminders],
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Notification center
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Reminders</h1>
        <p className="text-sm text-muted-foreground">
          Adhkār, Qur&apos;an, fasting and custom reminders — with quiet hours
          so nothing rings after bedtime.
        </p>
      </header>

      {/* Permission + platform limits, stated honestly */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>
            {permission === "granted"
              ? "Permission granted — reminders can show system notifications."
              : permission === "denied"
                ? "Blocked in your browser settings — in-app toasts and sounds still work."
                : permission === "unsupported"
                  ? "This browser doesn’t support notifications — in-app toasts and sounds still work."
                  : "Allow notifications to see reminders outside the app tab."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {permission !== "granted" && permission !== "unsupported" && (
            <Button className="cursor-pointer gap-2" onClick={() => void requestPermission()}>
              <Bell className="size-4" />
              Enable notifications
            </Button>
          )}
          <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-xs leading-5 text-muted-foreground">
            <span className="font-semibold text-foreground">How scheduling works:</span>{" "}
            reminders fire while Noor Al-Islam is open in a tab (toast, sound,
            vibration and notification). Mobile browsers and PWAs only deliver
            background notifications through a push server, which this app
            deliberately doesn’t use — no accounts or keys are required for
            your reminders. Keep the app open (or in a background tab) for
            alarms you don’t want to miss; prayer alarms work the same way.
          </div>
        </CardContent>
      </Card>

      {/* Active reminders */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Your reminders</CardTitle>
          <Button size="sm" className="cursor-pointer gap-1.5" onClick={openNew}>
            <Plus className="size-4" />
            New
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {sorted.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No reminders yet — add one, or use a preset below.
            </p>
          )}
          {sorted.map((r) => {
            const next = nextOccurrence(r, now);
            return (
              <div
                key={r.id}
                className={
                  "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 " +
                  (r.enabled ? "border-border bg-card" : "border-border/60 bg-muted/30")
                }
              >
                <span
                  className={
                    "flex size-9 shrink-0 items-center justify-center rounded-lg " +
                    (r.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
                  }
                >
                  {r.kind === "sleep" || r.kind === "wake" ? (
                    <Moon className="size-4" />
                  ) : r.enabled ? (
                    <Bell className="size-4" />
                  ) : (
                    <BellOff className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {KIND_LABELS[r.kind]} · {r.time} ·{" "}
                    {r.days.length === 0
                      ? "daily"
                      : r.days.map((d) => DAY_LABELS[d]).join(", ")}
                    {r.enabled && (
                      <span className="text-primary"> · {formatUntil(next, now)}</span>
                    )}
                  </p>
                </div>
                <Switch
                  checked={r.enabled}
                  onCheckedChange={(on) =>
                    setStore((s) => updateReminder(s, r.id, { enabled: on }))
                  }
                  aria-label={`${r.enabled ? "Disable" : "Enable"} ${r.label}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  onClick={() => openEdit(r)}
                  aria-label={`Edit ${r.label}`}
                >
                  <span className="text-xs font-semibold">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteId(r.id)}
                  aria-label={`Delete ${r.label}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Presets */}
      {missingPresets.length > 0 && (
        <Card className="border-border/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Suggested</CardTitle>
            <CardDescription>One-tap reminders you can add</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {missingPresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => addPreset(p)}
                className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                + {p.label} · {p.time}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quiet hours */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quiet hours</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-3.5 py-3">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm">Suspend reminders overnight</Label>
              <span className="text-xs text-muted-foreground">
                Nothing rings between these times (works past midnight)
              </span>
            </div>
            <Switch
              checked={store.quiet.enabled}
              onCheckedChange={(on) =>
                setStore((s) => setQuiet(s, { ...s.quiet, enabled: on }))
              }
              aria-label="Quiet hours"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quiet-from" className="text-sm">
                From
              </Label>
              <Input
                id="quiet-from"
                type="time"
                value={store.quiet.from}
                onChange={(e) =>
                  /^\d{2}:\d{2}$/.test(e.target.value) &&
                  setStore((s) => setQuiet(s, { ...s.quiet, from: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quiet-to" className="text-sm">
                To
              </Label>
              <Input
                id="quiet-to"
                type="time"
                value={store.quiet.to}
                onChange={(e) =>
                  /^\d{2}:\d{2}$/.test(e.target.value) &&
                  setStore((s) => setQuiet(s, { ...s.quiet, to: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <ReminderDialog
        open={dialogOpen}
        draft={draft}
        onChange={setDraft}
        onClose={() => setDialogOpen(false)}
        onSave={saveDraft}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              It will stop ringing permanently. You can always create it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={() => {
                if (deleteId) {
                  setStore((s) => removeReminder(s, deleteId));
                  toast.success("Reminder deleted.");
                }
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="pb-4 text-center text-xs leading-5 text-muted-foreground">
        Prayer alarms are configured on the Prayer page; this center covers
        everything else. All reminders stay on this device.
      </p>
    </div>
  );
}
