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
import { formatGregorianLong, formatHijri, formatHijriArabic } from "@/lib/dates";
import {
  CITY_PRESETS,
  REMINDABLE_PRAYERS,
  formatCountdown,
  nextPrayer,
  playChime,
  prayerInstant,
  resolvePrayerLocation,
  shiftDateParts,
  timesForDate,
  usePrayerSettings,
} from "@/lib/prayerSettings";
import {
  CALCULATION_METHODS,
  PRAYER_LABELS,
  formatHours,
  type PrayerName,
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
    playChime();
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
            <Select
              onValueChange={(cityId) =>
                update({ location: { mode: "city", cityId } })
              }
            >
              <SelectTrigger className={selectClass} aria-label="Choose a city">
                <SelectValue placeholder="Choose a city…" />
              </SelectTrigger>
              <SelectContent>
                {CITY_PRESETS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}, {c.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  Alarms ring while the app is open (a chime plus a notification
                  if allowed). They stay on this device — reminders are local by
                  design, like an alarm clock.
                </p>
              </div>

              {/* Location switcher for city mode */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Location</Label>
                <div className="flex gap-2">
                  <Select
                    value={settings.location.mode === "city" ? (settings.location.cityId ?? "") : "device"}
                    onValueChange={(value) => {
                      if (value === "device") requestDeviceLocation();
                      else update({ location: { mode: "city", cityId: value } });
                    }}
                  >
                    <SelectTrigger className={selectClass} aria-label="Location">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="device">My location</SelectItem>
                      {CITY_PRESETS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}, {c.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
