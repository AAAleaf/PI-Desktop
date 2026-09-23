# ADR 0306: Notebook and Sage paper palettes as built-in themes

- Status: Accepted
- Date: 2026-09-23
- Amends: ADR 0260 (appearance surface), ADR 0180/D343 (type-scale layering)

## Context

The built-in theme picker offered a binary choice: light or dark (plus
`system` and plugin-contributed themes). Users who want a low-glare reading
surface had no first-party option, and plugin themes are too heavy a vehicle
for two static palettes. DeepSeek-Reasonix ships MIT-licensed official paper
themes whose palettes solve the same problem; two of them map cleanly onto
PI-Desktop's token roles.

## Decision

Two built-in themes join the picker after Light and Dark:

1. **Notebook** — warm cream surfaces (`#fff9ed` chat base), cool slate ink
   (`#2b2f35`), teal accent (`#007b78`), from DeepSeek-Reasonix
   `official-spark-notebook` (MIT).
2. **Sage** — cream-paper surfaces (`#fafaf4`), green-grey ink (`#26332d`),
   sage accent (`#47735f`), from `official-sage-breeze` (MIT).

Implementation keeps the binary theme model intact:

- `ThemePreference` gains `"notebook" | "sage"`. Both resolve to the **light**
  base (`BuiltinTheme.base`), so `nativeTheme`, plugin panels, the plugin
  launcher, code highlighting, and every `[data-theme]` CSS gate keep seeing
  `light` with zero behaviour change.
- The renderer additionally publishes `data-palette="notebook|sage"` on the
  document root. Two token blocks in `tokens.css` retint the light palette's
  paint variables (surfaces, ink, borders, accent) under
  `:root[data-theme="light"][data-palette="…"]`. The layer order matches the
  plugin-theme override concept (ADR 0260), minus the CSS injection.
- The native window background rides the existing
  `windowSetBackgroundColor` color override: the renderer passes
  `builtinWindowBackground(palette)` (`#fff9ed` / `#f7f7ef`).
- Ink stays a cool slate and the warmth lives in the surfaces, matching the
  source palettes; only the accent differentiates the two.

## Consequences

- Users get two low-glare light variants without touching the dark theme or
  the two-palette contract anywhere else in the app.
- Plugin panels receive the light palette; a plugin cannot style for the
  paper tints yet — acceptable, since panels already only get light/dark.
- A future paper palette is one entry in `BUILTIN_THEME_BY_ID`, one token
  block, one picker label.

## Alternatives

- **Promote the palettes to full `ThemeColorScheme` values:** rejected; every
  binary consumer (nativeTheme, plugin host, highlighting, CSS gates) would
  need a mapping layer, a large blast radius for a colour change.
- **Ship them as plugin themes:** rejected; built-in static palettes need no
  provider lifecycle, and plugin theming is for contributed, dynamic sets.

## References

- `packages/shared/src/theme.ts`
- `apps/desktop/src/styles/tokens.css` (paper palette blocks)
- `apps/desktop/src/features/app/useAppShellRuntime.tsx`
- `desktop/themes/official/official-spark-notebook` and
  `official-sage-breeze` in esengine/DeepSeek-Reasonix (MIT)
