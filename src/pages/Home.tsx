import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Layers,
  Loader2,
  Moon,
  RefreshCw,
  Search,
  Sun,
} from "lucide-react";
import { useNavigate } from "react-router";
import { CrescentMark } from "@/components/Brand";
import { SettingsButton } from "@/components/SettingsButton";
import { formatGregorianLong, formatGregorianShort, formatHijri, formatTime } from "@/lib/dates";
import { dailyAyahPick } from "@/lib/quranText";
import { useAppState } from "@/lib/app-state";
import { errorMessage, fetchSurahArabic, fetchSurahTranslation, type AyahText } from "@/lib/quranApi";
import { getSurah } from "@/lib/surahs";
import { cn } from "@/lib/utils";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

function relativeTime(ts: number): string {
  if (!ts) return "recently";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatGregorianShort(new Date(ts));
}

function greetingLabel(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function ThemeToggle() {
  const { theme, updateSettings } = useAppState();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => updateSettings({ theme: isDark ? "light" : "dark" })}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

const QUICK_LINKS = [
  { icon: BookOpen, label: "Surahs", to: "/quran?tab=surahs" },
  { icon: Layers, label: "Juz", to: "/quran?tab=juz" },
  { icon: Search, label: "Search", to: "/quran?tab=search" },
  { icon: Bookmark, label: "Bookmarks", to: "/quran?tab=bookmarks" },
] as const;

interface DailyVerse {
  pick: { surah: number; ayah: number };
  arabic: AyahText;
  translation: AyahText | null;
}

/**
 * Version-1 home: greeting, dates, continue reading, verse of the day and
 * quick links into the Qur'an section. Everything degrades gracefully offline
 * (verse comes from the local cache once its surah has been read).
 */
export default function Home() {
  const navigate = useNavigate();
  const { lastRead, settings } = useAppState();
  const [now, setNow] = useState(() => new Date());
  const pick = useMemo(() => dailyAyahPick(new Date()), []);

  type VerseState =
    | { status: "loading" }
    | { status: "ready"; data: DailyVerse }
    | { status: "error"; message: string };
  const [verseState, setVerseState] = useState<VerseState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const retryVerse = () => {
    setVerseState({ status: "loading" });
    setRetryKey((k) => k + 1);
  };

  // Live clock (updates twice a minute).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Verse of the day: real ayah fetched from the verified source, cached offline.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [arabic, translation] = await Promise.all([
          fetchSurahArabic(pick.surah),
          fetchSurahTranslation(pick.surah).catch(() => null),
        ]);
        if (cancelled) return;
        const a = arabic.find((x) => x.n === pick.ayah) ?? null;
        const e = translation?.find((x) => x.n === pick.ayah) ?? null;
        if (!a) throw new Error("Verse not found in the source data.");
        setVerseState({ status: "ready", data: { pick, arabic: a, translation: e } });
      } catch (err) {
        if (!cancelled) setVerseState({ status: "error", message: errorMessage(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pick, retryKey]);

  const hijri = formatHijri(now);
  const surahMeta = lastRead ? getSurah(lastRead.surah) : undefined;
  const startSurah = getSurah(1)!;

  const handleContinue = () => {
    if (lastRead && surahMeta) {
      navigate(`/quran/${lastRead.surah}?ayah=${lastRead.ayah}`);
    } else {
      navigate("/quran/1");
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-2xl px-4 pt-4 sm:pt-6"
    >
      {/* Brand header */}
      <motion.header variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-900 text-[#f2d791]">
            <CrescentMark className="size-5" />
          </span>
          <div>
            <p className="text-sm leading-none font-bold tracking-tight">Noor Al-Islam</p>
            <p className="mt-1 text-[11px] leading-none text-muted-foreground">
              Qur&apos;an &amp; Muslim Companion
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SettingsButton />
        </div>
      </motion.header>

      {/* Greeting hero */}
      <motion.section
        variants={item}
        className="pattern-islamic relative mt-4 overflow-hidden rounded-2xl bg-brand-900 px-5 py-6 text-white"
      >
        <CrescentMark className="pointer-events-none absolute -top-8 -right-8 size-32 text-white/5" />
        <div className="relative">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-[#f2d791] uppercase">
            {greetingLabel(now.getHours())}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            As-salamu alaikum
          </h1>
          <p className="font-quran mt-1.5 text-xl text-white/85" dir="rtl">
            السلام عليكم ورحمة الله
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/85">
            <span>{formatGregorianLong(now)}</span>
            <span className="h-1 w-1 rounded-full bg-[#f2d791]" aria-hidden="true" />
            <span className="font-medium">{hijri ?? "Hijri date unavailable"}</span>
            <span className="h-1 w-1 rounded-full bg-[#f2d791]" aria-hidden="true" />
            <span className="tabular-nums text-white/70">{formatTime(now)}</span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-white/50">
            Hijri date from your device&apos;s Umm al-Qura calendar — actual dates may
            vary with local moon sighting.
          </p>
        </div>
      </motion.section>

      {/* Continue reading */}
      <motion.button
        variants={item}
        type="button"
        onClick={handleContinue}
        className="group mt-4 flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 text-left transition-colors hover:border-primary/50"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <BookOpen className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold uppercase">
            {lastRead && surahMeta ? "Continue reading" : "Start reading"}
          </span>
          <span className="mt-1 block truncate text-base font-bold tracking-tight">
            {lastRead && surahMeta
              ? `${surahMeta.translit} · Ayah ${lastRead.ayah}`
              : `${startSurah.translit} — ${startSurah.meaning}`}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {lastRead && surahMeta
              ? `${surahMeta.meaning} · ${lastRead.ayah} of ${surahMeta.ayahs} · ${relativeTime(lastRead.updatedAt)}`
              : "Begin with the opening surah of the Qur'an"}
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </motion.button>

      {/* Verse of the day */}
      <motion.section
        variants={item}
        className="mt-4 rounded-2xl border border-border bg-card p-5"
        aria-label="Verse of the day"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-bold tracking-[0.2em] text-gold uppercase">
            Verse of the day
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {formatGregorianShort(now)}
          </span>
        </div>

        {verseState.status === "loading" && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading today&apos;s verse…
          </div>
        )}

        {verseState.status === "error" && (
          <div className="py-6">
            <p className="text-sm text-muted-foreground">{verseState.message}</p>
            <button
              type="button"
              onClick={retryVerse}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary hover:border-primary/50"
            >
              <RefreshCw className="size-3.5" />
              Try again
            </button>
          </div>
        )}

        {verseState.status === "ready" && (
          <button
            type="button"
            onClick={() =>
              navigate(`/quran/${verseState.data.pick.surah}?ayah=${verseState.data.pick.ayah}`)
            }
            className="mt-3 block w-full text-left"
          >
            <p
              className="font-quran text-right leading-[2.1] text-foreground"
              dir="rtl"
              lang="ar"
            >
              {verseState.data.arabic.text}
            </p>
            {settings.showTranslation && verseState.data.translation && (
              <p className="mt-3 text-[15px] leading-6 text-muted-foreground italic">
                “{verseState.data.translation.text}”
              </p>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                {getSurah(verseState.data.pick.surah)?.translit} · Ayah{" "}
                {verseState.data.pick.ayah}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {verseState.data.translation ? "Translation: Saheeh International" : "Uthmani script"}
                <ArrowRight className="ml-1 inline size-3" />
              </span>
            </div>
          </button>
        )}
      </motion.section>

      {/* Quick access */}
      <motion.h2
        variants={item}
        className="mt-6 text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase"
      >
        Read the Qur&apos;an
      </motion.h2>
      <motion.div variants={item} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <button
              key={link.to}
              type="button"
              onClick={() => navigate(link.to)}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary/50"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-4" />
              </span>
              <span className="text-sm font-semibold tracking-tight">{link.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Trust footer */}
      <motion.footer
        variants={item}
        className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pb-4 text-center text-[11px] text-muted-foreground"
      >
        <span>Qur&apos;an text: Tanzil.net (Uthmani)</span>
        <span className={cn("h-1 w-1 rounded-full bg-border")} aria-hidden="true" />
        <span>Translation: Saheeh International</span>
      </motion.footer>
    </motion.div>
  );
}
