import { execSync, spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const url = "http://localhost:5714/";
const out = fileURLToPath(new URL("./public/og.jpg", import.meta.url));
const serverPath = fileURLToPath(new URL("./server.js", import.meta.url));

const up = () =>
  fetch(url).then(
    () => true,
    () => false,
  );
const server = (await up())
  ? null
  : spawn("node", [serverPath], { stdio: "ignore" });
for (let tries = 0; server && !(await up()); tries++) {
  if (tries > 50) throw new Error("dev server did not start on :5714");
  await new Promise((resolve) => setTimeout(resolve, 100));
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });
  await page.addInitScript(() => localStorage.setItem("yace-theme", "dark"));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  // let the live tagline mount and its shimmer/glitch reach a mid-cycle frame
  await page.waitForTimeout(1200);
  // reshape the hero for the 630px crop: fill and center it, park the fish in
  // the empty right corner (they collide with the tagline otherwise), drop the
  // bubbles (a paused bubble freezes as a stray glyph), stop all animation
  await page.addStyleTag({
    content: `
      .nav { display: none !important; }
      .hero { min-height: 630px; box-sizing: border-box; display: grid; align-items: center; }
      .hero__fish-school { right: -120px; bottom: 60px; }
      .hero__bubbles { display: none !important; }
      * { animation-play-state: paused !important; }
    `,
  });
  await page.waitForTimeout(200);

  const shot = join(mkdtempSync(join(tmpdir(), "yace-og-")), "og-2x.png");
  await page.screenshot({ path: shot });
  // 2x render downscaled keeps glyph edges crisp; jpeg because the scanline
  // noise blows a same-size png up to ~1MB, past messenger scraper limits
  execSync(`sips -z 630 1200 "${shot}" --out "${shot}"`, { stdio: "ignore" });
  execSync(`sips -s format jpeg -s formatOptions 88 "${shot}" --out "${out}"`, {
    stdio: "ignore",
  });
  console.log(`wrote ${out}`);
} finally {
  await browser.close();
  server?.kill();
}
