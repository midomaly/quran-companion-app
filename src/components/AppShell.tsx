import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Home as HomeIcon, WifiOff } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router";
import { CrescentMark, MosqueSilhouette } from "@/components/Brand";
import { useOnline } from "@/hooks/use-online";
import { cn } from "@/lib/utils";

const SPLASH_KEY = "noor:splashSeen";
const SPLASH_MS = 2100;

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/quran", label: "Quran", icon: BookOpen, end: false },
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

/**
 * App frame for the two version-1 sections: splash, floating bottom
 * navigation (Home / Quran), offline banner and route outlet.
 */
export default function AppShell() {
  const location = useLocation();
  const online = useOnline();
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

      {/* Bottom navigation (version 1: Home + Quran) */}
      <nav
        aria-label="Primary"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-xs items-center gap-1 rounded-2xl border border-border/70 bg-card/90 p-1.5 backdrop-blur-md">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="size-5" aria-hidden="true" />
                    <span>{item.label}</span>
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
