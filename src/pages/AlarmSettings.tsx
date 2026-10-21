import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ADHAN_RECORDINGS,
  FAJR_ADHAN_TRACK,
  STANDARD_ADHAN_TRACKS,
  getAdhanRecording,
  isAdhanTrackUnavailable,
  useAdhanPlayback,
  type AdhanTrackId,
} from "@/lib/adhan";
import {
  DEFAULT_PRAYER_SETTINGS,
  REMINDABLE_PRAYERS,
  REMINDER_SOUNDS,
  playAlarmSound,
  playReminderSound,
  resolvePrayerLocation,
  shiftDateParts,
  stopAlarmSound,
  timesForDate,
  usePrayerSettings,
  type ReminderSound,
} from "@/lib/prayerSettings";
import { PRAYER_LABELS, formatHours } from "@/lib/prayerTimes";
import { cn } from "@/lib/utils";
import {
  BellRing,
  Loader2,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Square,
  Vibrate,
  Volume2,
} from "lucide-react";

function notifPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/** Preview transport (play / pause / stop / honest unavailable state). */
function PreviewControls({
  trackId,
  volume,
  playback,
  disabledLabel,
}: {
  trackId: AdhanTrackId | null;
  volume: number;
  playback: ReturnType<typeof useAdhanPlayback>;
  disabledLabel?: string;
}) {
  if (!trackId) {
    return (
      <span className="text-xs text-muted-foreground">
        {disabledLabel ?? "Nothing to preview"}
      </span>
    );
  }
  const rec = getAdhanRecording(trackId);
  const active = playback.trackId === trackId;
  const unavailable = isAdhanTrackUnavailable(playback, trackId);
  const loading = active && playback.status === "loading";
  const playing = active && playback.status === "playing";
  const paused = active && playback.status === "paused";

  return (
    <span className="flex items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="cursor-pointer gap-1.5"
        onClick={() => void playback.play(trackId, volume)}
        aria-label={`Preview ${rec.label}`}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : playing ? (
          <Pause className="size-3.5" />
        ) : (
          <Play className="size-3.5" />
        )}
        {loading ? "Loading…" : playing ? "Pause" : paused ? "Resume" : "Preview"}
      </Button>
      {(active && (playing || paused || loading)) && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="cursor-pointer gap-1.5"
          onClick={() => playback.stop()}
          aria-label="Stop preview"
        >
          <Square className="size-3.5" />
          Stop
        </Button>
      )}
      {unavailable && (
        <span className="text-xs font-medium text-destructive">
          Unavailable — check your connection
        </span>
      )}
    </span>
  );
}

/**
 * “Prayer Alarm & Adhan Settings” — the full alarm control centre: per-prayer
 * toggles, the adhan/tone sound library with real previews and transport
 * controls, volume, timing, notifications, vibration, quiet hours, test and
 * restore-defaults. Everything persists in localStorage (device-local, like an
 * alarm clock), and the limits card states plainly what a web app can and
 * cannot do in the background.
 */
export default function AlarmSettings() {
  const [settings, update] = usePrayerSettings();
  const [now, setNow] = useState(() => Date.now());
  const [permission, setPermission] = useState(notifPermission);
  const [volume, setVolume] = useState(settings.reminders.volume);
  const playback = useAdhanPlayback();

  const deviceTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const resolved = resolvePrayerLocation(settings, deviceTz);
  const date = shiftDateParts(now, 0);
  const times = resolved ? timesForDate(resolved, date, settings) : null;

  // Live clock so the listed prayer times stay honest across midnight.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const r = settings.reminders;
  const setReminders = (patch: Partial<typeof r>) => update({ reminders: patch });

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const previewSound = (sound: ReminderSound, isFajr = false) => {
    if (sound === "silent") return;
    if (sound === "adhan" || sound === "fajr-adhan") {
      playAlarmSound(sound, { volume, isFajr, adhanTrack: r.adhanTrack });
      return;
    }
    stopAlarmSound();
    playReminderSound(sound, volume);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Salah
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Prayer Alarm &amp; Adhan Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose how each prayer rings — full adhan, Fajr adhan, a short tone
          or silent. Settings are saved on this device and survive restarts.
        </p>
      </header>

      {!resolved && (
        <Card className="border-border/70 shadow-none">
          <CardContent className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="size-4" />
            </span>
            <p className="flex-1 text-sm text-muted-foreground">
              Set your location first — alarms need real prayer times, never
              hard-coded ones.
            </p>
            <Button size="sm" variant="outline" className="cursor-pointer" asChild>
              <Link to="/prayer">Open Prayer</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Per-prayer alarms */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alarms by prayer</CardTitle>
          <CardDescription>
            {resolved
              ? `Times calculated for ${resolved.label} · ${settings.method.toUpperCase()} method`
              : "Enable an alarm per prayer"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {REMINDABLE_PRAYERS.map((name) => {
            const on = !!r.enabled[name];
            return (
              <div
                key={name}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{PRAYER_LABELS[name]}</span>
                  <span className="text-xs text-muted-foreground">
                    {times ? formatHours(times[name]) : "Time unknown — set location"}
                    {on &&
                      ` · rings ${r.leadMinutes === 0 ? "at prayer time" : `${r.leadMinutes} min before`}`}
                  </span>
                </div>
                <Switch
                  checked={on}
                  onCheckedChange={(checked) =>
                    setReminders({
                      enabled: { ...r.enabled, [name]: checked },
                    })
                  }
                  aria-label={`${on ? "Disable" : "Enable"} ${PRAYER_LABELS[name]} alarm`}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Sound library */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alarm sound</CardTitle>
          <CardDescription>
            Preview each option before choosing — what you hear is what rings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {REMINDER_SOUNDS.map((s) => {
            const selected = r.sound === s.id;
            const remoteUnavailable =
              s.id === "adhan" &&
              isAdhanTrackUnavailable(playback, r.adhanTrack);
            const fajrUnavailable =
              s.id === "fajr-adhan" &&
              isAdhanTrackUnavailable(playback, FAJR_ADHAN_TRACK);
            return (
              <div
                key={s.id}
                className={cn(
                  "rounded-xl border px-3.5 py-3",
                  selected ? "border-primary bg-primary/5" : "border-border bg-card",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setReminders({ sound: s.id })}
                    aria-pressed={selected}
                    className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                      aria-hidden="true"
                    >
                      {selected && <span className="size-1.5 rounded-full bg-background" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{s.label}</span>
                      <span className="block text-xs leading-5 text-muted-foreground">
                        {s.description}
                        {s.remote && !remoteUnavailable && !fajrUnavailable
                          ? " Streams from archive.org (needs a connection)."
                          : ""}
                      </span>
                      {(remoteUnavailable || fajrUnavailable) && (
                        <span className="mt-1 block text-xs font-medium text-destructive">
                          This recording is unavailable right now — it will not
                          ring until it loads again.
                        </span>
                      )}
                    </span>
                  </button>
                  {s.id !== "silent" && s.id !== "adhan" && s.id !== "fajr-adhan" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 cursor-pointer gap-1.5"
                      onClick={() => previewSound(s.id)}
                      aria-label={`Preview ${s.label}`}
                    >
                      <Play className="size-3.5" />
                      Preview
                    </Button>
                  )}
                </div>
                {(s.id === "adhan" || s.id === "fajr-adhan") && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-7">
                    <PreviewControls
                      trackId={
                        s.id === "fajr-adhan"
                          ? FAJR_ADHAN_TRACK
                          : r.adhanTrack
                      }
                      volume={volume}
                      playback={playback}
                    />
                    {s.id === "fajr-adhan" && (
                      <span className="text-xs text-muted-foreground">
                        Includes “the prayer is better than sleep”.
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Which full-adhan recording */}
          {r.sound === "adhan" && (
            <div className="mt-1 flex flex-col gap-2 rounded-xl border border-border bg-muted/30 px-3.5 py-3">
              <Label className="text-sm">Adhan recording</Label>
              <p className="text-xs text-muted-foreground">
                The default full-adhan recording, plus an alternative. Fajr
                always uses the Fajr recording — its wording exists nowhere else.
              </p>
              {STANDARD_ADHAN_TRACKS.map((rec) => {
                const selected = r.adhanTrack === rec.id;
                return (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => setReminders({ adhanTrack: rec.id })}
                      aria-pressed={selected}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                    >
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded-full border",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                        aria-hidden="true"
                      >
                        {selected && <span className="size-1.5 rounded-full bg-background" />}
                      </span>
                      <span className="truncate text-sm font-medium">{rec.label}</span>
                    </button>
                    <PreviewControls
                      trackId={rec.id}
                      volume={volume}
                      playback={playback}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Adhan recordings:{" "}
            <a
              className="underline hover:text-foreground"
              href={ADHAN_RECORDINGS[0].sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {ADHAN_RECORDINGS[0].source}
            </a>{" "}
            — released under a Public Domain 1.0 mark on archive.org. Tones are
            synthesized on your device; nothing fake stands in for the adhan.
          </p>
        </CardContent>
      </Card>

      {/* Volume, timing, notification, vibration */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Volume &amp; alerts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Alarm volume</Label>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {volume}%
              </span>
            </div>
            <Slider
              value={[volume]}
              onValueChange={([v]) => setVolume(v)}
              onValueCommit={([v]) => setReminders({ volume: v })}
              max={100}
              step={5}
              aria-label="Alarm volume"
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Applies to the adhan and tones. Device media volume still applies.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Reminder timing</Label>
            <Select
              value={String(r.leadMinutes)}
              onValueChange={(v) =>
                setReminders({ leadMinutes: Number(v) as 0 | 5 | 10 | 15 })
              }
            >
              <SelectTrigger className="bg-card" aria-label="Reminder timing">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">At prayer time</SelectItem>
                <SelectItem value="5">5 minutes before</SelectItem>
                <SelectItem value="10">10 minutes before</SelectItem>
                <SelectItem value="15">15 minutes before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-3.5 py-3">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm">Notification at prayer time</Label>
              <span className="text-xs text-muted-foreground">
                {permission === "granted"
                  ? "Permission granted — notifications will show."
                  : permission === "denied"
                    ? "Blocked in browser settings — in-app toast and sound still work."
                    : permission === "unsupported"
                      ? "This browser doesn’t support notifications."
                      : "Requires notification permission."}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {permission !== "granted" && permission !== "unsupported" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => void requestNotifications()}
                >
                  Allow
                </Button>
              )}
              <Switch
                checked={r.notify}
                onCheckedChange={(checked) => setReminders({ notify: checked })}
                aria-label="Notification at prayer time"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-3.5 py-3">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm">Vibration</Label>
              <span className="text-xs text-muted-foreground">
                Buzz at each alarm (on supported devices)
              </span>
            </div>
            <Switch
              checked={r.vibrate}
              onCheckedChange={(checked) => setReminders({ vibrate: checked })}
              aria-label="Vibrate at alarms"
            />
          </div>

          <Button
            variant="outline"
            className="cursor-pointer gap-2"
            onClick={() => previewSound(r.sound, false)}
            disabled={r.sound === "silent"}
          >
            <Volume2 className="size-4" />
            Test alarm
          </Button>
        </CardContent>
      </Card>

      {/* Quiet hours */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quiet hours</CardTitle>
          <CardDescription>
            Nothing rings between these times — alarms you would have slept
            through stay silent.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-3.5 py-3">
            <Label className="text-sm">Silence alarms overnight</Label>
            <Switch
              checked={r.quiet.enabled}
              onCheckedChange={(checked) =>
                setReminders({ quiet: { ...r.quiet, enabled: checked } })
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
                value={r.quiet.from}
                onChange={(e) =>
                  setReminders({ quiet: { ...r.quiet, from: e.target.value } })
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
                value={r.quiet.to}
                onChange={(e) =>
                  setReminders({ quiet: { ...r.quiet, to: e.target.value } })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Honest platform limits + reset */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How alarms reach you</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-xs leading-5 text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">While the app is open</span>{" "}
            (in a tab or the installed Android app), alarms ring on time: adhan
            or tone, vibration, notification and toast, each prayer once per
            day. A missed minute is still caught for up to 3 minutes.
          </p>
          <p>
            <span className="font-semibold text-foreground">Android:</span> allow
            notifications when asked, and set the app to{" "}
            <em>Unrestricted</em> battery usage (Settings → Apps → Noor Al-Islam
            → Battery) so Android doesn’t freeze it before an alarm. After a
            device restart, alarms re-arm the next time the app opens.
          </p>
          <p>
            <span className="font-semibold text-foreground">We won’t promise the impossible:</span>{" "}
            no web app can ring a full adhan from a closed or force-stopped
            tab — operating systems block that without a push server, and a
            push notification cannot carry a full-length custom adhan sound on
            Android. Exact background alarms need the native build (documented
            in the project README). If an alarm can’t play, the notification or
            in-app toast still tells you the prayer time.
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              className="cursor-pointer gap-2"
              onClick={() => {
                stopAlarmSound();
                setVolume(DEFAULT_PRAYER_SETTINGS.reminders.volume);
                setReminders({ ...DEFAULT_PRAYER_SETTINGS.reminders });
                toast.success("Alarm settings restored to defaults.");
              }}
            >
              <RotateCcw className="size-4" />
              Restore default settings
            </Button>
            <span className="inline-flex items-center gap-1.5">
              <BellRing className="size-3.5" />
              <Vibrate className="size-3.5" />
              Saved on this device
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
