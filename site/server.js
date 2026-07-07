import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { transpileSource } from "../scripts/transpile-src.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const publicRoot = fileURLToPath(new URL("public", import.meta.url));
const port = Number(process.env.PORT) || 5714;

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".map": "application/json",
};

const resolveInPublic = (path) =>
  join(publicRoot, normalize(path).replace(/^(\.\.[/\\])+/, ""));

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);

  // the import map resolves "yace" to ./src/*.js; mirror prod's built
  // _site/src by transpiling the ".ts" source live from the repo root
  const isSource =
    path.startsWith("/src/") && (path.endsWith(".js") || path.endsWith(".ts"));
  if (isSource) {
    try {
      const code = await transpileSource(repoRoot, path);
      res.writeHead(200, { "Content-Type": "text/javascript" });
      res.end(code);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
    return;
  }

  const indexedPath = path.endsWith("/") ? path + "index.html" : path;
  const file = resolveInPublic(indexedPath);

  try {
    if ((await stat(file)).isDirectory()) {
      // serving index.html at the slashless URL would break the page's
      // relative imports — redirect to the canonical directory URL instead
      res.writeHead(301, { Location: path + "/" });
      res.end();
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "text/plain" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(port, () => {
  console.log(`yace site → http://localhost:${port}/`);
});
