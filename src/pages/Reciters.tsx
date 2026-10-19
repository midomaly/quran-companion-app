import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  BookOpen,
  Check,
  Headphones,
  Loader2,
  Pause,
  Play,
  Search,
} from "lucide-react";
import { SettingsButton } from "@/components/SettingsButton";
import { useAppState } from "@/lib/app-state";
import {
  RECITERS,
  previewAudioUrl,
  recitersByCountry,
  type Reciter,
} from "@/lib/reciters";
import { cn } from "@/lib/utils";

/**
 * Reciters Library — all 60 reciters, grouped by country, searchable in
 * English or Arabic, with a live audio preview and one-tap "use in the
 * Reader". Audio streams from three free public CDNs (everyayah.com,
 * cdn.islamic.network, cdn.mp3quran.net); mp3quran entries play whole
 * surahs and are labelled as such.
 */
export default function Reciters() {
  const { settings, updateSettings } = useAppState();
  const [query, setQuery] = useState("");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const groups = useMemo(() => {
    const all = recitersByCountry();
    const raw = query.trim();
    const filtered = raw
      ? all
          .map((g) => ({
            country: g.country,
            reciters: g.reciters.filter(
              (r) =>
                r.name.toLowerCase().includes(raw.toLowerCase()) ||
                (r.arabicName ?? "").includes(raw) ||
                r.country.toLowerCase().includes(raw.toLowerCase()) ||
                (r.style ?? "").toLowerCase().includes(raw.toLowerCase()),
            ),
          }))
          .filter((g) => g.reciters.length > 0)
      : all;
    return activeCountry
      ? filtered.filter((g) => g.country === activeCountry)
      : filtered;
  }, [query, activeCountry]);

  const countries = useMemo(() => recitersByCountry().map((g) => g.country), []);
  const shownCount = groups.reduce((n, g) => n + g.reciters.length, 0);

  // Stop the preview when navigating away.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  const togglePreview = (reciter: Reciter) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingId === reciter.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    const url = previewAudioUrl(reciter.id);
    if (!url) return;
    setLoadingId(reciter.id);
    audio.src = url;
    audio
      .play()
      .then(() => setPlayingId(reciter.id))
      .catch(() => {
        setPlayingId(null);
        toast.error(
          navigator.onLine === false
            ? "Previews need an internet connection."
            : "Couldn't play this reciter right now. Please try again.",
        );
      })
      .finally(() => setLoadingId(null));
  };

  const applyReciter = (reciter: Reciter) => {
    updateSettings({ reciter: reciter.id });
    toast.success(
      reciter.perSurah
        ? `${reciter.name} will recite full surahs in the Reader.`
        : `${reciter.name} is now your reciter.`,
    );
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="pattern-islamic relative overflow-hidden bg-brand-900 text-[#f7e8c4]">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/60 via-brand-900/80 to-brand-900" />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 pt-8 pb-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-arabic text-3xl leading-tight" dir="rtl">
                مكتبة القرّاء
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                Reciters Library
              </h1>
              <p className="mt-1.5 max-w-md text-sm text-[#f7e8c4]/70">
                {RECITERS.length} of the world&apos;s best-known Qur&apos;an
                reciters. Tap play to hear each voice, then use them in the
                Reader.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link
                to="/quran"
                aria-label="Open the Qur'an"
                className="grid size-9 place-items-center rounded-xl border border-[#f7e8c4]/20 text-[#f7e8c4]/80 transition-colors hover:bg-[#f7e8c4]/10 hover:text-[#f7e8c4]"
              >
                <BookOpen className="size-4" />
              </Link>
              <SettingsButton className="text-[#f7e8c4]/80 hover:text-[#f7e8c4]" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#f7e8c4]/60">
            <span className="rounded-full border border-[#f7e8c4]/15 px-2.5 py-1">
              Verse-by-verse playback
            </span>
            <span className="rounded-full border border-[#f7e8c4]/15 px-2.5 py-1">
              {countries.length} countries
            </span>
            <span className="rounded-full border border-[#f7e8c4]/15 px-2.5 py-1">
              Free streaming
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-24 pt-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 60 reciters — name, country or عربي…"
            aria-label="Search reciters"
            className="h-11 w-full rounded-xl border border-input bg-card pr-4 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>

        {/* Country chips */}
        <div className="hide-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          <button
            type="button"
            onClick={() => setActiveCountry(null)}
            aria-pressed={activeCountry === null}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              activeCountry === null
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          {countries.map((country) => (
            <button
              key={country}
              type="button"
              onClick={() => setActiveCountry(country)}
              aria-pressed={activeCountry === country}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                activeCountry === country
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {country}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="mt-4 text-xs font-medium text-muted-foreground">
          Showing {shownCount} of {RECITERS.length} reciters
        </p>

        {/* Grouped cards */}
        {groups.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
            <Headphones className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">No reciter matches that search.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCountry(null);
              }}
              className="mt-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-8">
            {groups.map((group) => (
              <section key={group.country} className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-sm font-bold tracking-tight">
                    {group.country}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {group.reciters.length}
                  </span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {group.reciters.map((reciter) => {
                    const active = settings.reciter === reciter.id;
                    const isPlaying = playingId === reciter.id;
                    const isLoading = loadingId === reciter.id;
                    const sub = [
                      reciter.arabicName,
                      reciter.style,
                      reciter.perSurah ? "Full surah" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <article
                        key={reciter.id}
                        className={cn(
                          "flex flex-col gap-2.5 rounded-2xl border bg-card p-3.5 transition-colors",
                          active
                            ? "border-primary/60 bg-primary/5"
                            : "border-border",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold">
                              {reciter.name}
                            </h3>
                            {sub && (
                              <p
                                className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground"
                                dir="auto"
                              >
                                {sub}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePreview(reciter)}
                            aria-label={
                              isPlaying
                                ? `Pause ${reciter.name} preview`
                                : `Play ${reciter.name} preview`
                            }
                            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                          >
                            {isLoading ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : isPlaying ? (
                              <Pause className="size-4" />
                            ) : (
                              <Play className="size-4" />
                            )}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyReciter(reciter)}
                          aria-pressed={active}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                          )}
                        >
                          {active ? (
                            <>
                              <Check className="size-3.5" /> In the Reader
                            </>
                          ) : (
                            "Use in Reader"
                          )}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Attribution */}
        <p className="mt-10 border-t border-border pt-4 text-[11px] leading-5 text-muted-foreground">
          Recitation audio streams free of charge from everyayah.com,
          cdn.islamic.network (QuranicAudio) and mp3quran.net. Reciters marked
          &quot;Full surah&quot; publish whole-surah recordings, so the Reader
          plays the entire surah with them. An internet connection is needed
          for audio; the Qur&apos;an text itself works offline once saved.
        </p>
      </main>

      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setPlayingId(null)}
        onError={() => {
          setPlayingId(null);
          setLoadingId(null);
        }}
      />
    </div>
  );
}
