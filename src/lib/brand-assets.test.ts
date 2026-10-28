import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const root = new URL("../../", import.meta.url);

function bytes(relative: string): Buffer {
  return readFileSync(new URL(relative, root));
}

describe("brand files", () => {
  it("ships the header logo, the wordmark, and a real favicon", () => {
    const webp = bytes("public/brand/tidynest-logo-white.webp");
    const whitePng = bytes("public/brand/tidynest-logo-white.png");
    const wordmark = bytes("public/brand/tidynest-logo.png");
    const favicon = bytes("src/app/favicon.ico");
    assert.equal(webp.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(whitePng.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(wordmark.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(favicon.readUInt16LE(0), 0);
    assert.equal(favicon.readUInt16LE(2), 1);
    const login = readFileSync(new URL("src/app/login/page.tsx", root), "utf8");
    const nav = readFileSync(new URL("src/components/nav-bar.tsx", root), "utf8");
    assert.match(login, /brandLogoPath\(\)/);
    assert.match(nav, /logoPath/);
    const brand = readFileSync(new URL("src/lib/brand.ts", root), "utf8");
    assert.match(brand, /\/brand\/tidynest-logo-white\.webp/);
  });
});
