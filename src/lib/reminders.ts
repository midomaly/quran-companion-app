/**
 * Reminder engine for the notification center (phase 2).
 *
 * Reminders are device-local (an alarm clock does not roam with your
 * account). Scheduling is honest: a reminder fires while the app is open —
 * on a 15-second tick plus when the tab becomes visible — via toast,
 * Notification (when permitted), sound and vibration. Browsers cannot wake a
 * closed tab without a push server, and the UI says so plainly.
 *
 * All matching logic is pure (see `reminderDue`) so tests can prove it.
 */

export type ReminderKind =
  | "adhkar-morning"
  | "adhkar-evening"
  | "sleep"
  | "wake"
  | "quran"
  | "fasting"
  | "custom";

export interface Reminder {
  id: string;
  label: string;
  kind: ReminderKind;
  /** Local wall-clock time "HH:MM" (24h). */
  time: string;
  /** Days of week 0=Sun…6=Sat; empty array = every day. */
  days: number[];
  enabled: boolean;
}

export interface QuietHours {
  enabled: boolean;
  /** "HH:MM"; may wrap past midnight (from > to). */
  from: string;
  to: string;
}

export interface ReminderStore {
  reminders: Reminder[];
  quiet: QuietHours;
}

export const KIND_LABELS: Record<ReminderKind, string> = {
  "adhkar-morning": "Morning adhkār",
  "adhkar-evening": "Evening adhkār",
  sleep: "Bedtime",
  wake: "Wake up",
  quran: "Qur'an reading",
  fasting: "Fasting",
  custom: "Custom",
};

/** Suggested reminders the user can add in one tap. */
export const PRESET_REMINDERS: Omit<Reminder, "id">[] = [
  { label: "Morning adhkār", kind: "adhkar-morning", time: "06:30", days: [], enabled: true },
  { label: "Evening adhkār", kind: "adhkar-evening", time: "17:30", days: [], enabled: true },
  { label: "Bedtime", kind: "sleep", time: "22:30", days: [], enabled: false },
  { label: "Wake up", kind: "wake", time: "05:00", days: [], enabled: false },
  { label: "Qur'an reading", kind: "quran", time: "20:00", days: [], enabled: false },
  { label: "Suhoor reminder (Ramadan)", kind: "fasting", time: "04:30", days: [], enabled: false },
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STORAGE_KEY = "noor:reminders";

export const DEFAULT_STORE: ReminderStore = {
  reminders: [],
  quiet: { enabled: false, from: "23:00", to: "05:30" },
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

/** "HH:MM" → minutes since midnight. Invalid input → 0. */
export function timeToMinutes(time: string): number {
  const m = TIME_RE.exec(time);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `r${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  }
}

function sanitizeReminder(raw: unknown): Reminder | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Reminder>;
  if (typeof r.id !== "string" || !r.id) return null;
  if (typeof r.label !== "string" || !r.label.trim()) return null;
  if (!isValidTime(r.time)) return null;
  const kind: ReminderKind =
    typeof r.kind === "string" && r.kind in KIND_LABELS
      ? (r.kind as ReminderKind)
      : "custom";
  const days = Array.isArray(r.days)
    ? [...new Set(r.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))]
    : [];
  return {
    id: r.id,
    label: r.label.trim().slice(0, 80),
    kind,
    time: r.time,
    days: days as number[],
    enabled: r.enabled !== false,
  };
}

export function loadReminderStore(): ReminderStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORE;
    const parsed = JSON.parse(raw) as Partial<ReminderStore>;
    const reminders = Array.isArray(parsed.reminders)
      ? (parsed.reminders.map(sanitizeReminder).filter(Boolean) as Reminder[])
      : [];
    const q = parsed.quiet;
    const quiet: QuietHours = {
      enabled: q?.enabled === true,
      from: isValidTime(q?.from) ? q.from : DEFAULT_STORE.quiet.from,
      to: isValidTime(q?.to) ? q.to : DEFAULT_STORE.quiet.to,
    };
    return { reminders, quiet };
  } catch {
    return DEFAULT_STORE;
  }
}

export function saveReminderStore(store: ReminderStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable — session still works in memory */
  }
}

export function addReminder(
  store: ReminderStore,
  input: Omit<Reminder, "id">,
): ReminderStore {
  const reminder: Reminder = { ...input, id: newId() };
  const next = { ...store, reminders: [...store.reminders, reminder] };
  saveReminderStore(next);
  return next;
}

export function updateReminder(
  store: ReminderStore,
  id: string,
  patch: Partial<Omit<Reminder, "id">>,
): ReminderStore {
  const next = {
    ...store,
    reminders: store.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  };
  saveReminderStore(next);
  return next;
}

export function removeReminder(store: ReminderStore, id: string): ReminderStore {
  const next = { ...store, reminders: store.reminders.filter((r) => r.id !== id) };
  saveReminderStore(next);
  return next;
}

export function setQuiet(store: ReminderStore, quiet: QuietHours): ReminderStore {
  const next = { ...store, quiet };
  saveReminderStore(next);
  return next;
}

/** Is `now` inside quiet hours (handles wrap past midnight)? */
export function inQuietHours(quiet: QuietHours, now: Date): boolean {
  if (!quiet.enabled) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const from = timeToMinutes(quiet.from);
  const to = timeToMinutes(quiet.to);
  if (from === to) return false;
  return from < to ? cur >= from && cur < to : cur >= from || cur < to;
}

/** Minutes allowed to pass after the scheduled time and still fire once. */
export const DUE_GRACE_MINUTES = 3;

/**
 * Pure firing decision: enabled, today matches (or daily), within the grace
 * window after its scheduled time, and not inside quiet hours.
 */
export function reminderDue(
  reminder: Reminder,
  quiet: QuietHours,
  now: Date,
): boolean {
  if (!reminder.enabled) return false;
  if (reminder.days.length > 0 && !reminder.days.includes(now.getDay())) {
    return false;
  }
  const scheduled = timeToMinutes(reminder.time);
  const current = now.getHours() * 60 + now.getMinutes();
  const elapsed = current - scheduled;
  if (elapsed < 0 || elapsed > DUE_GRACE_MINUTES) return false;
  if (inQuietHours(quiet, now)) return false;
  return true;
}

/** Next occurrence (ms) of a reminder after `from` — for “in 2h 14m” labels. */
export function nextOccurrence(reminder: Reminder, from: number): number {
  const [h, m] = reminder.time.split(":").map(Number);
  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(from);
    d.setDate(d.getDate() + offset);
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= from) continue;
    if (reminder.days.length === 0 || reminder.days.includes(d.getDay())) {
      return d.getTime();
    }
  }
  return from + 86_400_000;
}

/** “in 2h 14m” / “in 45s” style label for a future instant. */
export function formatUntil(target: number, now: number): string {
  const ms = Math.max(0, target - now);
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return "less than a minute";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `in ${m} min`;
  return `in ${h}h ${m}m`;
}
