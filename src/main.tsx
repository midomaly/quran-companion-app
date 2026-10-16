import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { AppStateProvider } from "@/lib/app-state";
import { I18nProvider } from "@/lib/i18n";
import "./index.css";

// Lazy load route components for better code splitting
const AppShell = lazy(() => import("./components/AppShell.tsx"));
const Home = lazy(() => import("./pages/Home.tsx"));
const QuranHub = lazy(() => import("./pages/QuranHub.tsx"));
const Reader = lazy(() => import("./pages/Reader.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Prayer = lazy(() => import("./pages/Prayer.tsx"));
const Qibla = lazy(() => import("./pages/Qibla.tsx"));
const Tasbih = lazy(() => import("./pages/Tasbih.tsx"));
const Duas = lazy(() => import("./pages/Duas.tsx"));
const Hadith = lazy(() => import("./pages/Hadith.tsx"));
const CalendarPage = lazy(() => import("./pages/CalendarPage.tsx"));
const Reminders = lazy(() => import("./pages/Reminders.tsx"));
const Ramadhan = lazy(() => import("./pages/Ramadhan.tsx"));
const Mosques = lazy(() => import("./pages/Mosques.tsx"));
const Learn = lazy(() => import("./pages/Learn.tsx"));
const Downloads = lazy(() => import("./pages/Downloads.tsx"));
const Tracker = lazy(() => import("./pages/Tracker.tsx"));
import { PrayerReminderHost } from "@/components/PrayerReminderHost";
import { ReminderHost } from "@/components/ReminderHost";

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// PWA: register the offline-shell service worker in production only (the dev
// preview relies on HMR, which a service worker would fight) and only in the
// top window (the platform preview embeds the app in an iframe, where service
// worker registration is blocked by the browser).
if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  window.top === window.self
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* installability is best-effort — the app works without it */
    });
  });
}



function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <I18nProvider>
        <AppStateProvider>
          <BrowserRouter>
            <RouteSyncer />
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                {/* Noor Al-Islam — version 1: Home + Qur'an reader */}
                <Route element={<AppShell />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/quran" element={<QuranHub />} />
                  <Route path="/quran/:surahId" element={<Reader />} />
                  <Route path="/prayer" element={<Prayer />} />
                  <Route path="/qibla" element={<Qibla />} />
                  <Route path="/tasbih" element={<Tasbih />} />
                  <Route path="/duas" element={<Duas />} />
                  <Route path="/hadith" element={<Hadith />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/reminders" element={<Reminders />} />
                  <Route path="/ramadhan" element={<Ramadhan />} />
                  <Route path="/mosques" element={<Mosques />} />
                  <Route path="/learn" element={<Learn />} />
                  <Route path="/downloads" element={<Downloads />} />
                  <Route path="/tracker" element={<Tracker />} />
                </Route>
                <Route
                  path="/auth"
                  element={<AuthPage redirectAfterAuth="/dashboard" />}
                />
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <Dashboard />
                    </RequireAuth>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AppStateProvider>
        </I18nProvider>
        <Toaster />
        <PrayerReminderHost />
        <ReminderHost />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
