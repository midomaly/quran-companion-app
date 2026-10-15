/**
 * App-wide prayer alarm host — mounted once in main.tsx, renders nothing.
 *
 * On a 20s tick (plus every time the tab becomes visible again) it checks
 * today's prayer times against the reminder settings and fires each enabled
 * alarm exactly once per day: an in-app toast (always), a system notification
 * (when permission is granted) and a gentle chime. A 3-minute grace window
 * catches times that passed while the tab was asleep.
 */

import { PRAYER_LABELS, formatHours } from "@/lib/prayerTimes";
import {
  REMINDABLE_PRAYERS,
  playReminderSound,
  prayerInstant,
  resolvePrayerLocation,
  shiftDateParts,
  timesForDate,
  usePrayerSettings,
} from "@/lib/prayerSettings";
import { useEffect } from "react";
import { toast } from "sonner";

const TICK_MS = 20_000;
const GRACE_MS = 3 * 60_000;

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
      const times = timesForDate(resolved, date, settings);
      const lead = settings.reminders.leadMinutes;

      for (const name of REMINDABLE_PRAYERS) {
        if (!settings.reminders.enabled[name]) continue;
        const at = prayerInstant(resolved, date, times[name]);
        if (at === null) continue;
        const fireAt = at - lead * 60_000;
        if (now < fireAt || now - fireAt > GRACE_MS) continue;

        const evKey = `noor:remind:${dateKey}:${name}:${lead}`;
        try {
          if (sessionStorage.getItem(evKey)) continue;
          sessionStorage.setItem(evKey, "1");
        } catch {
          /* storage unavailable — worst case: duplicate reminder */
        }

        const timeLabel = formatHours(times[name]);
        const body =
          lead > 0
            ? `${PRAYER_LABELS[name]} in ${lead} minutes · ${timeLabel}`
            : `It is time for ${PRAYER_LABELS[name]} · ${timeLabel}`;

        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
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
        playReminderSound(settings.reminders.sound);
        toast(body);
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
