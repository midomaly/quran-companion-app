import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  ListChecks,
  Loader2,
  Pause,
  Play,
  Repeat,
  Share2,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { SettingsButton } from "@/components/SettingsButton";
import { useAppState } from "@/lib/app-state";
import {
  ayahAudioUrl,
  errorMessage,
  fetchSurahArabic,
  fetchSurahTranslation,
  reciterName,
  TRANSLATION_EDITION_NAME,
  ARABIC_EDITION_NAME,
  type AyahText,
} from "@/lib/quranApi";
import { splitBasmala, toArabicDigits } from "@/lib/quranText";
import { SURAHS, getSurah, isValidSurah, type Surah } from "@/lib/surahs";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 1.25, 1.5, 0.75];

export default function Reader() {
  const { surahId } = useParams<{ surahId: string }>();
  const surahNumber = Number(surahId);
  const surah = isValidSurah(surahNumber) ? getSurah(surahNumber) : undefined;
  const [searchParams] = useSearchParams();
  const rawAyah = Number(searchParams.get("ayah"));
  const targetAyah = Number.isInteger(rawAyah) && rawAyah > 0 ? rawAyah : 0;

  const navigate = useNavigate();
  const { settings, isBookmarked, toggleBookmark, setLastRead } = useAppState();

  const [loaded, setLoaded] = useState<{
    surah: number;
    arabic: AyahText[];
    translation: AyahText[] | null;
  } | null>(null);
  const [loadError, setLoadError] = useState<{ surah: number; message: string } | null>(null);
  const [translationFail, setTranslationFail] = useState<{
    surah: number;
    message: string;
  } | null>(null);
  const [loadKey, setLoadKey] = useState(0);

  // Derived from async load state (no setState churn inside effects).
  const arabic = loaded && loaded.surah === surahNumber ? loaded.arabic : null;
  const translation = loaded && loaded.surah === surahNumber ? loaded.translation : null;
  const invalidMessage = isValidSurah(surahNumber)
    ? null
    : `“${surahId ?? ""}” is not a valid surah. The Qur'an has 114 surahs (1–114).`;
  const failureMessage = loadError && loadError.surah === surahNumber ? loadError.message : null;
  const status: "loading" | "ready" | "error" =
    invalidMessage || failureMessage ? "error" : arabic ? "ready" : "loading";
  const error = invalidMessage ?? failureMessage ?? "";
  const translationNote =
    translationFail && translationFail.surah === surahNumber ? translationFail.message : "";
  const retryLoad = () => {
    setLoadError(null);
    setLoadKey((k) => k + 1);
  };
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [jumpValue, setJumpValue] = useState("");
  const [readProgress, setReadProgress] = useState(0);

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);

  /* ---------------------------------------------------------------- */
  /* Load surah text (Arabic first, translation streams in)            */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    if (!isValidSurah(surahNumber)) return;
    (async () => {
      try {
        const ar = await fetchSurahArabic(surahNumber);
        if (cancelled) return;
        setLoaded({ surah: surahNumber, arabic: ar, translation: null });
        setLoadError(null);
        fetchSurahTranslation(surahNumber)
          .then((tr) => {
            if (cancelled) return;
            setLoaded((prev) =>
              prev && prev.surah === surahNumber ? { ...prev, translation: tr } : prev,
            );
            setTranslationFail(null);
          })
          .catch((err) => {
            if (cancelled) return;
            setTranslationFail({
              surah: surahNumber,
              message: `English translation unavailable right now — showing the Uthmani text only. (${errorMessage(err)})`,
            });
          });
      } catch (err) {
        if (cancelled) return;
        setLoadError({ surah: surahNumber, message: errorMessage(err) });
        setLoaded((prev) => (prev && prev.surah === surahNumber ? null : prev));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [surahNumber, loadKey]);

  /* ---------------------------------------------------------------- */
  /* Jump to an ayah (?ayah=N) after content is ready                  */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (status !== "ready" || !targetAyah || !arabic) return;
    if (targetAyah > arabic.length) return;
    const t1 = setTimeout(() => {
      const el = document.getElementById(`ayah-${targetAyah}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlighted(targetAyah);
      }
    }, 100);
    const t2 = setTimeout(() => setHighlighted(null), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [status, targetAyah, arabic]);

  /* ---------------------------------------------------------------- */
  /* Track reading position (last read)                                */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (status !== "ready" || !arabic || !surahNumber) return;
    const visible = new Set<number>();
    let timer: number | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const n = Number((entry.target as HTMLElement).dataset.ayah);
          if (Number.isInteger(n)) {
            if (entry.isIntersecting) visible.add(n);
            else visible.delete(n);
          }
        }
        if (visible.size > 0) {
          window.clearTimeout(timer);
          const topmost = Math.min(...visible);
          timer = window.setTimeout(() => setLastRead(surahNumber, topmost), 700);
        }
      },
      { rootMargin: "-110px 0px -55% 0px", threshold: 0 },
    );
    arabic.forEach((a) => {
      const el = document.getElementById(`ayah-${a.n}`);
      if (el) observer.observe(el);
    });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [status, arabic, surahNumber, setLastRead]);

  /* ---------------------------------------------------------------- */
  /* Reading progress bar                                              */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (status !== "ready") return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const height = document.documentElement.scrollHeight - window.innerHeight;
        setReadProgress(height > 0 ? Math.min(1, window.scrollY / height) : 0);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [status]);

  /* ---------------------------------------------------------------- */
  /* Audio playback                                                    */
  /* ---------------------------------------------------------------- */
  const playAyah = useCallback(
    (n: number) => {
      const audio = audioRef.current;
      if (!audio || !arabic || !surah) return;
      const target = arabic.find((a) => a.n === n);
      if (!target) return;
      audio.src = ayahAudioUrl(target.g, settings.reciter);
      audio.playbackRate = SPEEDS[speedIndex];
      audio
        .play()
        .then(() => {
          setPlaying(n);
          setIsPlaying(true);
        })
        .catch(() => {
          setPlaying(null);
          setIsPlaying(false);
          toast.error(
            navigator.onLine === false
              ? "Audio needs an internet connection."
              : "Couldn't play the recitation. Please try again.",
          );
        });
    },
    [arabic, surah, settings.reciter, speedIndex],
  );

  const togglePlay = useCallback(
    (n: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (playing === n && isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else if (playing === n && !isPlaying) {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setIsPlaying(false);
            toast.error("Couldn't resume playback.");
          });
      } else {
        playAyah(n);
      }
    },
    [playing, isPlaying, playAyah],
  );

  const handleEnded = useCallback(() => {
    if (!arabic || playing === null) {
      setIsPlaying(false);
      return;
    }
    if (repeat) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
      }
      return;
    }
    if (settings.continuousPlayback && playing < arabic.length) {
      playAyah(playing + 1);
    } else {
      setIsPlaying(false);
      setProgress(0);
    }
  }, [arabic, playing, repeat, settings.continuousPlayback, playAyah]);

  const handleAudioError = useCallback(() => {
    if (!audioRef.current?.src) return;
    setIsPlaying(false);
  }, []);

  const stopPlayback = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    setPlaying(null);
    setIsPlaying(false);
    setProgress(0);
  };

  const stepAyah = (delta: number) => {
    if (playing === null || !arabic) return;
    const next = playing + delta;
    if (next >= 1 && next <= arabic.length) playAyah(next);
  };

  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  // Lock-screen / OS media controls.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (playing === null || !surah) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${surah.translit} ${surahNumber}:${playing}`,
        artist: reciterName(settings.reciter),
        album: "Noor Al-Islam",
      });
      navigator.mediaSession.setActionHandler("play", () => {
        audioRef.current?.play().catch(() => setIsPlaying(false));
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => stepAyah(-1));
      navigator.mediaSession.setActionHandler("nexttrack", () => stepAyah(1));
    } catch {
      /* Media Session unsupported — playback still works in-page. */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, surah, surahNumber, settings.reciter]);

  // Stop audio when leaving the surah.
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
      }
    };
  }, [surahNumber]);

  /* ---------------------------------------------------------------- */
  /* Copy / share                                                      */
  /* ---------------------------------------------------------------- */
  const buildShareText = useCallback(
    (a: AyahText): string => {
      const tr = translation?.find((t) => t.n === a.n);
      const ref = `${surah?.translit ?? "Qur'an"} ${surahNumber}:${a.n}`;
      return [
        a.text,
        tr ? `\n"${tr.text}"` : "",
        `\n— ${ref}`,
        `\nQur'an text: Tanzil.net (Uthmani) · Translation: ${TRANSLATION_EDITION_NAME}`,
      ]
        .filter(Boolean)
        .join("\n");
    },
    [translation, surah, surahNumber],
  );

  const copyAyah = async (a: AyahText) => {
    try {
      await navigator.clipboard.writeText(buildShareText(a));
      toast.success(`Copied ${surahNumber}:${a.n}`);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access.");
    }
  };

  const shareAyah = async (a: AyahText) => {
    const text = buildShareText(a);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${surah?.translit} ${surahNumber}:${a.n}`, text });
        return;
      } catch {
        return; // user cancelled the share sheet
      }
    }
    await copyAyah(a);
  };

  const handleJump = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(jumpValue);
    if (!surah || !Number.isInteger(n) || n < 1 || n > surah.ayahs) {
      toast.error(`Enter an ayah between 1 and ${surah?.ayahs ?? "?"}.`);
      return;
    }
    navigate(`/quran/${surahNumber}?ayah=${n}`);
    setJumpValue("");
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  const index = SURAHS.findIndex((s) => s.n === surahNumber);
  const prevSurah: Surah | undefined = index > 0 ? SURAHS[index - 1] : undefined;
  const nextSurah: Surah | undefined =
    index >= 0 && index < SURAHS.length - 1 ? SURAHS[index + 1] : undefined;

  const translationByAyah = useMemo(() => {
    if (!translation) return new Map<number, string>();
    return new Map(translation.map((t) => [t.n, t.text]));
  }, [translation]);

  if (status === "error") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={retryLoad}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => navigate("/quran")}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:border-primary/50"
            >
              Surah list
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Sticky reader header */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => navigate("/quran")}
            aria-label="Back to surah list"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-foreground transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold tracking-tight">
              {surah ? surah.translit : "Surah"}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {surah ? `${surah.meaning} · ${surah.ayahs} ayahs · ${surah.revelation}` : ""}
            </p>
          </div>
          {surah && (
            <form onSubmit={handleJump} className="flex items-center">
              <input
                type="number"
                min={1}
                max={surah.ayahs}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                placeholder="№"
                aria-label="Jump to ayah number"
                className="h-9 w-12 rounded-lg border border-input bg-card px-1 text-center text-xs tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
              />
            </form>
          )}
          <SettingsButton className="shrink-0" />
        </div>
        {/* Reading progress */}
        <div className="h-0.5 w-full bg-muted">
          <div
            className="h-0.5 rounded-full bg-primary transition-[width] duration-150"
            style={{ width: `${Math.round(readProgress * 100)}%` }}
          />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pb-10">
        {/* Surah intro */}
        <div className="pattern-islamic mt-4 rounded-2xl border border-border bg-card px-4 py-5 text-center">
          <p className="font-quran text-2xl text-primary" dir="rtl" lang="ar">
            {surah?.name}
          </p>
          <h2 className="mt-1.5 text-lg font-bold tracking-tight">
            {surah?.translit} — {surah?.meaning}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {surah?.revelation} · {surah?.ayahs} ayahs · {ARABIC_EDITION_NAME}
            {settings.showTranslation ? ` · Translation: ${TRANSLATION_EDITION_NAME}` : ""}
          </p>
          {translationNote && (
            <p className="mt-2 text-[11px] text-muted-foreground">{translationNote}</p>
          )}
        </div>

        {/* Ayah list */}
        {status === "loading" || !arabic || !surah ? (
          <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading surah…
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-1">
            {arabic.map((a) => {
              const split = splitBasmala(surahNumber, a.n, a.text);
              const trText = translationByAyah.get(a.n);
              const bookmarked = isBookmarked(surahNumber, a.n);
              const isCurrentAudio = playing === a.n;
              return (
                <article
                  key={a.n}
                  id={`ayah-${a.n}`}
                  data-ayah={a.n}
                  className={cn(
                    "scroll-mt-28 rounded-xl border border-transparent px-3 py-4 transition-colors",
                    highlighted === a.n && "border-gold/60 bg-gold-soft/50",
                    isCurrentAudio && "bg-primary/5",
                  )}
                >
                  {/* Toolbar: ayah number + actions */}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      className="font-quran grid size-8 place-items-center rounded-full border border-gold/60 text-[11px] leading-none text-gold"
                      aria-label={`Ayah ${a.n}`}
                      dir="rtl"
                    >
                      {toArabicDigits(a.n)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => togglePlay(a.n)}
                        aria-label={
                          isCurrentAudio && isPlaying
                            ? `Pause ayah ${a.n}`
                            : `Play ayah ${a.n}`
                        }
                        className={cn(
                          "grid size-8 place-items-center rounded-lg transition-colors",
                          isCurrentAudio && isPlaying
                            ? "bg-primary text-primary-foreground"
                            : "text-primary hover:bg-primary/10",
                        )}
                      >
                        {isCurrentAudio && isPlaying ? (
                          <Pause className="size-4" />
                        ) : (
                          <Play className="size-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const added = toggleBookmark(surahNumber, a.n);
                          toast(added ? `Bookmarked ${surahNumber}:${a.n}` : "Bookmark removed");
                        }}
                        aria-label={
                          bookmarked ? "Remove bookmark" : "Bookmark this ayah"
                        }
                        className={cn(
                          "grid size-8 place-items-center rounded-lg transition-colors",
                          bookmarked
                            ? "text-gold hover:bg-gold/10"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        {bookmarked ? (
                          <BookmarkCheck className="size-4" />
                        ) : (
                          <Bookmark className="size-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyAyah(a)}
                        aria-label={`Copy ayah ${a.n}`}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <Copy className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => shareAyah(a)}
                        aria-label={`Share ayah ${a.n}`}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <Share2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Basmala shown as an ornamental line (split from ayah 1, text unchanged) */}
                  {split.basmala && (
                    <p
                      className="font-quran mb-3 text-center text-2xl leading-loose text-primary"
                      dir="rtl"
                      lang="ar"
                    >
                      {split.basmala}
                    </p>
                  )}

                  {/* Arabic */}
                  <p
                    className="font-quran text-right text-foreground"
                    dir="rtl"
                    lang="ar"
                    style={{
                      fontSize: `${settings.arabicFontSize}px`,
                      lineHeight: 1.95,
                    }}
                  >
                    {split.body}
                  </p>

                  {/* Translation */}
                  {settings.showTranslation && (
                    <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                      {trText ?? (
                        <span className="text-xs italic">Translation loading…</span>
                      )}
                    </p>
                  )}
                </article>
              );
            })}

            {/* End of surah navigation */}
            <div className="mt-6 flex items-center justify-between gap-2 border-t border-border pt-5">
              {prevSurah ? (
                <button
                  type="button"
                  onClick={() => navigate(`/quran/${prevSurah.n}`)}
                  className="flex max-w-[38%] items-center gap-1 rounded-xl border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/50"
                >
                  <ChevronLeft className="size-4 shrink-0" />
                  <span className="truncate">{prevSurah.translit}</span>
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => navigate("/quran")}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                aria-label="Back to surah list"
              >
                <ListChecks className="size-4" />
              </button>
              {nextSurah ? (
                <button
                  type="button"
                  onClick={() => navigate(`/quran/${nextSurah.n}`)}
                  className="flex max-w-[38%] items-center gap-1 rounded-xl border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/50"
                >
                  <span className="truncate">{nextSurah.translit}</span>
                  <ChevronRight className="size-4 shrink-0" />
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mini player */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setProgress(el.duration ? el.currentTime / el.duration : 0);
        }}
        onEnded={handleEnded}
        onError={handleAudioError}
        preload="none"
      />

      <AnimatePresence>
        {playing !== null && surah && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-0 bottom-24 z-40 px-3"
            aria-label="Recitation player"
          >
            <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card/95 p-2.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => stepAyah(-1)}
                  disabled={playing <= 1}
                  aria-label="Previous ayah"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                >
                  <SkipBack className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => togglePlay(playing)}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => stepAyah(1)}
                  disabled={playing >= (arabic?.length ?? 0)}
                  aria-label="Next ayah"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                >
                  <SkipForward className="size-4" />
                </button>
                <div className="mx-1 min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">
                    {surah.translit} · Ayah {playing}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {reciterName(settings.reciter)}
                    {!settings.continuousPlayback && !repeat ? " · single ayah" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRepeat((r) => !r)}
                  aria-label={repeat ? "Repeat ayah: on" : "Repeat ayah: off"}
                  aria-pressed={repeat}
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                    repeat
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Repeat className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={cycleSpeed}
                  aria-label="Playback speed"
                  className="shrink-0 rounded-lg px-1.5 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {SPEEDS[speedIndex]}×
                </button>
                <button
                  type="button"
                  onClick={stopPlayback}
                  aria-label="Close player"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
