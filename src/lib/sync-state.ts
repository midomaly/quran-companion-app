/**
 * Pure, environment-free helpers for accounts + sync (phase 2).
 *
 * Shared by the client sync engine (src/lib/app-sync.ts), the Convex save
 * mutation (src/convex/sync.ts) and unit tests — so this file must stay free
 * of React, DOM, localStorage and Convex runtime imports.
 *
 * Sync model:
 * - One cloud doc per user (src/convex/sync.ts, table `syncState`).
 * - Sign-in / account switch: local and cloud are MERGED (bookmarks union,
 *   newest last-read wins, settings & searches last-writer-wins by their own
 *   timestamps) so nothing on either side is ever lost at adoption time.
 * - Steady state: either side may change; diverging edits merge with the same
 *   rules and the result is pushed back. Removals made while signed in stick
 *   (bookmarks are replaced by the merged list); a bookmark removed while
 *   signed out on the same device can be re-adopted by the union at next
 *   sign-in — losing data would be worse than resurrecting it.
 */

export interface SyncSettings {
  theme: "light" | "dark" | "system";
  /** Arabic (Uthmani) font size in px */
  arabicFontSize: number;
  /** Show the English translation under each ayah */
  showTranslation: boolean;
  reciter: string;
  /** Keep playing ayah by ayah within a surah */
  continuousPlayback: boolean;
}

export interface SyncBookmark {
  surah: number;
  ayah: number;
  addedAt: number;
}

export interface SyncLastRead {
  surah: number;
  ayah: number;
  updatedAt: number;
}

/** The payload of a cloud doc (metadata like _id/userId is stripped). */
export interface CloudSyncDoc {
  userId?: string;
  settings: SyncSettings;
  settingsUpdatedAt: number;
  bookmarks: SyncBookmark[];
  lastRead?: SyncLastRead | null;
  recentSearches: string[];
  searchesUpdatedAt: number;
}

/** What the client keeps on-device (state + the two freshness stamps). */
export interface LocalSyncState {
  settings: SyncSettings;
  settingsUpdatedAt: number;
  bookmarks: SyncBookmark[];
  lastRead: SyncLastRead | null;
  recentSearches: string[];
  searchesUpdatedAt: number;
}

export const MAX_SYNC_BOOKMARKS = 5000;
export const MAX_SYNC_SEARCHES = 8;
export const MIN_SYNC_FONT_SIZE = 20;
export const MAX_SYNC_FONT_SIZE = 64;
export const DEFAULT_SYNC_FONT_SIZE = 30;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Read a {surah, ayah} pair, returning null unless both are valid refs. */
function readRef(raw: { surah?: unknown; ayah?: unknown }): {
  surah: number;
  ayah: number;
} | null {
  const { surah, ayah } = raw;
  if (!isFiniteNumber(surah) || !Number.isInteger(surah) || surah < 1 || surah > 114) {
    return null;
  }
  if (!isFiniteNumber(ayah) || !Number.isInteger(ayah) || ayah < 1) {
    return null;
  }
  return { surah, ayah };
}

/** Validate, dedupe (keeping the newest addedAt) and sort a bookmark list. */
export function sanitizeBookmarks(input: unknown): SyncBookmark[] {
  if (!Array.isArray(input)) return [];
  const byKey = new Map<string, SyncBookmark>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const b = raw as Partial<SyncBookmark>;
    const ref = readRef(b);
    if (!ref) continue;
    const addedAt = isFiniteNumber(b.addedAt) && b.addedAt > 0 ? b.addedAt : 0;
    const key = `${ref.surah}:${ref.ayah}`;
    const prev = byKey.get(key);
    if (!prev || addedAt > prev.addedAt) {
      byKey.set(key, { surah: ref.surah, ayah: ref.ayah, addedAt });
    }
  }
  return [...byKey.values()]
    .sort((a, b) => a.surah - b.surah || a.ayah - b.ayah)
    .slice(0, MAX_SYNC_BOOKMARKS);
}

/** Validate a last-read position; null when missing or malformed. */
export function sanitizeLastRead(input: unknown): SyncLastRead | null {
  if (!input || typeof input !== "object") return null;
  const lr = input as Partial<SyncLastRead>;
  const ref = readRef(lr);
  if (!ref) return null;
  return {
    ...ref,
    updatedAt: isFiniteNumber(lr.updatedAt) && lr.updatedAt > 0 ? lr.updatedAt : 0,
  };
}

/** Validate settings field-by-field, falling back to `fallback` per field. */
export function sanitizeSettings(
  input: unknown,
  fallback: SyncSettings | null,
): SyncSettings | null {
  if (!input || typeof input !== "object") return fallback;
  const s = input as Partial<SyncSettings>;
  const base: SyncSettings = fallback ?? {
    theme: "system",
    arabicFontSize: DEFAULT_SYNC_FONT_SIZE,
    showTranslation: true,
    reciter: "ar.alafasy",
    continuousPlayback: true,
  };
  const fontSize = isFiniteNumber(s.arabicFontSize)
    ? Math.min(MAX_SYNC_FONT_SIZE, Math.max(MIN_SYNC_FONT_SIZE, Math.round(s.arabicFontSize)))
    : base.arabicFontSize;
  return {
    theme:
      s.theme === "light" || s.theme === "dark" || s.theme === "system"
        ? s.theme
        : base.theme,
    arabicFontSize: fontSize,
    showTranslation:
      typeof s.showTranslation === "boolean" ? s.showTranslation : base.showTranslation,
    reciter: typeof s.reciter === "string" && s.reciter.length > 0 ? s.reciter : base.reciter,
    continuousPlayback:
      typeof s.continuousPlayback === "boolean" ? s.continuousPlayback : base.continuousPlayback,
  };
}

/** Validate a recent-search list: trimmed non-empty strings, capped. */
export function sanitizeSearches(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const q = raw.trim();
    if (!q || out.includes(q)) continue;
    out.push(q);
    if (out.length >= MAX_SYNC_SEARCHES) break;
  }
  return out;
}

function positiveTimestamp(value: unknown): number {
  return isFiniteNumber(value) && value > 0 ? value : 0;
}

/** Map a raw cloud doc (or null) to a normalized local-shaped state. */
export function docToLocal(doc: CloudSyncDoc | null | undefined): LocalSyncState {
  if (!doc) {
    return {
      settings: sanitizeSettings(null, null)!,
      settingsUpdatedAt: 0,
      bookmarks: [],
      lastRead: null,
      recentSearches: [],
      searchesUpdatedAt: 0,
    };
  }
  return {
    settings: sanitizeSettings(doc.settings, null)!,
    settingsUpdatedAt: positiveTimestamp(doc.settingsUpdatedAt),
    bookmarks: sanitizeBookmarks(doc.bookmarks),
    lastRead: sanitizeLastRead(doc.lastRead),
    recentSearches: sanitizeSearches(doc.recentSearches),
    searchesUpdatedAt: positiveTimestamp(doc.searchesUpdatedAt),
  };
}

/**
 * Merge device-local state with the cloud doc. Symmetric and loss-free:
 * - bookmarks: union, newest addedAt per ayah, sorted
 * - lastRead: whichever position was updated most recently
 * - settings / recent searches: last-writer-wins by their own timestamp
 * The timestamps of the winning side travel with it so the merged result is
 * idempotent: merge(merge(a, b), b) === merge(a, b).
 */
export function mergeLocalAndCloud(
  local: LocalSyncState,
  cloud: CloudSyncDoc | null | undefined,
): LocalSyncState {
  const remote = docToLocal(cloud);
  const cloudSettingsNewer = remote.settingsUpdatedAt > local.settingsUpdatedAt;
  const cloudSearchesNewer = remote.searchesUpdatedAt > local.searchesUpdatedAt;

  let lastRead: SyncLastRead | null = null;
  if (local.lastRead && remote.lastRead) {
    lastRead = local.lastRead.updatedAt >= remote.lastRead.updatedAt ? local.lastRead : remote.lastRead;
  } else {
    lastRead = local.lastRead ?? remote.lastRead;
  }

  return {
    settings: cloudSettingsNewer ? remote.settings : local.settings,
    settingsUpdatedAt: Math.max(local.settingsUpdatedAt, remote.settingsUpdatedAt),
    bookmarks: sanitizeBookmarks([...local.bookmarks, ...remote.bookmarks]),
    lastRead,
    recentSearches: cloudSearchesNewer ? remote.recentSearches : local.recentSearches,
    searchesUpdatedAt: Math.max(local.searchesUpdatedAt, remote.searchesUpdatedAt),
  };
}

/**
 * Server-side save rules (used by src/convex/sync.ts). The incoming client
 * state wins for bookmarks (post-merge it is authoritative), while settings,
 * searches and last-read keep the freshest side so two devices racing cannot
 * roll back a newer edit.
 */
export function mergeForSave(
  existing: CloudSyncDoc | null | undefined,
  incoming: LocalSyncState,
  now: number,
): LocalSyncState & { updatedAt: number } {
  const prev = existing ? docToLocal(existing) : null;
  const takeIncomingSettings = !prev || incoming.settingsUpdatedAt >= prev.settingsUpdatedAt;
  const takeIncomingSearches = !prev || incoming.searchesUpdatedAt >= prev.searchesUpdatedAt;

  let lastRead: SyncLastRead | null = incoming.lastRead;
  if (prev?.lastRead) {
    if (!incoming.lastRead || prev.lastRead.updatedAt > incoming.lastRead.updatedAt) {
      lastRead = prev.lastRead;
    }
  }

  return {
    settings: takeIncomingSettings ? incoming.settings : prev!.settings,
    settingsUpdatedAt: prev
      ? Math.max(prev.settingsUpdatedAt, incoming.settingsUpdatedAt)
      : incoming.settingsUpdatedAt,
    bookmarks: sanitizeBookmarks(incoming.bookmarks),
    lastRead,
    recentSearches: takeIncomingSearches ? incoming.recentSearches : prev!.recentSearches,
    searchesUpdatedAt: prev
      ? Math.max(prev.searchesUpdatedAt, incoming.searchesUpdatedAt)
      : incoming.searchesUpdatedAt,
    updatedAt: now,
  };
}

/**
 * Stable fingerprint of the sync payload. Only the payload matters — doc
 * metadata (_id, updatedAt, userId) is excluded so equal content always has
 * an equal fingerprint on both sides of the wire.
 */
export function fingerprint(state: LocalSyncState): string {
  return JSON.stringify([
    [
      state.settings.theme,
      state.settings.arabicFontSize,
      state.settings.showTranslation,
      state.settings.reciter,
      state.settings.continuousPlayback,
    ],
    state.settingsUpdatedAt,
    state.bookmarks.map((b) => [b.surah, b.ayah, b.addedAt]),
    state.lastRead ? [state.lastRead.surah, state.lastRead.ayah, state.lastRead.updatedAt] : null,
    state.recentSearches,
    state.searchesUpdatedAt,
  ]);
}
