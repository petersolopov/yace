import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import ts from "typescript";

// src is authored in ".ts" but the browser (library fixtures, the site's
// import map) requests ".js"; transpile the matching sibling on the fly so dev
// serves the same modules prod ships as the built _site/src. Mechanical: it
// throws when the source is missing and leaves the 404/error policy to callers.
export async function transpileSource(root, requestPath) {
  const relative = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const source = await readFile(
    join(root, relative.replace(/\.js$/, ".ts")),
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
