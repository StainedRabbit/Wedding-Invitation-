# Our Next Chapter
Angelyn B. Sayno · silver moon and stars  
Kevin-Ezer F. Tanierla · golden sun

## Review
Open the three numbered JPGs in order. The six-chapter contact sheet, desktop spread, and control sheet show placement at representative sizes. All form examples and event placeholders are review copy. The two reference PNGs preserve the approved illustrations, including their original lettering. Use the blank production artwork and add semantic text and buttons at implementation.

## Coordinate system and assembly
Portrait master = 1086 × 1448 px. Origin is top left. Scale every registered component and offset by the same factor. The CSV gives the trimmed rectangle’s exact top-left relative to this master. Web and master offsets are identical. Each moving raster has real alpha. All PNG layers can be placed in an image editor using these offsets. The full-board art is a reconstruction of the flat reference; ribbon and metal motifs are isolated raster pieces. Their hidden folds and the reverse board are inferred. Lighting is directional.

**Closed state, bottom to top.** Use moonlit-backdrop as the stage. Center book-back-board, page-edge-stack, cover-exterior, cover-crown-star, cover-flourish, moon-stars, sun, live lettering, then ribbon-tied. Keep the back board and edge stack hidden or covered until turning starts. For a fast first paint use cover-first-paint.webp (648 × 864) as the single text-free composite. Scale title/name positions from the master. Avoid double-rendering ribbon or symbols when swapping to separated parts.

**Tied bow.** Replace ribbon-tied with this back-to-front order: ribbon-band, ribbon-upper-wrap, ribbon-left-tail, ribbon-right-tail, ribbon-left-loop, ribbon-right-loop, ribbon-knot. Knot center ≈ (842, 990). Anchor both loops near that point. The band enters from (40, 1000), passes the knot and wraps toward the outer right edge. Pull the right tail away, narrow the loops near their gathered ends, open the knot, and withdraw the band. Swap to ribbon-resting only after the band clears the face. A mesh or masked path deformation will look softer than rotating each entire flat piece. These are still layers for animation, not a simulated silk rig.

**Hinge.** Vertical spine crease ≈ x=145 (13.35% of full width), pivot y=724. Keep the left strip of the board stationary; clip the moving exterior at the crease. The inside moving face is cover-inner-face. Use backface culling and separate front/back planes; orient the back artwork to read correctly after the turn. Page-edge-stack and book-back-board stay under the moving board. Add a dynamic contact shadow at the hinge. Once the cover passes the edge-on position, transition to the open composition with the visible inner binding. Keep the camera still. These two independently illustrated reference views have slightly different book geometry; align the frame before the handoff. A short masked blend behind the turning board hides the difference.

**Open mobile.** Use page-invitation-mobile with ribbon-resting at its CSV offset; add title, names, invitation wording, date, venue and real RSVP button. The sun, flowers and inside crescent are intentionally part of this resting composition. Use a glint above them. For actual scrolling and text enlargement, anchor binding and ornaments to the margins and tile paper-ivory through the content region. Never vertically stretch a completed illustrated page to fit copy.

## Type placement and color
Cover title center about (592,375), two lines. Available box x=225–955, y=235–518. Names are two lines below motifs. Left name box x=205–565, right x=605–990; y=781–935. Centered text in each. Put the opening action below the book, outside its bow.
Open master centers text around x=622. Heading near y=330, names y=464 and 616, paragraph y=716–893, placeholders y=967–1025, action centered at y=1122. Use these as visual anchors; allow reflow and a growing page on small devices. For narrow reading surfaces reserve x≈240–980 for main copy. On the desktop fallback reserve inner 70% of each leaf and keep text at least 8% of leaf width from the gutter. The static desktop render illustrates a facing-page view. The desktop-spread asset has blank reading surfaces. Keep icon buttons and important controls away from the gutter. At larger font sizes move ornaments outward and allow scroll.
Color samples include cloth #052655 and #062050. Use deep sapphire #15335A for controls, navy #172941 for text, warm ivory #FFF4DF, periwinkle around #9196C8 and warm metallic gold around #CBA766. Preserve the richer hue variation inside the raster art. Preview type uses Nimbus Roman Italic for the title and names, Nimbus Roman for copy, Nimbus Sans for UI. For deployment try a similar book serif such as Spectral with Source Sans 3 for body and controls. Check line breaks with the actual font loaded.

## Screen and implementation map
| View | Exported art | Live or code-styled elements | Awaiting couple |
|---|---|---|---|
| Arrival | backdrop, first-paint composite or registered cover layers | title, names, open action, loading text if needed | — |
| Invitation | portrait or desktop page, loose ribbon | wording, names, dates, RSVP link | date and venue |
| Our Story | paper tile, floral corners, milestone-star, chapter-tab and divider | timeline, flexible photos and text | real memories, photos, portraits or keepsakes |
| Wedding Details | leaf surfaces, date/time/location SVGs | date, time, address, calendar or directions link | event schedule, venue, map destination, approved venue image |
| RSVP | paper, sparse corner flower, RSVP/check/error/retry icons | labels, inputs, attendance choices, submit, progress and retry | final questions and reply policy |
| Confirmation | confirmation-stamp | response message after a successful save | final wording |
| Navigation | chapters, close, previous and next icons; chapter-tab | chapter menu, links and focus | — |
| Public metadata | favicon SVG and PNGs, share-preview JPG | document title and share metadata | — |

## Controls and responsive ornaments
Default primary uses sapphire fill, a fine gold rim, ivory label and optional button-flourish at either end. Secondary is an ivory surface, blue outline and navy label. Compact previous/next can use the arrow SVG with a short visible label. Use a pair of fixed-size flourishes and flexible center with inline padding; permit long labels to wrap. Use ≥44 px touch targets. Hover lightens the fill, keyboard focus adds a clearly separated outer ring, pressed darkens it, disabled has a muted fill and a real disabled state. Submitting uses an editable “Sending…” label plus a progress indicator and disables duplicate submission. Pair errors with icon and written message; retain input and expose a retry. Use the same confirmation seal for either attendance choice. Inline the single-color SVG icons or use a CSS mask for currentColor on both surfaces. The fixed-size 24 px previews use no hover-only cues.
For a long page compose the top and bottom florals separately on paper-ivory and anchor the corner pieces at their native aspect ratio. Use a fine CSS rule around the page and a CSS gutter gradient. Keep the dense stitched flowers on the cover, lighter margins for reading. For a two-page layout duplicate leaf surfaces, with opposite shading at the inner edges.

## Motion
Start with an approximately two-second opening. Give the ribbon the first 0.6 s, the cover the next 1.0 s, and let sunlight settle during the last 0.4 s. Reuse milestone-star for one brief glint at the crescent. Animate a CSS warm gradient across the upper right floral margin, away from the type. Later page turns use leaf-front/leaf-back and a narrow moving gutter shadow; try 450 ms. Keep text stationary after arrival and on RSVP. For reduced motion switch directly to the open state and change chapters without rotation, shimmer or moving light. Load the first-paint asset first and the optional motion pieces later. Sizes are recorded in bytes in the CSV.

## Boundaries
These are visual assets and static design studies. Hinge alignment, opacity timings, real font rendering, touch targets and response feedback still require testing in the eventual browser implementation. No real guest or event details have been invented. Keep private information out of the share preview.
