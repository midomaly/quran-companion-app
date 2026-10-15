/**
 * Zakāt calculator math (phase 2) — pure functions, unit-tested.
 *
 * Design rules from the brief:
 * - NO universal currency or nisab value is assumed: the user picks their
 *   currency and enters the nisab current for their locality (the app
 *   documents how nisab is derived — the value of the zakāt-able weight of
 *   gold or silver where one lives — but never hard-codes a market price,
 *   because gold/silver prices and scholarly rulings vary).
 * - The standard rate is 2.5% (rubʿ al-ʿushr, 1/40) of zakāt-able wealth
 *   once it reaches the nisab and a lunar year has passed — the app states
 *   that the hawl (one-year hold) and complex cases need a scholar.
 */

export const ZAKAT_RATE = 0.025;

export interface ZakatInput {
  /** Cash in hand + bank balances. */
  cash: number;
  /** Gold value (by weight × current local price, in your currency). */
  gold: number;
  /** Silver value likewise. */
  silver: number;
  /** Business/investment assets at current value. */
  investments: number;
  /** Other zakāt-able assets (receivables, trade goods…). */
  otherAssets: number;
  /** Debts due immediately (some scholars allow deducting due debts). */
  liabilities: number;
  /** Nisab in your currency — entered by you, never hard-coded. */
  nisab: number;
}

export interface ZakatResult {
  totalAssets: number;
  totalLiabilities: number;
  /** assets − liabilities, floored at 0. */
  netZakatable: number;
  meetsNisab: boolean;
  zakatDue: number;
}

/** Sum of all asset categories minus liabilities (floored at zero). */
export function computeZakat(input: ZakatInput): ZakatResult {
  const num = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
  const totalAssets =
    num(input.cash) +
    num(input.gold) +
    num(input.silver) +
    num(input.investments) +
    num(input.otherAssets);
  const totalLiabilities = num(input.liabilities);
  const net = Math.max(0, totalAssets - totalLiabilities);
  const meetsNisab = input.nisab > 0 && net >= input.nisab;
  return {
    totalAssets,
    totalLiabilities,
    netZakatable: net,
    meetsNisab,
    zakatDue: meetsNisab ? net * ZAKAT_RATE : 0,
  };
}

export interface CharityEntry {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  note: string;
}

const CHARITY_KEY = "noor:charity";

export function loadCharity(): CharityEntry[] {
  try {
    const raw = localStorage.getItem(CHARITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e): e is CharityEntry => {
        if (!e || typeof e !== "object") return false;
        const x = e as Partial<CharityEntry>;
        return (
          typeof x.id === "string" &&
          typeof x.date === "string" &&
          typeof x.amount === "number" &&
          Number.isFinite(x.amount) &&
          typeof x.note === "string"
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export function saveCharity(entries: CharityEntry[]): void {
  try {
    localStorage.setItem(CHARITY_KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable */
  }
}

export function addCharity(amount: number, note: string): CharityEntry[] {
  const entry: CharityEntry = {
    id: `${Date.now()}${Math.floor(Math.random() * 1e5)}`,
    date: new Date().toISOString().slice(0, 10),
    amount,
    note,
  };
  const next = [entry, ...loadCharity()];
  saveCharity(next);
  return next;
}

export function removeCharity(id: string): CharityEntry[] {
  const next = loadCharity().filter((e) => e.id !== id);
  saveCharity(next);
  return next;
}
