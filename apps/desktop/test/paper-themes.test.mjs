import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, path), "utf8");

const settingsTypes = read("../../../packages/shared/src/types/settings.ts");
const tokens = read("../src/styles/tokens.css");
const shellRuntime = read("../src/features/app/useAppShellRuntime.tsx");
const themeRow = read("../src/components/settings/ThemeRow.tsx");
const lifecycle = read("../electron/main/bootstrap/app-lifecycle.ts");

// Paper palettes ride on the light theme through `data-palette`, so every
// binary light/dark consumer keeps working unchanged. Keep this suite
// source-oriented like the neighboring desktop contracts.
test("notebook and sage are built-in preferences resolving to the light base", () => {
  assert.match(settingsTypes, /"notebook"\s*\|\s*"sage"/);
  assert.match(shellRuntime, /isPaletteThemeId\(preference\)/);
  // The renderer must retint via the palette attribute, not via data-theme,
  // so binary gates keep matching the light theme.
  assert.match(shellRuntime, /dataset\.palette = palette/);
  assert.match(shellRuntime, /builtinWindowBackground\(palette\)/);
});

test("both palettes retint the light token set", () => {
  assert.match(tokens, /\[data-theme="light"\]\[data-palette="notebook"\]/);
  assert.match(tokens, /\[data-theme="light"\]\[data-palette="sage"\]/);
  // Paper inks stay cool slate, adapted from the DeepSeek-Reasonix palettes.
  assert.match(tokens, /--ds-text-primary: #2b2f35;/);
  assert.match(tokens, /--ds-text-primary: #26332d;/);
  assert.match(tokens, /--ds-accent: #007b78;/);
  assert.match(tokens, /--ds-accent: #47735f;/);
});

test("the settings picker and the host agree on the five built-ins", () => {
  assert.match(themeRow, /settings\.themeNotebook/);
  assert.match(themeRow, /settings\.themeSage/);
  // Main maps paper preferences to their light base for nativeTheme and the
  // plugin panels instead of dropping them to system.
  assert.match(lifecycle, /builtinThemeScheme\(preference\)/);
  assert.match(lifecycle, /isBuiltinThemePreference\(preference\)/);
});
