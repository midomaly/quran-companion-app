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
  { id: "toronto", name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, timeZone: "America/Toronto" },
  { id: "chicago", name: "Chicago", country: "United States", lat: 41.8781, lng: -87.6298, timeZone: "America/Chicago" },
  { id: "houston", name: "Houston", country: "United States", lat: 29.7604, lng: -95.3698, timeZone: "America/Chicago" },
  { id: "losangeles", name: "Los Angeles", country: "United States", lat: 34.0522, lng: -118.2437, timeZone: "America/Los_Angeles" },
  { id: "mexico", name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332, timeZone: "America/Mexico_City" },
  { id: "saopaulo", name: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, timeZone: "America/Sao_Paulo" },
  { id: "buenosaires", name: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816, timeZone: "America/Argentina/Buenos_Aires" },
  { id: "paris", name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, timeZone: "Europe/Paris" },
  { id: "berlin", name: "Berlin", country: "Germany", lat: 52.52, lng: 13.405, timeZone: "Europe/Berlin" },
  { id: "madrid", name: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038, timeZone: "Europe/Madrid" },
  { id: "rome", name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964, timeZone: "Europe/Rome" },
  { id: "sarajevo", name: "Sarajevo", country: "Bosnia & Herzegovina", lat: 43.8563, lng: 18.4131, timeZone: "Europe/Sarajevo" },
  { id: "moscow", name: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173, timeZone: "Europe/Moscow" },
  { id: "ankara", name: "Ankara", country: "Türkiye", lat: 39.9334, lng: 32.8597, timeZone: "Europe/Istanbul" },
  { id: "cairo2", name: "Giza", country: "Egypt", lat: 30.0131, lng: 31.2089, timeZone: "Africa/Cairo" },
  { id: "casablanca", name: "Casablanca", country: "Morocco", lat: 33.5731, lng: -7.5898, timeZone: "Africa/Casablanca" },
  { id: "algiers", name: "Algiers", country: "Algeria", lat: 36.7538, lng: 3.0588, timeZone: "Africa/Algiers" },
  { id: "tunis", name: "Tunis", country: "Tunisia", lat: 36.8065, lng: 10.1815, timeZone: "Africa/Tunis" },
  { id: "khartoum", name: "Khartoum", country: "Sudan", lat: 15.5007, lng: 32.5599, timeZone: "Africa/Khartoum" },
  { id: "nairobi", name: "Nairobi", country: "Kenya", lat: -1.2921, lng: 36.8219, timeZone: "Africa/Nairobi" },
  { id: "capetown", name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241, timeZone: "Africa/Johannesburg" },
  { id: "joburg", name: "Johannesburg", country: "South Africa", lat: -26.2041, lng: 28.0473, timeZone: "Africa/Johannesburg" },
  { id: "accra", name: "Accra", country: "Ghana", lat: 5.6037, lng: -0.187, timeZone: "Africa/Accra" },
  { id: "abuja", name: "Abuja", country: "Nigeria", lat: 9.0765, lng: 7.3986, timeZone: "Africa/Lagos" },
  { id: "dakar", name: "Dakar", country: "Senegal", lat: 14.7167, lng: -17.4677, timeZone: "Africa/Dakar" },
  { id: "baghdad", name: "Baghdad", country: "Iraq", lat: 33.3152, lng: 44.3661, timeZone: "Asia/Baghdad" },
  { id: "beirut", name: "Beirut", country: "Lebanon", lat: 33.8938, lng: 35.5018, timeZone: "Asia/Beirut" },
  { id: "damascus", name: "Damascus", country: "Syria", lat: 33.5138, lng: 36.2765, timeZone: "Asia/Damascus" },
  { id: "amman", name: "Amman", country: "Jordan", lat: 31.9539, lng: 35.9106, timeZone: "Asia/Amman" },
  { id: "jerusalem", name: "Jerusalem", country: "Palestine", lat: 31.7683, lng: 35.2137, timeZone: "Asia/Jerusalem" },
  { id: "doha", name: "Doha", country: "Qatar", lat: 25.2854, lng: 51.531, timeZone: "Asia/Qatar" },
  { id: "kuwait", name: "Kuwait City", country: "Kuwait", lat: 29.3759, lng: 47.9774, timeZone: "Asia/Kuwait" },
  { id: "muscat", name: "Muscat", country: "Oman", lat: 23.588, lng: 58.3829, timeZone: "Asia/Muscat" },
  { id: "sanaa", name: "Sanaa", country: "Yemen", lat: 15.3694, lng: 44.191, timeZone: "Asia/Aden" },
  { id: "tehran", name: "Tehran", country: "Iran", lat: 35.6892, lng: 51.389, timeZone: "Asia/Tehran" },
  { id: "karachi2", name: "Islamabad", country: "Pakistan", lat: 33.6844, lng: 73.0479, timeZone: "Asia/Karachi" },
  { id: "delhi", name: "Delhi", country: "India", lat: 28.6139, lng: 77.209, timeZone: "Asia/Kolkata" },
  { id: "mumbai", name: "Mumbai", country: "India", lat: 19.076, lng: 72.8777, timeZone: "Asia/Kolkata" },
  { id: "colombo", name: "Colombo", country: "Sri Lanka", lat: 6.9271, lng: 79.8612, timeZone: "Asia/Colombo" },
  { id: "tashkent", name: "Tashkent", country: "Uzbekistan", lat: 41.2995, lng: 69.2401, timeZone: "Asia/Tashkent" },
  { id: "almaty", name: "Almaty", country: "Kazakhstan", lat: 43.222, lng: 76.8512, timeZone: "Asia/Almaty" },
  { id: "baku", name: "Baku", country: "Azerbaijan", lat: 40.4093, lng: 49.8671, timeZone: "Asia/Baku" },
  { id: "kabul", name: "Kabul", country: "Afghanistan", lat: 34.5553, lng: 69.2075, timeZone: "Asia/Kabul" },
  { id: "dhaka2", name: "Chittagong", country: "Bangladesh", lat: 22.3569, lng: 91.7832, timeZone: "Asia/Dhaka" },
  { id: "jakarta2", name: "Surabaya", country: "Indonesia", lat: -7.2575, lng: 112.7521, timeZone: "Asia/Jakarta" },
  { id: "singapore", name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, timeZone: "Asia/Singapore" },
  { id: "manila", name: "Manila", country: "Philippines", lat: 14.5995, lng: 120.9842, timeZone: "Asia/Manila" },
  { id: "beijing", name: "Beijing", country: "China", lat: 39.9042, lng: 116.4074, timeZone: "Asia/Shanghai" },
  { id: "tokyo", name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, timeZone: "Asia/Tokyo" },
  { id: "sydney", name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, timeZone: "Australia/Sydney" },
  { id: "melbourne", name: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631, timeZone: "Australia/Melbourne" },
  { id: "auckland", name: "Auckland", country: "New Zealand", lat: -36.8509, lng: 174.7645, timeZone: "Pacific/Auckland" },
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
  /** What plays when a reminder fires. */
  sound: ReminderSound;
  /** Vibrate at the reminder (where the device supports it). */
  vibrate: boolean;
}

export type ReminderSound = "chime" | "adhan" | "silent";

export const REMINDER_SOUNDS: { id: ReminderSound; label: string }[] = [
  { id: "chime", label: "Gentle chime" },
  { id: "adhan", label: "Adhan (full)" },
  { id: "silent", label: "Notification only" },
];

/**
 * Full adhan recordings, verified reachable (HTTP 200) during development.
 * Played with a plain <audio> element — cross-origin playback needs no CORS
 * headers. If a source fails we fall back to the in-app chime.
 */
export const ADHAN_URLS = [
  "https://www.islamcan.com/audio/adhan/azan1.mp3",
  "https://www.islamcan.com/audio/adhan/azan2.mp3",
  "https://www.islamcan.com/audio/adhan/azan3.mp3",
];

let adhanAudio: HTMLAudioElement | null = null;

/** Play the configured reminder sound. Falls back to the chime on failure. */
export function playReminderSound(sound: ReminderSound): void {
  if (sound === "silent") return;
  if (sound === "chime") {
    playChime();
    return;
  }
  try {
    stopReminderSound();
    adhanAudio = new Audio(ADHAN_URLS[0]);
    adhanAudio.volume = 0.9;
    adhanAudio.addEventListener("error", () => {
      // Source unreachable — never leave the reminder silent.
      if (sound === "adhan") playChime();
    });
    void adhanAudio.play().catch(() => playChime());
  } catch {
    playChime();
  }
}

/** Stop a playing adhan (used by preview controls). */
export function stopReminderSound(): void {
  if (adhanAudio) {
    try {
      adhanAudio.pause();
      adhanAudio.currentTime = 0;
    } catch {
      /* ignore */
    }
    adhanAudio = null;
  }
}

/** Manual per-prayer adjustment in minutes (−30…+30), applied after the engine. */
export const OFFSET_LIMIT = 30;

export interface PrayerAppSettings {
  location: PrayerLocationChoice;
  method: string;
  asrFactor: AsrFactor;
  offsets: Partial<Record<PrayerName, number>>;
  reminders: PrayerReminderSettings;
}

const SETTINGS_KEY = "noor:prayerSettings";

export const DEFAULT_PRAYER_SETTINGS: PrayerAppSettings = {
  location: { mode: "none" },
  method: "mwl",
  asrFactor: 1,
  offsets: {},
  reminders: { enabled: {}, leadMinutes: 0, sound: "chime", vibrate: true },
};

function loadOffsets(raw: unknown): Partial<Record<PrayerName, number>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<PrayerName, number>> = {};
  for (const key of Object.keys(raw) as PrayerName[]) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      const n = Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, Math.round(v)));
      if (n !== 0) out[key] = n;
    }
  }
  return out;
}

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
      offsets: loadOffsets(parsed.offsets),
      reminders: {
        enabled:
          parsed.reminders?.enabled && typeof parsed.reminders.enabled === "object"
            ? parsed.reminders.enabled
            : {},
        leadMinutes:
          parsed.reminders?.leadMinutes === 5 || parsed.reminders?.leadMinutes === 10
            ? parsed.reminders.leadMinutes
            : 0,
        sound:
          parsed.reminders?.sound === "adhan" || parsed.reminders?.sound === "silent"
            ? parsed.reminders.sound
            : "chime",
        vibrate:
          typeof parsed.reminders?.vibrate === "boolean"
            ? parsed.reminders.vibrate
            : true,
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
  const times = computePrayerTimes(date, toPrayerLocation(resolved, date), {
    method: settings.method,
    asrFactor: settings.asrFactor,
  });
  // Manual per-prayer adjustments (the “Prayer-time adjustment controls”);
  // every consumer (page, next-prayer math, alarm host) goes through here.
  const offsets = settings.offsets;
  if (Object.keys(offsets).length === 0) return times;
  const out = { ...times };
  for (const key of Object.keys(offsets) as PrayerName[]) {
    const delta = offsets[key];
    const value = out[key];
    if (delta && typeof value === "number") {
      const next = value + delta / 60;
      out[key] = next < 0 ? next + 24 : next >= 24 ? next - 24 : next;
    }
  }
  return out;
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
