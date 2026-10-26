# MC Pao · Ciao Marco !

An unofficial mobile arcade platformer set on the Riviera. Recover the bottle,
stomp Marcos, find the blue watch, cross the yachts and escape in the gold SVJ.

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
`http://YOUR_COMPUTER_LAN_IP:3000`. Landscape provides the widest view;
portrait has a paused rotation prompt and an explicit option to continue.
Some browser features, such as clipboard sharing, need HTTPS outside localhost.

## Controls

- Phone: hold **◀ / ▶** to move, tap **SAUT** twice to double jump, **SLAM** to
  dive or pose on deck. Movement and jumping support two fingers, thumb sliding,
  pointer capture and cancellation.
- Keyboard: **A/D** or **←/→**, **Space/W/↑** to jump, **S/↓** to slam,
  **Esc/P** to pause, **C** for outfits, **F** for fullscreen.
- Choose Black VIP, Classic White or Monaco Gold directly in the lobby.
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
npm run test:mobile
npm run test:ui
npm run test:phones
```

- `test:game`: complete keyboard route, intentional boss death, checkpoint retry,
  all boss phases and Lambo finish.
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

Development scene links: `?boss=1`, `?swim=1`, `?yacht=1`, `?lambo=1`.
Development exposes `render_game_to_text()` and `advanceTime(ms)`;
manual time stepping stays enabled until reload.
