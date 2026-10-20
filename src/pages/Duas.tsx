import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DUA_CATEGORIES, type Dua } from "@/data/duas";
import { Check, Copy, Heart, Minus, Plus, Search, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

const FAVORITES_KEY = "noor:duaFavorites";
const REPEAT_TARGETS = [1, 3, 7, 33, 100] as const;

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string").slice(0, 300);
  } catch {
    return [];
  }
}

/** Every dua flattened once for search and favorites. */
const ALL_DUAS: { dua: Dua; categoryId: string }[] = DUA_CATEGORIES.flatMap((cat) =>
  cat.duas.map((dua) => ({ dua, categoryId: cat.id })),
);

function DuaCard({
  dua,
  favorite,
  onToggleFavorite,
}: {
  dua: Dua;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(1);

  const shareText = `${dua.arabic}\n\n${dua.translation}\n— ${dua.source}\n(Noor Al-Islam)`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: dua.title, text: shareText });
        return;
      } catch {
        return; // user cancelled
      }
    }
    await copy();
  };

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{dua.title}</h3>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={favorite}
            className={cn(
              "grid size-8 place-items-center rounded-lg transition-colors",
              favorite
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Heart className={cn("size-4", favorite && "fill-current")} />
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            aria-label={`Copy ${dua.title}`}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => void share()}
            aria-label={`Share ${dua.title}`}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Share2 className="size-4" />
          </button>
        </div>
      </div>
      <p className="font-quran text-2xl leading-[2.1] text-foreground" dir="rtl" lang="ar">
        {dua.arabic}
      </p>
      <p className="text-sm leading-6 text-muted-foreground">{dua.translation}</p>
      <p className="text-xs font-medium text-primary">{dua.source}</p>

      {/* Repeat counter — tap along as you recite; resets per target. */}
      <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-border bg-background/50 px-3 py-2">
        <span className="text-xs text-muted-foreground">
          Repeat counter{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {count}
            {target > 1 ? ` / ${target}` : ""}
          </span>
        </span>
        <span className="flex items-center gap-1">
          {REPEAT_TARGETS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTarget(t);
                setCount(0);
              }}
              aria-pressed={target === t}
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors",
                target === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCount((c) => Math.max(0, c - 1))}
            aria-label="Decrease count"
            className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCount((c) => (target > 1 && c + 1 >= target ? 0 : c + 1))}
            aria-label="Increase count"
            className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="size-3.5" />
          </button>
        </span>
      </div>
    </article>
  );
}

/**
 * Duʿāʾ library (phase 2): Qur'anic and authentically-sourced supplications
 * with search, favorites, per-dua repeat counters, copy and share. All content
 * is bundled, so the whole library works offline.
 */
export default function Duas() {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      /* storage unavailable */
    }
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }, []);

  const matchesQuery = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return ALL_DUAS.filter(
      ({ dua }) =>
        dua.title.toLowerCase().includes(q) ||
        dua.translation.toLowerCase().includes(q) ||
        dua.source.toLowerCase().includes(q) ||
        dua.arabic.includes(query.trim()),
    );
  }, [query]);

  const searching = matchesQuery !== null;
  const visibleIds = onlyFavorites ? new Set(favorites) : null;

  const renderCard = ({ dua }: { dua: Dua }) => (
    <DuaCard
      key={dua.id}
      dua={dua}
      favorite={favorites.includes(dua.id)}
      onToggleFavorite={() => toggleFavorite(dua.id)}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Supplication
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Duas</h1>
        <p className="text-sm text-muted-foreground">
          Qur&apos;anic and authentically-sourced duʿāʾ for every moment —
          search, save favorites and count repeats. The whole library works
          offline.
        </p>
      </header>

      {/* Search + favorites filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, meaning or source…"
            aria-label="Search duas"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant={onlyFavorites ? "default" : "outline"}
          size="icon"
          onClick={() => setOnlyFavorites((v) => !v)}
          aria-label="Show favorites only"
          aria-pressed={onlyFavorites}
          className="shrink-0"
        >
          <Heart className={cn("size-4", onlyFavorites && "fill-current")} />
        </Button>
      </div>

      {searching ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {matchesQuery.length} result{matchesQuery.length === 1 ? "" : "s"} for “{query}”
          </p>
          {matchesQuery.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No dua matches “{query}”. Try a word like “morning”, “forgiveness”
              or a source like “Bukhari”.
            </p>
          ) : (
            matchesQuery.map(renderCard)
          )}
        </div>
      ) : onlyFavorites ? (
        <div className="flex flex-col gap-3">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Heart className="size-6 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                No favorites yet — tap the heart on any dua to keep it here.
              </p>
            </div>
          ) : (
            ALL_DUAS.filter(({ dua }) => visibleIds?.has(dua.id)).map(renderCard)
          )}
        </div>
      ) : (
        <Tabs defaultValue={DUA_CATEGORIES[0].id}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {DUA_CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="rounded-full border border-border bg-card data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {DUA_CATEGORIES.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="mt-4 flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">{cat.blurb}</p>
              {cat.duas.map((dua) => renderCard({ dua }))}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <div className="pb-4 text-center">
        <Button asChild variant="outline" size="sm">
          <Link to="/hadith">Read related hadith →</Link>
        </Button>
      </div>
    </div>
  );
}
