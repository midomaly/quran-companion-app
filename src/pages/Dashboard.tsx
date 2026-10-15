import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useAppState } from "@/lib/app-state";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Cloud,
  History,
  LogOut,
  Settings2,
} from "lucide-react";
import { useNavigate } from "react-router";

/**
 * Account page (phase 2 — accounts + sync): who is signed in, what syncs,
 * reading stats and the way back into the Qur'an. This is where sign-in
 * lands by default (redirectAfterAuth="/dashboard").
 */
export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { bookmarks, lastRead } = useAppState();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const email = user?.email ?? null;
  const displayName = user?.name || email?.split("@")[0] || "reader";

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
              Account
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              As-salamu alaikum, {displayName}
            </h1>
            {email && (
              <p className="mt-1 text-sm text-muted-foreground">{email}</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer gap-2 self-start"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </header>

        {/* Sync status */}
        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cloud className="size-5" />
            </div>
            <CardTitle>Synced with your account</CardTitle>
            <CardDescription>
              Bookmarks, your last-read position, settings and recent searches
              follow this account automatically on every device — sign in
              anywhere and your reading is exactly where you left it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card px-3.5 py-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Bookmark className="size-3.5 text-primary" />
                  Bookmarks
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {bookmarks.length}
                </dd>
              </div>
              <div className="rounded-xl border border-border bg-card px-3.5 py-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <History className="size-3.5 text-primary" />
                  Last read
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {lastRead
                    ? `Surah ${lastRead.surah} · ${lastRead.ayah}`
                    : "Not yet"}
                </dd>
              </div>
              <div className="rounded-xl border border-border bg-card px-3.5 py-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Bookmark className="size-3.5 text-primary" />
                  Offline text
                </dt>
                <dd className="mt-1 text-muted-foreground">
                  Saved per device
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-3">
              <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="size-4" />
              </div>
              <CardTitle className="text-base">Continue reading</CardTitle>
              <CardDescription>
                {lastRead
                  ? `Pick up at surah ${lastRead.surah}, ayah ${lastRead.ayah}.`
                  : "Your journey through the Qur'an starts here."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="cursor-pointer gap-2"
                onClick={() =>
                  navigate(lastRead ? `/quran/${lastRead.surah}` : "/quran")
                }
              >
                Open the Qur'an
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-3">
              <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Settings2 className="size-4" />
              </div>
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription>
                Theme, Arabic size, translation and reciter — synced with your
                account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="cursor-pointer gap-2"
                onClick={() => navigate("/")}
              >
                Back to home
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
