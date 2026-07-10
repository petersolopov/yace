import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

// the public claim is "under 2KB gzip" (README, site hero, repo description);
// 2000 is the decimal-kB reading — stricter than 2048 and what bundlephobia
// displays, so the claim can never drift out of sync with the badge
const limit = 2000;

const file = new URL("../dist/index.js", import.meta.url);
const gzipped = gzipSync(await readFile(file)).length;

if (gzipped >= limit) {
  console.error(
    `check-size: dist/index.js is ${gzipped} B gzip — the "under 2KB" claim allows at most ${limit - 1} B`,
  );
  process.exit(1);
}

console.log(`check-size: dist/index.js is ${gzipped} B gzip (limit ${limit})`);
