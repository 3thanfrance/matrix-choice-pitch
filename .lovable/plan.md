## Issue
The earlier mobile-crispness pass tightened the desktop figure width from `W * 1.0` to `W * 0.92`, which shrank the silhouette on desktop. The portrait branch is fine; desktop just needs its original sizing back.

## Change
In `src/components/MatrixAgents.tsx` (lines 32 and 61), split the two branches with their own specs:

```ts
const figH = H > W
  ? Math.min(H * 0.9, W * 1.35)   // mobile / portrait — bigger silhouette
  : Math.min(H * 0.78, W * 1.0);  // desktop / landscape — restored to original
```

That's the only change. No other files touched.