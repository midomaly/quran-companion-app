/**
 * Zakāt calculator math (src/lib/zakat.ts). The module docstring and README
 * promise "pure, unit-tested" math — these are those tests. The rules
 * asserted here: 2.5% rate (rubʿ al-ʿushr), the nisab gate, due-debt
 * deduction with a zero floor, and that no nisab is ever hard-coded.
 * Run with: bun test
 */
import { describe, expect, test } from "bun:test";
import { ZAKAT_RATE, computeZakat } from "../src/lib/zakat";

const base = {
  cash: 0,
  gold: 0,
  silver: 0,
  investments: 0,
  otherAssets: 0,
  liabilities: 0,
  nisab: 0,
};

describe("computeZakat", () => {
  test("the standard rate is 2.5% (rubʿ al-ʿushr, 1/40)", () => {
    expect(ZAKAT_RATE).toBe(0.025);
    expect(1 / 40).toBe(ZAKAT_RATE);
  });

  test("sums every zakāt-able category", () => {
    const r = computeZakat({
      ...base,
      cash: 1000,
      gold: 2000,
      silver: 50,
      investments: 300,
      otherAssets: 200,
    });
    expect(r.totalAssets).toBe(3550);
    expect(r.netZakatable).toBe(3550);
  });

  test("deducts immediate liabilities and floors the net at zero", () => {
    const deducted = computeZakat({
      ...base,
      cash: 10000,
      liabilities: 4000,
      nisab: 5000,
    });
    expect(deducted.totalLiabilities).toBe(4000);
    expect(deducted.netZakatable).toBe(6000);
    expect(deducted.zakatDue).toBe(150); // 6000 × 0.025

    const underwater = computeZakat({
      ...base,
      cash: 1000,
      liabilities: 5000,
      nisab: 500,
    });
    expect(underwater.netZakatable).toBe(0);
    expect(underwater.zakatDue).toBe(0);
  });

  test("no zakāt below the nisab; due exactly at it", () => {
    const below = computeZakat({ ...base, cash: 4999, nisab: 5000 });
    expect(below.meetsNisab).toBe(false);
    expect(below.zakatDue).toBe(0);

    const at = computeZakat({ ...base, cash: 5000, nisab: 5000 });
    expect(at.meetsNisab).toBe(true);
    expect(at.zakatDue).toBe(125); // 5000 × 0.025
  });

  test("a nisab of zero never qualifies (nothing is hard-coded)", () => {
    const r = computeZakat({ ...base, cash: 10000, nisab: 0 });
    expect(r.meetsNisab).toBe(false);
    expect(r.zakatDue).toBe(0);
  });

  test("non-finite or negative entries count as zero", () => {
    const r = computeZakat({
      ...base,
      cash: Number.NaN,
      gold: -5,
      silver: Number.POSITIVE_INFINITY,
      investments: 2000,
    });
    expect(r.totalAssets).toBe(2000);
    expect(r.netZakatable).toBe(2000);
  });
});
