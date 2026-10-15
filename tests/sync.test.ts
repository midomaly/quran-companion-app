/**
 * Phase 2 — accounts & sync: merge rules are the heart of correctness here
 * (nothing may be lost at sign-in, no device can roll back a newer edit), so
 * they are tested directly against the shared pure module.
 * Run with: bun test
 */
import { describe, expect, test } from "bun:test";
import {
  MAX_SYNC_FONT_SIZE,
  MAX_SYNC_SEARCHES,
  docToLocal,
  fingerprint,
  mergeForSave,
  mergeLocalAndCloud,
  sanitizeBookmarks,
  sanitizeLastRead,
  sanitizeSearches,
  sanitizeSettings,
  type CloudSyncDoc,
  type LocalSyncState,
} from "../src/lib/sync-state";

function local(over: Partial<LocalSyncState> = {}): LocalSyncState {
  return {
    settings: {
      theme: "system",
      arabicFontSize: 30,
      showTranslation: true,
      reciter: "ar.alafasy",
      continuousPlayback: true,
    },
    settingsUpdatedAt: 1_000,
    bookmarks: [{ surah: 1, ayah: 5, addedAt: 100 }],
    lastRead: { surah: 2, ayah: 30, updatedAt: 500 },
    recentSearches: ["mercy"],
    searchesUpdatedAt: 1_000,
    ...over,
  };
}

function cloud(over: Partial<CloudSyncDoc> = {}): CloudSyncDoc {
  const base = local();
  return {
    userId: "user1",
    settings: base.settings,
    settingsUpdatedAt: base.settingsUpdatedAt,
    bookmarks: base.bookmarks,
    lastRead: base.lastRead ?? undefined,
    recentSearches: base.recentSearches,
    searchesUpdatedAt: base.searchesUpdatedAt,
    ...over,
  };
}

describe("sanitizeBookmarks", () => {
  test("drops malformed entries and keeps valid ones sorted", () => {
    const out = sanitizeBookmarks([
      { surah: 2, ayah: 3, addedAt: 5 },
      { surah: 1, ayah: 10, addedAt: 5 },
      { surah: 0, ayah: 1, addedAt: 5 }, // invalid surah
      { surah: 115, ayah: 1, addedAt: 5 }, // out of range
      { surah: 3, ayah: -1, addedAt: 5 }, // invalid ayah
      { surah: "2", ayah: 3, addedAt: 5 }, // wrong type
      null,
      "nonsense",
    ]);
    expect(out).toEqual([
      { surah: 1, ayah: 10, addedAt: 5 },
      { surah: 2, ayah: 3, addedAt: 5 },
    ]);
  });

  test("dedupes by surah:ayah keeping the newest addedAt", () => {
    const out = sanitizeBookmarks([
      { surah: 5, ayah: 1, addedAt: 10 },
      { surah: 5, ayah: 1, addedAt: 99 },
      { surah: 5, ayah: 1, addedAt: 40 },
    ]);
    expect(out).toEqual([{ surah: 5, ayah: 1, addedAt: 99 }]);
  });
});

describe("sanitizeSettings / searches / lastRead", () => {
  test("clamps font size into range", () => {
    const s = sanitizeSettings({ arabicFontSize: 999 }, null)!;
    expect(s.arabicFontSize).toBe(MAX_SYNC_FONT_SIZE);
    const s2 = sanitizeSettings({ arabicFontSize: 1 }, null)!;
    expect(s2.arabicFontSize).toBe(20);
  });

  test("falls back per-field on invalid values", () => {
    const s = sanitizeSettings(
      { theme: "neon", showTranslation: "yes", reciter: "", arabicFontSize: NaN },
      null,
    )!;
    expect(s.theme).toBe("system");
    expect(s.showTranslation).toBe(true);
    expect(s.reciter).toBe("ar.alafasy");
    expect(s.arabicFontSize).toBe(30);
  });

  test("searches: trims, dedupes, drops junk, caps", () => {
    const out = sanitizeSearches([
      "  mercy  ",
      "mercy",
      "",
      "   ",
      42,
      "light",
      "mercy",
      ...Array.from({ length: 20 }, (_, i) => `q${i}`),
    ]);
    expect(out[0]).toBe("mercy");
    expect(out[1]).toBe("light");
    expect(new Set(out).size).toBe(out.length);
    expect(out.length).toBeLessThanOrEqual(MAX_SYNC_SEARCHES);
  });

  test("lastRead: valid kept, junk returns null", () => {
    expect(sanitizeLastRead({ surah: 1, ayah: 1, updatedAt: 5 })).toEqual({
      surah: 1,
      ayah: 1,
      updatedAt: 5,
    });
    expect(sanitizeLastRead({ surah: 999, ayah: 1 })).toBeNull();
    expect(sanitizeLastRead(undefined)).toBeNull();
  });
});

describe("mergeLocalAndCloud", () => {
  test("unions bookmarks from both sides, newest addedAt wins", () => {
    const l = local({ bookmarks: [{ surah: 1, ayah: 5, addedAt: 100 }] });
    const c = cloud({ bookmarks: [{ surah: 1, ayah: 5, addedAt: 7 }, { surah: 2, ayah: 256, addedAt: 50 }] });
    const merged = mergeLocalAndCloud(l, c);
    expect(merged.bookmarks).toEqual([
      { surah: 1, ayah: 5, addedAt: 100 },
      { surah: 2, ayah: 256, addedAt: 50 },
    ]);
  });

  test("newest lastRead wins, null sides handled", () => {
    const newer = { surah: 40, ayah: 1, updatedAt: 900 };
    const older = { surah: 2, ayah: 30, updatedAt: 500 };
    expect(mergeLocalAndCloud(local({ lastRead: newer }), cloud({ lastRead: older })).lastRead).toEqual(newer);
    expect(mergeLocalAndCloud(local({ lastRead: older }), cloud({ lastRead: newer })).lastRead).toEqual(newer);
    expect(mergeLocalAndCloud(local({ lastRead: null }), cloud({ lastRead: newer })).lastRead).toEqual(newer);
    expect(mergeLocalAndCloud(local({ lastRead: newer }), cloud({ lastRead: null })).lastRead).toEqual(newer);
  });

  test("settings & searches: last writer wins by timestamp", () => {
    const localSettings = local({
      settings: { ...local().settings, arabicFontSize: 44 },
      settingsUpdatedAt: 2_000,
    });
    const cloudSide = cloud({
      settings: { ...local().settings, reciter: "ar.husary" },
      settingsUpdatedAt: 5_000,
    });
    const merged = mergeLocalAndCloud(localSettings, cloudSide);
    expect(merged.settings.reciter).toBe("ar.husary"); // cloud newer
    expect(merged.settings.arabicFontSize).toBe(30);
    expect(merged.settingsUpdatedAt).toBe(5_000);

    const merged2 = mergeLocalAndCloud(localSettings, cloud({ settingsUpdatedAt: 500 }));
    expect(merged2.settings.arabicFontSize).toBe(44); // local newer
    expect(merged2.settingsUpdatedAt).toBe(2_000);
  });

  test("null cloud returns the local content unchanged", () => {
    const l = local();
    const merged = mergeLocalAndCloud(l, null);
    expect(fingerprint(merged)).toBe(fingerprint(l));
  });

  test("is idempotent: merge(merge(a,b), b) === merge(a,b)", () => {
    const l = local({ bookmarks: [{ surah: 1, ayah: 1, addedAt: 10 }], settingsUpdatedAt: 100 });
    const c = cloud({
      bookmarks: [{ surah: 2, ayah: 2, addedAt: 20 }],
      settingsUpdatedAt: 900,
      lastRead: { surah: 5, ayah: 5, updatedAt: 800 },
    });
    const once = mergeLocalAndCloud(l, c);
    const twice = mergeLocalAndCloud(once, c);
    expect(fingerprint(twice)).toBe(fingerprint(once));
  });
});

describe("mergeForSave (server rules)", () => {
  test("fresh insert takes the incoming state", () => {
    const out = mergeForSave(null, local(), 12_345);
    expect(out.settings.arabicFontSize).toBe(30);
    expect(out.updatedAt).toBe(12_345);
  });

  test("incoming settings older than existing are NOT applied (no rollback)", () => {
    const existing = cloud({
      settings: { ...local().settings, reciter: "ar.husary" },
      settingsUpdatedAt: 9_000,
    });
    const incoming = local({
      settings: { ...local().settings, arabicFontSize: 40 },
      settingsUpdatedAt: 3_000,
    });
    const out = mergeForSave(existing, incoming, 1);
    expect(out.settings.reciter).toBe("ar.husary"); // existing (newer) kept
    expect(out.settingsUpdatedAt).toBe(9_000);
  });

  test("incoming settings newer ARE applied", () => {
    const existing = cloud({ settingsUpdatedAt: 1_000 });
    const incoming = local({
      settings: { ...local().settings, arabicFontSize: 40 },
      settingsUpdatedAt: 9_000,
    });
    const out = mergeForSave(existing, incoming, 1);
    expect(out.settings.arabicFontSize).toBe(40);
    expect(out.settingsUpdatedAt).toBe(9_000);
  });

  test("lastRead keeps the newest; bookmarks are replaced (removals stick)", () => {
    const existing = cloud({
      lastRead: { surah: 9, ayah: 9, updatedAt: 9_000 },
      bookmarks: [{ surah: 1, ayah: 1, addedAt: 1 }, { surah: 3, ayah: 3, addedAt: 1 }],
    });
    const incoming = local({
      lastRead: { surah: 2, ayah: 2, updatedAt: 2_000 },
      bookmarks: [{ surah: 1, ayah: 1, addedAt: 1 }],
    });
    const out = mergeForSave(existing, incoming, 1);
    expect(out.lastRead).toEqual({ surah: 9, ayah: 9, updatedAt: 9_000 });
    expect(out.bookmarks).toEqual([{ surah: 1, ayah: 1, addedAt: 1 }]); // surah 3 removal kept
  });

  test("searches: newest side wins (clearing from the newer device sticks)", () => {
    const existing = cloud({ recentSearches: ["old"], searchesUpdatedAt: 9_000 });
    const incoming = local({ recentSearches: ["new"], searchesUpdatedAt: 1_000 });
    const out = mergeForSave(existing, incoming, 1);
    expect(out.recentSearches).toEqual(["old"]);
    const out2 = mergeForSave(existing, { ...incoming, searchesUpdatedAt: 10_000 }, 1);
    expect(out2.recentSearches).toEqual(["new"]);
  });
});

describe("fingerprint", () => {
  test("cloud doc and identical local state fingerprint equal (metadata ignored)", () => {
    const l = local();
    const doc = { ...cloud(), _id: "abc", _creationTime: 42 } as CloudSyncDoc;
    expect(fingerprint(docToLocal(doc))).toBe(fingerprint(l));
  });

  test("any content change changes the fingerprint", () => {
    const l = local();
    expect(fingerprint(local({ bookmarks: [] }))).not.toBe(fingerprint(l));
    expect(fingerprint(local({ settingsUpdatedAt: 2 }))).not.toBe(fingerprint(l));
    expect(fingerprint(local({ lastRead: null }))).not.toBe(fingerprint(l));
  });
});
