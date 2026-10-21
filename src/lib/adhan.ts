/**
 * Adhan (call-to-prayer) audio library + playback controller.
 *
 * Recordings: "Adhan Recordings from Doha, Qatar" — the archive.org item is
 * marked **Public Domain 1.0** (https://archive.org/details/adhan.recordings.from.doha.qatar)
 * and archive.org staff confirm hotlinking of the stable `/download/` permalinks
 * is allowed (https://archive.org/post/261115/hotlinking-allowed). All three
 * URLs below were verified reachable during development (HTTP 200, audio/mpeg).
 *
 * Honesty rules baked into this module:
 * - Nothing is presented as playable that isn't: if a recording fails to load
 *   (offline, blocked, removed), it is marked unavailable in playback state
 *   and the settings UI must show it that way.
 * - Playback uses a plain <audio> element: it rings while the app is open or
 *   alive in a background tab. A closed or frozen tab cannot play audio — the
 *   settings screen states this plainly instead of promising otherwise.
 */

import { useSyncExternalStore } from "react";

export type AdhanTrackId = "doha-adhan-a" | "doha-adhan-b" | "doha-fajr";

export interface AdhanRecording {
  id: AdhanTrackId;
  label: string;
  /** Fajr recordings carry the extra “الصلاة خير من النوم” wording. */
  kind: "standard" | "fajr";
  url: string;
  /** Human-readable attribution shown in the settings screen. */
  source: string;
  sourceUrl: string;
  license: string;
}

const ARCHIVE_ITEM = "https://archive.org/details/adhan.recordings.from.doha.qatar";
const ARCHIVE_LICENSE = "Public Domain 1.0 (archive.org item designation)";
const ARCHIVE_SOURCE = "Adhan Recordings from Doha, Qatar (archive.org)";

export const ADHAN_RECORDINGS: AdhanRecording[] = [
  {
    id: "doha-adhan-a",
    label: "Adhan — Doha, recitation A",
    kind: "standard",
    url: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_02_Dhuhr_Adhan.mp3",
    source: ARCHIVE_SOURCE,
    sourceUrl: ARCHIVE_ITEM,
    license: ARCHIVE_LICENSE,
  },
  {
    id: "doha-adhan-b",
    label: "Adhan — Doha, recitation B",
    kind: "standard",
    url: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_05_Isha_Adhan.mp3",
    source: ARCHIVE_SOURCE,
    sourceUrl: ARCHIVE_ITEM,
    license: ARCHIVE_LICENSE,
  },
  {
    id: "doha-fajr",
    label: "Fajr Adhan — Doha",
    kind: "fajr",
    url: "https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_01_Fajr_Adhan.mp3",
    source: ARCHIVE_SOURCE,
    sourceUrl: ARCHIVE_ITEM,
    license: ARCHIVE_LICENSE,
  },
];

/** Recording used for non-Fajr prayers when “Adhan” is selected. */
export const DEFAULT_ADHAN_TRACK: AdhanTrackId = "doha-adhan-a";
/** Recording used at Fajr (its wording only exists in a Fajr adhan). */
export const FAJR_ADHAN_TRACK: AdhanTrackId = "doha-fajr";

export function getAdhanRecording(id: AdhanTrackId): AdhanRecording {
  return ADHAN_RECORDINGS.find((r) => r.id === id) ?? ADHAN_RECORDINGS[0];
}

export function isAdhanTrackId(value: unknown): value is AdhanTrackId {
  return typeof value === "string" && ADHAN_RECORDINGS.some((r) => r.id === value);
}

/** Recordings other than the Fajr one — what a “full adhan” choice picks from. */
export const STANDARD_ADHAN_TRACKS = ADHAN_RECORDINGS.filter((r) => r.kind === "standard");

/* ------------------------------------------------------------------ *
 * Playback controller: one <audio> element, observable state, so the
 * settings screen can render real play/pause/stop and honest errors.
 * ------------------------------------------------------------------ */

export type AdhanStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface AdhanPlaybackState {
  status: AdhanStatus;
  trackId: AdhanTrackId | null;
  /** Set when playback failed — that track must not be shown as available. */
  error: string | null;
}

const IDLE_STATE: AdhanPlaybackState = { status: "idle", trackId: null, error: null };

let audio: HTMLAudioElement | null = null;
let currentTrack: AdhanTrackId | null = null;
let state: AdhanPlaybackState = IDLE_STATE;
const listeners = new Set<() => void>();

function setState(next: AdhanPlaybackState): void {
  state = next;
  listeners.forEach((l) => l());
}

export function adhanPlaybackState(): AdhanPlaybackState {
  return state;
}

export function subscribeAdhanPlayback(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function element(): HTMLAudioElement | null {
  try {
    if (audio) return audio;
    const a = new Audio();
    a.addEventListener("playing", () => {
      setState({ status: "playing", trackId: currentTrack, error: null });
    });
    a.addEventListener("ended", () => {
      setState({ status: "idle", trackId: currentTrack, error: null });
    });
    a.addEventListener("error", () => {
      setState({
        status: "error",
        trackId: currentTrack,
        error: "This recording could not be loaded (offline or blocked). It is not available right now.",
      });
    });
    audio = a;
    return audio;
  } catch {
    return null;
  }
}

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 1;
  return Math.min(1, Math.max(0, volume / 100));
}

/**
 * Play a recording. Resolves true when playback actually started; on failure
 * the state is marked "error" so the UI can show the track as unavailable
 * instead of pretending it rang.
 */
export function playAdhan(trackId: AdhanTrackId, volume = 100): Promise<boolean> {
  const a = element();
  if (!a) return Promise.resolve(false);
  const rec = getAdhanRecording(trackId);
  if (currentTrack !== trackId) {
    a.src = rec.url;
    currentTrack = trackId;
  }
  a.volume = clampVolume(volume);
  setState({ status: "loading", trackId, error: null });
  return a
    .play()
    .then(() => true)
    .catch(() => {
      setState({
        status: "error",
        trackId,
        error:
          "Playback was blocked or the recording is unreachable — check your connection and tap play again.",
      });
      return false;
    });
}

export function pauseAdhan(): void {
  try {
    audio?.pause();
  } catch {
    /* ignore */
  }
  if (state.status === "playing" || state.status === "loading") {
    setState({ ...state, status: "paused" });
  }
}

export function resumeAdhan(): void {
  if (!audio || !currentTrack) return;
  if (state.status === "paused") void playAdhan(currentTrack, audio.volume * 100);
}

export function stopAdhan(): void {
  try {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  } catch {
    /* ignore */
  }
  setState({ status: "idle", trackId: currentTrack, error: state.error });
}

/** Has this recording failed to load? The picker must show it as unavailable. */
export function isAdhanTrackUnavailable(
  playback: AdhanPlaybackState,
  trackId: AdhanTrackId,
): boolean {
  return playback.status === "error" && playback.trackId === trackId;
}

/**
 * React binding for the preview controls. `play` accepts a 0–100 volume so a
 * preview honours the alarm-volume setting.
 */
export function useAdhanPlayback(): AdhanPlaybackState & {
  play: (trackId: AdhanTrackId, volume?: number) => Promise<boolean>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
} {
  const snapshot = useSyncExternalStore(
    subscribeAdhanPlayback,
    adhanPlaybackState,
    () => IDLE_STATE,
  );
  return {
    ...snapshot,
    play: playAdhan,
    pause: pauseAdhan,
    resume: resumeAdhan,
    stop: stopAdhan,
  };
}
