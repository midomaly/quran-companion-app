/**
 * Prayer feature settings + helpers (device-local, like the rest of the
 * reader's preferences — alarms belong to the device that rings, so they are
 * intentionally not synced to the account).
 *
 * Includes:
 * - City presets (lat/lng + IANA time zone — DST handled by Intl).
 * - Persistent settings (location, method, Asr madhhab, reminders).
 * - Next-prayer math in absolute instants (works for cities in other zones).
 * - A gentle WebAudio chime used by the alarm.
 */

import { useCallback, useState } from "react";
import {
  computePrayerTimes,
  getMethod,
  PRAYER_LABELS,
  PRAYER_ORDER,
  utcOffsetHoursFor,
  type AsrFactor,
  type PrayerLocation,
  type PrayerName,
  type PrayerTimes,
  type YearMonthDay,
} from "./prayerTimes";

export interface CityPreset {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  /** IANA zone — keeps DST correct for any year. */
  timeZone: string;
}

export const CITY_PRESETS: CityPreset[] = [
  { id: "makkah", name: "Makkah", country: "Saudi Arabia", lat: 21.4225, lng: 39.8262, timeZone: "Asia/Riyadh" },
  { id: "madinah", name: "Madinah", country: "Saudi Arabia", lat: 24.4686, lng: 39.6142, timeZone: "Asia/Riyadh" },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", lat: 24.7136, lng: 46.6753, timeZone: "Asia/Riyadh" },
  { id: "cairo", name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357, timeZone: "Africa/Cairo" },
  { id: "dubai", name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, timeZone: "Asia/Dubai" },
  { id: "istanbul", name: "Istanbul", country: "Türkiye", lat: 41.0082, lng: 28.9784, timeZone: "Europe/Istanbul" },
  { id: "karachi", name: "Karachi", country: "Pakistan", lat: 24.8607, lng: 67.0011, timeZone: "Asia/Karachi" },
  { id: "dhaka", name: "Dhaka", country: "Bangladesh", lat: 23.8103, lng: 90.4125, timeZone: "Asia/Dhaka" },
  { id: "jakarta", name: "Jakarta", country: "Indonesia", lat: -6.2088, lng: 106.8456, timeZone: "Asia/Jakarta" },
  { id: "kl", name: "Kuala Lumpur", country: "Malaysia", lat: 3.139, lng: 101.6869, timeZone: "Asia/Kuala_Lumpur" },
  { id: "lagos", name: "Lagos", country: "Nigeria", lat: 6.5244, lng: 3.3792, timeZone: "Africa/Lagos" },
  { id: "london", name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, timeZone: "Europe/London" },
  { id: "newyork", name: "New York", country: "United States", lat: 40.7128, lng: -74.006, timeZone: "America/New_York" },
];

/** The five prayers (plus sunrise) that can carry a reminder. */
export const REMINDABLE_PRAYERS: PrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export interface PrayerLocationChoice {
  mode: "none" | "device" | "city";
  cityId?: string;
  coords?: { lat: number; lng: number };
}

export interface PrayerReminderSettings {
  enabled: Partial<Record<PrayerName, boolean>>;
  /** Notify this many minutes before the prayer; 0 = exactly at the time. */
  leadMinutes: 0 | 5 | 10;
}

export interface PrayerAppSettings {
  location: PrayerLocationChoice;
  method: string;
  asrFactor: AsrFactor;
  reminders: PrayerReminderSettings;
}

const SETTINGS_KEY = "noor:prayerSettings";

export const DEFAULT_PRAYER_SETTINGS: PrayerAppSettings = {
  location: { mode: "none" },
  method: "mwl",
  asrFactor: 1,
  reminders: { enabled: {}, leadMinutes: 0 },
};

export function loadPrayerSettings(): PrayerAppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_PRAYER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PrayerAppSettings>;
    const mode = parsed.location?.mode;
    return {
      location: {
        mode: mode === "device" || mode === "city" || mode === "none" ? mode : "none",
        cityId: typeof parsed.location?.cityId === "string" ? parsed.location.cityId : undefined,
        coords:
          typeof parsed.location?.coords?.lat === "number" &&
          typeof parsed.location?.coords?.lng === "number"
            ? { lat: parsed.location.coords.lat, lng: parsed.location.coords.lng }
            : undefined,
      },
      method: getMethod(parsed.method ?? "").id, // unknown ids fall back to MWL
      asrFactor: parsed.asrFactor === 2 ? 2 : 1,
      reminders: {
        enabled:
          parsed.reminders?.enabled && typeof parsed.reminders.enabled === "object"
            ? parsed.reminders.enabled
            : {},
        leadMinutes:
          parsed.reminders?.leadMinutes === 5 || parsed.reminders?.leadMinutes === 10
            ? parsed.reminders.leadMinutes
            : 0,
      },
    };
  } catch {
    return DEFAULT_PRAYER_SETTINGS;
  }
}

function savePrayerSettings(settings: PrayerAppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — session still works in memory */
  }
}

/**
 * Patch accepted by `update`: `location` and `reminders` merge one level deep
 * (matching the runtime merge below), so callers can update just
 * `reminders.enabled` or just `reminders.leadMinutes`.
 */
export type PrayerSettingsPatch = Partial<
  Omit<PrayerAppSettings, "location" | "reminders">
> & {
  location?: Partial<PrayerLocationChoice>;
  reminders?: Partial<PrayerReminderSettings>;
};

export function usePrayerSettings(): [
  PrayerAppSettings,
  (patch: PrayerSettingsPatch) => void,
] {
  const [settings, setSettings] = useState<PrayerAppSettings>(loadPrayerSettings);
  const update = useCallback((patch: PrayerSettingsPatch) => {
    setSettings((prev) => {
      const next: PrayerAppSettings = {
        ...prev,
        ...patch,
        location: patch.location ? { ...prev.location, ...patch.location } : prev.location,
        reminders: patch.reminders
          ? { ...prev.reminders, ...patch.reminders }
          : prev.reminders,
      };
      savePrayerSettings(next);
      return next;
    });
  }, []);
  return [settings, update];
}

export interface ResolvedPrayerLocation {
  lat: number;
  lng: number;
  /** IANA time zone used for wall-clock conversion. */
  timeZone: string;
  label: string;
}

/** Turn settings into compute-ready coordinates, or null when unset. */
export function resolvePrayerLocation(
  settings: PrayerAppSettings,
  deviceTimeZone: string,
): ResolvedPrayerLocation | null {
  if (settings.location.mode === "city") {
    const city = CITY_PRESETS.find((c) => c.id === settings.location.cityId);
    if (city) {
      return {
        lat: city.lat,
        lng: city.lng,
        timeZone: city.timeZone,
        label: `${city.name}, ${city.country}`,
      };
    }
    return null;
  }
  if (settings.location.mode === "device" && settings.location.coords) {
    return {
      lat: settings.location.coords.lat,
      lng: settings.location.coords.lng,
      timeZone: deviceTimeZone,
      label: "My location",
    };
  }
  return null;
}

/** Compute-ready location → engine input (adds the zone's UTC offset). */
export function toPrayerLocation(
  resolved: ResolvedPrayerLocation,
  date: YearMonthDay,
): PrayerLocation {
  return {
    lat: resolved.lat,
    lng: resolved.lng,
    utcOffsetHours: utcOffsetHoursFor(resolved.timeZone, date),
  };
}

export function timesForDate(
  resolved: ResolvedPrayerLocation,
  date: YearMonthDay,
  settings: PrayerAppSettings,
): PrayerTimes {
  return computePrayerTimes(date, toPrayerLocation(resolved, date), {
    method: settings.method,
    asrFactor: settings.asrFactor,
  });
}

/**
 * Absolute instant (ms) of a prayer on a date in the location's zone:
 * wall-clock time in the zone → UTC instant. DST-transition edge cases can be
 * off by the offset change itself, which is acceptable for reminders.
 */
export function prayerInstant(
  resolved: ResolvedPrayerLocation,
  date: YearMonthDay,
  hours: number | null,
): number | null {
  if (hours === null || !Number.isFinite(hours)) return null;
  const offset = utcOffsetHoursFor(resolved.timeZone, date);
  const totalMinutes = Math.round(hours * 60);
  const dayShift = Math.floor(totalMinutes / 1440);
  const minuteOfDay = ((totalMinutes % 1440) + 1440) % 1440;
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + dayShift));
  const wallUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    Math.floor(minuteOfDay / 60),
    minuteOfDay % 60,
    0,
    0,
  );
  return wallUtc - offset * 3_600_000;
}

export interface NextPrayer {
  name: PrayerName;
  at: number;
}

/**
 * Next prayer event strictly after `now` (ms): today's remaining prayers or
 * tomorrow's Fajr. Returns the label-less entry; UI uses PRAYER_LABELS.
 */
export function nextPrayer(
  now: number,
  resolved: ResolvedPrayerLocation,
  settings: PrayerAppSettings,
): NextPrayer | null {
  for (const shift of [0, 1]) {
    const date = shiftDateParts(now, shift);
    const times = timesForDate(resolved, date, settings);
    for (const name of PRAYER_ORDER) {
      if (name === "sunrise") continue; // not a prayer — countdown skips it
      const at = prayerInstant(resolved, date, times[name]);
      if (at !== null && at > now) return { name, at };
    }
  }
  return null;
}

/** Calendar parts (in the location zone) for `now`, shifted by days. */
export function shiftDateParts(now: number, days: number): YearMonthDay {
  const d = new Date(now);
  const shifted = new Date(d.getTime() + days * 86_400_000);
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1, day: shifted.getDate() };
}

/** Format a countdown like "1:23:45" (days not expected beyond 24h). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Gentle 3-tone chime (no audio assets needed). Safe to call anywhere. */
export function playChime(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const start = ctx.currentTime + 0.05;
    const tones = [523.25, 659.25, 783.99]; // C5 E5 G5
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = start + i * 0.28;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
    window.setTimeout(() => void ctx.close(), 2200);
  } catch {
    /* audio unavailable */
  }
}

export { PRAYER_LABELS };
