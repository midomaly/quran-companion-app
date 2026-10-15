import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Phase 2 — accounts & sync: the signed-in reader's state, mirrored from
    // src/lib/app-state.tsx so bookmarks, last-read position, settings and
    // recent searches follow the account across devices. One doc per user.
    syncState: defineTable({
      userId: v.id("users"),
      settings: v.object({
        theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
        arabicFontSize: v.number(),
        showTranslation: v.boolean(),
        // verified translation edition id, e.g. "en.sahih" (optional for
        // docs written before the translation picker existed)
        translation: v.optional(v.string()),
        reciter: v.string(),
        continuousPlayback: v.boolean(),
      }),
      settingsUpdatedAt: v.number(),
      bookmarks: v.array(
        v.object({ surah: v.number(), ayah: v.number(), addedAt: v.number() }),
      ),
      lastRead: v.optional(
        v.object({ surah: v.number(), ayah: v.number(), updatedAt: v.number() }),
      ),
      recentSearches: v.array(v.string()),
      searchesUpdatedAt: v.number(),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    // add other tables here

    // tableName: defineTable({
    //   ...
    //   // table fields
    // }).index("by_field", ["field"])
  },
  {
    schemaValidation: false,
  },
);

export default schema;
