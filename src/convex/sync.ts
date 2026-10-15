import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  docToLocal,
  mergeForSave,
  sanitizeBookmarks,
  sanitizeLastRead,
  sanitizeSearches,
  sanitizeSettings,
  type CloudSyncDoc,
} from "../lib/sync-state";
import { mutation, query } from "./_generated/server";

/**
 * Phase 2 — accounts & sync.
 *
 * `get` returns the signed-in user's sync doc (null when signed out or before
 * the first save). `save` writes the client's state using the shared merge
 * rules from src/lib/sync-state.ts, so two devices racing can never roll back
 * a newer setting, search list or last-read position.
 */

const settingsValidator = v.object({
  theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
  arabicFontSize: v.number(),
  showTranslation: v.boolean(),
  // optional so clients predating the translation picker keep working
  translation: v.optional(v.string()),
  reciter: v.string(),
  continuousPlayback: v.boolean(),
});

const bookmarkValidator = v.object({
  surah: v.number(),
  ayah: v.number(),
  addedAt: v.number(),
});

const lastReadValidator = v.object({
  surah: v.number(),
  ayah: v.number(),
  updatedAt: v.number(),
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db
      .query("syncState")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const save = mutation({
  args: {
    settings: settingsValidator,
    settingsUpdatedAt: v.number(),
    bookmarks: v.array(bookmarkValidator),
    lastRead: v.optional(lastReadValidator),
    recentSearches: v.array(v.string()),
    searchesUpdatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Sign in to sync your reading state.");
    }

    const incoming = docToLocal({
      settings: {
        ...args.settings,
        // `translation` is optional in the validator (older clients omit it);
        // normalize it here so the shared SyncSettings contract holds.
        translation: args.settings.translation ?? "en.sahih",
      },
      settingsUpdatedAt: args.settingsUpdatedAt,
      bookmarks: args.bookmarks,
      lastRead: args.lastRead ?? null,
      recentSearches: args.recentSearches,
      searchesUpdatedAt: args.searchesUpdatedAt,
    });

    const existing = await ctx.db
      .query("syncState")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    // The stored doc matches the save validator at runtime; the cast bridges
    // the optional `translation` field in the schema validator to the
    // normalized CloudSyncDoc shape (sanitizeSettings fills the default).
    const merged = mergeForSave(
      (existing as unknown as CloudSyncDoc | null) ?? null,
      incoming,
      Date.now(),
    );
    const doc = {
      userId,
      settings: merged.settings,
      settingsUpdatedAt: merged.settingsUpdatedAt,
      bookmarks: sanitizeBookmarks(merged.bookmarks),
      lastRead: merged.lastRead ?? undefined,
      recentSearches: sanitizeSearches(merged.recentSearches),
      searchesUpdatedAt: merged.searchesUpdatedAt,
      updatedAt: merged.updatedAt,
    };

    if (existing) {
      await ctx.db.replace(existing._id, doc);
    } else {
      await ctx.db.insert("syncState", doc);
    }
    return doc;
  },
});

/** Re-exported for callers that need to normalize raw input before saving. */
export { sanitizeLastRead, sanitizeSettings };
