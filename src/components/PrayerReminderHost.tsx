/**
 * App-wide prayer alarm host — mounted once in main.tsx, renders nothing.
 *
 * On a 20s tick (plus every time the tab becomes visible again) it asks the
 * pure scheduler (duePrayerAlarms) which alarms are due and fires each one
 * exactly once per day: an in-app toast (always, with a Stop action), a
 * system notification (when enabled and permitted), vibration and the
 * configured sound — a verified adhan recording (Fajr gets the Fajr adhan),
 * a synthesized tone, or nothing. A 3-minute grace window catches times that
 * passed while the tab was asleep, and quiet hours silence everything.
 */

import { PRAYER_LABELS, formatHours } from "@/lib/prayerTimes";
import {
  playAlarmSound,
  resolvePrayerLocation,
  shiftDateParts,
  stopAlarmSound,
  timesForDate,
  duePrayerAlarms,
  usePrayerSettings,
} from "@/lib/prayerSettings";
import { useEffect } from "react";
import { toast } from "sonner";

const TICK_MS = 20_000;

export function PrayerReminderHost() {
  const [settings] = usePrayerSettings();

  useEffect(() => {
    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const tick = () => {
      const resolved = resolvePrayerLocation(settings, deviceTz);
      if (!resolved) return;
      const now = Date.now();
      const date = shiftDateParts(now, 0);
      const dateKey = `${date.year}-${date.month}-${date.day}`;
      const lead = settings.reminders.leadMinutes;
      const times = timesForDate(resolved, date, settings);
      const sound = settings.reminders.sound;

      for (const alarm of duePrayerAlarms(now, resolved, settings)) {
        const evKey = `noor:remind:${dateKey}:${alarm.name}:${lead}`;
        try {
          if (sessionStorage.getItem(evKey)) continue;
          sessionStorage.setItem(evKey, "1");
        } catch {
          /* storage unavailable — worst case: duplicate reminder */
        }

        const timeLabel = formatHours(times[alarm.name]);
        const body =
          lead > 0
            ? `${PRAYER_LABELS[alarm.name]} in ${lead} minutes · ${timeLabel}`
            : `It is time for ${PRAYER_LABELS[alarm.name]} · ${timeLabel}`;

        if (
          settings.reminders.notify &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification("Noor Al-Islam", {
              body,
              icon: "/logo.svg",
              tag: evKey,
            });
          } catch {
            /* some browsers block constructor outside a worker */
          }
        }
        if (settings.reminders.vibrate) {
          try {
            navigator.vibrate?.([80, 60, 80]);
          } catch {
            /* vibration unsupported */
          }
        }
        playAlarmSound(sound, {
          volume: settings.reminders.volume,
          isFajr: alarm.name === "fajr",
          adhanTrack: settings.reminders.adhanTrack,
        });
        toast(body, {
          // A full adhan runs for minutes — keep the Stop action around.
          duration: sound === "adhan" || sound === "fajr-adhan" ? 120_000 : 10_000,
          action: { label: "Stop", onClick: () => stopAlarmSound() },
        });
      }
    };

    tick();
    const id = window.setInterval(tick, TICK_MS);
    const onVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [settings]);

  return null;
}
