## Noor Al-Islam — The Complete Qur'an & Muslim Companion

**You read the Qur'an** — all 114 surahs, all 6,236 ayahs, in Uthmani script
with your choice of 8 verified translations, recitation audio, bookmarks,
search and offline reading — and the app covers the rest of a Muslim's day: prayer
times with alarms, Qibla, tasbih, duas, hadith and a Hijri calendar. No
account is ever required to read.

### Features

- **Splash + branding**: emerald/gold identity, crescent mark, Islamic
  geometric pattern, light & dark mode.
- **Home dashboard**: "As-salamu alaikum" greeting, Gregorian + Hijri (Umm
  al-Qura) dates with local time, Continue Reading (persisted last-read
  position), Verse of the Day (real ayah from the source, changes daily),
  quick links into the Qur'an and every companion section.
- **Interface in 5 languages**: English, العربية (full RTL), Français,
  Hausa and Yorùbá — chosen in Settings. The UI language is independent of
  the Qur'an translation: no unverified translation is ever substituted.
- **Qur'an hub** (`/quran`): all 114 surahs (filterable), all 30 juz,
  full-text search (English translation + Arabic Uthmani), bookmarks tab,
  and a **Plans** tab — Khatmah planner with 7/15/30/90-day targets, juz
  logging and honest behind/ahead pace commentary.
- **Reader** (`/quran/:surahId`): Uthmani text + your chosen translation,
  ornamental basmala line, adjustable Arabic font size, ayah jump,
  bookmark/copy/share/note per ayah, **personal ayah notes** (device-local),
  **per-ayah tafsir** (Ibn Kathir Abridged in English, Tafsir al-Muyassar
  in Arabic — labelled scholarly commentary, fetched on demand),
  **loop-range playback** for memorisation (from–to ayahs × 3/5/10/∞),
  automatic last-read tracking, reading progress bar, verse-by-verse audio
  (7 reciters, play/pause/prev/next/continuous/repeat/speed, lock-screen
  media controls).
- **8 verified translation editions**: Saheeh, Pickthall, Yusuf Ali,
  Hilali & Khan, Français (Hamidullah), Hausa (Gumi), Indonesia (Kemenag)
  and Türkçe (Diyanet) — every identifier was verified live against the
  source before being listed. The choice syncs to your account and caches
  per edition for offline reading.
- **Prayer times** (`/prayer`): an offline astronomical engine (PrayTimes-
  style solar position math) computes Fajr→Isha for your location with 9
  calculation methods, Madhab/Asr choice and high-latitude fallback;
  countdown to the next prayer, notification permission, and per-prayer
  adhān alarms that chime in-app (reminder host runs app-wide).
- **Notification center** (`/reminders`): personal reminders with weekday
  schedules, quiet hours and snooze — same honest in-app engine.
- **Qibla** (`/qibla`): great-circle bearing and distance to the Kaaba from
  your prayer location, live device-compass with permission/denied/no-
  sensor fallbacks, magnetic-interference warning with figure-eight
  recalibration guidance, city quick-picks.
- **Tasbih** (`/tasbih`): tap-to-count with haptics and a completion chime
  (both toggleable), target rings, **custom dhikr phrases and targets**,
  **undo** (button + Ctrl+Z), reset confirmation, auto-logged **session
  history** with today/yesterday/lifetime stats and a 7-day chart.
- **Duas** (`/duas`): curated authentic supplications (morning/evening,
  prayer, travel, food, distress…) with Arabic, transliteration and
  translation — **searchable**, with **favorites**, per-dua **repeat
  counters** (1/3/7/33/100) and **share**.
- **Hadith** (`/hadith`): attributed hadith collection including the Forty of
  an-Nawawi, with narrator grading.
- **Hijri calendar** (`/calendar`): **month/week/day views** with dual Hijri/
  Gregorian dates (Umm al-Qura via Intl), **±2-day manual adjustment**
  applied app-wide, Islamic events (Ramadan, Eids, ʿĀshūrāʾ, Laylat
  al-Qadr…) **plus your own events with optional reminders**, a
  **Hijri↔Gregorian converter**, share-a-day and a printable month.
- **Learning center** (`/learn`): guides (pillars, wuḍūʾ, ṣalāh), a Seerah
  timeline and a short quiz — educational material, kept separate from
  Qur'an and hadith, with a "practice questions belong with a qualified
  scholar" notice.
- **Ramadan & zakat** (`/ramadhan`): Ramadan tools and a zakāt calculator
  (pure, unit-tested math).
- **Worship tracker** (`/tracker`): a gentle daily checklist (prayers, Qur'an,
  adhkar, fasting, charity, memorization) with streaks and a 7-day view.
- **Mosque finder** (`/mosques`): real nearby masjids from OpenStreetMap
  (Overpass mirrors) with distances, addresses and directions — nothing
  invented, with graceful fallback when the service is unreachable.
- **Offline & downloads** (`/downloads`): download/remove per-surah text,
  cache inventory with sizes, storage usage, network + sync status, clear-
  all with confirmation. Every surah read once is cached on-device; an
  offline banner and graceful error states cover the rest.
- **Accounts & sync**: sign in (`/auth`) and bookmarks, last-read position,
  settings (incl. translation edition) and recent searches merge across
  devices via Convex — while everything continues to work fully offline
  without an account.
- **Settings**: theme, language, Arabic size, translation edition, reciter,
  source attribution, offline-cache management. All preferences persist
  locally.

### Data sources (attribution)

- Qur'an text: Uthmani script via the [AlQuran Cloud API](https://alquran.cloud)
  from [Tanzil.net](https://tanzil.net) (CC BY 3.0 — keep this notice when
  redistributing).
- Translations: AlQuran Cloud editions — Saheeh International (default),
  Pickthall, Yusuf Ali, Hilali & Khan, Hamidullah (French), Gumi (Hausa),
  Kemenag (Indonesian), Diyanet (Turkish); every translator is attributed
  in the in-app picker.
- Tafsir: [Qur'an.com API](https://api.quran.com) — Ibn Kathir (Abridged,
  English) and Tafsir al-Muyassar (Arabic). Shown as scholarly commentary,
  not scripture; needs a connection.
- Verse audio: `cdn.islamic.network` (streamed, not redistributed).
- Mosques: © [OpenStreetMap](https://www.openstreetmap.org/copyright)
  contributors (ODbL) via the Overpass API.
- Prayer times / Qibla: computed on-device (PrayTimes-style solar math and
  great-circle bearing) — no server involved.

### Commands

```bash
bun run dev         # start the dev server (the platform runs this for you)
bun tsc -b --noEmit # typecheck
bun run lint        # eslint
bun test            # unit tests (render smoke, metadata, prayer times, sync rules)
bun run verify:data # live check of all 114 surahs/6,236 ayahs against the source
```

### Project layout

- `src/lib/surahs.ts` — verified surah + juz metadata (do not hand-edit)
- `src/lib/quranApi.ts` — data client, offline cache, search, audio, tafsir
- `src/lib/translation-editions.ts` — live-verified translation editions
- `src/lib/quranText.ts` — pure display helpers (basmala split, daily ayah)
- `src/lib/plans.ts` — Khatmah (Qur'an completion) planner math
- `src/lib/prayerTimes.ts` — offline astronomical prayer time engine
- `src/lib/prayerSettings.ts` — method/madhab presets, alarms, next-prayer math
- `src/lib/qibla.ts` — great-circle bearing to the Kaaba
- `src/lib/hijri.ts` — Hijri parts, Islamic events, ± adjustment, conversion
- `src/lib/reminders.ts` + `src/lib/events.ts` — reminder engine, personal events
- `src/lib/zakat.ts` — zakāt math (pure functions, unit-tested)
- `src/lib/i18n.tsx` — 5-language interface (incl. full RTL Arabic)
- `src/lib/app-state.tsx` — settings/bookmarks/last-read (localStorage)
- `src/lib/sync-state.ts` + `src/lib/app-sync.tsx` — pure merge rules and the
  Convex-backed account sync engine (`src/convex/sync.ts`)
- `src/components/AppShell.tsx` — splash, bottom nav, offline banner
- `src/components/PrayerReminderHost.tsx` / `src/components/ReminderHost.tsx` —
  adhān and personal-reminder engines (run app-wide)
- `src/data/` — curated duas, hadith and learning content
- `src/pages/` — `Home`, `QuranHub`, `Reader`, `Prayer`, `Qibla`, `Tasbih`,
  `Duas`, `Hadith`, `CalendarPage`, `Reminders`, `Ramadhan`, `Mosques`,
  `Learn`, `Downloads`, `Tracker`, plus `Auth` and `Dashboard`
- `scripts/verify-live-data.ts` — religious-data integrity check

### Scope notes

Nothing here requires an account — reading, prayer times, alarms and all
companion tools work fully offline without sign-in; signing in (`/auth` →
`/dashboard`) only mirrors bookmarks, last-read position, settings and
recent searches across devices. Reminders and adhān alarms are honest
in-app notifications: they fire while the app is open (Web Notifications
API, no push service is configured), never silently pretending otherwise.

---

## Overview

This project uses the following tech stack:
- Vite
- Typescript
- React Router v7 (all imports from `react-router` instead of `react-router-dom`)
- React 19 (for frontend components)
- Tailwind v4 (for styling)
- Shadcn UI (for UI components library)
- Lucide Icons (for icons)
- Convex (for backend & database)
- Convex Auth (for authentication)
- Framer Motion (for animations)
- Three js (for 3d models)

All relevant files live in the 'src' directory.

Use bun for the package manager.

## Setup

This project is set up already and running on a cloud environment, as well as a convex development in the sandbox.

## Environment Variables

The project is set up with project specific CONVEX_DEPLOYMENT and VITE_CONVEX_URL environment variables on the client side.

The convex server has a separate set of environment variables that are accessible by the convex backend.

Currently, these variables include auth-specific keys: JWKS, JWT_PRIVATE_KEY, and SITE_URL.


# Using Authentication (Important!)

You must follow these conventions when using authentication.

## Auth is already set up.

All convex authentication functions are already set up. The auth currently uses email OTP and anonymous users, but can support more.

The email OTP configuration is defined in `src/convex/auth/emailOtp.ts`. DO NOT MODIFY THIS FILE.

Also, DO NOT MODIFY THESE AUTH FILES: `src/convex/auth.config.ts` and `src/convex/auth.ts`.

## Using Convex Auth on the backend

On the `src/convex/users.ts` file, you can use the `getCurrentUser` function to get the current user's data.

## Using Convex Auth on the frontend

The `/auth` page is already set up to use auth. Navigate to `/auth` for all log in / sign up sequences.

You MUST use this hook to get user data. Never do this yourself without the hook:
```typescript
import { useAuth } from "@/hooks/use-auth";

const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
```

## Protected Routes

The starter `/dashboard` route is protected with `RequireAuth`. Extend that page
for the product's authenticated experience, and reuse `RequireAuth` when adding
another protected route — do NOT hand-roll a redirect to `/auth`, since landing
on a bare sign-in form with no explanation of what was blocked is confusing.

`RequireAuth` states the block on the page the visitor asked for and sends them
to `/auth?returnTo=<current route>` when they choose to sign in, so they come
back to it. Pass `title` and `description` to say what the page is:

```tsx
<Route
  path="/dashboard"
  element={
    <RequireAuth
      title="Sign in to view your dashboard"
      description="Your projects and settings live here."
    >
      <Dashboard />
    </RequireAuth>
  }
/>
```

Pass `redirectImmediately` for a route where bouncing straight to `/auth` really
is better.

## Auth Page

The auth page is defined in `src/pages/Auth.tsx`. Send sign-in and sign-up actions
to `/auth`.

## Authorization

You can perform authorization checks on the frontend and backend.

On the frontend, you can use the `useAuth` hook to get the current user's data and authentication state.

You should also be protecting queries, mutations, and actions at the base level, checking for authorization securely.

## Adding a redirect after auth

The `/auth` route in `src/main.tsx` redirects to `/dashboard` by default. If the
product's main authenticated route is different, update `redirectAfterAuth` to
that route. A validated same-origin `returnTo` query parameter takes priority so
users can resume the protected page they originally requested. Never leave an
authenticated product redirecting back to the public landing page.

## Complete authenticated products

When the requested product implies accounts, a workspace, a dashboard, or other
signed-in functionality, the task is not complete with only a landing page and
auth form. Build the main authenticated experience, protect its route, and verify
that signing in reaches it.

# Frontend Conventions

You will be using the Vite frontend with React 19, Tailwind v4, and Shadcn UI.

Generally, pages should be in the `src/pages` folder, and components should be in the `src/components` folder.

Shadcn primitives are located in the `src/components/ui` folder and should be used by default.

## Page routing

Your page component should go under the `src/pages` folder.

When adding a page, update the react router configuration in `src/main.tsx` to include the new route you just added.

## Shad CN conventions

Follow these conventions when using Shad CN components, which you should use by default.
- Remember to use "cursor-pointer" to make the element clickable
- For title text, use the "tracking-tight font-bold" class to make the text more readable
- Always make apps MOBILE RESPONSIVE. This is important
- AVOID NESTED CARDS. Try and not to nest cards, borders, components, etc. Nested cards add clutter and make the app look messy.
- AVOID SHADOWS. Avoid adding any shadows to components. stick with a thin border without the shadow.
- Avoid skeletons; instead, use the loader2 component to show a spinning loading state when loading data.


## Landing Pages

You must always create good-looking designer-level styles to your application. 
- Make it well animated and fit a certain "theme", ie neo brutalist, retro, neumorphism, glass morphism, etc

Use known images and emojis from online.

If the user is logged in already, show the get started button to say "Dashboard" or "Profile" instead to take them there.

## Responsiveness and formatting

Make sure pages are wrapped in a container to prevent the width stretching out on wide screens. Always make sure they are centered aligned and not off-center.

Always make sure that your designs are mobile responsive. Verify the formatting to ensure it has correct max and min widths as well as mobile responsiveness.

- Always create sidebars for protected dashboard pages and navigate between pages
- Always create navbars for landing pages
- On these bars, the created logo should be clickable and redirect to the index page

## Animating with Framer Motion

You must add animations to components using Framer Motion. It is already installed and configured in the project.

To use it, import the `motion` component from `framer-motion` and use it to wrap the component you want to animate.


### Other Items to animate
- Fade in and Fade Out
- Slide in and Slide Out animations
- Rendering animations
- Button clicks and UI elements

Animate for all components, including on landing page and app pages.

## Three JS Graphics

Your app comes with three js by default. You can use it to create 3D graphics for landing pages, games, etc.


## Colors

You can override colors in: `src/index.css`

This uses the oklch color format for tailwind v4.

Always use these color variable names.

Make sure all ui components are set up to be mobile responsive and compatible with both light and dark mode.

Set theme using `dark` or `light` variables at the parent className.

## Styling and Theming

When changing the theme, always change the underlying theme of the shad cn components app-wide under `src/components/ui` and the colors in the index.css file.

Avoid hardcoding in colors unless necessary for a use case, and properly implement themes through the underlying shad cn ui components.

When styling, ensure buttons and clickable items have pointer-click on them (don't by default).

Always follow a set theme style and ensure it is tuned to the user's liking.

## Toasts

You should always use toasts to display results to the user, such as confirmations, results, errors, etc.

Use the shad cn Sonner component as the toaster. For example:

```
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
export function SonnerDemo() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Event has been created", {
          description: "Sunday, December 03, 2023 at 9:00 AM",
          action: {
            label: "Undo",
            onClick: () => console.log("Undo"),
          },
        })
      }
    >
      Show Toast
    </Button>
  )
}
```

Remember to import { toast } from "sonner". Usage: `toast("Event has been created.")`

## Dialogs

Always ensure your larger dialogs have a scroll in its content to ensure that its content fits the screen size. Make sure that the content is not cut off from the screen.

Ideally, instead of using a new page, use a Dialog instead. 

# Using the Convex backend

You will be implementing the convex backend. Follow your knowledge of convex and the documentation to implement the backend.

## The Convex Schema

You must correctly follow the convex schema implementation.

The schema is defined in `src/convex/schema.ts`.

Do not include the `_id` and `_creationTime` fields in your queries (it is included by default for each table).
Do not index `_creationTime` as it is indexed for you. Never have duplicate indexes.


## Convex Actions: Using CRUD operations

When running anything that involves external connections, you must use a convex action with "use node" at the top of the file.

You cannot have queries or mutations in the same file as a "use node" action file. Thus, you must use pre-built queries and mutations in other files.

You can also use the pre-installed internal crud functions for the database:

```ts
// in convex/users.ts
import { crud } from "convex-helpers/server/crud";
import schema from "./schema.ts";

export const { create, read, update, destroy } = crud(schema, "users");

// in some file, in an action:
const user = await ctx.runQuery(internal.users.read, { id: userId });

await ctx.runMutation(internal.users.update, {
  id: userId,
  patch: {
    status: "inactive",
  },
});
```


## Common Convex Mistakes To Avoid

When using convex, make sure:
- Document IDs are referenced as `_id` field, not `id`.
- Document ID types are referenced as `Id<"TableName">`, not `string`.
- Document object types are referenced as `Doc<"TableName">`.
- Keep schemaValidation to false in the schema file.
- You must correctly type your code so that it passes the type checker.
- You must handle null / undefined cases of your convex queries for both frontend and backend, or else it will throw an error that your data could be null or undefined.
- Always use the `@/folder` path, with `@/convex/folder/file.ts` syntax for importing convex files.
- This includes importing generated files like `@/convex/_generated/server`, `@/convex/_generated/api`
- Remember to import functions like useQuery, useMutation, useAction, etc. from `convex/react`
- NEVER have return type validators.
