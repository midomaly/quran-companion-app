/**
 * Render smoke tests: server-render the real route tree (AppShell + pages)
 * and assert the key UI actually appears. This catches runtime render errors
 * (bad hooks, broken JSX, missing providers) without needing a browser.
 * Run with: bun test
 */
import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { AppStateProvider } from "../src/lib/app-state";
import AppShell from "../src/components/AppShell";
import Home from "../src/pages/Home";
import QuranHub from "../src/pages/QuranHub";
import Reader from "../src/pages/Reader";

function render(path: string): string {
  const html = renderToString(
    <MemoryRouter initialEntries={[path]}>
      <AppStateProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="quran" element={<QuranHub />} />
            <Route path="quran/:surahId" element={<Reader />} />
          </Route>
        </Routes>
      </AppStateProvider>
    </MemoryRouter>,
  );
  // React SSR serializes adjacent text nodes with "<!-- -->" separators
  // (e.g. "Al-Baqara<!-- --> — <!-- -->The Cow"). Strip them so assertions
  // match the text users actually see; content assertions stay exact.
  return html.replace(/<!-- -->/g, "");
}

describe("app shell", () => {
  test("renders splash, brand and bottom navigation", () => {
    const html = render("/");
    expect(html).toContain("نور الإسلام"); // splash
    expect(html).toContain("Noor Al-Islam");
    expect(html).toContain("<span>Home</span>");
    expect(html).toContain("<span>Quran</span>");
  });
});

describe("home dashboard", () => {
  test("renders greeting, reading card, verse card and quick links", () => {
    const html = render("/");
    expect(html).toContain("As-salamu alaikum");
    expect(html).toContain("Start reading"); // no last-read position yet
    expect(html).toContain("Al-Faatiha");
    expect(html).toContain("Verse of the day");
    expect(html).toContain("Surahs");
    expect(html).toContain("Bookmarks");
    expect(html).toContain("Tanzil");
  });
});

describe("quran hub", () => {
  test("lists all 114 surahs with revelation type", () => {
    const html = render("/quran");
    expect(html).toContain("The Qur");
    expect(html).toContain("Al-Faatiha");
    expect(html).toContain("The Opening · 7 ayahs · Meccan");
    expect(html).toContain("An-Naas");
    expect(html).toContain("Mankind · 6 ayahs · Meccan");
    const revelationRows = html.match(/· (Meccan|Medinan)/g);
    expect(revelationRows?.length ?? 0).toBe(114);
  });
});

describe("reader", () => {
  test("shows the loading state for a valid surah", () => {
    const html = render("/quran/2");
    expect(html).toContain("Loading surah");
    expect(html).toContain("Al-Baqara — The Cow");
    expect(html).toContain("Saheeh International");
  });

  test("rejects an invalid surah with a clear error", () => {
    const html = render("/quran/999");
    expect(html).toContain("not a valid surah");
    expect(html).toContain("114 surahs");
  });

  test("rejects a non-numeric surah id", () => {
    const html = render("/quran/not-a-surah");
    expect(html).toContain("not a valid surah");
  });
});
