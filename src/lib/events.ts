/**
 * Personal Islamic events (phase 2) — user-created entries stored on this
 * device, shown on the calendar next to the fixed Islamic events, with an
 * optional one-day-before reminder (wired into the shared reminder engine so
 * it fires honestly, while the app is open).
 */

export interface PersonalEvent {
  id: string;
  /** Gregorian date the event falls on (local midnight). */
  date: number;
  title: string;
  note: string;
  /** Weekday 0..6 the reminder should fire on (event day), null = no reminder. */
  reminderWeekday: number | null;
  /** "HH:MM" reminder time when reminderWeekday is set. */
  reminderTime: string;
}

const STORAGE_KEY = "noor:events";
const MAX_EVENTS = 300;

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `e${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  }
}

function startOfDayMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function sanitizeEvent(raw: unknown): PersonalEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<PersonalEvent>;
  if (typeof e.date !== "number" || !Number.isFinite(e.date)) return null;
  if (typeof e.title !== "string" || !e.title.trim()) return null;
  const weekday =
    typeof e.reminderWeekday === "number" && e.reminderWeekday >= 0 && e.reminderWeekday <= 6
      ? Math.round(e.reminderWeekday)
      : null;
  const time = /^\d{2}:\d{2}$/.test(e.reminderTime ?? "") ? (e.reminderTime as string) : "09:00";
  return {
    id: typeof e.id === "string" && e.id ? e.id : newId(),
    date: startOfDayMs(e.date),
    title: e.title.trim().slice(0, 100),
    note: typeof e.note === "string" ? e.note.trim().slice(0, 500) : "",
    reminderWeekday: weekday,
    reminderTime: time,
  };
}

export function loadEvents(): PersonalEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeEvent)
      .filter((e): e is PersonalEvent => e !== null)
      .sort((a, b) => a.date - b.date)
      .slice(0, MAX_EVENTS);
  } catch {
    return [];
  }
}

export function saveEvents(events: PersonalEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    /* storage unavailable */
  }
}

export function addEvent(
  events: PersonalEvent[],
  input: Omit<PersonalEvent, "id">,
): PersonalEvent[] {
  const next = [...events, { ...input, id: newId() }].sort((a, b) => a.date - b.date);
  saveEvents(next);
  return next;
}

export function updateEvent(
  events: PersonalEvent[],
  id: string,
  patch: Partial<Omit<PersonalEvent, "id">>,
): PersonalEvent[] {
  const next = events
    .map((e) => (e.id === id ? { ...e, ...patch } : e))
    .sort((a, b) => a.date - b.date);
  saveEvents(next);
  return next;
}

export function removeEvent(events: PersonalEvent[], id: string): PersonalEvent[] {
  const next = events.filter((e) => e.id !== id);
  saveEvents(next);
  return next;
}

/** Personal events falling on a given day. */
export function eventsOnDate(events: PersonalEvent[], dayMs: number): PersonalEvent[] {
  const day = startOfDayMs(dayMs);
  return events.filter((e) => e.date === day);
}
