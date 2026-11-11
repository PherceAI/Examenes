# Design · Evaluaciones Hotel Zeus

Clean, modern, minimal, inspired by laravel.com. Tokens live in `app/globals.css` (`@theme`). Shared primitives live in `components/ui.tsx`.

## Color
- Ground: `paper` #ffffff. `subtle` #fafafa is used for hovers and selected rows.
- Ink: `ink` #171717 (text), `ink-2` #525252 (secondary), `ink-3` #737373 (labels, meta).
- Lines: `line` #e5e5e5 (hairlines, borders), `line-2` #f2f2f2 (bar tracks).
- Accent: `accent` #f0360a / `accent-strong` #d42d06 / `accent-soft` #fff3ee. Used for primary buttons, selected answers, the active nav underline, corner ticks, and the "live" dot. Nothing decorative.
- States: `ok` #15803d, `bad` #c81e1e, `wip` #a16207, each with a `-soft` background.
- Areas (dots only): Recepción #3b82f6, Alimentos #f59e0b, Pisos #14b8a6, Lavandería #8b5cf6.

## Type
- Instrument Sans (next/font).
  - Display uses weight 400 with tracking -0.04 to -0.06em: 38–60px on pages, 96px for the score.
  - Body is 14–16px.
- IBM Plex Mono only for data: cédula, scores, counts, question numbers like "01 / 37".

## Components
- `.frame`: a 1px hairline box with 5px accent squares on the top-left and bottom-right corners. It is used for every content block and table. Never put `overflow:auto` on it; scroll an inner `relative overflow-x-auto` div.
- Buttons (`btn` in `ui.tsx`): primary is accent, 8px radius, faint shadow, 40–48px tall. Secondary is white with a hairline border. Ghost is text with a hover background.
- `StatusPill`: 24px tall, a soft background and a dot. Monospaced score.
- `MonthStrip`: a 12-cell hairline grid (6×2 on phones) with month and score. The compact version is 12 bars for tables.
- Answer options: 60px rows with a mono letter box. Selected = accent border + soft fill + 3px halo.
- Page header: large title over `.grid-fade`. This is the only place the grid appears (owner-requested Laravel cue).

## Motion
- `.rise` (420ms expo-out, translate + opacity from 0.4) on entry.
- `.score-in` on the result number.
- `live-dot` pulse for "open now".
- All motion is removed under `prefers-reduced-motion`.
