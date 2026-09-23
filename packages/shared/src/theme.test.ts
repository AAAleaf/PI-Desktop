import { describe, expect, it } from "vitest";
import {
  BUILTIN_THEME_PREFERENCES,
  BUILTIN_THEMES,
  builtinThemeScheme,
  builtinWindowBackground,
  isBuiltinThemeId,
  isBuiltinThemePreference,
  isPaletteThemeId,
  isThemeColorScheme,
} from "./theme.js";

describe("built-in themes", () => {
  it("declares each palette's window background once", () => {
    expect(builtinWindowBackground("light")).toBe("#ffffff");
    expect(builtinWindowBackground("dark")).toBe("#181818");
    expect(builtinWindowBackground("notebook")).toBe("#fff9ed");
    expect(builtinWindowBackground("sage")).toBe("#f7f7ef");
    expect(BUILTIN_THEMES.map((theme) => theme.id)).toEqual([
      "light",
      "dark",
      "notebook",
      "sage",
    ]);
    for (const theme of BUILTIN_THEMES) {
      expect(theme.windowBackground).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("layers the paper palettes on the light base", () => {
    expect(builtinThemeScheme("notebook")).toBe("light");
    expect(builtinThemeScheme("sage")).toBe("light");
    for (const theme of BUILTIN_THEMES) {
      expect(builtinThemeScheme(theme.id)).toBe(theme.base);
    }
  });

  it("keeps the picker order stable", () => {
    expect(BUILTIN_THEME_PREFERENCES).toEqual([
      "system",
      "light",
      "dark",
      "notebook",
      "sage",
    ]);
  });

  it("separates a colour scheme from a paper palette, system, and plugins", () => {
    expect(isThemeColorScheme("light")).toBe(true);
    expect(isThemeColorScheme("dark")).toBe(true);
    expect(isThemeColorScheme("notebook")).toBe(false);
    expect(isThemeColorScheme("system")).toBe(false);
    expect(isThemeColorScheme("plugin:demo.hello:midnight")).toBe(false);
    expect(isThemeColorScheme(undefined)).toBe(false);
    expect(isPaletteThemeId("notebook")).toBe(true);
    expect(isPaletteThemeId("sage")).toBe(true);
    expect(isPaletteThemeId("light")).toBe(false);
    expect(isBuiltinThemeId("notebook")).toBe(true);
    expect(isBuiltinThemeId("plugin:demo.hello:midnight")).toBe(false);
    expect(isBuiltinThemePreference("system")).toBe(true);
    expect(isBuiltinThemePreference("notebook")).toBe(true);
    expect(isBuiltinThemePreference("plugin:demo.hello:midnight")).toBe(false);
  });

  it("leaves system and plugin preferences without a fixed scheme", () => {
    expect(builtinThemeScheme("system")).toBeUndefined();
    expect(builtinThemeScheme("plugin:demo.hello:midnight")).toBeUndefined();
    expect(builtinThemeScheme(undefined)).toBeUndefined();
    expect(builtinThemeScheme(42)).toBeUndefined();
  });
});
