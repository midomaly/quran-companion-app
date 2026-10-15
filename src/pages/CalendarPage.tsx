import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatGregorianLong, formatHijri, formatHijriArabic } from "@/lib/dates";
import {
  HIJRI_MONTHS_AR,
  HIJRI_MONTHS_EN,
  HIJRI_OFFSET_MAX,
  HIJRI_OFFSET_MIN,
  eventsOn,
  getHijriOffset,
  hijriMonthLabel,
  hijriParts,
  hijriToGregorian,
  setHijriOffset,
} from "@/lib/hijri";
import {
  addEvent,
  eventsOnDate,
  loadEvents,
  removeEvent,
  updateEvent,
  type PersonalEvent,
} from "@/lib/events";
import { addReminder, loadReminderStore } from "@/lib/reminders";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  Moon,
  Pencil,
  Plus,
  Printer,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ViewMode = "month" | "week" | "day";

interface DayCell {
  date: Date;
  day: number;
  hijriDay: number | null;
  hijriMonth: number | null;
  events: { title: string; note: string }[];
  personal: PersonalEvent[];
  isToday: boolean;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a: Date | null, b: Date): boolean {
  return (
    !!a &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonth(
  year: number,
  monthIndex: number,
  today: Date,
  personal: PersonalEvent[],
): DayCell[] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: DayCell[] = [];
  for (let i = 0; i < first.getDay(); i++) {
    cells.push({
      date: new Date(0),
      day: 0,
      hijriDay: null,
      hijriMonth: null,
      events: [],
      personal: [],
      isToday: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIndex, d);
    const h = hijriParts(date);
    cells.push({
      date,
      day: d,
      hijriDay: h?.day ?? null,
      hijriMonth: h?.month ?? null,
      events: h ? eventsOn(h.month, h.day) : [],
      personal: eventsOnDate(personal, date.getTime()),
      isToday: sameDay(date, today),
    });
  }
  return cells;
}

function weekStart(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function buildWeek(anchor: Date, today: Date, personal: PersonalEvent[]): DayCell[] {
  const start = weekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const h = hijriParts(date);
    return {
      date,
      day: date.getDate(),
      hijriDay: h?.day ?? null,
      hijriMonth: h?.month ?? null,
      events: h ? eventsOn(h.month, h.day) : [],
      personal: eventsOnDate(personal, date.getTime()),
      isToday: sameDay(date, today),
    };
  });
}

/** Hijri adjustment control (−2..+2 days) shared by every surface. */
function HijriAdjust() {
  const [offset, setOffset] = useState(() => getHijriOffset());
  const change = (next: number) => {
    setHijriOffset(next);
    setOffset(next);
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
      <div className="flex flex-col">
        <Label className="text-sm">Hijri adjustment</Label>
        <span className="text-xs text-muted-foreground">
          Match your local moon sighting (±2 days)
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => change(Math.max(HIJRI_OFFSET_MIN, offset - 1))}
          disabled={offset <= HIJRI_OFFSET_MIN}
          aria-label="Decrease Hijri adjustment"
        >
          −
        </Button>
        <span className="w-10 text-center text-sm font-semibold tabular-nums">
          {offset > 0 ? `+${offset}` : offset}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => change(Math.min(HIJRI_OFFSET_MAX, offset + 1))}
          disabled={offset >= HIJRI_OFFSET_MAX}
          aria-label="Increase Hijri adjustment"
        >
          +
        </Button>
      </div>
    </div>
  );
}

/** Gregorian ⇄ Hijri converter (Umm al-Qura; ±1 day with local sighting). */
function DateConverter() {
  const [gregInput, setGregInput] = useState("");
  const [hDay, setHDay] = useState("1");
  const [hMonth, setHMonth] = useState("9");
  const [hYear, setHYear] = useState(String(new Date().getFullYear() - 576));

  const gregResult = useMemo(() => {
    if (!gregInput) return null;
    const parts = gregInput.split("-");
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (Number.isNaN(date.getTime())) return null;
    return {
      greg: formatGregorianLong(date),
      hijri: formatHijri(date),
      arabic: formatHijriArabic(date),
    };
  }, [gregInput]);

  const hijriResult = useMemo(() => {
    const d = hijriToGregorian(Number(hDay), Number(hMonth), Number(hYear));
    if (!d) return null;
    return {
      greg: formatGregorianLong(d),
      monthEn: HIJRI_MONTHS_EN[Number(hMonth) - 1],
      monthAr: HIJRI_MONTHS_AR[Number(hMonth) - 1],
    };
  }, [hDay, hMonth, hYear]);

  return (
    <Card className="print-card border-border/70 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Date converter</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
            Gregorian → Hijri
          </p>
          <Input
            type="date"
            value={gregInput}
            onChange={(e) => setGregInput(e.target.value)}
            aria-label="Gregorian date"
          />
          {gregResult && (
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <p className="font-medium">{gregResult.hijri ?? "Hijri unavailable"}</p>
              {gregResult.arabic && (
                <p className="font-quran mt-0.5 text-base" dir="rtl">
                  {gregResult.arabic}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
            Hijri → Gregorian
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              max={30}
              value={hDay}
              onChange={(e) => setHDay(e.target.value)}
              aria-label="Hijri day"
              className="text-center"
            />
            <select
              value={hMonth}
              onChange={(e) => setHMonth(e.target.value)}
              aria-label="Hijri month"
              className="h-9 flex-1 rounded-md border border-input bg-card px-2 text-sm outline-none focus-visible:border-primary"
            >
              {HIJRI_MONTHS_EN.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={1200}
              max={1600}
              value={hYear}
              onChange={(e) => setHYear(e.target.value)}
              aria-label="Hijri year"
              className="text-center"
            />
          </div>
          {hijriResult ? (
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <p className="font-medium">{hijriResult.greg}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {hijriResult.monthEn} ·{" "}
                <span className="font-quran" dir="rtl">
                  {hijriResult.monthAr}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              That Hijri day doesn&apos;t exist in this Umm al-Qura month (it may
              have 29 days). Try a day ±1.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarPage() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [view, setView] = useState<ViewMode>("month");
  const [selected, setSelected] = useState<Date | null>(today);
  const [personal, setPersonal] = useState<PersonalEvent[]>(loadEvents);
  const [editing, setEditing] = useState<PersonalEvent | "new" | null>(null);
  const [draft, setDraft] = useState({ title: "", note: "", remind: false, time: "09:00" });

  const cells = useMemo(
    () => buildMonth(cursor.year, cursor.month, today, personal),
    [cursor, today, personal],
  );

  const selectedDate = selected ?? today;
  const weekCells = useMemo(
    () => buildWeek(selectedDate, today, personal),
    [selectedDate, today, personal],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
      }).format(new Date(cursor.year, cursor.month, 1)),
    [cursor],
  );

  const hijriLabel = useMemo(
    () => hijriMonthLabel(new Date(cursor.year, cursor.month, 15)),
    [cursor],
  );

  const prev = () =>
    setCursor((c) =>
      c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 },
    );
  const next = () =>
    setCursor((c) =>
      c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 },
    );
  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelected(today);
  };

  const selectedH = useMemo(() => hijriParts(selectedDate), [selectedDate]);
  const selectedFixed = selectedH ? eventsOn(selectedH.month, selectedH.day) : [];
  const selectedPersonal = useMemo(
    () => eventsOnDate(personal, selectedDate.getTime()),
    [personal, selectedDate],
  );
  const inRamadan = selectedH?.month === 9;

  /* --------------------------- event editing --------------------------- */

  const openNew = () => {
    setDraft({ title: "", note: "", remind: false, time: "09:00" });
    setEditing("new");
  };

  const openEdit = (e: PersonalEvent) => {
    setDraft({
      title: e.title,
      note: e.note,
      remind: e.reminderWeekday !== null,
      time: e.reminderTime,
    });
    setEditing(e);
  };

  const saveEvent = () => {
    const title = draft.title.trim();
    if (!title) {
      toast.error("Give the event a title first.");
      return;
    }
    const reminderWeekday = draft.remind ? selectedDate.getDay() : null;
    if (editing === "new") {
      setPersonal((prevEvents) =>
        addEvent(prevEvents, {
          date: selectedDate.getTime(),
          title,
          note: draft.note.trim(),
          reminderWeekday,
          reminderTime: draft.time,
        }),
      );
      toast.success(`Event added to ${formatGregorianLong(selectedDate)}.`);
    } else if (editing) {
      setPersonal((prevEvents) =>
        updateEvent(prevEvents, editing.id, {
          title,
          note: draft.note.trim(),
          reminderWeekday,
          reminderTime: draft.time,
        }),
      );
      toast.success("Event updated.");
    }
    // One-day-before style reminder: the shared reminder engine fires it on
    // that weekday while the app is open (honest limitation, stated in UI).
    if (reminderWeekday !== null) {
      const store = loadReminderStore();
      addReminder(store, {
        label: `📌 ${title}`,
        kind: "custom",
        time: draft.time,
        days: [reminderWeekday],
        enabled: true,
      });
      toast.info(
        `Reminder set for ${WEEKDAYS[reminderWeekday]}s at ${draft.time} — reminders ring while the app is open.`,
      );
    }
    setEditing(null);
  };

  const deleteEvent = (id: string) => {
    setPersonal((prevEvents) => removeEvent(prevEvents, id));
    setEditing(null);
    toast.success("Event deleted.");
  };

  /* ------------------------------ actions ------------------------------ */

  const shareDay = async () => {
    const lines = [
      formatGregorianLong(selectedDate),
      formatHijri(selectedDate) ?? "",
      formatHijriArabic(selectedDate) ?? "",
      ...selectedFixed.map((e) => `• ${e.title} — ${e.note}`),
      ...selectedPersonal.map((e) => `• ${e.title}${e.note ? ` — ${e.note}` : ""}`),
      "— Shared from Noor Al-Islam",
    ].filter(Boolean);
    const text = lines.join("\n");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Islamic calendar day", text });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Day copied to clipboard.");
    } catch {
      toast.error("Sharing isn't available in this browser.");
    }
  };

  const printMonth = useCallback(() => window.print(), []);

  /* ------------------------------- render ------------------------------- */

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-5 py-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hijri Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Umm al-Qura dates with Gregorian month, week and day views,
            Islamic events and your own entries.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 print-hide">
          <Button variant="outline" size="icon" className="size-8" onClick={shareDay} aria-label="Share this day">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={printMonth} aria-label="Print this month">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <HijriAdjust />

      {/* View switcher + navigation */}
      <Card className="print-card border-border/70 shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>{monthLabel}</CardTitle>
            {hijriLabel && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Moon className="h-3.5 w-3.5" />
                {hijriLabel}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 print-hide">
            <Button variant="outline" size="icon" onClick={prev} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={next} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div
            role="tablist"
            aria-label="Calendar view"
            className="print-hide grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
          >
            {([
              { value: "month", label: "Month", icon: CalendarDays },
              { value: "week", label: "Week", icon: List },
              { value: "day", label: "Day", icon: Clock },
            ] as const).map((v) => (
              <button
                key={v.value}
                type="button"
                role="tab"
                aria-selected={view === v.value}
                onClick={() => setView(v.value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:text-sm",
                  view === v.value
                    ? "bg-card text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <v.icon className="size-3.5 sm:size-4" />
                {v.label}
              </button>
            ))}
          </div>

          {/* Month grid */}
          {view === "month" && (
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  {wd}
                </div>
              ))}
              {cells.map((cell, i) =>
                cell.day === 0 ? (
                  <div key={`b${i}`} />
                ) : (
                  <button
                    key={cell.date.toISOString()}
                    onClick={() => {
                      setSelected(cell.date);
                      setView("day");
                    }}
                    className={`flex min-h-[64px] flex-col items-center justify-start gap-0.5 rounded-md border p-1 text-left transition-colors hover:bg-accent ${
                      cell.isToday
                        ? "border-primary bg-primary/10 font-semibold"
                        : sameDay(selected, cell.date)
                          ? "border-primary/60 bg-primary/5"
                          : "border-transparent"
                    }`}
                  >
                    <span className="text-sm leading-none">{cell.day}</span>
                    <span className="text-[10px] leading-none text-muted-foreground">
                      {cell.hijriDay}
                    </span>
                    {(cell.events.length > 0 || cell.personal.length > 0) && (
                      <span className="mt-0.5 flex items-center gap-0.5 text-[9px] leading-tight text-primary">
                        <Star className="h-2.5 w-2.5 shrink-0 fill-current" />
                        <span className="truncate">
                          {cell.personal[0]?.title ?? cell.events[0].title}
                        </span>
                      </span>
                    )}
                  </button>
                ),
              )}
            </div>
          )}

          {/* Week view */}
          {view === "week" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
              {weekCells.map((cell) => (
                <button
                  key={cell.date.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelected(cell.date);
                    setView("day");
                  }}
                  className={cn(
                    "flex min-h-[96px] flex-col items-start gap-1 rounded-xl border p-2 text-left transition-colors hover:border-primary/50",
                    cell.isToday
                      ? "border-primary bg-primary/10"
                      : sameDay(selected, cell.date)
                        ? "border-primary/60 bg-primary/5"
                        : "border-border bg-card",
                  )}
                >
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {WEEKDAYS[cell.date.getDay()]} {cell.day}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {cell.hijriDay} {cell.hijriMonth ? HIJRI_MONTHS_EN[cell.hijriMonth - 1] : ""}
                  </span>
                  {cell.personal.slice(0, 2).map((e) => (
                    <span key={e.id} className="truncate text-[10px] font-medium text-primary">
                      • {e.title}
                    </span>
                  ))}
                  {cell.events.slice(0, 1).map((e) => (
                    <span key={e.title} className="truncate text-[10px] text-gold">
                      ★ {e.title}
                    </span>
                  ))}
                </button>
              ))}
            </div>
          )}

          {/* Day view */}
          {view === "day" && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-border bg-card px-3.5 py-3">
                <p className="text-sm font-semibold">{formatGregorianLong(selectedDate)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{formatHijri(selectedDate) ?? "Hijri date unavailable"}</span>
                  {formatHijriArabic(selectedDate) && (
                    <span dir="rtl" className="font-quran font-medium text-primary/80">
                      {formatHijriArabic(selectedDate)}
                    </span>
                  )}
                </div>
                {inRamadan && (
                  <p className="mt-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
                    Ramaḍān — a day of fasting. Set a fasting reminder in
                    Reminders.
                  </p>
                )}
              </div>

              {selectedFixed.map((e) => (
                <div
                  key={e.title}
                  className="rounded-lg border border-primary/20 bg-primary/5 p-3"
                >
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Star className="h-4 w-4 fill-current text-primary" />
                    {e.title}
                  </p>
                  <p className="mt-1 pl-6 text-sm text-muted-foreground">{e.note}</p>
                </div>
              ))}

              {selectedPersonal.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => openEdit(e)}
                  className="rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50"
                >
                  <p className="flex items-center justify-between gap-2 text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {e.title}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                      {e.reminderWeekday !== null && <span>🔔 {e.reminderTime}</span>}
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                  </p>
                  {e.note && (
                    <p className="mt-1 pl-6 text-sm text-muted-foreground">{e.note}</p>
                  )}
                </button>
              ))}

              <Button variant="outline" size="sm" className="gap-1.5" onClick={openNew}>
                <Plus className="h-4 w-4" />
                Add an event to this day
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DateConverter />

      <p className="text-xs text-muted-foreground">
        Hijri dates follow the Umm al-Qura calendar with your manual adjustment;
        actual observance may vary by ±1 day with local moon sighting. Event
        reminders ring while the app is open — browsers cannot wake a closed
        tab.
      </p>

      {/* Event editor */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New event" : "Edit event"}</DialogTitle>
            <DialogDescription>
              {formatGregorianLong(selectedDate)} · {formatHijri(selectedDate)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Family iftar, community daleel…"
                maxLength={100}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-note">Note (optional)</Label>
              <Input
                id="event-note"
                value={draft.note}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                placeholder="Details"
                maxLength={200}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
              <div className="flex flex-col">
                <Label htmlFor="event-remind" className="text-sm">
                  Weekly reminder
                </Label>
                <span className="text-xs text-muted-foreground">
                  Fires at the set time while the app is open
                </span>
              </div>
              <Switch
                id="event-remind"
                checked={draft.remind}
                onCheckedChange={(checked) => setDraft((d) => ({ ...d, remind: checked }))}
              />
            </div>
            {draft.remind && (
              <div className="flex items-center gap-2">
                <Label htmlFor="event-time" className="text-sm">
                  Time
                </Label>
                <Input
                  id="event-time"
                  type="time"
                  value={draft.time}
                  onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
                  className="w-32"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between gap-2">
            {editing && editing !== "new" ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={() => deleteEvent(editing.id)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEvent}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CalendarPage;
