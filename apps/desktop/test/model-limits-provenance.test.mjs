import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, path), "utf8");

const panes = read("../src/components/settings/ModelSelectionPanes.tsx");
const LOCALES = ["de", "en", "es", "fr", "ko", "tr", "zh-CN", "zh-TW"];
const localesDir = join(here, "../../../packages/i18n/src/locales");
const localeSources = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    readFileSync(join(localesDir, locale, "index.ts"), "utf8"),
  ]),
);

// The generic-seed annotation keeps unknown models honest: 128k/8k must never
// read as a published window. Keep this suite source-oriented like the
// neighboring desktop contracts.
test("unmatched models are annotated as generic, catalog matches and user pins are not", () => {
  // The chosen-row derivation must gate on both signals: no catalog
  // provenance of any kind AND a binding the user has not pinned.
  assert.match(
    panes,
    /const genericLimits =\s*\n\s*binding\.contextWindowSource !== "user" &&\s*\n\s*info\?\.catalogSource == null;/,
  );
  // The available list mirrors it per row, so a hand-pinned binding that the
  // endpoint no longer lists stays unmarked.
  assert.match(
    panes,
    /row\.binding\?\.contextWindowSource !== "user" &&\s*\n\s*row\.info\?\.catalogSource == null/,
  );
  // Any catalog source — models.dev or an OpenRouter endpoint (ADR 0307) —
  // counts as matched, so the union must be tested against null, not one value.
  assert.doesNotMatch(panes, /catalogSource !== "models\.dev"/);
});

test("the generic hint reaches all four limit surfaces", () => {
  const uses = panes.split("settings.modelLimitsGenericHint").length - 1;
  // Available rows, chosen-row limits, the context-window label and the
  // max-output label in the Advanced sheet.
  assert.ok(uses >= 4, `expected >=4 hint usages, found ${uses}`);
  assert.match(
    panes,
    /genericLimits \? \(\s*\n\s*<HelpIcon label=\{t\("settings\.modelLimitsGenericHint"\)\} \/>/,
  );
});

test("every locale explains the generic defaults", () => {
  for (const [locale, source] of Object.entries(localeSources)) {
    assert.match(
      source,
      /"?modelLimitsGenericHint"?:\s*"[^"]{20,}"/,
      `${locale} is missing modelLimitsGenericHint`,
    );
  }
});
