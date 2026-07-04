import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT) || 5714;

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

const resolveInRoot = (path) =>
  join(root, normalize(path).replace(/^(\.\.[/\\])+/, ""));

// fixtures and examples import ".js" specifiers, but src is authored in ".ts";
// transpile the matching source on the fly and leave specifiers untouched so
// the browser requests each sibling ".ts" and gets it transpiled the same way.
async function transpileSource(path) {
  const source = await readFile(
    resolveInRoot(path.replace(/\.js$/, ".ts")),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  });
  return outputText;
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);

  const isSource =
    path.startsWith("/src/") && (path.endsWith(".js") || path.endsWith(".ts"));
  if (isSource) {
    try {
      const code = await transpileSource(path);
      res.writeHead(200, { "Content-Type": "text/javascript" });
      res.end(code);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
    return;
  }

  const indexedPath = path.endsWith("/") ? path + "index.html" : path;
  const file = resolveInRoot(indexedPath);

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
}).listen(port);
