# Book opening transition review

## Goal

The guest opens the cover, sees the first page already resting inside the book, and then moves smoothly toward the top of that same page until it fills the screen. The invitation's text and artwork should hold their positions throughout the movement.

## What went wrong

- In the VS Code integrated browser, the preview offered “Play opening animation” and “Open without animation,” indicating that reduced motion was enabled. I replayed the opening and saw the cover and the finished invitation. The available screenshots did not capture the intermediate frames, so the apparent smoothness of that replay needs a separate visual check with normal motion enabled.
- The current code mounts the reader only after the cover turn completes. During the cover turn, the visible book contains a blue back board and binding, while the real invitation page is still absent. The page then appears through a left-to-right clip animation. This makes the page feel as though it is being revealed after opening rather than already lying inside the book.
- The reader is scaled uniformly to fit the page area. Its aspect ratio is the viewport's, so in a wide or short viewport it occupies only the top portion of the tall book. The exposed blue board below it makes the first page look detached from the book.
- The cover, book, and reader use separate animation phases and layers. The cover fades before the reader is mounted, and the zoom transforms only the reader. The binding and book remain stationary behind it, weakening the impression of a camera moving into one physical scene.
- The unfold uses a moving rectangular clip and a gradient. It reads as a wipe rather than a page resting under a turning cover. The current fallback timer and resize handler can also end the approach abruptly.
- At the short height of the VS Code preview, the invitation needs internal scrolling and the fixed page number sits over the bottom of the visible text. The final framing needs to account for that limited height.

## What to add and how to fix it

1. Mount the actual invitation page before the cover starts turning. Put it inside a book-shaped page surface beneath the cover, with the binding and back board registered to the same coordinate system. Keep the same invitation content and artwork through the entire sequence.
2. Give that surface the book's portrait dimensions. On wide screens, show a portrait page in the book and define a viewport-sized destination crop anchored at the top of the page. Keep the content layout fixed during the camera move so text, decoration, and line breaks do not jump. Ensure the full viewport is covered at the end.
3. Let the cover reveal the already-present page as it swings away. Remove the separate rectangular unfold wipe. Retain the hinge shadow and let it soften as the cover clears the paper.
4. Animate a shared scene or camera wrapper, including page, binding, and adjacent book elements, from the open-book view toward the destination crop. Use one continuous transform with a gentle ease in and ease out, and let the book edges move naturally out of frame. Begin the camera movement after a brief moment where the opened first page is visible.
5. Keep the reader mounted while the transform finishes. Enable controls and focus the heading after the camera settles. Reserve space for the page number and controls on short screens, allowing the page content to scroll without obscuring text.
6. Preserve the reduced-motion option and the failed-asset fallback. If the viewport changes during the approach, recompute the destination or finish at a visually aligned frame. Use animation completion as the normal handoff and keep a timeout only as a recovery path.

## Verification

- Replay in the VS Code browser with normal motion enabled and inspect the cover opening, the first fully exposed page, the middle of the zoom, and the settled reader. The page should be visible beneath the cover and no blue board should appear as a gap in the page.
- Compare the same text and floral landmarks at the start and end of the camera movement. Their positions on the page and line wrapping should remain stable, with no flash or layout jump.
- Repeat at desktop, phone portrait, and short landscape sizes. Check that the page fills the final viewport, starts at its top, and that text and controls remain reachable.
- Check reduced motion, slow or failed image loading, resizing during the approach, keyboard focus, page navigation, and RSVP after the animation.
