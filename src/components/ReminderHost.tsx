/**
 * App-wide custom-reminder host — mounted once in main.tsx, renders nothing.
 *
 * On a 15-second tick (plus every time the tab becomes visible) it fires any
 * reminder whose time has just passed: toast (always), system notification
 * (when permitted), configured sound and vibration. Each reminder fires once
 * per calendar day, tracked in sessionStorage so reloads don't duplicate it.
 *
 * Honest limitation (stated in the Reminders UI): browsers cannot fire
 * notifications from a closed tab without a push server, so reminders ring
 * while the app is open — exactly like leaving an alarm clock app running.
 */

import {
  loadReminderStore,
  reminderDue,
} from "@/lib/reminders";
import {
  loadPrayerSettings,
  playAlarmSound,
  stopAlarmSound,
} from "@/lib/prayerSettings";
import { useEffect } from "react";
import { toast } from "sonner";

const TICK_MS = 15_000;

export function ReminderHost() {
  useEffect(() => {
    const tick = () => {
      const store = loadReminderStore();
      if (store.reminders.length === 0) return;
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

      for (const reminder of store.reminders) {
        if (!reminderDue(reminder, store.quiet, now)) continue;

        const evKey = `noor:rem:${reminder.id}:${dateKey}`;
        try {
          if (sessionStorage.getItem(evKey)) continue;
          sessionStorage.setItem(evKey, "1");
        } catch {
          /* storage unavailable — worst case: duplicate reminder */
        }

        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification("Noor Al-Islam", {
              body: reminder.label,
              icon: "/logo.svg",
              tag: evKey,
            });
          } catch {
            /* constructor blocked outside a worker */
          }
        }
        try {
          navigator.vibrate?.([80, 60, 80]);
        } catch {
          /* vibration unsupported */
        }
        const alarm = loadPrayerSettings().reminders;
        playAlarmSound(alarm.sound, {
          volume: alarm.volume,
          adhanTrack: alarm.adhanTrack,
        });
        toast(reminder.label, {
          duration: alarm.sound === "adhan" || alarm.sound === "fajr-adhan" ? 120_000 : 10_000,
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
  }, []);

  return null;
}
