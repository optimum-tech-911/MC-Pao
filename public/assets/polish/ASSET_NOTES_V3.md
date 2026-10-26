# Correction-pass artwork · 26 October 2026

Generated with the built-in ImageGen tool. Originals remain in the generated_images session directory. Watch/car references describe official designs; they do not prove ownership or endorsement. Research sources: [RESEARCH.md](../../../RESEARCH.md).

## Blue skeleton watch

Output: `rm-blue-v3.png`.

Exact tool arguments:

```json
{
  "transparent_background": true,
  "referenced_image_paths": [
    "/private/tmp/mcpao-v3/rm53-reference.jpg",
    "/Users/optimumtech/Desktop/mc-pao_-ciao-marco!-—-16-bit-mediterranean-platformer/public/assets/polish/pao-sheet-v2.png"
  ],
  "prompt": "Create ONE isolated blue Richard Mille RM 53-01 inspired watch pickup sprite for a premium 16-bit mobile game. Reference 1 is the real watch: faithfully preserve its wide curved TONNEAU barrel-shaped carbon case, exposed intricate SKELETON mechanical dial, crossing silver bridges and cables, blue-tipped analog hands, eight silver case screws, large blue crown on right, and vivid sky-blue rubber strap above AND below the case. The case must have curved sides, rounded corners and tapered top/bottom: absolutely not a square digital smartwatch. Reference 2 supplies crisp pixel-art style only. Front-on view, upright, full strap and complete watch visible, no tilt, generous transparent margins. Detailed but strongly readable at 44 by 60 game pixels. Deliberate pixel clusters, dark warm outlines, blue, carbon black, silver and tiny ruby accents. Genuinely transparent background, no pedestal, glow, sparkle, shadow, hands wearing it, scenery or text labels. The dial should visibly look mechanical and analog, not form an M letter or any digital glyph."
}
```

## Gold Aventador SVJ

Output: `aventador-gold-v3.png`.

Exact tool arguments:

```json
{
  "transparent_background": true,
  "referenced_image_paths": [
    "/private/tmp/mcpao-v3/aventador-reference.png",
    "/Users/optimumtech/Desktop/mc-pao_-ciao-marco!-—-16-bit-mediterranean-platformer/public/assets/polish/yacht-v2.png"
  ],
  "prompt": "Create a production game sprite sheet containing TWO views of the SAME metallic gold Lamborghini AVENTADOR SVJ, faithful to the real car in reference 1, rendered in the crisp detailed pixel-art style of reference 2. Exactly ONE COLUMN and TWO equal-height ROWS. Each row is a full isolated car, complete nose to rear wing, generous transparent padding, identical body dimensions, wheelbase, angle and ground baseline. Canvas aspect about 3:2; each row is a wide horizontal cell. Car faces RIGHT, near side profile with a slight front three-quarter view. Long very LOW pointed Lamborghini wedge nose, sharply raked windshield, real Aventador roof line, large dark HEXAGONAL side air intake, aggressive split front bumper, unmistakable Y-shaped white LED headlights, wide rear haunches, black SVJ omega rear wing, black multi-spoke wheels with gold rims and red brake calipers. Sculpted rich METALLIC GOLD body with ivory and amber pixel highlights, not a flat yellow generic sports car. Upper row: parked, near-side SCISSOR DOOR fully raised upright from its FRONT hinge, showing dark leather interior. Lower row: exact same car with door CLOSED, ready to drive; same wheels/body position, no motion blur or flames. No people, no text, no labels, no background, no ground plane or drop shadow. Genuinely transparent. Keep each entire car including raised door strictly inside its own cell."
}
```

## Freestyle crawl sheet

Output: `pao-swim-v3.png`.

Exact tool arguments:

```json
{
  "transparent_background": true,
  "referenced_image_paths": [
    "/Users/optimumtech/Desktop/mc-pao_-ciao-marco!-—-16-bit-mediterranean-platformer/public/assets/polish/pao-sheet-v2.png"
  ],
  "prompt": "Create a NEW production FREESTYLE SWIMMING animation sprite sheet for the exact same MC Pao character in the reference: wavy brown hair, full beard, blue square sunglasses, stocky build, black tee, silver chain, dark trousers and white/red sneakers. Exactly FOUR COLUMNS by TWO ROWS, 8 frames total. Each cell is square with generous clear padding; entire swimmer fits strictly inside its cell. All eight poses use the SAME side view facing RIGHT, identical head size, same horizontal torso length, fixed head/shoulder position and outfit. Show a genuinely different phase of one continuous front-crawl stroke in each frame: 1 right hand reaches forward, left arm pulls under chest; 2 right hand enters water, left elbow rises behind; 3 right arm pulls under torso, left bent elbow recovers upward; 4 left forearm swings over head; 5 left hand reaches forward, right arm pulls under chest; 6 left hand enters water, right elbow rises behind; 7 left arm pulls under torso, right bent elbow recovers upward; 8 right forearm swings over head. Alternate a small flutter kick in the legs. Head turns slightly for a breath in frames 3 and 7. The head remains at approximately 72 percent across and 55 percent down EACH cell, shoulder at 55 percent across and 65 percent down; feet trail left. Raised arms can reach above the head but must stay inside the cell. Do not give him a flying Superman pose. Use bent elbows, alternating shoulder roll and visible pulling arms, not eight duplicates. Crisp deliberate 16-bit pixel art matching the reference, strong silhouette, consistent connected anatomy, no cropped nose or feet, no additional limbs. Genuinely transparent background. NO WATER, splashes, foam, scenery, text, grid, shadows or frame labels; the game will render its own waterline and splashes."
}
```

## Yacht guest scale

Output: `yacht-v3.png`.

Exact tool arguments:

```json
{
  "transparent_background": true,
  "referenced_image_paths": [
    "/Users/optimumtech/Desktop/mc-pao_-ciao-marco!-—-16-bit-mediterranean-platformer/public/assets/polish/yacht-v2.png"
  ],
  "prompt": "Edit this game yacht asset with ONE precise change: enlarge BOTH women by about 22 percent, scaling each upward from her FEET while keeping their feet on exactly the same horizontal teak deck line. They should be noticeably a little taller and more readable, proportionate to an adult player character. Preserve their identities (blonde in red gown, brunette in black gown), sunglasses, poses and pixel art style. Preserve the entire boat's geometry, hull, cabin, radar mast, railings, flag, scale, placement, colors and transparent margins as closely as possible. Keep the same full bow-to-stern composition. Do not add people, change the yacht, add text, sky, sea, shadows, scenery or new objects. Genuinely transparent background remains transparent."
}
```

The native-resolution compiler `npm run art:pack` extracts these assets and the v2 character sheets into the lossless `game-atlas-v3.png`, with coordinates in `src/game/artAtlas.ts`. Original sheets are retained. The four coherent first-row swim poses are used; inconsistent second-row poses are excluded. The compiler waits for real source frames before capture. Costume palette mapping, swimming head anchors, waterline clipping and yacht deck alignment are in the game source.

