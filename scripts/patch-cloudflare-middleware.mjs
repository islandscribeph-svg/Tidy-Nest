import { readFileSync, writeFileSync } from "node:fs";

// OpenNext's edge converter calls `cookie`'s default export. The bundled
// package only exposes named `parse`, so any request with a Cookie header
// crashes before the app runs. Point the call at the named export.
const file = new URL("../.open-next/middleware/handler.mjs", import.meta.url);
const source = readFileSync(file, "utf8");
const next = source.replaceAll("import_cookie.default.parse", "import_cookie.parse");
if (next === source) {
  if (!source.includes("import_cookie.parse")) {
    console.error("Could not find the cookie parser call in the Worker middleware bundle.");
    process.exit(1);
  }
  console.log("Cloudflare middleware cookie parser already patched.");
} else {
  writeFileSync(file, next);
  console.log("Patched the Cloudflare middleware cookie parser.");
}
