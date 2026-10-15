import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolvePrayerLocation, usePrayerSettings } from "@/lib/prayerSettings";
import { angleDelta, distanceKm, qiblaBearing } from "@/lib/qibla";
import { Compass, Loader2, MapPin, Navigation } from "lucide-react";
import { useEffect, useState } from "react";

type OrientationState = "idle" | "loading" | "granted" | "denied" | "unsupported";

/**
 * Qibla (phase 2): bearing + distance from your prayer location, and a live
 * compass when the device provides orientation (iOS needs an explicit
 * permission tap). Falls back to a clear numeric bearing without sensors.
 */
export default function Qibla() {
  const [settings, update] = usePrayerSettings();
  const [heading, setHeading] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<OrientationState>("idle");

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const resolved = resolvePrayerLocation(settings, deviceTz);

  // Passive orientation listener (Android fires absolute events; iOS
  // exposes webkitCompassHeading once permission was granted).
  useEffect(() => {
    const handler = (event: Event) => {
      const e = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (typeof e.webkitCompassHeading === "number") {
        setHeading(e.webkitCompassHeading);
        setOrientation("granted");
        return;
      }
      const absolute = event.type === "deviceorientationabsolute";
      if (absolute && typeof e.alpha === "number") {
        // Alpha rotates counterclockwise; compass heading is clockwise.
        setHeading((360 - e.alpha) % 360);
        setOrientation("granted");
      }
    };
    window.addEventListener("deviceorientation", handler);
    window.addEventListener("deviceorientationabsolute", handler);
    return () => {
      window.removeEventListener("deviceorientation", handler);
      window.removeEventListener("deviceorientationabsolute", handler);
    };
  }, []);

  const enableCompass = async () => {
    try {
      const DOE = window.DeviceOrientationEvent as
        | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
        | undefined;
      if (!DOE) {
        setOrientation("unsupported");
        return;
      }
      if (typeof DOE.requestPermission === "function") {
        setOrientation("loading");
        const result = await DOE.requestPermission();
        if (result !== "granted") {
          setOrientation("denied");
          return;
        }
      }
      setOrientation("granted");
      // Android without the absolute event: try a quick synthetic check — if no
      // heading arrives, the numeric bearing below remains the source of truth.
      window.setTimeout(() => {
        setHeading((h) => {
          if (h === null) setOrientation((s) => (s === "granted" ? "idle" : s));
          return h;
        });
      }, 1500);
    } catch {
      setOrientation("denied");
    }
  };

  const bearing = resolved ? qiblaBearing(resolved) : null;
  const km = resolved ? Math.round(distanceKm(resolved)) : null;
  const aligned =
    heading !== null && bearing !== null
      ? Math.abs(angleDelta(heading, bearing)) < 6
      : false;

  if (!resolved) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-6">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
            Qibla
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Direction of the Kaaba</h1>
        </header>
        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Compass className="size-5" />
            </div>
            <CardTitle>Set your location first</CardTitle>
            <CardDescription>
              The Qibla direction is calculated from your position. Set it on
              the Prayer page — it is shared across the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline">
                <a href="/prayer">Open Prayer</a>
              </Button>
              <Button
                variant="outline"
                onClick={() => update({ location: { mode: "city", cityId: "makkah" } })}
              >
                Quick pick: Makkah
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Tip: pick your city on the Prayer page, then return here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Qibla
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Direction of the Kaaba</h1>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 text-primary" />
          {resolved.label}
          {km !== null && ` · ${km.toLocaleString()} km to Makkah`}
        </p>
      </header>

      <Card className="border-border/70 shadow-none">
        <CardContent className="flex flex-col items-center gap-4 pt-6 pb-6">
          {/* Compass dial */}
          <div className="relative size-72">
            <svg
              viewBox="0 0 300 300"
              className="absolute inset-0 size-full"
              style={{
                transform: heading !== null ? `rotate(${-heading}deg)` : undefined,
                transition: "transform 120ms linear",
              }}
              aria-hidden
            >
              <circle cx="150" cy="150" r="140" className="fill-card stroke-border" strokeWidth="2" />
              {Array.from({ length: 36 }).map((_, i) => {
                const major = i % 9 === 0;
                const angle = (i * 10 * Math.PI) / 180;
                const r1 = major ? 118 : 128;
                return (
                  <line
                    key={i}
                    x1={150 + Math.sin(angle) * r1}
                    y1={150 - Math.cos(angle) * r1}
                    x2={150 + Math.sin(angle) * 134}
                    y2={150 - Math.cos(angle) * 134}
                    className={major ? "stroke-foreground" : "stroke-border"}
                    strokeWidth={major ? 2.5 : 1.5}
                  />
                );
              })}
              <text x="150" y="40" textAnchor="middle" className="fill-foreground text-[18px] font-bold" style={{ fontSize: 18 }}>
                N
              </text>
              <text x="150" y="272" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 14 }}>
                S
              </text>
              <text x="34" y="156" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 14 }}>
                W
              </text>
              <text x="266" y="156" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 14 }}>
                E
              </text>
            </svg>

            {/* Qibla needle (independent rotation: bearing − heading) */}
            <div
              className="absolute inset-0 flex items-start justify-center"
              style={{
                transform:
                  bearing !== null
                    ? `rotate(${bearing - (heading ?? 0)}deg)`
                    : `rotate(${bearing ?? 0}deg)`,
                transition: "transform 120ms linear",
              }}
            >
              <div className="flex flex-col items-center gap-1 pt-6">
                <span
                  className={
                    "flex size-12 items-center justify-center rounded-full shadow-md transition-colors " +
                    (aligned ? "bg-primary text-primary-foreground ring-4 ring-primary/30" : "bg-primary text-primary-foreground")
                  }
                >
                  <Navigation className="size-6 fill-current" />
                </span>
              </div>
            </div>

            {/* Center readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold tabular-nums">
                {Math.round(bearing ?? 0)}°
              </span>
              <span className="text-xs text-muted-foreground">Qibla from north</span>
            </div>
          </div>

          {aligned && (
            <p className="text-sm font-semibold text-primary">
              You are facing the Qibla — Allāhu akbar.
            </p>
          )}

          {heading === null && (
            <Button className="cursor-pointer gap-2" onClick={() => void enableCompass()} disabled={orientation === "loading"}>
              {orientation === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Compass className="size-4" />
              )}
              Enable live compass
            </Button>
          )}

          <p className="max-w-xs text-center text-xs leading-5 text-muted-foreground">
            {heading !== null
              ? "Turn until the needle points up. On a phone without a magnetometer the dial stays fixed — follow the degrees above."
              : "Live compass needs device motion permission (iPhone asks once). The bearing above always works: face that angle from true north."}{" "}
            If the needle swings erratically, move away from magnets, metal
            frames and speakers, and wave your phone in a figure-eight to
            recalibrate.
          </p>
          {orientation === "denied" && (
            <p className="text-xs text-destructive">
              Motion access was denied — you can still use the bearing in your
              phone&apos;s compass app.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
