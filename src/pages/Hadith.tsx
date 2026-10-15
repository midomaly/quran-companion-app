import { HADITHS, HADITH_THEMES, type HadithTheme } from "@/data/hadith";
import { BookMarked } from "lucide-react";
import { useState } from "react";

/**
 * Hadith collection (phase 2): brief verified reports from the well-known
 * collections, filterable by theme, each with its source for verification.
 */
export default function Hadith() {
  const [theme, setTheme] = useState<HadithTheme | "all">("all");

  const visible = theme === "all" ? HADITHS : HADITHS.filter((h) => h.theme === theme);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Sayings of the Prophet ﷺ
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Hadith</h1>
        <p className="text-sm text-muted-foreground">
          A curated selection from the verified collections — each report
          carries its source so you can check it in the original.
        </p>
      </header>

      {/* Theme filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTheme("all")}
          aria-pressed={theme === "all"}
          className={
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
            (theme === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground")
          }
        >
          All · {HADITHS.length}
        </button>
        {HADITH_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            aria-pressed={theme === t.id}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
              (theme === t.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((h) => (
          <article key={h.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookMarked className="size-4" />
            </span>
            <div className="flex flex-col gap-2">
              <p className="text-sm leading-6 text-foreground">{h.text}</p>
              <p className="text-xs font-medium text-primary">{h.source}</p>
            </div>
          </article>
        ))}
      </div>

      <p className="pb-4 text-center text-xs leading-5 text-muted-foreground">
        Collections: Ṣaḥīḥ al-Bukhārī, Ṣaḥīḥ Muslim, Jāmiʿ at-Tirmidhī, Sunan
        Abī Dāwūd, Sunan Ibn Mājah — the six major canonical works.
      </p>
    </div>
  );
}
