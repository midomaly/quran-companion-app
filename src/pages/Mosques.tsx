import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Compass,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CITY_PRESETS, resolvePrayerLocation, usePrayerSettings } from "@/lib/prayerSettings";

/**
 * Nearby mosque finder (phase 2).
 *
 * Data: OpenStreetMap via the Overpass API — free, key-less, ODbL-licensed.
 * Multiple mirrors are tried in order; if all fail (network/WAF/limits) the
 * page says so and offers external map search instead. Nothing here is
 * invented: every listing comes from a live OSM response.
 */

interface Mosque {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  distanceM: number;
}

/** Public Overpass mirrors, verified to answer a mosque query. */
const OVERPASS_MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const SEARCH_RADIUS_M = 8000;
const RESULT_LIMIT = 30;

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function overpassQuery(lat: number, lng: number): string {
  return `[out:json][timeout:20];(
    node["amenity"="place_of_worship"]["religion"="muslim"](around:${SEARCH_RADIUS_M},${lat},${lng});
    way["amenity"="place_of_worship"]["religion"="muslim"](around:${SEARCH_RADIUS_M},${lat},${lng});
  );out center ${RESULT_LIMIT};`;
}

interface OverpassTagged {
  tags?: Record<string, string>;
}
interface OverpassNode extends OverpassTagged {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
}

async function queryOverpass(lat: number, lng: number): Promise<OverpassNode[]> {
  const data = overpassQuery(lat, lng);
  let lastError: unknown = null;
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 20_000);
      const res = await fetch(mirror, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(data)}`,
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { elements?: OverpassNode[] };
      if (Array.isArray(json.elements)) return json.elements;
    } catch (err) {
      lastError = err; // try the next mirror
    }
  }
  throw lastError ?? new Error("All Overpass mirrors failed");
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function mapsSearchUrl(q: Mosque | string): string {
  const query = typeof q === "string" ? q : `${q.name} mosque`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function mapsDirectionsUrl(m: Mosque): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`;
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

type Status =
  | { phase: "idle" }
  | { phase: "locating" }
  | { phase: "loading" }
  | { phase: "done" }
  | { phase: "error"; message: string };

export default function Mosques() {
  const [settings] = usePrayerSettings();
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number; label: string } | null>(null);

  const deviceTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const resolved = resolvePrayerLocation(settings, deviceTz);

  const search = useCallback(
    async (lat: number, lng: number, label: string) => {
      setCenter({ lat, lng, label });
      setStatus({ phase: "loading" });
      try {
        const elements = await queryOverpass(lat, lng);
        const found: Mosque[] = [];
        for (const el of elements) {
          const name = el.tags?.name;
          const elLat = el.lat ?? el.center?.lat;
          const elLng = el.lon ?? el.center?.lon;
          if (!name || elLat === undefined || elLng === undefined) continue;
          found.push({
            id: String(el.id),
            name,
            lat: elLat,
            lng: elLng,
            address: buildAddress(el.tags ?? {}),
            phone: el.tags?.phone ?? el.tags?.["contact:phone"],
            website: el.tags?.website ?? el.tags?.["contact:website"],
            distanceM: haversineM(lat, lng, elLat, elLng),
          });
        }
        found.sort((a, b) => a.distanceM - b.distanceM);
        setMosques(found);
        setStatus({ phase: "done" });
      } catch {
        setMosques([]);
        setStatus({
          phase: "error",
          message:
            "Could not reach OpenStreetMap’s Overpass service (it may be rate-limiting or blocked on this network).",
        });
      }
    },
    [],
  );

  const useDevice = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus({ phase: "error", message: "Geolocation is not available on this device." });
      return;
    }
    setStatus({ phase: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => void search(pos.coords.latitude, pos.coords.longitude, "My location"),
      () =>
        setStatus({
          phase: "error",
          message: "Location permission denied — pick a city below instead.",
        }),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600_000 },
    );
  };

  // Auto-search once when a prayer location is already configured.
  useEffect(() => {
    if (resolved && status.phase === "idle") {
      void search(resolved.lat, resolved.lng, resolved.label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  const externalQuery = center
    ? `mosque near ${center.lat},${center.lng}`
    : "mosque near me";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Masjid
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Mosque finder</h1>
        <p className="text-sm text-muted-foreground">
          Real places of worship from OpenStreetMap — names, distances and
          directions, nothing invented.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button
          className="cursor-pointer gap-2"
          onClick={useDevice}
          disabled={status.phase === "locating" || status.phase === "loading"}
        >
          {status.phase === "locating" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MapPin className="size-4" />
          )}
          Use my location
        </Button>
        <Button
          variant="outline"
          className="cursor-pointer gap-2"
          disabled={status.phase === "loading"}
          onClick={() => void search(51.5074, -0.1278, "Demo: London")}
          hidden={false}
        >
          <Compass className="size-4" />
          Nearby (city centre demo)
        </Button>
      </div>

      {/* City shortcuts from the prayer presets */}
      <div className="flex flex-wrap gap-1.5">
        {CITY_PRESETS.slice(0, 8).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => void search(c.lat, c.lng, `${c.name}, ${c.country}`)}
            className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            {c.name}
          </button>
        ))}
      </div>

      {status.phase === "loading" && (
        <Card className="border-border/70 shadow-none">
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Searching OpenStreetMap near {center?.label}…
          </CardContent>
        </Card>
      )}

      {status.phase === "error" && (
        <Card className="border-border/70 shadow-none">
          <CardContent className="flex flex-col gap-3 py-6">
            <p className="text-sm text-muted-foreground">{status.message}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5"
                onClick={() => center && void search(center.lat, center.lng, center.label)}
              >
                <RefreshCw className="size-3.5" />
                Try again
              </Button>
              <Button asChild variant="outline" size="sm" className="cursor-pointer gap-1.5">
                <a href={mapsSearchUrl(externalQuery)} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" />
                  Search on Google Maps
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status.phase === "done" && (
        <Card className="border-border/70 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {mosques.length} {mosques.length === 1 ? "mosque" : "mosques"} near {center?.label}
            </CardTitle>
            <CardDescription>
              Sorted by straight-line distance · OpenStreetMap contributors (ODbL)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {mosques.length === 0 && (
              <div className="flex flex-col gap-3 py-4">
                <p className="text-sm text-muted-foreground">
                  No mosques found in OpenStreetMap within{" "}
                  {SEARCH_RADIUS_M / 1000} km — coverage varies by region.
                </p>
                <Button asChild variant="outline" size="sm" className="cursor-pointer gap-1.5">
                  <a href={mapsSearchUrl(externalQuery)} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3.5" />
                    Search on Google Maps instead
                  </a>
                </Button>
              </div>
            )}
            {mosques.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistance(m.distanceM)} away
                      {m.address && ` · ${m.address}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="cursor-pointer gap-1.5 text-xs"
                  >
                    <a href={mapsDirectionsUrl(m)} target="_blank" rel="noreferrer">
                      <Compass className="size-3.5" />
                      Directions
                    </a>
                  </Button>
                  {m.phone && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="cursor-pointer gap-1.5 text-xs"
                    >
                      <a href={`tel:${m.phone.replace(/\s+/g, "")}`}>
                        <Phone className="size-3.5" />
                        Call
                      </a>
                    </Button>
                  )}
                  {m.website && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="cursor-pointer gap-1.5 text-xs"
                    >
                      <a href={m.website} target="_blank" rel="noreferrer">
                        <Globe className="size-3.5" />
                        Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <p className="pt-1 text-center text-[11px] leading-4 text-muted-foreground">
              Contact details shown only when present in OpenStreetMap data.
              Distances are straight-line — follow local roads and signage.
            </p>
          </CardContent>
        </Card>
      )}

      <p className="pb-4 text-center text-xs leading-5 text-muted-foreground">
        Data © OpenStreetMap contributors · Mirrors: Overpass API. If a listing
        is missing or wrong, improve it at openstreetmap.org.
      </p>
    </div>
  );
}
