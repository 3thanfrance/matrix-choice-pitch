# Mobile crispness pass

Two issues on mobile right now, both in `src/components/MatrixAgents.tsx`:

1. The closed-eye "lid" renders as a stark horizontal stroke across the eye area, which reads as a stray line on small viewports.
2. The silhouette and eye shapes look mushy because the matrix glyphs drop to 9px and the rendered shape barely changes size while the available pixels shrink. The character grid is too coarse to define edges.

## Changes (all in `src/components/MatrixAgents.tsx`)

### 1. Closed-eye lid

Replace the white horizontal stroke in `drawEyeMask` (the `openAmount < 0.08` branch, ~lines 393–403) with a very thin, very short lid that only spans the inner ~60% of the eye width and tapers via two short strokes from each corner toward the center. This keeps the "blink closed" beat readable without painting a hard line across the whole eye region. No timing or blink-state changes.

### 2. Crisper rendering on narrow viewports

- Raise the matrix font floor: change `fontSize` from `max(9, min(13, floor(W/100)))` to a formula that uses both axes, e.g. `max(11, min(14, floor(min(W, H) / 60)))`. On a ~390px-wide phone this lifts the glyph from 9px to ~11–12px, which thickens edges of the silhouette/eye mask.
- Bump the DPR cap from 2 to 3 (`Math.min(window.devicePixelRatio || 1, 3)`) so the canvas backing store matches retina phones. This is the single biggest crispness win and stays bounded.
- Tighten `lineHeight` slightly: `Math.ceil(fontSize * 1.15)` instead of `1.2`. Denser rows = more samples per shape, better edge definition.
- In `getEyePosition` and the silhouette sizing inside `drawSilhouetteMask`, the figure is sized off `Math.min(H * 0.78, W * 1.0)`. On a tall narrow phone that's `W * 1.0`, which already fills width edge-to-edge — but with so few glyph rows the shoulders/hat brim get under-sampled. Reduce the width cap to `W * 0.92` so the figure has a small margin on phones, giving the existing rows more headroom to actually trace the silhouette.

### 3. No changes elsewhere

- `Terminal.tsx`, boot sequence, story tree, and pill flash logic stay as-is.
- No new dependencies, no responsive media queries — these are pure canvas-side tweaks that improve mobile without affecting desktop appreciably (desktop already hits the 13/14px cap and DPR is typically 1–2).

## Verification

After the edit, screenshot the preview at 390×844 (mobile) and 1280×800 (desktop) during the silhouette and eye phases and confirm:
- Silhouette edges (hat brim, shoulders, sunglasses) read clearly on mobile.
- Closed-eye state shows a short centered lid, not a full-width line.
- Desktop look is unchanged or marginally crisper.
