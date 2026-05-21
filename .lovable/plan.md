Three targeted fixes:

### 1. Revert the uniform grid background in `MatrixAgents.tsx`
The grid tiling fixed the bands but made the background look static/wavy and is also why the eye no longer reads as "fully closed" — uniform density removes the contrast that made the blink visible. Go back to the Pretext-driven layout for its organic, multi-script feel, but with a proper fix for short/empty wrapped lines:

- For each layout line, render its graphemes as before.
- After the last grapheme, if `xPos` hasn't reached `W`, continue filling that same row with corpus characters until it does.
- If a line's text is entirely empty/whitespace, treat it as a row that needs full filling.

Result: dynamic, varied background like the original — no black bands, no grid pattern.

### 2. Fix the eye blink so it closes fully
After reverting to the varied-density background, the closed-eye thin-line mask will read clearly again. Also tighten the close itself in `drawEyeMask`:

- Lower the `openAmount < 0.03` threshold to `< 0.08` so the mask snaps to the flat closed line slightly sooner, eliminating the sliver that currently lingers at the end of the blink.
- Make sure the outer eye outline strokes (currently drawn after the early return) also collapse to a single horizontal line when closed, so the silhouette of the lid is unambiguous.

### 3. Splash/collision physics in `PretextRain.tsx`
Drops appear to fall through text because the tail keeps drawing below the collision point and splash particles arc back down through the letters, mimicking a continuing drop.

- On collision, record the text-top Y for that drop; clamp tail rendering so no glyphs are drawn below that Y until the drop fully exits the text region. This gives a clean "stop on contact" look.
- Splash particles: lower gravity (`vy += 0.05` instead of `0.12`), cap downward `vy`, and kill particles as soon as their `y` returns to or below their spawn `y` (so they never re-cross the text downward).
- Add a small horizontal "spray" bias so splashes clearly redirect sideways, reading as a bounce rather than a continuation.

### Verification
Reload `/`, watch the full intro (silhouette → eye → pupil zoom), confirm:
- background is dynamic and band-free,
- the eye fully closes during every blink,
- on the terminal screen, drops visibly stop/spray at text instead of passing through.