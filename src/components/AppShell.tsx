import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  BellRing,
  BookOpen,
  CalendarDays,
  CircleDot,
  Clock,
  Compass,
  Download,
  GraduationCap,
  Hand,
  Headphones,
  Home as HomeIcon,
  LayoutGrid,
  ListChecks,
  MapPin,
  MoonStar,
  ScrollText,
  WifiOff,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { CrescentMark, MosqueSilhouette } from "@/components/Brand";
import { useOnline } from "@/hooks/use-online";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";

const SPLASH_KEY = "noor:splashSeen";
const SPLASH_MS = 2100;

const NAV_ITEMS = [
  { to: "/", labelKey: "nav.home", label: "Home", icon: HomeIcon, end: true },
  { to: "/quran", labelKey: "nav.quran", label: "Quran", icon: BookOpen, end: false },
  { to: "/prayer", labelKey: "nav.prayer", label: "Prayer", icon: Clock, end: false },
  { to: "/calendar", labelKey: "nav.calendar", label: "Calendar", icon: CalendarDays, end: false },
] as const;

const MORE_LINKS = [
  { to: "/qibla", labelKey: "nav.qibla", label: "Qibla compass", icon: Compass },
  { to: "/tasbih", labelKey: "nav.tasbih", label: "Tasbih counter", icon: CircleDot },
  { to: "/tracker", labelKey: "nav.tracker", label: "Worship tracker", icon: ListChecks },
  { to: "/duas", labelKey: "nav.duas", label: "Duas library", icon: Hand },
  { to: "/reciters", labelKey: "nav.reciters", label: "Reciters library", icon: Headphones },
  { to: "/hadith", labelKey: "nav.hadith", label: "Hadith library", icon: ScrollText },
  { to: "/learn", labelKey: "nav.learn", label: "Learning center", icon: GraduationCap },
  { to: "/ramadan", labelKey: "nav.ramadan", label: "Ramadan & Zakat", icon: MoonStar },
  { to: "/alarms", labelKey: "nav.alarms", label: "Prayer alarms & Adhan", icon: BellRing },
  { to: "/reminders", labelKey: "nav.reminders", label: "Reminders", icon: Bell },
  { to: "/mosques", labelKey: "nav.mosques", label: "Mosque finder", icon: MapPin },
  { to: "/downloads", labelKey: "nav.downloads", label: "Offline & downloads", icon: Download },
] as const;

/** Full-screen splash shown once per browser session. */
function Splash({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const duration = reduce ? 0 : 0.7;
  return (
    <motion.div
      className="pattern-islamic fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-brand-900"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.45, ease: "easeInOut" } }}
      onClick={onDone}
      role="presentation"
    >
      <motion.div
        initial={{ scale: reduce ? 1 : 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center px-6 text-center"
      >
        <CrescentMark className="h-20 w-20 text-[#f2d791] drop-shadow-sm" />
        <motion.p
          initial={{ opacity: 0, y: reduce ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduce ? 0 : 0.25, duration }}
          className="font-quran mt-5 text-4xl text-[#f7e8c4] sm:text-5xl"
          dir="rtl"
        >
          نور الإسلام
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduce ? 0 : 0.4, duration }}
          className="mt-3 text-[11px] font-semibold tracking-[0.45em] text-white/85 uppercase sm:text-xs"
        >
          Noor Al-Islam
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduce ? 0 : 0.6, duration }}
          className="mt-2 text-sm text-white/60"
        >
          The Complete Qur&apos;an &amp; Muslim Companion
        </motion.p>
      </motion.div>
      <MosqueSilhouette className="absolute inset-x-0 bottom-0 h-40 w-full text-black/30" />
      <div className="absolute inset-x-0 bottom-10 z-10 text-center">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.8, delay: reduce ? 0 : 0.9 }}
          className="text-[10px] tracking-[0.3em] text-white/50 uppercase"
        >
          Bismillah
        </motion.span>
      </div>
    </motion.div>
  );
}

/** Bottom-nav "More" entry: a sheet linking the remaining sections. */
function MoreMenu() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="More sections"
        >
          <LayoutGrid className="size-5" aria-hidden="true" />
          <span>{t("nav.more")}</span>
          <span className="mt-0.5 h-1 w-1 rounded-full bg-gold opacity-0" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("nav.more")}</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-2 px-4 pb-6">
          {MORE_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.to}
                type="button"
                onClick={() => go(link.to)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary/50"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="truncate text-sm font-semibold tracking-tight">
                  {t(link.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * App frame: splash, floating bottom navigation (Home / Quran / Prayer /
 * Calendar + More sheet), offline banner and route outlet.
 */
export default function AppShell() {
  const location = useLocation();
  const online = useOnline();
  const { t } = useI18n();
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return !sessionStorage.getItem(SPLASH_KEY);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!showSplash) return;
    try {
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      /* sessionStorage unavailable */
    }
    const timer = setTimeout(() => setShowSplash(false), SPLASH_MS);
    return () => clearTimeout(timer);
  }, [showSplash]);

  // Reset scroll on path change (query-only changes keep position).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      {!online && (
        <div
          role="status"
          className="sticky top-0 z-30 flex items-center justify-center gap-2 border-b border-border bg-accent px-4 py-2 text-xs font-medium text-accent-foreground"
        >
          <WifiOff className="size-3.5 shrink-0" />
          You&apos;re offline — saved surahs are still available
        </div>
      )}

      <main className="flex-1 pb-28">
        <Outlet />
      </main>

      {/* Bottom navigation: primary sections + "More" sheet */}
      <nav
        aria-label="Primary"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center gap-1 rounded-2xl border border-border/70 bg-card/90 p-1.5 backdrop-blur-md">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="size-5" aria-hidden="true" />
                    <span>{t(item.labelKey)}</span>
                    <span
                      className={cn(
                        "mt-0.5 h-1 w-1 rounded-full bg-gold transition-opacity",
                        isActive ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </>
                )}
              </NavLink>
            );
          })}
          <MoreMenu />
        </div>
      </nav>

      <AnimatePresence>
        {showSplash && (
          <Splash
            key="splash"
            onDone={() => setShowSplash(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
