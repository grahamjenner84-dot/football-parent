import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";

// Loads public/reel-core.js the same manual-CommonJS-compile way
// lib/instagram/slide-fit.ts does (see that file's comment for why plain
// `require` isn't used from lib/ - not a concern in a test file, but kept
// consistent).
function loadReelCore() {
  const filePath = path.join(process.cwd(), "public", "reel-core.js");
  const src = fs.readFileSync(filePath, "utf8");
  const mod = new Module(filePath);
  mod.filename = filePath;
  mod.paths = (Module as unknown as { _nodeModulePaths: (p: string) => string[] })._nodeModulePaths(path.dirname(filePath));
  (mod as unknown as { _compile: (src: string, filename: string) => void })._compile(src, filePath);
  return mod.exports as { badgeText: (slide: { num?: number; numberLabel?: string }) => string };
}

const Core = loadReelCore();

test("badgeText: an ordinary numbered slide shows its zero-padded number", () => {
  assert.equal(Core.badgeText({ num: 7 }), "07");
  assert.equal(Core.badgeText({ num: 1 }), "01");
  assert.equal(Core.badgeText({ num: 12 }), "12");
});

test("badgeText: no num at all defaults to 01 (matches drawSlide's slide.num || 1)", () => {
  assert.equal(Core.badgeText({}), "01");
});

test("badgeText: numberLabel takes priority over num, uppercased", () => {
  assert.equal(Core.badgeText({ num: 11, numberLabel: "BONUS!" }), "BONUS!");
  assert.equal(Core.badgeText({ numberLabel: "bonus!" }), "BONUS!");
});
