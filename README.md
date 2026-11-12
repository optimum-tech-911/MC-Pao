# MC Pao · Ciao Marco !

An unofficial mobile arcade platformer set on the Riviera. Choose MC Pao or Marco Mouly, recover the bottle,
face your rival, find the blue watch, cross the yachts and escape in the gold SVJ.
Both heroes have identical speed, jumps, hitboxes, health and scoring. Your choice
is saved on the device. Marco wears a burgundy silk robe with gold embroidery and
carries his grand cru. His reference-based face has cropped dark hair, gray temples
and salt-and-pepper stubble. Articulated run, jump, slam, landing, swim and toast
frames keep the bottle attached to his wrist or secured in his sash.

Marco’s **La tournée Grand Cru** adds terrace steps, a cellar gallery with a
moving lift, and a raised private-tasting deck. The original coast and swim
channels remain accessible. Both routes contain the same rewards and enemy
inventory; MC Pao keeps the original route.

## Play locally

Use **Node.js 22.12 or newer**. Open this project folder in Terminal:

```sh
npm install
npm run dev
```

Visit **http://localhost:3000**. Keep Terminal open. Stop with **Control+C**.
After the first install, `npm run dev` is enough. No Gemini key or account is needed.
If port 3000 is busy, run `PORT=3001 npm run dev` and visit localhost:3001.
The old conflicting esbuild dependency was replaced with a Vite-compatible version;
`--force` and `--legacy-peer-deps` are unnecessary.

To test on a physical phone, connect it to the same Wi-Fi and open
`http://YOUR_COMPUTER_LAN_IP:3000`. The game starts in either orientation.
Some browser features, such as clipboard sharing, need HTTPS outside localhost.

## Controls

- Phone: choose **Gestes**, **Joystick**, or **Boutons** in the lobby. Gestures
  swipe left/right to move, up to jump, and down to slam. The joystick uses the
  same directions; buttons use **◀ / ▶**, **SAUT**, and **SLAM**. The choice is
  saved on the device and can also be changed in the pause menu.
- Keyboard: **A/D** or **←/→**, **Space/W/↑** to jump, **S/↓** to slam,
  **Esc/P** to pause, **C** for outfits, **F** for fullscreen.
- Choose your hero before playing. MC Pao has Black VIP, Classic White and Monaco Gold
  outfits; Marco has his signature Grand Cru robe. The rival and final boss switch
  with your hero. Return to the lobby from Pause to change characters.
- Find the optional **Cuvée 36K** on the upper harbor route for +3,600 points.

## Production

```sh
npm ci
npm run lint
npm test
npm run build
npm start
```

The build includes `dist/server.mjs`; production runs directly with Node and
supports an install with development dependencies omitted. Deploy `dist/`,
`package.json` and `package-lock.json`, then run `npm ci --omit=dev` and `npm start`.
Use `PORT` for the hosting port and **DATA_DIR** for an attached persistent volume.
Default storage is `data/leaderboard.json`. `/api/health` is the health endpoint.

Use one Node process with this file-backed leaderboard. Multiple instances need
shared database storage. Writes are atomic; storage failures return HTTP 503.
Scores are casual, client-reported game points, not server-validated prize results.
Demo benchmarks are labeled; there are no official certifications or cash prizes.

All runtime artwork and fonts are local. A lossless ~1 MB atlas replaces ~8 MB
of source-art downloads. Preview query links and debug hooks are disabled in
production. `npm run preview` serves only the frontend and has no leaderboard API.
No public hosting deployment has been performed.

## Verification

With the dev server running, use another Terminal:

```sh
npx playwright install chromium webkit
npm run test:game
npm run test:game:marco
npm run test:characters
npm run test:marco-actions
npm run test:marco-upper
npm run test:pao-rivals
npm run test:mobile
npm run test:ui
npm run test:phones
```

- `test:game`: complete keyboard route, intentional boss death, checkpoint retry,
  all boss phases and Lambo finish.
- `test:game:marco`: the same full story with Marco, including boss death and checkpoint retry.
- `test:characters`: saved selection, exact movement/jump/slam parity, swapped rivals,
  pause/restart/replay, Marco animation sheet and both heroes across eight phone scenarios.
- `test:marco-actions`: actual rendered run cycles, turns, jump/slam/landing,
  toast, turbo, damage/defeat, crawl/emerging and car-entry/finale poses.
  Asserts approved V2 artwork is used, rather than a loading fallback.
- `test:marco-upper`: reach the terrace steps, cellar gallery, moving lift and
  optional Cuvée 36K through normal controls.
- `test:pao-rivals`: all 24 approved Mini Pao frames, patrol/phone/charge/stomp
  actions, mirrored turns, phone layouts and artwork failure/retry.
- `test:mobile`: the same complete route using actual two-finger browser touch events.
- `test:ui`: settings, fullscreen, sharing, replay, editor, costume cycling,
  touch actions and rotation pause.
- `test:phones`: 18 phone/tablet size/orientation combinations in Chromium and WebKit,
  visible Play/scores/Resume, actual outfit color changes, generated-art loading,
  leaderboard filters, double jump, cancellation and failed-load retry.
- `node scripts/playtest-story.mjs --bonus`: collect the secret bottle through normal controls.
- `npm run test:production`: built-server checks, real-time phone input, local assets,
  missing routes, persistent scores after restart, disk errors and rate limiting.
  Uses temporary test data and ports 3003/3004, not the real leaderboard.

Reports and screenshots are under `output/`. `GAME_URL` selects another dev server.
For production-only dependency verification, use `PROD_ROOT=/path/to/release npm run test:production`.
Browser emulation is verified; physical iPhone/Android testing and fresh-player
feedback remain the final release review.

## Artwork and references

[Research and source limits](RESEARCH.md), [original asset notes](public/assets/polish/ASSET_NOTES.md),
[correction-pass prompts](public/assets/polish/ASSET_NOTES_V3.md),
[voice recording support](public/assets/audio/README.md).
The music is original synthesis. Optional French narration is off by default.

Source sheets remain available for editing. After changing artwork/extraction,
run the dev server, then `npm run art:pack` before rebuilding. This compiles the
native sprite canvases into `public/assets/polish/game-atlas-v3.png` and updates
`src/game/artAtlas.ts`. The compiler waits for real source frames before capture.

Marco uses the user-approved **Character Study V2** artwork, preserved in
`art/marco/approved-character-v2.png`. Its three transparent source sheets contain
40 generated frames for running, breathing, aerial actions, slam/stomp, landing,
hurt/defeat, toast, swimming, victory and car entry. Turbo uses the run cycle with
boost timing and the existing halo/afterimages. Exact generation prompts and frame
order are recorded in `art/marco/ASSET_NOTES.json`.

`src/game/approvedMarcoSprites.ts` loads and slices the three sheets in
`public/assets/marco/`, cleans alpha residue and preserves fixed pose anchors.
Marco's Play button waits for all frames, with a retry and Pao option on failure.
These sheets do not require repacking the original Pao atlas.

Marco faces the approved **Mini MC Pao** caricature, preserved in
`art/pao-rival/approved-enemy-v1.png`. Two transparent sheets provide 24 frames:
eight waddling steps, four phone-call poses, two charge anticipations, eight
frantic charge steps and two comic stomp aftermath poses. The VIP boss uses the
same caricature at a larger size. `approvedPaoRivals.ts` preserves foot anchors
and exposes loading/retry status; Marco's start button waits for both hero and
rival artwork. Generation prompts live in `art/pao-rival/ASSET_NOTES.json`.
Playing Pao retains the original Mini Marco rivals.

Development character override: `?character=marco` (or `pao`).
Development scene links: `?boss=1`, `?swim=1`, `?yacht=1`, `?lambo=1`.
Development exposes `render_game_to_text()` and `advanceTime(ms)`;
manual time stepping stays enabled until reload.
