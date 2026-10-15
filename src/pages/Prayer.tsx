import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatGregorianLong, formatHijri, formatHijriArabic } from "@/lib/dates";
import {
  CITY_PRESETS,
  OFFSET_LIMIT,
  REMINDABLE_PRAYERS,
  REMINDER_SOUNDS,
  formatCountdown,
  nextPrayer,
  playReminderSound,
  prayerInstant,
  resolvePrayerLocation,
  shiftDateParts,
  timesForDate,
  usePrayerSettings,
  type PrayerAppSettings,
  type ReminderSound,
  type ResolvedPrayerLocation,
} from "@/lib/prayerSettings";
import {
  CALCULATION_METHODS,
  PRAYER_LABELS,
  PRAYER_ORDER,
  formatHours,
  type PrayerName,
  type PrayerTimes,
} from "@/lib/prayerTimes";
import {
  Bell,
  BellOff,
  Loader2,
  MapPin,
  Moon,
  MoonStar,
  Sun,
  Sunrise,
  Sunset,
  Vibrate,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PRAYER_ARABIC: Record<PrayerName, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

const PRAYER_ICONS: Record<PrayerName, typeof Sun> = {
  fajr: MoonStar,
  sunrise: Sunrise,
  dhuhr: Sun,
  asr: Sunrise,
  maghrib: Sunset,
  isha: Moon,
};

function notifPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/**
 * Salah times (phase 2): offline astronomical times with a live countdown to
 * the next prayer, location & calculation-method settings, and the per-prayer
 * alarm toggles wired to <PrayerReminderHost>.
 */
export default function Prayer() {
  const [settings, update] = usePrayerSettings();
  const [now, setNow] = useState(() => Date.now());
  const [geoState, setGeoState] = useState<"idle" | "loading" | "error">("idle");
  const [permission, setPermission] = useState(notifPermission);

  const deviceTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const resolved = resolvePrayerLocation(settings, deviceTz);

  // Live clock — countdown and "next prayer" stay accurate every second.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const requestDeviceLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoState("error");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update({
          location: {
            mode: "device",
            coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          },
        });
        setGeoState("idle");
      },
      () => setGeoState("error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600_000 },
    );
  };

  // If permission was already granted earlier, resolve silently on mount.
  useEffect(() => {
    if (settings.location.mode !== "device" || settings.location.coords) return;
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state === "granted" && !cancelled) requestDeviceLocation();
      })
      .catch(() => {
        /* permissions API unavailable — the button covers it */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.location.mode, settings.location.coords]);

  const date = shiftDateParts(now, 0);
  const times = resolved ? timesForDate(resolved, date, settings) : null;
  const next = resolved ? nextPrayer(now, resolved, settings) : null;
  const tomorrow = shiftDateParts(now, 1);
  const tomorrowFajr =
    resolved && times ? prayerInstant(resolved, tomorrow, timesForDate(resolved, tomorrow, settings).fajr) : null;

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const toggleReminder = async (name: PrayerName) => {
    const enabled = !settings.reminders.enabled[name];
    if (enabled && typeof Notification !== "undefined" && Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
    update({ reminders: { enabled: { ...settings.reminders.enabled, [name]: enabled } } });
  };

  const testAlarm = () => {
    playReminderSound(settings.reminders.sound);
    if (settings.reminders.vibrate) {
      try {
        navigator.vibrate?.([80, 60, 80]);
      } catch {
        /* vibration unsupported */
      }
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Noor Al-Islam", {
          body: "Alarm test — your prayer reminders will sound like this.",
          icon: "/logo.svg",
        });
      } catch {
        /* constructor blocked */
      }
    }
  };

  const selectClass = "bg-card";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Salah
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Prayer times</h1>
        <p className="text-sm text-muted-foreground">
          {formatGregorianLong(new Date(now))}
          {formatHijri(new Date(now)) && (
            <span className="text-muted-foreground">
              {" · "}
              {formatHijri(new Date(now))}
              {formatHijriArabic(new Date(now)) ? ` (${formatHijriArabic(new Date(now))})` : ""}
            </span>
          )}
        </p>
      </header>

      {!resolved ? (
        /* -------- Location setup -------- */
        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </div>
            <CardTitle>Set your location</CardTitle>
            <CardDescription>
              Prayer times are calculated offline from your coordinates — pick a
              city or use your device location.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button className="cursor-pointer gap-2" onClick={requestDeviceLocation} disabled={geoState === "loading"}>
              {geoState === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MapPin className="size-4" />
              )}
              Use my location
            </Button>
            {geoState === "error" && (
              <p className="text-xs text-destructive">
                Could not get your location — choose a city below instead.
              </p>
            )}
            <CityPicker
              selectedId={settings.location.cityId}
              onPick={(cityId) => update({ location: { mode: "city", cityId } })}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* -------- Next prayer hero -------- */}
          <Card className="pattern-islamic border-border/70 bg-card shadow-none">
            <CardContent className="flex flex-col items-center gap-1 pt-6 pb-5 text-center">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 text-primary" />
                {resolved.label}
                <button
                  type="button"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                  onClick={() => update({ location: { mode: "none" } })}
                >
                  change
                </button>
              </span>
              {next ? (
                <>
                  <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                    Next · {PRAYER_LABELS[next.name]}
                  </p>
                  <p className="text-4xl font-bold tabular-nums sm:text-5xl">
                    {formatCountdown(next.at - now)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    at {formatHours(times?.[next.name] ?? null)}
                    {settings.reminders.leadMinutes > 0 &&
                      settings.reminders.enabled[next.name] &&
                      ` · alarm ${settings.reminders.leadMinutes} min before`}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Times unavailable for this location.
                </p>
              )}
              {tomorrowFajr !== null && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Tomorrow&apos;s Fajr ·{" "}
                  <span className="font-semibold text-foreground">
                    {formatInZone(tomorrowFajr, resolved.timeZone)}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* -------- Times list -------- */}
          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Today&apos;s schedule</CardTitle>
              <CardDescription>
                {CALCULATION_METHODS.find((m) => m.id === settings.method)?.label}
                {settings.asrFactor === 2 ? " · Hanafi Asr" : " · Standard Asr"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {(Object.keys(PRAYER_LABELS) as PrayerName[]).map((name) => {
                const Icon = PRAYER_ICONS[name];
                const time = times?.[name] ?? null;
                const isNext = next?.name === name;
                const remindable = REMINDABLE_PRAYERS.includes(name);
                const alarmOn = !!settings.reminders.enabled[name];
                return (
                  <div
                    key={name}
                    className={
                      "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors " +
                      (isNext
                        ? "border-primary/60 bg-primary/5"
                        : "border-border bg-card")
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          "flex size-9 items-center justify-center rounded-lg " +
                          (isNext ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")
                        }
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                          {PRAYER_LABELS[name]}
                          {name === "sunrise" && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              (not a prayer)
                            </span>
                          )}
                        </span>
                        <span className="font-quran text-xs text-muted-foreground" dir="rtl">
                          {PRAYER_ARABIC[name]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold tabular-nums">
                        {formatHours(time)}
                      </span>
                      {remindable && (
                        <button
                          type="button"
                          aria-label={`${alarmOn ? "Disable" : "Enable"} ${PRAYER_LABELS[name]} alarm`}
                          aria-pressed={alarmOn}
                          onClick={() => void toggleReminder(name)}
                          className={
                            "flex size-8 items-center justify-center rounded-lg transition-colors " +
                            (alarmOn
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground")
                          }
                        >
                          {alarmOn ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* -------- Weekly / monthly timetables -------- */}
          <TimetableCard resolved={resolved} settings={settings} now={now} />

          {/* -------- Calculation & alarm settings -------- */}
          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Calculation & alarms</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Calculation method</Label>
                <Select
                  value={settings.method}
                  onValueChange={(method) => update({ method })}
                >
                  <SelectTrigger className={selectClass} aria-label="Calculation method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALCULATION_METHODS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {CALCULATION_METHODS.find((m) => m.id === settings.method)?.note}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-3.5 py-3">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm">Asr method</Label>
                  <span className="text-xs text-muted-foreground">
                    Hanafi considers a longer shadow
                  </span>
                </div>
                <Switch
                  checked={settings.asrFactor === 2}
                  onCheckedChange={(checked) => update({ asrFactor: checked ? 2 : 1 })}
                  aria-label="Hanafi Asr"
                />
              </div>

              {/* Manual per-prayer adjustments */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Manual adjustments (minutes)</Label>
                  {Object.keys(settings.offsets).length > 0 && (
                    <button
                      type="button"
                      onClick={() => update({ offsets: {} })}
                      className="cursor-pointer text-xs font-medium text-primary hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(PRAYER_ORDER.filter((n) => n !== "sunrise") as PrayerName[]).map((name) => {
                    const value = settings.offsets[name] ?? 0;
                    const setDelta = (delta: number) => {
                      const next = Math.max(
                        -OFFSET_LIMIT,
                        Math.min(OFFSET_LIMIT, value + delta),
                      );
                      const offsets = { ...settings.offsets };
                      if (next === 0) delete offsets[name];
                      else offsets[name] = next;
                      update({ offsets });
                    };
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-lg border border-border bg-card px-2 py-1.5"
                      >
                        <span className="text-xs text-muted-foreground">
                          {PRAYER_LABELS[name]}
                        </span>
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Adjust ${PRAYER_LABELS[name]} earlier`}
                            onClick={() => setDelta(-1)}
                            className="flex size-6 cursor-pointer items-center justify-center rounded border border-border text-sm leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-xs font-semibold tabular-nums">
                            {value > 0 ? `+${value}` : value}
                          </span>
                          <button
                            type="button"
                            aria-label={`Adjust ${PRAYER_LABELS[name]} later`}
                            onClick={() => setDelta(1)}
                            className="flex size-6 cursor-pointer items-center justify-center rounded border border-border text-sm leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            +
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Nudge each time to match your local mosque&apos;s clock.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Alarm timing</Label>
                <Select
                  value={String(settings.reminders.leadMinutes)}
                  onValueChange={(v) =>
                    update({ reminders: { leadMinutes: Number(v) as 0 | 5 | 10 } })
                  }
                >
                  <SelectTrigger className={selectClass} aria-label="Alarm timing">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Exactly at prayer time</SelectItem>
                    <SelectItem value="5">5 minutes before</SelectItem>
                    <SelectItem value="10">10 minutes before</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Reminder sound</Label>
                <Select
                  value={settings.reminders.sound}
                  onValueChange={(v) => update({ reminders: { sound: v as ReminderSound } })}
                >
                  <SelectTrigger className={selectClass} aria-label="Reminder sound">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_SOUNDS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  “Adhan (full)” streams the recorded adhan from islamcan.com;
                  if it can’t load, the chime plays instead.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-3.5 py-3">
                <div className="flex flex-col gap-0.5">
                  <Label className="text-sm">Vibration</Label>
                  <span className="text-xs text-muted-foreground">
                    Buzz at each reminder (on supported devices)
                  </span>
                </div>
                <Switch
                  checked={settings.reminders.vibrate}
                  onCheckedChange={(checked) => update({ reminders: { vibrate: checked } })}
                  aria-label="Vibrate at reminders"
                />
              </div>

              <div className="flex flex-col gap-2">
                {permission !== "granted" && permission !== "unsupported" && (
                  <Button
                    variant="outline"
                    className="cursor-pointer gap-2"
                    onClick={() => void requestNotifications()}
                  >
                    <Bell className="size-4" />
                    Enable notifications
                  </Button>
                )}
                {permission === "denied" && (
                  <p className="text-xs text-muted-foreground">
                    Notifications are blocked in your browser settings — in-app
                    alarms and sounds will still fire while the app is open.
                  </p>
                )}
                <Button
                  variant="outline"
                  className="cursor-pointer gap-2"
                  onClick={testAlarm}
                >
                  <Vibrate className="size-4" />
                  Test alarm
                </Button>
                <p className="text-xs leading-5 text-muted-foreground">
                  Alarms ring while the app is open (chosen sound plus a
                  notification if allowed). They stay on this device — reminders
                  are local by design, like an alarm clock. Browsers cannot wake
                  a closed tab without a push server.
                </p>
              </div>

              {/* Location switcher (searchable city list) */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Location</Label>
                <Button
                  variant="outline"
                  className="cursor-pointer justify-start gap-2"
                  onClick={requestDeviceLocation}
                  disabled={geoState === "loading"}
                >
                  <MapPin className="size-4" />
                  {settings.location.mode === "device"
                    ? "Using my location — tap to refresh"
                    : "Use my location (GPS)"}
                </Button>
                <CityPicker
                  selectedId={settings.location.cityId}
                  onPick={(cityId) => update({ location: { mode: "city", cityId } })}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Moon-sighting note */}
      <p className="pb-4 text-center text-xs leading-5 text-muted-foreground">
        Times are astronomical calculations for your location and method —
        confirm with your local mosque where practices differ. Hijri dates use
        the Umm al-Qura calendar; actual dates depend on local moon sighting.
      </p>
    </div>
  );
}

/** Format an absolute instant in the location's wall clock (e.g. tomorrow's Fajr). */
function formatInZone(instant: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(instant));
  } catch {
    return formatHours(null);
  }
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Searchable city list (offline — filters the local preset table). */
function CityPicker({
  selectedId,
  onPick,
}: {
  selectedId?: string;
  onPick: (cityId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = CITY_PRESETS;
    if (!q) return all.slice(0, 20);
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search city or country…"
        aria-label="Search city or country"
        className="h-10 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-card">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            No city matches “{query}” — try a bigger nearby city.
          </p>
        ) : (
          <ul>
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPick(c.id)}
                  className={
                    "flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted " +
                    (selectedId === c.id ? "text-primary font-semibold" : "text-foreground")
                  }
                >
                  <span className="truncate">
                    {c.name}
                    <span className="text-muted-foreground"> · {c.country}</span>
                  </span>
                  {selectedId === c.id && (
                    <span className="text-xs font-medium text-primary">selected</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!query && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {CITY_PRESETS.length} cities — search to
          narrow down.
        </p>
      )}
    </div>
  );
}

interface TimetableRow {
  label: string;
  sub: string;
  times: PrayerTimes;
}

function TimetableTable({ rows }: { rows: TimetableRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="px-2 py-2 text-left font-semibold">Day</th>
            {(PRAYER_ORDER as PrayerName[]).map((name) => (
              <th key={name} className="px-2 py-2 text-right font-semibold">
                {name === "sunrise" ? "Rise" : PRAYER_LABELS[name]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.sub + i} className="border-t border-border/60">
              <td className="px-2 py-2 whitespace-nowrap">
                <span className="font-semibold">{row.label}</span>{" "}
                <span className="text-muted-foreground">{row.sub}</span>
              </td>
              {(PRAYER_ORDER as PrayerName[]).map((name) => (
                <td key={name} className="px-2 py-2 text-right tabular-nums">
                  {formatHours(row.times[name])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Weekly and monthly timetables computed on-device (offline by design). */
function TimetableCard({
  resolved,
  settings,
  now,
}: {
  resolved: ResolvedPrayerLocation;
  settings: PrayerAppSettings;
  now: number;
}) {
  const [monthOffset, setMonthOffset] = useState(0);

  const weekRows = useMemo<TimetableRow[]>(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = shiftDateParts(now, i);
        const weekday = new Date(
          Date.UTC(date.year, date.month - 1, date.day),
        ).getUTCDay();
        return {
          label: i === 0 ? "Today" : WEEKDAY_SHORT[weekday],
          sub: `${date.day} ${MONTH_LONG[date.month - 1].slice(0, 3)}`,
          times: timesForDate(resolved, date, settings),
        };
      }),
    [now, resolved, settings],
  );

  const monthRows = useMemo<TimetableRow[]>(() => {
    const base = shiftDateParts(now, 0);
    const d = new Date(Date.UTC(base.year, base.month - 1 + monthOffset, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: days }, (_, i) => {
      const date = { year, month, day: i + 1 };
      const weekday = new Date(Date.UTC(year, month - 1, i + 1)).getUTCDay();
      return {
        label: String(i + 1),
        sub: WEEKDAY_SHORT[weekday],
        times: timesForDate(resolved, date, settings),
      };
    });
  }, [now, monthOffset, resolved, settings]);

  const monthDate = useMemo(() => {
    const base = shiftDateParts(now, 0);
    const d = new Date(Date.UTC(base.year, base.month - 1 + monthOffset, 1));
    return `${MONTH_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }, [now, monthOffset]);

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Timetables</CardTitle>
        <CardDescription>
          Computed on this device — available offline. Method shown in
          Calculation & alarms.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="week">
          <TabsList className="mb-3">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
          <TabsContent value="week">
            <TimetableTable rows={weekRows} />
          </TabsContent>
          <TabsContent value="month" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setMonthOffset((m) => m - 1)}
                aria-label="Previous month"
              >
                ‹
              </Button>
              <span className="text-sm font-semibold">{monthDate}</span>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setMonthOffset((m) => m + 1)}
                aria-label="Next month"
              >
                ›
              </Button>
            </div>
            <TimetableTable rows={monthRows} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
