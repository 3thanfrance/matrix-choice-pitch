## Goal
Make the Matrix Agents silhouette larger and clearer on mobile (portrait) viewports without changing the desktop/landwide experience.

## Changes
All edits in `src/components/MatrixAgents.tsx`:

1. **Portrait-aware figure sizing** (lines 32 and 61):
   - Detect `isPortrait = H > W`
   - Mobile (`isPortrait`): `figH = Math.min(H * 0.9, W * 1.35)` — fills more of the narrow screen so hat, sunglasses, and shoulders read clearly
   - Desktop/landscape: keep `figH = Math.min(H * 0.78, W * 0.92)` (unchanged)

## Expected result
On a 390×844 phone, figure height increases from ~359 px to ~527 px (`W * 1.35`), giving the glyph-based silhouette more rows/columns for sharper detail. Desktop stays exactly as-is.

## No changes elsewhere
`Terminal.tsx`, boot sequence, story tree, and pill flash logic remain untouched.