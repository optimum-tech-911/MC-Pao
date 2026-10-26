Original prompt: Help run this Google AI Studio game locally after npm install / npm run dev failed, review the game, and recommend the best next step toward attracting MC Pao's attention.

2026-10-26
- Reproduced npm install failure: direct esbuild ^0.25.0 conflicts with Vite 8's optional peer range ^0.27.0 || ^0.28.0.
- Removed unused direct esbuild dependency; Vite and tsx can resolve their own supported versions.
- Added a script for existing rules tests and made npm start use tsx in production mode.
- Next: complete install, run checks, launch and playtest desktop/mobile, document accurate local instructions and a focused next-step recommendation.

- npm install now succeeds; package-lock.json captures working versions. No forced peer-dependency bypass needed.
- Corrected an existing test type import (Platform belongs to level.ts) and completed its fixture fields. Added npm test for the 12 existing rules tests.
- npm run lint, npm run build, and npm test all pass (12/12).
- Replaced the generic AI Studio README and .env.example with accurate local setup: Node >=22.12, npm install, npm run dev, http://localhost:3000, no Gemini key needed.
- Added development-only state and manual time hooks for reproducible playtesting; production excludes them. Updated Vite alias resolution to avoid __dirname warnings.
- Ran the skill's Playwright client (unchanged copy in /private/tmp for access to an existing Playwright installation), inspected screenshots and JSON state.
- Additional desktop/mobile browser checks: start, movement, jump/landing, pause/resume, costume switch, restart, swimming/dolphin jump, yacht scene, boss scene, and Lambo-to-victory transition. No browser errors. Scene previews do not prove a complete story run/boss victory from the beginning.
- Artifacts: output/playtest-opening and output/review. Desktop/mobile screenshots were opened and visually inspected.
- Key product finding: portrait mobile gameplay is a small centered strip with large unused space and a crowded toolbar; landscape is clearer. Recommend a short mobile-first showcase with simplified controls/menu and French copy before adding features or sharing publicly.
- Touch input checks also passed for movement, double jump and slam. Production smoke check on port 3001 confirmed the built game starts, the leaderboard responds with HTTP 200, and development hooks are absent. Temporary production server stopped; development server remains on port 3000. Latest mobile route screenshot was visually inspected.
- Firecrawl could not verify a current official MC Pao profile; Instagram scraping is unsupported. Do not guess a handle or claim a verified outreach route.

Suggested next work (not implemented):
- Polish a 45–60 second showcase: easy first stomp, watch power-up, memorable payoff; prioritize phone landscape layout and hide secondary editor/rank/costume/weather actions in pause/settings.
- Test with a few fresh players, then prepare a short vertical gameplay clip and a single playable link with creator credit/contact.
- A public leaderboard needs durable hosting storage; preview modes currently allow entering the finale directly. Treat competitive score verification as later work.

Follow-up review, 26 October 2026:
- User requested a deeper review of gameplay, attractiveness, character authenticity, animations and design toward a polished final version.
- Created POLISH_PLAN.md with evidence, priorities, proposed changes and release gates. No gameplay/art redesign was applied for this review.
- Generated output/audit/animation-sheet.png from the actual browser sprite bank and opened it. Confirmed cut-image rig limitations, detached skin-colored fragments in run frames, largely unchanged upper-body poses and a toast prop without a corresponding arm lift.
- PNG alpha metrics confirmed transparency. Initial raw-image preview concern about missing transparency was corrected; do not report background removal as an established primary defect.
- First hit in a hold-right scenario was observed by frame 30 (~0.5 s). Useful pacing evidence, not an unfairness verdict.
- Retrieved a public Monaco News interview transcript and thumbnail (https://www.youtube.com/watch?v=vAB7GB5k_Bc), viewed the thumbnail, and used it as one initial likeness reference. Did not watch/listen to the complete interview or certify quote delivery.
- Current voice uses browser speech synthesis and cancels previous lines on each new call; actual audio mix still needs listening review.
- Recommended next implementation: a polished first 20–30 seconds with final character designs, clean run/jump/stomp frames, simple teaching sequence and readable phone presentation. Then extend across level/boss/finale.

Implementation pass, 26 October 2026:
- User explicitly authorized implementing all recommendations. Implemented the gameplay, art/animation, French UI, mobile viewport and sound polish described in IMPLEMENTATION.md.
- Generated three assets with built-in ImageGen, copied into public/assets/polish, preserved originals and saved exact prompts/source roles in ASSET_NOTES.md. Added complete pose sprite integration, consistent scale/costume palettes and isolated-fragment cleanup.
- Redesigned title/HUD/results and moved secondary actions into pause/extras. Added landscape viewport, rotation pause/fallback, contextual hints, score sharing, saved audio options and optional narrator/voice manifest support.
- Extended starting safe area, implemented boss checkpoint/retry, added fixed-step simulation and full pause freeze, fixed held-pose retriggering and corrected turbo bypass of the boss shield. Removed overhead boss platforms after playtesting exposed blocked stomp access; anvil crates now have an anvil icon.
- First autopilot could finish by ramming the closed boss shield; fixed that behavior and added regression coverage. Subsequent full-route tests intentionally exercised a death and checkpoint recovery. A pilot with double-jump projectile dodging completed all boss phases, reached the Lambo and finished with two hearts; the packaged test passed again at 44,650 euros.
- Added Playwright 1.61.1 as a dev dependency and saved portable test:game and test:ui scripts. npm install succeeded with zero reported vulnerabilities. Startup/test scripts now use node --import tsx to avoid the tsx CLI's IPC issue in restricted environments.
- Final checks passed: lint, 13 unit tests, production build, packaged full story test and packaged UI/touch/settings/sharing/fullscreen/editor checks. Original skill client rerun for final yacht animation.
- Audio capture output/polish-review/music-review.webm: AudioContext running; peak measured -15.3 dBFS. Audio input is unavailable to this model, so do not claim an actual listening review.
- Remaining external review: physical phones, fresh human players and optional approved real voice recordings. No public deployment or messages sent.
- Production smoke check passed: built game starts, all three new PNG assets respond with image/png and HTTP 200, leaderboard HTTP 200, and development hooks are absent. Desktop sample: median frame interval 16.7 ms, 95th percentile 17.9 ms. Temporary port-3001 server stopped; dev server remains on port 3000.
- Final visual cleanup removed neighbouring-cell fragments and the redundant pose badge. Added a brief stomp impact pose, adjusted run cadence and corrected toast timing. Lint, all 13 rules tests and build passed afterward; the original skill client was rerun and the final yacht screenshot inspected.

User correction pass, 26 October 2026:
- User clarified the beginning glitch is the first enemy. Found a patrol span smaller than his body; fixed the authored range and made degenerate custom patrols stationary. Added a regression test (14 unit tests total).
- Generated a blue skeleton-dial watch, Aventador SVJ open/closed door frames, dedicated crawl frames and a yacht edit with both guests ~22% taller. Preserved source images; exact prompts will be recorded with the assets.
- Fixed the title portrait ignoring selected costume and strengthened white/gold shirt palettes. Added three visible outfit choices.
- Replaced the cream landing page with a mobile arcade lobby showing Play, outfits and top scores together. Clear demo benchmarks replace fake official/certificate claims.
- Swimming now has anchored crawl frames, partial submersion, waterline ripples, splashes, wake and underwater clipping at stone piers.
- Added an optional high-route Cuvée 36K bottle bonus (+3,600 fictional points), based on public clips; research limits and official art references are in RESEARCH.md.
- Packed 142 native sprite frames losslessly into a ~1 MB atlas, replacing ~8 MB of runtime source-art downloads. Original generated sheets remain for future editing. Fonts are self-hosted with OFL licenses.
- Production build now bundles the Express server and runs directly with Node. Atomic leaderboard persistence returns a failure instead of claiming an unsaved score succeeded; configurable persistent DATA_DIR, request limits and proper missing-asset/API responses added. Scene preview query parameters are development-only.
- Chromium and WebKit passed 12 phone-size/orientation checks: first-screen scores/Play, actual visible white/gold palette changes, simultaneous movement/double jump, pointer cancellation and recoverable asset loading failure. Packaged desktop UI tests passed. Full desktop story with checkpoint death/retry passed at 43,950 points and three hearts.
- The apparent harbor touch issue was a test-driver error: the driver released the movement finger instead of the jump finger. Corrected the CDP sequence and reran the whole route successfully with real two-finger touch input, including boss death/retry and victory (43,950 points, three hearts). An initial artwork compilation race was caught visually; the compiler now waits for actual generated frames before packing. Rebuilt the atlas and reran the phone matrix and full desktop/mobile runs.
- Final device matrix expanded to 18 Chromium/WebKit phone/tablet combinations, including 320px-high landscape viewports. All pass with visible Play/scores/Resume, genuine generated art, three visible costume palettes, leaderboard filter/return behavior, double jump/cancellation and a successful reload after failed artwork loading. Rotation prompt also works on portrait tablets.
- Secret bottle collected via normal controls and reward/hint overlap regression verified. Compact pause/leaderboard screens were opened and visually inspected on both engines; final opening screenshot from the skill client was inspected as well.
- Clean production-only install passed with 72 packages and no reported vulnerabilities. Built server runs without tsx/Vite; real-time phone touch/pause, development shortcut exclusion, absent debug hooks, local-only runtime requests, persistent score across restart, HTTP 400/404/429/503 behavior all passed using isolated temporary data. Typical emulated desktop frame interval ~16.7 ms; this is not a physical-phone benchmark.
- Updated README with accurate local, phone LAN, production storage and test instructions. Dev server restarted with final server implementation and left running at http://localhost:3000. No public deployment or outreach performed. Physical phone/human playtesting remains the external release review; no absolute zero-bug guarantee is claimed.
- Final display cleanup hides transient fallback portraits until the real atlas is ready and gives long reward callouts priority over tutorial/short popup text. Targeted bonus regression, original skill-client opening check, lint, build and clean-runtime production smoke all pass afterward. Current phone LAN address for this session: http://192.168.1.122:3000 (same Wi-Fi).
