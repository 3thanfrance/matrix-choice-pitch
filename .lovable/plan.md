Keep the BLUE PILL PROTOCOL screen as a transitional flash (mirror of RED PILL → ACCESS GRANTED), but strip the invented copy ("BACK TO THE NOTEBOOKS.", "OR... ONE CONVERSATION FIRST?", "THE OFFER STANDS.") and land on the spec's "THE DOOR'S OPEN. KARL@OMNI.CO".

## Changes in `src/components/Terminal.tsx`

1. Replace the `bluepill` node so it's just the protocol flash, no prompt, no extra lines:
   ```ts
   bluepill: {
     lines: [">> BLUE PILL PROTOCOL ACTIVATED <<"],
   },
   ```
2. Remove the `bluepill_final` node — unused after this change.
3. Auto-advance `bluepill` → `redpill_no` (which is the spec's "THE DOOR'S OPEN. KARL@OMNI.CO" closer). In the auto-advance effect around lines 277-283, add a sibling clause:
   ```ts
   if (currentNode === "bluepill") {
     const timer = setTimeout(() => {
       setNextNodeKey("redpill_no");
       setPhase("deleting");
     }, AUTO_LINGER);
     return () => clearTimeout(timer);
   }
   ```
4. Drop `"bluepill_final"` from the end-state list on line 286 (keep `demo2` and `redpill_no`).
5. Leave the blue pill flash logic in `handleInput` untouched — entering `bluepill` still triggers the blue glow + static, matching how `redpill` triggers the red flash.

`skeptic.no` and `hesitate.no` stay pointed at `bluepill` so the BLUE PILL beat still plays before the close-out.

## Resulting flow

- Decline path: …→ skeptic [N] or hesitate [N] → BLUE PILL PROTOCOL flash → "THE DOOR'S OPEN. KARL@OMNI.CO" → outro.
- Accept path: …→ redpill [Y] → RED PILL PROTOCOL → ACCESS GRANTED → "NO MATTER HOW IT GOES…" closer → outro.
- redpill [N] still routes straight to `redpill_no` (door's open), unchanged.

## Verification

Walk all four scenarios. Confirm BLUE PILL PROTOCOL appears as a brief transitional screen only before the door's-open ending, with no follow-up [Y/N] prompt and no invented copy.
