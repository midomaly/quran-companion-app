/**
 * Regenerates the PWA PNG icons from public/logo.svg.
 *
 * Chrome (Android & desktop) will not accept a manifest icon that is an SVG
 * with `"sizes": "any"` — it fails the installability check, so "Install app"
 * / "Add to Home screen" never appears. Real 192×192 and 512×512 PNGs are
 * required. Run after changing the logo:
 *
 *   bun scripts/generate-icons.ts
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const svg = await Bun.file(new URL("../public/logo.svg", import.meta.url)).text();
const outDir = new URL("../public/icons/", import.meta.url);
await mkdir(outDir, { recursive: true });

for (const size of [192, 512] as const) {
  const out = new URL(`icon-${size}.png`, outDir);
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(out.pathname);
  console.log(`wrote ${out.pathname} (${size}×${size})`);
}

// Maskable variant: the OS crops maskable icons to a circle/squircle, so the
// background must be full-bleed (the regular icon has rounded, transparent
// corners that would show as slivers).
{
  const out = new URL("icon-512-maskable.png", outDir);
  const mark = await sharp(Buffer.from(svg), { density: 300 })
    .resize(512, 512, { fit: "fill" })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: "#0b5540" },
  })
    .composite([{ input: mark }])
    .png({ compressionLevel: 9 })
    .toFile(out.pathname);
  console.log(`wrote ${out.pathname} (512×512 maskable)`);
}
