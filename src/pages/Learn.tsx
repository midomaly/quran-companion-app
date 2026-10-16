import { useMemo, useState } from "react";
import { BookMarked, GraduationCap, HelpCircle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GUIDES, QUIZ, type Guide } from "@/data/learn";
import { cn } from "@/lib/utils";

/**
 * Learning centre (phase 2): guides (pillars, wuḍūʾ, ṣalāh), a Seerah
 * timeline and a short quiz. Content is labelled as educational material —
 * Qur'ān and hadith live in their own sections.
 */

function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start justify-between gap-3 text-left"
      >
        <span>
          <h3 className="text-sm font-semibold">{guide.title}</h3>
          <p className="text-xs text-muted-foreground">{guide.subtitle}</p>
        </span>
        <span className="text-xs font-medium text-primary">{open ? "Hide" : "Open"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {guide.kind === "seerah" ? (
            <ol className="flex flex-col gap-2.5">
              {guide.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-6">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-6 marker:text-primary marker:font-semibold">
              {guide.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          {guide.note && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
              {guide.note}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function Quiz() {
  const questions = useMemo(() => QUIZ, []);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[index];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answerIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <Card className="border-border/70 shadow-none">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Trophy className="size-8 text-primary" />
          <p className="text-lg font-bold">
            {score} / {questions.length} correct
          </p>
          <p className="text-sm text-muted-foreground">
            {score === questions.length
              ? "Mā shā' Allāh — perfect score!"
              : "Review the guides above and try again — repetition is how we learn."}
          </p>
          <Button className="cursor-pointer" onClick={restart}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2">
        <CardDescription>
          Question {index + 1} of {questions.length} · score {score}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm font-semibold">{q.question}</p>
        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => {
            const isAnswer = i === q.answerIndex;
            const chosen = picked === i;
            const reveal = picked !== null;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => choose(i)}
                disabled={reveal}
                className={cn(
                  "cursor-pointer rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                  !reveal && "border-border bg-card hover:border-primary/50",
                  reveal && isAnswer && "border-primary bg-primary/10 text-primary",
                  reveal && chosen && !isAnswer && "border-destructive bg-destructive/10 text-destructive",
                  reveal && !isAnswer && !chosen && "border-border/60 bg-muted/30 text-muted-foreground",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div className="flex flex-col gap-3">
            <p className="text-xs leading-5 text-muted-foreground">{q.explanation}</p>
            <Button className="cursor-pointer" onClick={next}>
              {index + 1 >= questions.length ? "See results" : "Next question"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Learn() {
  const guides = GUIDES.filter((g) => g.kind === "guide");
  const seerah = GUIDES.filter((g) => g.kind === "seerah");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Taʿallum
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Learning center</h1>
        <p className="text-sm text-muted-foreground">
          Pillars, purification, ṣalāh, Seerah and a quiz — educational
          material summarised from established sources, not a substitute for a
          teacher.
        </p>
      </header>

      <Tabs defaultValue="guides">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="guides" className="gap-1.5">
            <GraduationCap className="size-4" />
            Guides
          </TabsTrigger>
          <TabsTrigger value="seerah" className="gap-1.5">
            <BookMarked className="size-4" />
            Seerah
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-1.5">
            <HelpCircle className="size-4" />
            Quiz
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guides" className="mt-4 flex flex-col gap-3">
          {guides.map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </TabsContent>

        <TabsContent value="seerah" className="mt-4 flex flex-col gap-3">
          {seerah.map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </TabsContent>

        <TabsContent value="quiz" className="mt-4">
          <Quiz />
        </TabsContent>
      </Tabs>

      <p className="pb-4 text-center text-xs leading-5 text-muted-foreground">
        For authentic texts see Hadith and Du&apos;ās; for revelation see the
        Qur&apos;an. Questions of practice belong with a qualified scholar of
        your locality.
      </p>
    </div>
  );
}
