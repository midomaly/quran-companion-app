import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DUA_CATEGORIES, type Dua } from "@/data/duas";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

function DuaCard({ dua }: { dua: Dua }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${dua.arabic}\n\n${dua.translation}\n— ${dua.source}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{dua.title}</h3>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${dua.title}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        </button>
      </div>
      <p className="font-quran text-2xl leading-[2.1] text-foreground" dir="rtl">
        {dua.arabic}
      </p>
      <p className="text-sm leading-6 text-muted-foreground">{dua.translation}</p>
      <p className="text-xs font-medium text-primary">{dua.source}</p>
    </article>
  );
}

/**
 * Duʿāʾ library (phase 2): Qur'anic and authentically-sourced supplications,
 * grouped by moment of the day, with copy-to-clipboard on every card.
 */
export default function Duas() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Supplication
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Duas</h1>
        <p className="text-sm text-muted-foreground">
          Qur'anic and authentically-sourced duʿāʾ for every moment — tap the
          copy icon to save one anywhere.
        </p>
      </header>

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
            {cat.duas.map((dua) => (
              <DuaCard key={dua.id} dua={dua} />
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <div className="pb-4 text-center">
        <Button asChild variant="outline" size="sm">
          <a href="/hadith">Read related hadith →</a>
        </Button>
      </div>
    </div>
  );
}
