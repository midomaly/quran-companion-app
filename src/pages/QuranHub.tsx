import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Bookmark,
  BookmarkX,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  Layers,
  Loader2,
  Search as SearchIcon,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { SettingsButton } from "@/components/SettingsButton";
import { QuranPlans } from "@/components/QuranPlans";
import { useAppState } from "@/lib/app-state";
import {
  errorMessage,
  fetchSurahArabic,
  isArabicQuery,
  searchQuran,
  type AyahText,
  type SearchMatch,
} from "@/lib/quranApi";
import { JUZ, SURAHS, TOTAL_AYAHS, getSurah } from "@/lib/surahs";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "surahs", label: "Surahs", icon: BookOpen },
  { value: "juz", label: "Juz", icon: Layers },
  { value: "plans", label: "Plans", icon: CalendarCheck },
  { value: "search", label: "Search", icon: SearchIcon },
  { value: "bookmarks", label: "Bookmarks", icon: Bookmark },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function isValidTab(value: string | null): value is TabValue {
  return TABS.some((t) => t.value === value);
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

/* ------------------------------------------------------------------ */
/* Surahs                                                              */
/* ------------------------------------------------------------------ */

function SurahList() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return SURAHS;
    const lower = q.toLowerCase();
    return SURAHS.filter(
      (s) =>
        s.translit.toLowerCase().includes(lower) ||
        s.meaning.toLowerCase().includes(lower) ||
        String(s.n) === q ||
        s.name.includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, meaning or number…"
          aria-label="Filter surahs"
          className="h-11 w-full rounded-xl border border-input bg-card pr-4 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No surah matches “{query}”.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((s) => (
            <li key={s.n}>
              <button
                type="button"
                onClick={() => navigate(`/quran/${s.n}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary/50"
              >
                <span className="relative grid size-10 shrink-0 place-items-center">
                  <svg viewBox="0 0 40 40" className="absolute inset-0 size-full text-primary/30" aria-hidden="true">
                    <rect x="6" y="6" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(45 20 20)" />
                  </svg>
                  <span className="relative text-xs font-bold text-primary">{s.n}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold tracking-tight">
                    {s.translit}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {s.meaning} · {s.ayahs} ayahs · {s.revelation}
                  </span>
                </span>
                <span
                  className="font-quran shrink-0 text-lg text-foreground/75"
                  dir="rtl"
                  lang="ar"
                >
                  {s.name.replace("سُورَةُ ", "")}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Juz                                                                 */
/* ------------------------------------------------------------------ */

function JuzList() {
  const navigate = useNavigate();
  return (
    <ul className="flex flex-col gap-2">
      {JUZ.map((j, i) => {
        const start = getSurah(j.surah);
        const next = JUZ[i + 1];
        const end = next ? getSurah(next.surah) : getSurah(114);
        return (
          <li key={j.juz}>
            <button
              type="button"
              onClick={() => navigate(`/quran/${j.surah}?ayah=${j.ayah}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary/50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold text-primary">
                {j.juz}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold tracking-tight">
                  Juz {j.juz} · {start?.translit} {j.surah}:{j.ayah}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {start?.meaning}
                  {next ? ` → ${end?.translit} ${next.surah}:${next.ayah}` : " → end of the Qur'an"}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

function QuranSearch() {
  const navigate = useNavigate();
  const { recentSearches, addRecentSearch, clearRecentSearches } = useAppState();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [error, setError] = useState("");
  const [searchedFor, setSearchedFor] = useState("");
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    if (status !== "loading") return;
    let cancelled = false;
    const term = query.trim();
    (async () => {
      try {
        const matches = await searchQuran(term);
        if (cancelled) return;
        setResults(matches);
        setSearchedFor(term);
        setStatus("ready");
        addRecentSearch(term);
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const runSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setStatus("loading");
    setRequestId((id) => id + 1);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const searchedArabic = isArabicQuery(searchedFor);

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="relative">
        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isArabicQuery(query) ? "ابحث في القرآن…" : "Search every verse — English or Arabic…"}
          aria-label="Search the Qur'an"
          className="h-11 w-full rounded-xl border border-input bg-card pr-4 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <button
          type="submit"
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      {status === "idle" && (
        <div className="flex flex-col gap-3">
          {recentSearches.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                  Recent searches
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => runSearch(q)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/50"
                    dir={isArabicQuery(q) ? "rtl" : "ltr"}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <SearchIcon className="size-6 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                Search by an English word from any translation, or type Arabic
                words to search the Uthmani text.
              </p>
            </div>
          )}
        </div>
      )}

      {status === "loading" && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Searching the Qur&apos;an…
        </div>
      )}

      {status === "error" && (
        <div className="py-6">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => runSearch(searchedFor || query)}
            className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary hover:border-primary/50"
          >
            Try again
          </button>
        </div>
      )}

      {status === "ready" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {results.length} match{results.length === 1 ? "" : "es"} for “{searchedFor}” in{" "}
            {searchedArabic ? "the Uthmani text" : "the Saheeh International translation"}
          </p>
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <SearchIcon className="size-6 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                No verses match “{searchedFor}”. Try another word or spelling.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {results.map((m) => (
                <li key={`${m.surah}:${m.ayah}`}>
                  <button
                    type="button"
                    onClick={() => navigate(`/quran/${m.surah}?ayah=${m.ayah}`)}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-primary/50"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-primary">
                        {m.surahName} {m.surah}:{m.ayah}
                      </span>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 line-clamp-2 block text-sm leading-6",
                        searchedArabic ? "font-quran text-right text-base" : "text-muted-foreground",
                      )}
                      dir={searchedArabic ? "rtl" : "ltr"}
                    >
                      {m.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bookmarks                                                           */
/* ------------------------------------------------------------------ */

function BookmarksList() {
  const navigate = useNavigate();
  const { bookmarks, toggleBookmark } = useAppState();
  const [texts, setTexts] = useState<Record<number, AyahText[]>>({});
  const [loadError, setLoadError] = useState("");

  const neededSurahs = useMemo(
    () => [...new Set(bookmarks.map((b) => b.surah))],
    [bookmarks],
  );

  useEffect(() => {
    if (neededSurahs.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(
          neededSurahs.map(async (s) => [s, await fetchSurahArabic(s)] as const),
        );
        if (!cancelled) {
          setTexts(Object.fromEntries(entries));
          setLoadError("");
        }
      } catch (err) {
        if (!cancelled) setLoadError(errorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [neededSurahs]);

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Bookmark className="size-6 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">
          No bookmarks yet. Tap the bookmark icon on any ayah while reading and
          it will be saved here — on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {loadError && <p className="text-xs text-destructive">{loadError}</p>}
      <ul className="flex flex-col gap-2">
        {bookmarks.map((b) => {
          const meta = getSurah(b.surah);
          const ayah = texts[b.surah]?.find((x) => x.n === b.ayah);
          return (
            <li
              key={`${b.surah}:${b.ayah}`}
              className="rounded-xl border border-border bg-card p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/quran/${b.surah}?ayah=${b.ayah}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="text-xs font-bold text-primary">
                    {meta?.translit} {b.surah}:{b.ayah}
                  </span>
                  {ayah ? (
                    <span
                      className="font-quran mt-1.5 line-clamp-2 block text-right text-lg leading-9"
                      dir="rtl"
                      lang="ar"
                    >
                      {ayah.text}
                    </span>
                  ) : (
                    <span className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" /> Loading ayah…
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Remove bookmark"
                  onClick={() => toggleBookmark(b.surah, b.ayah)}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                >
                  <BookmarkX className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        {bookmarks.length} saved ayah{bookmarks.length === 1 ? "" : "s"} · stored on this
        device only
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function QuranHub() {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab");
  const tab: TabValue = isValidTab(rawTab) ? rawTab : "surahs";

  const setTab = (value: TabValue) => {
    if (value === "surahs") {
      setParams({});
    } else {
      setParams({ tab: value });
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-2xl px-4 pt-4 sm:pt-6"
    >
      <motion.header variants={item} className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">The Qur&apos;an</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            114 surahs · {TOTAL_AYAHS.toLocaleString("en-US")} ayahs · Hafs
            &lsquo;an Asim
          </p>
        </div>
        <SettingsButton />
      </motion.header>

      <motion.div variants={item} className="mt-4">
        <div
          role="tablist"
          aria-label="Qur'an sections"
          className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 sm:grid-cols-5"
        >
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                id={`quran-tab-${t.value}`}
                aria-controls="quran-tabpanel"
                aria-selected={active}
                onClick={() => setTab(t.value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:text-sm",
                  active
                    ? "bg-card text-primary shadow-none"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="size-3.5 sm:size-4" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        variants={item}
        className="mt-4 pb-6"
        role="tabpanel"
        id="quran-tabpanel"
        aria-labelledby={`quran-tab-${tab}`}
      >
        {tab === "surahs" && <SurahList />}
        {tab === "juz" && <JuzList />}
        {tab === "plans" && <QuranPlans />}
        {tab === "search" && <QuranSearch />}
        {tab === "bookmarks" && <BookmarksList />}
      </motion.div>
    </motion.div>
  );
}
