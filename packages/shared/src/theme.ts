import type { ThemePreference } from "./types.js";

/** The two base palettes anything can resolve to. */
export type ThemeColorScheme = "light" | "dark";

/**
 * A built-in theme preference. `system` is a preference rather than a palette:
 * it has no fixed colours, and each call site resolves it against its own
 * authority — `matchMedia` in the renderer, `nativeTheme` in main.
 *
 * `notebook` and `sage` are paper palettes layered on the light base (ADR
 * 0306): they resolve to `light` everywhere a binary scheme is required, and
 * the renderer additionally publishes them as `data-palette` so the palette
 * token layer can retint light-theme surfaces.
 */
export type BuiltinThemePreference = Exclude<ThemePreference, `plugin:${string}`>;

export type BuiltinThemeId = ThemeColorScheme | "notebook" | "sage";

export type BuiltinTheme = {
  id: BuiltinThemeId;
  /** Palette the theme's overrides layer on. Fixed for a built-in theme. */
  base: ThemeColorScheme;
  /**
   * Native window background on Windows/Linux, as `#rrggbb`.
   *
   * The renderer, the main process, the plugin panel host, and the panel
   * preload all read this value here. macOS keeps `vibrancy` and is never sent
   * one.
   */
  windowBackground: string;
};

/**
 * The one place a built-in palette's window background is written down.
 *
 * Before this existed the same `#ffffff` / `#181818` pair was spelled out in
 * four files, so changing the dark plate meant finding all four. A contributed
 * theme declares the same value through
 * `contributes.windowAppearance.backgroundColor` (ADR 0248).
 */
const BUILTIN_THEME_BY_ID: Record<BuiltinThemeId, BuiltinTheme> = {
  light: { id: "light", base: "light", windowBackground: "#ffffff" },
  dark: { id: "dark", base: "dark", windowBackground: "#181818" },
  notebook: { id: "notebook", base: "light", windowBackground: "#fff9ed" },
  sage: { id: "sage", base: "light", windowBackground: "#f7f7ef" },
};

/** Picker order for the built-in section, ahead of any contributed theme. */
export const BUILTIN_THEME_PREFERENCES: readonly BuiltinThemePreference[] = [
  "system",
  BUILTIN_THEME_BY_ID.light.id,
  BUILTIN_THEME_BY_ID.dark.id,
  BUILTIN_THEME_BY_ID.notebook.id,
  BUILTIN_THEME_BY_ID.sage.id,
];

export const BUILTIN_THEMES: readonly BuiltinTheme[] = [
  BUILTIN_THEME_BY_ID.light,
  BUILTIN_THEME_BY_ID.dark,
  BUILTIN_THEME_BY_ID.notebook,
  BUILTIN_THEME_BY_ID.sage,
];

/** True when a stored preference names a base palette instead of `system`/`plugin:`. */
export function isThemeColorScheme(value: unknown): value is ThemeColorScheme {
  return value === "light" || value === "dark";
}

/** True when a stored preference names one of the paper palettes. */
export function isPaletteThemeId(value: unknown): value is "notebook" | "sage" {
  return value === "notebook" || value === "sage";
}

/** True when a stored preference names any built-in palette id. */
export function isBuiltinThemeId(value: unknown): value is BuiltinThemeId {
  return isThemeColorScheme(value) || isPaletteThemeId(value);
}

/** True when a stored preference is one of the built-in options. */
export function isBuiltinThemePreference(value: unknown): value is BuiltinThemePreference {
  return value === "system" || isBuiltinThemeId(value);
}

/** Native window background for a resolved built-in palette. */
export function builtinWindowBackground(id: BuiltinThemeId): string {
  return BUILTIN_THEME_BY_ID[id].windowBackground;
}

/**
 * The binary base scheme a built-in preference resolves to; `undefined` for
 * `system` and plugin themes, whose base depends on the OS or the provider.
 */
export function builtinThemeScheme(
  preference: unknown,
): ThemeColorScheme | undefined {
  if (typeof preference !== "string") return undefined;
  return isBuiltinThemeId(preference) ? BUILTIN_THEME_BY_ID[preference].base : undefined;
}
