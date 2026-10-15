import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Cloud,
  CloudOff,
  Download,
  HardDrive,
  Loader2,
  Trash2,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOnline } from "@/hooks/use-online";
import { useAuth } from "@/hooks/use-auth";
import {
  downloadSurah,
  errorMessage,
  listQuranCache,
  removeSurahCache,
  clearQuranCache,
  type CacheEntry,
} from "@/lib/quranApi";
import { SURAHS, getSurah } from "@/lib/surahs";

/**
 * Download manager & offline centre (phase 2).
 *
 * - Shows what is saved for offline reading (Qur'ān text + translation),
 *   with approximate sizes and per-surah removal.
 * - "Download a surah" fetches both editions and caches them — real
 *   downloads, with per-item status (never faked).
 * - Storage estimate via the Storage API where the browser supports it.
 * - Sync status for the optional account (read-only view of auth state).
 */

function formatBytes(chars: number): string {
  // localStorage stores UTF-16: treat one unit as ~2 bytes.
  const bytes = chars * 2;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type DownloadState = Record<number, "idle" | "downloading" | "error">;

export default function Downloads() {
  const online = useOnline();
  const { isAuthenticated, isLoading } = useAuth();
  const [entries, setEntries] = useState<CacheEntry[]>(() => listQuranCache());
  const [downloadState, setDownloadState] = useState<DownloadState>({});
  const [query, setQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);

  const refresh = useCallback(() => setEntries(listQuranCache()), []);

  // Storage estimate (Chromium). Unsupported browsers just skip it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (navigator.storage?.estimate) {
          const est = await navigator.storage.estimate();
          if (!cancelled && est.usage !== undefined && est.quota !== undefined) {
            setUsage({ usage: est.usage, quota: est.quota });
          }
        }
      } catch {
        /* estimate unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saved = useMemo(() => entries.filter((e) => e.arabic), [entries]);
  const totalChars = useMemo(
    () => entries.reduce((s, e) => s + e.bytes, 0),
    [entries],
  );

  const filteredSurahs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter(
      (s) =>
        s.translit.toLowerCase().includes(q) ||
        s.meaning.toLowerCase().includes(q) ||
        String(s.n) === q,
    );
  }, [query]);

  const download = async (surah: number) => {
    if (downloadState[surah] === "downloading") return;
    if (!online) {
      toast.error("You're offline — downloads need a connection.");
      return;
    }
    setDownloadState((s) => ({ ...s, [surah]: "downloading" }));
    try {
      await downloadSurah(surah);
      setDownloadState((s) => ({ ...s, [surah]: "idle" }));
      refresh();
      toast.success(
        `${getSurah(surah)?.translit ?? `Surah ${surah}`} saved for offline reading.`,
      );
    } catch (err) {
      setDownloadState((s) => ({ ...s, [surah]: "error" }));
      toast.error(errorMessage(err));
    }
  };

  const removeOne = (surah: number) => {
    removeSurahCache(surah);
    refresh();
    toast.success(`Removed ${getSurah(surah)?.translit ?? surah} from this device.`);
  };

  const clearAll = () => {
    const removed = clearQuranCache();
    refresh();
    setConfirmClear(false);
    toast.success(
      removed > 0 ? `Removed ${removed} saved items.` : "Nothing was saved yet.",
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Offline
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Offline & downloads</h1>
        <p className="text-sm text-muted-foreground">
          Save surahs to read without internet — bookmarks, notes, duas,
          tasbih and prayer settings already work offline.
        </p>
      </header>

      {/* Connection + storage overview */}
      <Card className="border-border/70 shadow-none">
        <CardContent className="grid grid-cols-2 gap-3 pt-6 text-sm sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {online ? <Cloud className="size-3.5 text-primary" /> : <WifiOff className="size-3.5" />}
              Network
            </p>
            <p className="mt-0.5 font-semibold">{online ? "Online" : "Offline"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Download className="size-3.5 text-primary" />
              Saved surahs
            </p>
            <p className="mt-0.5 font-semibold tabular-nums">{saved.length} / 114</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HardDrive className="size-3.5 text-primary" />
              App storage
            </p>
            <p className="mt-0.5 font-semibold tabular-nums">
              {usage
                ? `${(usage.usage / 1024 / 1024).toFixed(1)} MB of ${(usage.quota / 1024 / 1024 / 1024).toFixed(1)} GB`
                : formatBytes(totalChars)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isAuthenticated ? (
                <Cloud className="size-3.5 text-primary" />
              ) : (
                <CloudOff className="size-3.5" />
              )}
              Sync
            </p>
            <p className="mt-0.5 font-semibold">
              {isLoading ? "…" : isAuthenticated ? "Account on" : "Local only"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Download a surah */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Download a surah</CardTitle>
          <CardDescription>
            Fetches the Uthmani text + Saheeh International translation and
            keeps them on this device (~5 KB per short surah).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search surah by name, meaning or number…"
            aria-label="Search surah to download"
          />
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
            {filteredSurahs.map((s) => {
              const entry = entries.find((e) => e.surah === s.n);
              const isDownloaded = !!entry?.arabic;
              const state = downloadState[s.n] ?? "idle";
              return (
                <div
                  key={s.n}
                  className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {s.n}. {s.translit}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.meaning} · {s.ayahs} ayahs
                      {entry && ` · ${formatBytes(entry.bytes)}`}
                    </p>
                  </div>
                  {state === "downloading" ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </span>
                  ) : isDownloaded ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer gap-1 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOne(s.n)}
                      aria-label={`Remove ${s.translit} from device`}
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer gap-1.5"
                      onClick={() => void download(s.n)}
                      disabled={!online}
                      aria-label={`Download ${s.translit}`}
                    >
                      <Download className="size-3.5" />
                      Save
                    </Button>
                  )}
                </div>
              );
            })}
            {filteredSurahs.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No surah matches “{query}”.
              </p>
            )}
          </div>
          {!online && (
            <p className="text-xs text-muted-foreground">
              Downloads need a connection; saved surahs stay readable offline.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Saved inventory */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Saved on this device</CardTitle>
            <CardDescription>
              {entries.length} surahs · {formatBytes(totalChars)} of text
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5 text-destructive hover:text-destructive"
            disabled={entries.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="size-3.5" />
            Clear all
          </Button>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">
              Nothing saved yet — your last-read position, bookmarks, settings
              and the daily verse cache still work offline.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {entries.map((e) => {
                const meta = getSurah(e.surah);
                return (
                  <li key={e.surah}>
                    <button
                      type="button"
                      onClick={() => removeOne(e.surah)}
                      className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                      title={`Remove ${meta?.translit ?? e.surah}`}
                    >
                      {meta?.translit ?? `#${e.surah}`} · {formatBytes(e.bytes)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="pb-4 text-center text-xs leading-5 text-muted-foreground">
        Audio streams from cdn.islamic.network when online — it is licensed for
        streaming, not redistribution, so recitation is not stored on the
        device. Account sync covers bookmarks, last-read and settings only.
      </p>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all saved Qur&apos;an text?</AlertDialogTitle>
            <AlertDialogDescription>
              {entries.length} saved surahs will be deleted from this device.
              You can download them again later when online.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction className="cursor-pointer" onClick={clearAll}>
              Remove all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
