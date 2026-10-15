import { useState } from "react";
import {
  Check,
  Cloud,
  CloudOff,
  Loader2,
  Settings2,
  Trash2,
  UserRound,
  WifiOff,
} from "lucide-react";
import { useConvex } from "convex/react";
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
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ARABIC_EDITION_NAME,
  RECITERS,
  TRANSLATION_EDITION_NAME,
  clearQuranCache,
  offlineSurahCount,
} from "@/lib/quranApi";
import {
  MAX_ARABIC_FONT_SIZE,
  MIN_ARABIC_FONT_SIZE,
  useAppState,
  type ThemeChoice,
} from "@/lib/app-state";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router";

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
      {children}
    </h3>
  );
}

/**
 * Phase-2 account & sync section. Gated on a live Convex client so SSR/render
 * trees (which mount <AppStateProvider> without providers) render nothing.
 */
function AccountSection({ close }: { close: () => void }) {
  const convex = useConvex();
  if (!convex) return null;
  return <AccountSectionInner close={close} />;
}

function AccountSectionInner({ close }: { close: () => void }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { bookmarks } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) return null;

  const goTo = (path: string) => {
    close();
    navigate(path);
  };
  const countLabel = `${bookmarks.length} bookmark${bookmarks.length === 1 ? "" : "s"} on this device`;

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <section className="flex flex-col gap-3">
        <SectionTitle>Account</SectionTitle>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
          <div className="flex items-center gap-2.5 text-sm">
            <CloudOff className="size-4 shrink-0 text-primary" />
            <div className="flex flex-col">
              <span className="font-medium">Sync across devices</span>
              <span className="text-xs text-muted-foreground">{countLabel}</span>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="cursor-pointer gap-1.5"
            onClick={() =>
              goTo(`/auth?returnTo=${encodeURIComponent(returnTo)}`)
            }
          >
            Sign in
          </Button>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Sign in with an email code to back up bookmarks, reading position and
          settings — they follow your account to any device.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Account</SectionTitle>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2.5 text-sm">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">
              {user?.name || user?.email || "Signed in"}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Cloud className="size-3 text-primary" /> Synced · {countLabel}
            </span>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="cursor-pointer gap-1.5"
          onClick={() => goTo("/dashboard")}
        >
          Manage
        </Button>
      </div>
    </section>
  );
}

/**
 * Gear button that opens the app settings sheet (appearance, reading,
 * reciter, sources and offline cache). Used on Home, Quran and the Reader.
 */
export function SettingsButton({ className }: { className?: string }) {
  const { settings, updateSettings } = useAppState();
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cachedSurahs, setCachedSurahs] = useState(() => offlineSurahCount());

  const handleClearCache = () => {
    setClearing(true);
    try {
      const removed = clearQuranCache();
      setCachedSurahs(0);
      toast.success(
        removed > 0 ? `Removed saved Qur'an text for ${removed} surah(s).` : "No saved Qur'an text to remove.",
      );
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Settings"
            className={cn("text-muted-foreground hover:text-foreground", className)}
          >
            <Settings2 className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Appearance, reading and data preferences</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-6 px-5 pb-8 pt-1">
            {/* Appearance */}
            <section className="flex flex-col gap-3">
              <SectionTitle>Appearance</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((opt) => {
                  const active = settings.theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateSettings({ theme: opt.value })}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                      aria-pressed={active}
                    >
                      {active && <Check className="size-3.5" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Reading */}
            <section className="flex flex-col gap-4">
              <SectionTitle>Reading</SectionTitle>

              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="arabic-size" className="text-sm">
                    Arabic text size
                  </Label>
                  <span className="text-xs font-semibold text-primary tabular-nums">
                    {settings.arabicFontSize}px
                  </span>
                </div>
                <Slider
                  id="arabic-size"
                  min={MIN_ARABIC_FONT_SIZE}
                  max={MAX_ARABIC_FONT_SIZE}
                  step={1}
                  value={[settings.arabicFontSize]}
                  onValueChange={(v) => updateSettings({ arabicFontSize: v[0] })}
                  aria-label="Arabic text size"
                />
                <div className="flex items-center justify-between gap-4">
                  <span className="font-quran text-xl" dir="rtl">
                    بِسْمِ ٱللَّهِ
                  </span>
                  <span className="font-quran text-3xl" dir="rtl">
                    بِسْمِ ٱللَّهِ
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-3.5 py-3">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="show-translation" className="text-sm">
                    English translation
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Show {TRANSLATION_EDITION_NAME} under each ayah
                  </span>
                </div>
                <Switch
                  id="show-translation"
                  checked={settings.showTranslation}
                  onCheckedChange={(checked) => updateSettings({ showTranslation: checked })}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-3.5 py-3">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="continuous" className="text-sm">
                    Continuous playback
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Keep reciting ayah by ayah within a surah
                  </span>
                </div>
                <Switch
                  id="continuous"
                  checked={settings.continuousPlayback}
                  onCheckedChange={(checked) => updateSettings({ continuousPlayback: checked })}
                />
              </div>
            </section>

            {/* Reciter */}
            <section className="flex flex-col gap-3">
              <SectionTitle>Reciter</SectionTitle>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {RECITERS.map((reciter) => {
                  const active = settings.reciter === reciter.id;
                  return (
                    <button
                      key={reciter.id}
                      type="button"
                      onClick={() => updateSettings({ reciter: reciter.id })}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                      aria-pressed={active}
                    >
                      <span className="truncate">{reciter.name}</span>
                      {active && <Check className="size-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Data */}
            <section className="flex flex-col gap-3">
              <SectionTitle>Offline data</SectionTitle>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <WifiOff className="size-4 text-primary" />
                  <span>
                    <strong className="font-semibold">{cachedSurahs}</strong> surah
                    {cachedSurahs === 1 ? "" : "s"} saved on this device
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setConfirmClear(true)}
                  disabled={cachedSurahs === 0}
                >
                  <Trash2 className="size-3.5" />
                  Clear
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Saved Qur&apos;an text always stays on this device. Bookmarks,
                settings and your last-read position are stored locally too —
                and backed up to your account automatically whenever you&apos;re
                signed in.
              </p>
            </section>

            {/* Account & sync (phase 2) */}
            <AccountSection close={() => setOpen(false)} />

            {/* Sources */}
            <section className="flex flex-col gap-2">
              <SectionTitle>Sources</SectionTitle>
              <ul className="flex flex-col gap-1.5 text-xs leading-5 text-muted-foreground">
                <li>
                  Qur&apos;an text: {ARABIC_EDITION_NAME} via AlQuran Cloud —{" "}
                  <a
                    href="https://tanzil.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    tanzil.net
                  </a>
                </li>
                <li>English translation: {TRANSLATION_EDITION_NAME}</li>
                <li>Verse audio: cdn.islamic.network</li>
                <li>
                  Hijri date: Umm al-Qura calendar from your device — actual dates
                  depend on local moon sighting.
                </li>
              </ul>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear saved Qur&apos;an text?</AlertDialogTitle>
            <AlertDialogDescription>
              Surahs you have read will no longer be available offline. Your
              bookmarks, settings and reading position are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleClearCache();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {clearing ? <Loader2 className="size-4 animate-spin" /> : "Clear saved text"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
