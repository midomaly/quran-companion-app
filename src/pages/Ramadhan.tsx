import { useEffect, useMemo, useState } from "react";
import { Calculator, Heart, Moon, Sunrise, Sunset } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCountdown } from "@/lib/prayerSettings";
import {
  CITY_PRESETS,
  prayerInstant,
  resolvePrayerLocation,
  shiftDateParts,
  timesForDate,
  usePrayerSettings,
} from "@/lib/prayerSettings";
import { formatHours } from "@/lib/prayerTimes";
import {
  addCharity,
  computeZakat,
  loadCharity,
  removeCharity,
  type ZakatInput,
} from "@/lib/zakat";
import { hijriParts } from "@/lib/hijri";
import { toast } from "sonner";

/**
 * Ramadan & Zakat (phase 2).
 *
 * Fasting section: Suhoor and Iftar countdowns from the same offline prayer
 * engine the Prayer page uses (Maghrib = Iftar time). A Ramadan calendar is
 * derived from the Hijri month — only shown when today is actually in
 * Ramadan (Umm al-Qura), with a moon-sighting caveat.
 *
 * Zakāt section: fully transparent calculator — you choose the currency,
 * enter the nisab current in your locality, and every assumption is printed
 * under the result. Nothing is hard-coded or universalised.
 */

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "GHS", "XOF", "SAR", "AED", "PKR", "EGP", "IDR", "MYR"];

const EMPTY_INPUT: ZakatInput = {
  cash: 0,
  gold: 0,
  silver: 0,
  investments: 0,
  otherAssets: 0,
  liabilities: 0,
  nisab: 0,
};

function FastingTab() {
  const now = useNow();
  const [settings] = usePrayerSettings();
  const deviceTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const resolved = resolvePrayerLocation(settings, deviceTz);
  const [manualCity, setManualCity] = useState<string | null>(null);

  const location = useMemo(() => {
    if (resolved) return resolved;
    const city = CITY_PRESETS.find((c) => c.id === manualCity) ?? CITY_PRESETS[0];
    const r = resolvePrayerLocation(
      { ...settings, location: { mode: "city", cityId: city.id } },
      deviceTz,
    );
    return r;
  }, [resolved, manualCity, settings, deviceTz]);

  const hijri = hijriParts(new Date(now));
  const isRamadanToday = hijri?.month === 9;

  // Next Maghrib (Iftar) and Fajr (Suhoor deadline) instants.
  const marks = useMemo(() => {
    if (!location) return { iftar: null, suhoor: null, iftarTime: null, suhoorTime: null };
    const today = shiftDateParts(now, 0);
    const t = timesForDate(location, today, settings);
    let iftar = prayerInstant(location, today, t.maghrib);
    let iftarTime: number | null = t.maghrib;
    if (iftar !== null && iftar <= now) {
      const tomorrow = shiftDateParts(now, 1);
      const tt = timesForDate(location, tomorrow, settings);
      iftar = prayerInstant(location, tomorrow, tt.maghrib);
      iftarTime = tt.maghrib;
    }
    // Suhoor deadline = today's Fajr, else tomorrow's.
    let suhoor = prayerInstant(location, today, t.fajr);
    let suhoorTime: number | null = t.fajr;
    if (suhoor !== null && suhoor <= now) {
      const tomorrow = shiftDateParts(now, 1);
      const tt = timesForDate(location, tomorrow, settings);
      suhoor = prayerInstant(location, tomorrow, tt.fajr);
      suhoorTime = tt.fajr;
    }
    return { iftar, suhoor, iftarTime, suhoorTime };
  }, [now, location, settings]);

  const hijriLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(now));
    } catch {
      return null;
    }
  }, [now]);

  return (
    <div className="flex flex-col gap-4">
      {/* Countdowns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="border-border/70 shadow-none">
          <CardContent className="flex flex-col items-center gap-1 pt-6 pb-5 text-center">
            <Moon className="size-5 text-primary" />
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Iftar (Maghrib)
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {marks.iftar ? formatCountdown(marks.iftar - now) : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatHours(marks.iftarTime)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-none">
          <CardContent className="flex flex-col items-center gap-1 pt-6 pb-5 text-center">
            <Sunrise className="size-5 text-primary" />
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Suhoor ends (Fajr)
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {marks.suhoor ? formatCountdown(marks.suhoor - now) : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatHours(marks.suhoorTime)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-sm">Location for fasting times</Label>
        <p className="text-xs text-muted-foreground">
          {location?.label}
          {resolved ? " (from Prayer settings)" : " (city preset — set a location on the Prayer page for GPS)"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CITY_PRESETS.slice(0, 10).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setManualCity(c.id)}
              className={
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (manualCity === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground")
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Ramadan status */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ramadan status</CardTitle>
          <CardDescription>
            {hijriLabel ? `Hijri date: ${hijriLabel}` : "Hijri date unavailable on this device"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRamadanToday ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-primary">
                🌙 Ramadan Mubarak — you are in Ramadan today (Umm al-Qura
                calendar).
              </p>
              <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-xs leading-5 text-muted-foreground">
                Track your fast and Qur&apos;an pages on the Worship Tracker.
                Suhoor/Iftar times above follow your current calculation
                method. Local moon sighting can shift the start by a day —
                confirm with your local authority.
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not Ramadan today (Umm al-Qura calendar). Countdowns above still
              work year-round for voluntary fasting — the same Suhoor and Iftar
              times apply. Ramadan dates can shift ±1 day with local moon
              sighting.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Eid indicator */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-muted-foreground">
        <Sunset className="size-4 shrink-0 text-primary" />
        Eid al-Fiṭr falls on 1 Shawwāl and Eid al-Aḍḥā on 10 Dhū al-Ḥijja —
        see the Calendar for both on the Umm al-Qura timeline.
      </div>
    </div>
  );
}

function ZakatTab() {
  const [currency, setCurrency] = useState("USD");
  const [input, setInput] = useState<ZakatInput>(EMPTY_INPUT);
  const [charity, setCharity] = useState(() => loadCharity());
  const [charityAmount, setCharityAmount] = useState("");
  const [charityNote, setCharityNote] = useState("");

  const result = useMemo(() => computeZakat(input), [input]);
  const fmt = (n: number) =>
    `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const set = (key: keyof ZakatInput, value: string) => {
    const n = Math.max(0, Number(value) || 0);
    setInput((prev) => ({ ...prev, [key]: n }));
  };

  const fields: { key: keyof Omit<ZakatInput, "nisab">; label: string; hint: string }[] = [
    { key: "cash", label: "Cash & bank balances", hint: "Balances held for a lunar year (hawl)" },
    { key: "gold", label: "Gold (current value)", hint: "Weight you own × today’s local gold price" },
    { key: "silver", label: "Silver (current value)", hint: "Weight you own × today’s local silver price" },
    { key: "investments", label: "Investments & business", hint: "Shares, trade goods, business assets at value" },
    { key: "otherAssets", label: "Other zakāt-able assets", hint: "Loans given out, receivables, etc." },
    { key: "liabilities", label: "Immediate debts", hint: "Debts due now (per common scholarly view)" },
  ];

  const totalCharity = charity.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Zakāt calculator</CardTitle>
          <CardDescription>
            Enter amounts in your own currency. The nisab threshold is yours to
            set — it is the local value of the zakāt-able weight of gold or
            silver, which changes with market prices and scholarly rulings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Currency</Label>
            <div className="flex flex-wrap gap-1.5">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={
                    "cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors " +
                    (currency === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground")
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <Label htmlFor={`z-${f.key}`} className="text-sm">
                {f.label}
              </Label>
              <Input
                id={`z-${f.key}`}
                inputMode="decimal"
                type="number"
                min={0}
                placeholder="0"
                value={input[f.key] || ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{f.hint}</p>
            </div>
          ))}

          <div className="flex flex-col gap-1 rounded-xl border border-primary/40 bg-primary/5 px-3.5 py-3">
            <Label htmlFor="z-nisab" className="text-sm">
              Nisab threshold ({currency}) — enter today’s value for your locality
            </Label>
            <Input
              id="z-nisab"
              inputMode="decimal"
              type="number"
              min={0}
              placeholder="e.g. local gold-price equivalent"
              value={input.nisab || ""}
              onChange={(e) => set("nisab", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="size-4 text-primary" />
            Result
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total assets</span>
            <span className="font-semibold tabular-nums">{fmt(result.totalAssets)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">− Immediate debts</span>
            <span className="font-semibold tabular-nums">{fmt(result.totalLiabilities)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="text-muted-foreground">= Zakāt-able wealth</span>
            <span className="font-semibold tabular-nums">{fmt(result.netZakatable)}</span>
          </div>
          <div className="rounded-xl bg-primary/10 px-3.5 py-3">
            <p className="text-xs text-muted-foreground">Zakāt due at 2.5% (1/40)</p>
            <p className="mt-0.5 text-2xl font-bold text-primary tabular-nums">
              {result.zakatDue > 0 ? fmt(result.zakatDue) : fmt(0)}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {input.nisab === 0
                ? "Enter your local nisab value to see whether zakāt is due."
                : result.meetsNisab
                  ? "Wealth is at or above the nisab — zakāt is due once the lunar year (hawl) has passed over it."
                  : "Below the nisab — no zakāt is due at this amount."}
            </p>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            <span className="font-semibold text-foreground">Assumptions:</span>{" "}
            2.5% on wealth held for a lunar year, above the nisab you entered;
            immediate debts deducted. Rulings differ between madhāhib on
            mixed-use assets, business depreciation, pensions and hawl
            restarts — for complex situations consult a qualified scholar;
            this calculator is a guide, not a fatwa.
          </p>
        </CardContent>
      </Card>

      {/* Charity log */}
      <Card className="border-border/70 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="size-4 text-primary" />
            Charity & sadaqah log
          </CardTitle>
          <CardDescription>
            Track what you have given — total {currency}{" "}
            {totalCharity.toLocaleString()} on record
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              inputMode="decimal"
              type="number"
              min={0}
              placeholder="Amount"
              value={charityAmount}
              onChange={(e) => setCharityAmount(e.target.value)}
              className="sm:w-32"
            />
            <Input
              placeholder="Note (optional) — e.g. Masjid fund"
              value={charityNote}
              maxLength={60}
              onChange={(e) => setCharityNote(e.target.value)}
            />
            <Button
              className="cursor-pointer"
              disabled={!(Number(charityAmount) > 0)}
              onClick={() => {
                const amount = Number(charityAmount);
                if (!(amount > 0)) return;
                setCharity(addCharity(amount, charityNote.trim()));
                setCharityAmount("");
                setCharityNote("");
                toast.success("Charity recorded.");
              }}
            >
              Add
            </Button>
          </div>
          {charity.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              No entries yet — charity can be given any day of the year.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {charity.slice(0, 20).map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-semibold tabular-nums">
                      {currency} {e.amount.toLocaleString()}
                    </span>
                    {e.note && (
                      <span className="ml-2 text-muted-foreground">· {e.note}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{e.date}</span>
                    <button
                      type="button"
                      aria-label="Remove entry"
                      onClick={() => setCharity(removeCharity(e.id))}
                      className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Ramadan & Zakat hub page. */
export default function Ramadhan() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Siyām & Zakāt
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Ramadan & Zakat</h1>
        <p className="text-sm text-muted-foreground">
          Fasting countdowns, a transparent zakāt calculator and your charity
          log.
        </p>
      </header>

      <Tabs defaultValue="fasting">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fasting">Fasting</TabsTrigger>
          <TabsTrigger value="zakat">Zakat & charity</TabsTrigger>
        </TabsList>
        <TabsContent value="fasting" className="mt-4">
          <FastingTab />
        </TabsContent>
        <TabsContent value="zakat" className="mt-4">
          <ZakatTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
