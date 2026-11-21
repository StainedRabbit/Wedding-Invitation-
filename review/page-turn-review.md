# Page-turn review

## Material and sequence

The closed book has a **hard cover**. When the guest opens it, the ribbon releases and the cover rotates as a rigid board around its spine. The first invitation page is already beneath the cover. The camera then moves into that page. This existing opening is a separate sequence in `Book.tsx`, `motion.css`, and `main.tsx`. Keep its board, ribbon, hinge, loading fallback, reduced-motion option, and camera approach working as they do now.

Once the guest is reading, every chapter transition is a **soft paper page turn**. The sheet bends and curls as its outer edge travels from right to left. Returning to a previous chapter reverses that motion. It should look thin and flexible against the fixed page below. There is no visible arrow, scrollbar, or fixed decorative overlay. The floral artwork belongs to the paper and moves with its top and bottom edges.

Going backward from the invitation closes the book through the existing close behavior. It does not trigger a paper turn. The current close returns directly to the closed cover. A closing animation is outside this review.

## What I checked

I reviewed the page-turn code in `frontend/src/Reader.tsx` and `frontend/src/reader.css`, the captured Chromium frame from the previous implementation, and the running invitation in VS Code. In VS Code, clicking the left and right edges moved between Wedding Details and RSVP. The preview uses reduced motion, so those live clicks changed pages immediately. The earlier Chromium capture shows a normal-motion turn partway through. It does not establish how smooth the entire motion feels.

## Problems

- **The paper looks rigid.** The captured frame shows the entire page rotating as one flat plane. `turn-sheet` applies a single `rotateY` to the whole leaf. The separate `bend-edge` element is only a shaded strip, so the text, flowers, and page outline do not bend with it.
- **The claimed lift is mostly shading.** The strip has a straight vertical edge and the screenshot shows a vertical dark band. It does not create a curved corner or a curved paper silhouette.
- **The spine is outside the visible reading page.** The rotation origin is the left edge of the full-screen leaf and the reader clips anything outside its viewport. A large part of the sheet moves off-screen, so the full passage over the spine and the reverse side are difficult to see.
- **The backside is plain.** The rotated pseudo-element uses a paper texture without page artwork or content. Depending on the angle and clipping, its appearance can look disconnected from the page being turned.
- **The shadow is independent of the paper shape.** A fixed-width gradient sweeps across the incoming page on its own timeline. Its position and shape do not follow a flexible fold, which can make the lighting feel like a screen overlay.
- **The destination becomes active immediately.** `goTo` changes `current` before the turn finishes, and the layout effect focuses its heading at once. During a backward turn the destination itself is the animated sheet and has `pointer-events: none`, while its form controls are still keyboard-focusable. Guests can reach controls while the page is moving.
- **Chapter jumps use one turn.** A direct jump to RSVP intentionally skips the intervening chapters in one turn. Keep that behavior and show the requested destination beneath the moving paper.

## Implementation guide

### 1. Separate the cover and paper

- Leave the hard-cover animation on the existing `.board` and `turn` keyframes. Do not apply paper deformation, a curled corner, or paper texture to the cover. Keep the invitation mounted under the opening cover and preserve the transition into the reader.
- Replace the reader's current `turn-sheet`, `bend-edge`, and `sweep-shadow` treatment with a separate paper-turn layer. Its timing and geometry must not drive the cover animation or the camera approach.

### 2. Make the paper visibly flexible

- Use a deformable surface with an actual curved silhouette. A subdivided mesh or connected narrow strips are viable approaches. A single `rotateY` plane plus a gradient is insufficient. The outer edge should lift first, a curved fold should travel across the sheet, and the paper should settle before it disappears.
- The turning visual must depict the current visible portion of the outgoing page, including its text, flowers, border, and scroll position. Preserve typography and alignment at the beginning of the turn. If the implementation uses copies or a rendered snapshot, keep them out of the accessibility tree and tab order, avoid duplicate IDs, and avoid a visible loading delay or a blank sheet while preparing it. Do not duplicate interactive form state.
- Give the front and reverse separate paper faces. Use a consistent paper texture and a soft highlight on the curved edge. The reverse may use a quiet textured paper surface when there is no designed reverse artwork. It must stay attached to the same sheet at the edge-on point and should not introduce invented text.
- Derive the cast shadow and fold highlight from the same turn progress as the geometry. The shadow should follow the lifted edge over the stationary destination, grow and soften as the paper rises, then fade as it settles. Avoid a broad stripe sweeping independently across the screen.
- The reader fills one screen, so its spine is at the left edge of the visible page. Frame the fold so the guest can see a meaningful portion of the flexible sheet while it travels left. The incoming page should cover the viewport throughout. Test portrait, wide desktop, and short landscape screens. Keep the corner artwork attached to the physical page edges and maintain readable, unstretched text.

### 3. Manage the visual and interactive state

- In `Reader.tsx`, track the settled chapter separately from a pending turn containing the origin, destination, and direction. For a forward turn, leave the destination visually underneath while the outgoing sheet turns. For a backward turn, bring the previous sheet back over the current page using the same geometry in reverse.
- While the sheet moves, freeze its captured scroll position and prevent wheel, touch, edge clicks, chapter actions, and keyboard navigation from starting another turn. Prevent Tab from reaching controls on either the moving visual or incoming page. If focus starts inside the outgoing page, move it to a stable reader container for the duration. Ensure the moving visual is not announced as an extra page.
- Commit the destination only when the turn completes. Then reset its reading position to the top, expose its content to assistive technology, focus its heading with `preventScroll`, and re-enable interaction. Keep `Rsvp` mounted or otherwise preserve its draft and preview result across chapter turns. Closing the book retains the existing reset behavior.
- A direct chapter button starts one turn in the appropriate direction and lands on its requested chapter. The final chapter blocks forward turns. Left from the first chapter closes the book. Maintain the existing edge buttons and their accessible labels, vertical swipe, wheel grouping, keyboard arrows, and internal scrolling at short heights.
- Under reduced motion, commit the destination immediately and focus its heading. If the preference changes during a turn, finish once at the requested destination. On animation cancellation, an unavailable visual surface, or a timeout, settle cleanly at that same destination and restore focus and interaction. Make completion idempotent so an animation event and fallback cannot commit twice. Recalculate geometry on resize or settle at the destination without leaving a half-turned sheet.

### 4. Preserve rendering and performance

- Keep only the necessary visual layers during a turn. Avoid re-rendering or re-capturing the page on every animation frame. Animate with one shared progress value so the paper, faces, and shadows cannot drift apart. Check that seams between strips are not visible and that antialiasing does not create gaps.
- Keep the existing semantic React page as the source of truth. The decorative turn surface should never accept input. The final static page should be visually identical to the destination under the sheet when the overlay is removed.

## Verification

- Record forward and backward turns with normal motion enabled. Inspect the beginning, quarter, midpoint, three-quarter point, and final frame at desktop, phone portrait, and short landscape sizes. Confirm the free edge visibly curves, both faces stay attached, the shadow follows the fold, and the destination appears without a flash or jump.
- Play the opening from the closed book. Confirm the hard cover remains rigid, the ribbon and hinge still work, the first paper page is revealed beneath it, and the camera moves smoothly into that same page. Verify that going back from page one closes the book.
- Check edge clicks, wheel and touch navigation, keyboard navigation, and direct chapter jumps. Attempt rapid repeated input and tabbing during a turn. Verify focus lands on the destination only when it is ready, and screen readers do not encounter duplicated content or controls.
- Check pages scrolled to different positions, RSVP draft and confirmation retention, viewport resizing during a turn, failed artwork, cancellation and timeout recovery, and a change to reduced motion during animation. Confirm that content remains readable and controls work afterward.
- Run `npm.cmd run build` in `frontend`. Review the actual animation in a browser with normal motion enabled, including intermediate frames. A successful build or checking computed CSS alone does not establish that the page looks flexible.
