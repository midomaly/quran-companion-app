/**
 * Persistent app state: appearance settings, bookmarks, last-read position and
 * recent searches. Everything is stored in localStorage on this device first —
 * reading the Qur'an never requires sign-in. When an account is signed in
 * (phase 2), <CloudSync> (src/lib/app-sync.ts) merges this device state with
 * the user's cloud doc and keeps the two reconciled in both directions.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CloudSync } from "./app-sync";
import { isKnownReciter, type Reciter } from "./quranApi";
import type { LocalSyncState } from "./sync-state";

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface Settings {
  theme: ThemeChoice;
  /** Arabic (Uthmani) font size in px */
  arabicFontSize: number;
  /** Show the English translation under each ayah */
  showTranslation: boolean;
  reciter: Reciter["id"];
  /** Keep playing ayah by ayah within a surah */
  continuousPlayback: boolean;
}

export interface Bookmark {
  surah: number;
  ayah: number;
  addedAt: number;
}

export interface LastRead {
  surah: number;
  ayah: number;
  updatedAt: number;
}

const SETTINGS_KEY = "noor:settings";
const BOOKMARKS_KEY = "noor:bookmarks";
const LAST_READ_KEY = "noor:lastRead";
const RECENT_KEY = "noor:recentSearches";
// Freshness stamps for last-writer-wins sync of settings / searches.
const SETTINGS_AT_KEY = "noor:settingsUpdatedAt";
const SEARCHES_AT_KEY = "noor:searchesUpdatedAt";

export const MIN_ARABIC_FONT_SIZE = 20;
export const MAX_ARABIC_FONT_SIZE = 64;
export const DEFAULT_ARABIC_FONT_SIZE = 30;

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  arabicFontSize: DEFAULT_ARABIC_FONT_SIZE,
  showTranslation: true,
  reciter: "ar.alafasy",
  continuousPlayback: true,
};

const MAX_RECENT_SEARCHES = 8;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function clampFontSize(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : DEFAULT_ARABIC_FONT_SIZE;
  return Math.min(MAX_ARABIC_FONT_SIZE, Math.max(MIN_ARABIC_FONT_SIZE, n));
}

function loadSettings(): Settings {
  const stored = safeParse<Partial<Settings>>(safeGet(SETTINGS_KEY));
  if (!stored) return DEFAULT_SETTINGS;
  const theme: ThemeChoice =
    stored.theme === "light" || stored.theme === "dark" || stored.theme === "system"
      ? stored.theme
      : DEFAULT_SETTINGS.theme;
  return {
    theme,
    arabicFontSize: clampFontSize(stored.arabicFontSize),
    showTranslation:
      typeof stored.showTranslation === "boolean"
        ? stored.showTranslation
        : DEFAULT_SETTINGS.showTranslation,
    reciter:
      typeof stored.reciter === "string" && isKnownReciter(stored.reciter)
        ? stored.reciter
        : DEFAULT_SETTINGS.reciter,
    continuousPlayback:
      typeof stored.continuousPlayback === "boolean"
        ? stored.continuousPlayback
        : DEFAULT_SETTINGS.continuousPlayback,
  };
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — session still works in memory */
  }
}

function isValidRef(surah: unknown, ayah: unknown): surah is number {
  return (
    typeof surah === "number" &&
    Number.isInteger(surah) &&
    surah >= 1 &&
    surah <= 114 &&
    typeof ayah === "number" &&
    Number.isInteger(ayah) &&
    ayah >= 1
  );
}

function loadBookmarks(): Bookmark[] {
  const stored = safeParse<unknown>(safeGet(BOOKMARKS_KEY));
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(
      (b): b is Bookmark =>
        !!b &&
        typeof b === "object" &&
        isValidRef((b as Bookmark).surah, (b as Bookmark).ayah),
    )
    .map((b) => ({
      surah: b.surah,
      ayah: b.ayah,
      addedAt: typeof b.addedAt === "number" ? b.addedAt : 0,
    }))
    .sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);
}

function loadLastRead(): LastRead | null {
  const stored = safeParse<Partial<LastRead>>(safeGet(LAST_READ_KEY));
  if (!stored) return null;
  const { surah, ayah } = stored;
  if (!isValidRef(surah, ayah) || typeof ayah !== "number") return null;
  return {
    surah,
    ayah,
    updatedAt: typeof stored.updatedAt === "number" ? stored.updatedAt : 0,
  };
}

function loadTimestamp(key: string): number {
  const n = safeParse<number>(safeGet(key));
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

/** Strictly monotonic now — keeps LWW correct even with clock skew. */
function bumpTimestamp(prev: number, key: string): number {
  const next = Math.max(Date.now(), prev + 1);
  safeSet(key, next);
  return next;
}

function loadRecentSearches(): string[] {
  const stored = safeParse<unknown>(safeGet(RECENT_KEY));
  if (!Array.isArray(stored)) return [];
  return stored.filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, MAX_RECENT_SEARCHES);
}

export interface AppStateValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  theme: ResolvedTheme;
  bookmarks: Bookmark[];
  isBookmarked: (surah: number, ayah: number) => boolean;
  toggleBookmark: (surah: number, ayah: number) => boolean;
  lastRead: LastRead | null;
  setLastRead: (surah: number, ayah: number) => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadBookmarks);
  const [lastRead, setLastReadState] = useState<LastRead | null>(loadLastRead);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState<number>(() =>
    loadTimestamp(SETTINGS_AT_KEY),
  );
  const [searchesUpdatedAt, setSearchesUpdatedAt] = useState<number>(() =>
    loadTimestamp(SEARCHES_AT_KEY),
  );
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Track OS theme changes while "system" is selected.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const theme: ResolvedTheme =
    settings.theme === "system" ? (systemDark ? "dark" : "light") : settings.theme;

  // Apply theme to the document so `.dark` CSS variables take effect.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0a2f24" : "#0b5540");
  }, [theme]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next: Settings = {
        ...prev,
        ...patch,
        arabicFontSize: clampFontSize(patch.arabicFontSize ?? prev.arabicFontSize),
      };
      safeSet(SETTINGS_KEY, next);
      return next;
    });
    setSettingsUpdatedAt((prev) => bumpTimestamp(prev, SETTINGS_AT_KEY));
  }, []);

  const isBookmarked = useCallback(
    (surah: number, ayah: number) => bookmarks.some((b) => b.surah === surah && b.ayah === ayah),
    [bookmarks],
  );

  const toggleBookmark = useCallback(
    (surah: number, ayah: number): boolean => {
      const exists = bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
      const next = exists
        ? bookmarks.filter((b) => !(b.surah === surah && b.ayah === ayah))
        : [...bookmarks, { surah, ayah, addedAt: Date.now() }].sort(
            (a, b) => a.surah - b.surah || a.ayah - b.ayah,
          );
      safeSet(BOOKMARKS_KEY, next);
      setBookmarks(next);
      return !exists;
    },
    [bookmarks],
  );

  const setLastRead = useCallback((surah: number, ayah: number) => {
    setLastReadState((prev) => {
      if (prev && prev.surah === surah && prev.ayah === ayah) return prev;
      const next: LastRead = { surah, ayah, updatedAt: Date.now() };
      safeSet(LAST_READ_KEY, next);
      return next;
    });
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    const q = query.trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((p) => p !== q)].slice(0, MAX_RECENT_SEARCHES);
      safeSet(RECENT_KEY, next);
      return next;
    });
    setSearchesUpdatedAt((prev) => bumpTimestamp(prev, SEARCHES_AT_KEY));
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    safeSet(RECENT_KEY, []);
    setSearchesUpdatedAt((prev) => bumpTimestamp(prev, SEARCHES_AT_KEY));
  }, []);

  /** Current sync payload — called fresh by the sync engine on each reconcile. */
  const snapshot = useCallback(
    (): LocalSyncState => ({
      settings,
      settingsUpdatedAt,
      bookmarks,
      lastRead,
      recentSearches,
      searchesUpdatedAt,
    }),
    [settings, settingsUpdatedAt, bookmarks, lastRead, recentSearches, searchesUpdatedAt],
  );

  /** Adopt state that arrived from the cloud: React state + localStorage. */
  const apply = useCallback((incoming: LocalSyncState) => {
    const reciter = isKnownReciter(incoming.settings.reciter)
      ? incoming.settings.reciter
      : DEFAULT_SETTINGS.reciter;
    const nextSettings: Settings = {
      ...incoming.settings,
      reciter,
      arabicFontSize: clampFontSize(incoming.settings.arabicFontSize),
    };
    const nextBookmarks = [...incoming.bookmarks].sort(
      (a, b) => a.surah - b.surah || a.ayah - b.ayah,
    );
    const nextSearches = incoming.recentSearches.slice(0, MAX_RECENT_SEARCHES);
    setSettings(nextSettings);
    safeSet(SETTINGS_KEY, nextSettings);
    setBookmarks(nextBookmarks);
    safeSet(BOOKMARKS_KEY, nextBookmarks);
    setLastReadState(incoming.lastRead);
    safeSet(LAST_READ_KEY, incoming.lastRead);
    setRecentSearches(nextSearches);
    safeSet(RECENT_KEY, nextSearches);
    setSettingsUpdatedAt(incoming.settingsUpdatedAt);
    safeSet(SETTINGS_AT_KEY, incoming.settingsUpdatedAt);
    setSearchesUpdatedAt(incoming.searchesUpdatedAt);
    safeSet(SEARCHES_AT_KEY, incoming.searchesUpdatedAt);
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      settings,
      updateSettings,
      theme,
      bookmarks,
      isBookmarked,
      toggleBookmark,
      lastRead,
      setLastRead,
      recentSearches,
      addRecentSearch,
      clearRecentSearches,
    }),
    [
      settings,
      updateSettings,
      theme,
      bookmarks,
      isBookmarked,
      toggleBookmark,
      lastRead,
      setLastRead,
      recentSearches,
      addRecentSearch,
      clearRecentSearches,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      <CloudSync bridge={{ snapshot, apply }} />
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used inside <AppStateProvider>");
  }
  return ctx;
}
