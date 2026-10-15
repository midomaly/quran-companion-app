import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGregorianLong, formatHijri, formatHijriArabic } from "@/lib/dates";
import { hijriMonthLabel, hijriParts, eventsOn } from "@/lib/hijri";
import { ChevronLeft, ChevronRight, Moon, Star } from "lucide-react";
import { useMemo, useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DayCell {
  date: Date;
  day: number;
  hijriDay: number | null;
  hijriMonth: number | null;
  events: { title: string; note: string }[];
  isToday: boolean;
}

function buildMonth(year: number, monthIndex: number, today: Date): DayCell[] {
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
      isToday:
        d === today.getDate() &&
        monthIndex === today.getMonth() &&
        year === today.getFullYear(),
    });
  }
  return cells;
}

function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState<Date | null>(null);

  const cells = useMemo(
    () => buildMonth(cursor.year, cursor.month, today),
    [cursor, today],
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

  const selectedInfo = selected
    ? {
        gregorian: formatGregorianLong(selected),
        hijri: formatHijri(selected),
        hijriArabic: formatHijriArabic(selected),
        events: (() => {
          const h = hijriParts(selected);
          return h ? eventsOn(h.month, h.day) : [];
        })(),
      }
    : null;

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Hijri Calendar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Umm al-Qura dates alongside the Gregorian calendar, with Islamic
          events.
        </p>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{monthLabel}</CardTitle>
            {hijriLabel && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Moon className="h-3.5 w-3.5" />
                {hijriLabel}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={prev} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={next} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
                  onClick={() => setSelected(cell.date)}
                  className={`flex min-h-[64px] flex-col items-center justify-start gap-0.5 rounded-md border p-1 text-left transition-colors hover:bg-accent ${
                    cell.isToday
                      ? "border-primary bg-primary/10 font-semibold"
                      : selected && cell.date.toDateString() === selected.toDateString()
                        ? "border-primary/60 bg-primary/5"
                        : "border-transparent"
                  }`}
                >
                  <span className="text-sm leading-none">{cell.day}</span>
                  <span className="text-[10px] leading-none text-muted-foreground">
                    {cell.hijriDay}
                  </span>
                  {cell.events.length > 0 && (
                    <span className="mt-0.5 flex items-center gap-0.5 text-[9px] leading-tight text-primary">
                      <Star className="h-2.5 w-2.5 shrink-0 fill-current" />
                      <span className="truncate">{cell.events[0].title}</span>
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {selectedInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{selectedInfo.gregorian}</CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{selectedInfo.hijri ?? "Hijri date unavailable"}</span>
              {selectedInfo.hijriArabic && (
                <span dir="rtl" className="font-medium text-primary/80">
                  {selectedInfo.hijriArabic}
                </span>
              )}
            </div>
          </CardHeader>
          {selectedInfo.events.length > 0 && (
            <CardContent className="space-y-3">
              {selectedInfo.events.map((e) => (
                <div key={e.title} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Star className="h-4 w-4 fill-current text-primary" />
                    {e.title}
                  </p>
                  <p className="mt-1 pl-6 text-sm text-muted-foreground">{e.note}</p>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Hijri dates follow the Umm al-Qura calendar; actual observance may vary
        by ±1 day with local moon sighting.
      </p>
    </div>
  );
}

export default CalendarPage;
