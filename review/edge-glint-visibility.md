# Edge glint visibility review

## What I saw

In the VS Code integrated browser at `localhost:5173`, the invitation showed faint blue and gold shading at the edges. I could not reliably distinguish individual glints at the preview's size. The cover offered “Open with animation” and “Open without animation,” indicating that the browser reports reduced motion. I selected “Open with animation” and observed the open invitation again. The glints remained difficult to see.

The screenshots are individual moments, not a continuous recording. They support the visibility finding in this preview but do not measure how the animated glints look under normal-motion settings on every screen.

## Why this happens

- The app's “Open with animation” choice applies to page turns, but `EdgeLight.tsx` independently reads the operating system's reduced-motion preference. It therefore keeps the edge glints static even after that choice. The CSS breathing animation also follows the system preference directly.
- In reduced motion, only five glints per edge are visible. They are just 2–5 CSS pixels wide at 36% opacity, inside an edge layer at 72% opacity. The pale star fill is close to the pale paper and glow, so the effective contrast is low.
- In normal motion, every star starts fully transparent, waits a random 0.2–5.3 seconds, and fades out completely between cycles. Later pauses can last 0.85–5.95 seconds. The random schedule can leave an edge with few visible glints at a given moment.
- The larger four-point shapes are only 4–5 pixels across. At the small VS Code preview size they can appear as faint dots instead of glints. The prior implementation check verified that positions and animation values changed, but did not establish that the effect was visible at this preview size.

## Fix for the next implementation

1. Pass the reader's existing session-level `reducedMotion` value into `EdgeLight`. When a guest explicitly chooses “Open with animation,” animate the edge glints and breathing glow for that session. When they choose “Open without animation,” show steady glints. Follow the existing session behavior if the system preference changes, and cancel active animations on preference changes or unmount.
2. Increase visibility without darkening the broad blue and gold washes. Give several glints a small bright core and a soft, slightly darker blue or amber halo so they remain distinct against ivory paper. Use a few larger four-point glints around 6–8 CSS pixels and smaller points around 3–4 pixels. Keep the largest ones sparse and away from text and form controls.
3. Keep the randomized fade-in and fade-out and move a glint only when it is invisible. Stagger the timing so at least one glint is ordinarily visible on each available edge, including shortly after a page settles. Vary timing, positions, and brightness independently. Avoid flashing or synchronizing the whole edge.
4. For reduced motion, show a few clearly visible, steady glints at fixed positions with the same restrained treatment. Keep hover slightly brighter, preserve the keyboard focus indicator, and leave the full-height edge click and touch areas working.

## Verify

- In VS Code at the current preview size, open with animation and watch both edges for several cycles. Confirm the glints are visible without hovering, appear at different positions, fade smoothly, and do not distract from the invitation text.
- Open without animation and confirm the steady glints are visible. Switch the system motion preference during reading and verify that active glint animations stop or start cleanly.
- Check desktop, phone portrait, and short landscape sizes, including the RSVP page. Verify the light remains strongest near the center, fades toward the top and bottom, and stays clear of text. Test hover, keyboard focus, edge scrolling, and first- and last-page navigation.
- Run `npm.cmd run build` in `frontend`. Inspect the real preview as well as animation values. A changing opacity or position alone does not prove a glint is perceptible.
