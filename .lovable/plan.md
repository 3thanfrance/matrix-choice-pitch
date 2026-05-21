Plan to fix this properly:

1. **Stop treating the bands as empty layout lines**
   - Revert the previous “skip/fill blank Pretext lines” approach because the screenshot shows the big black gaps are coming from the mask/removal logic, not missing corpus rows.

2. **Change the intro mask rendering so it never creates solid black voids**
   - In `MatrixAgents.tsx`, keep the silhouette/eye shape readable, but replace the current hard `continue` that removes characters inside bright mask areas with dimmed/edge-weighted characters.
   - This means the intro will stay fully filled with Matrix rain while the agent/eye appears through brightness and glow, not through black cutouts.

3. **Make the background layout deterministic and fully tiled**
   - Generate a dense grid of characters row-by-row across the whole viewport instead of relying on wrapped Pretext lines that can create uneven coverage.
   - This will remove the “line break” failure mode entirely.

4. **Fix rain collision with terminal text**
   - In `PretextRain.tsx`, replace the current single-point collision check with a small vertical sweep across each falling drop head/tail segment.
   - When a drop intersects the terminal text mask, clamp or heavily fade the overlapping glyphs and spawn splash/pool particles at the text boundary, so drops don’t sometimes pass through the letters.

5. **Verify visually in the preview**
   - Capture the intro after the change and check that the background is continuously filled across silhouette, eye, and zoom phases.
   - Check the terminal screen text to confirm falling drops consistently stop/fade/splash instead of cutting through visible text.