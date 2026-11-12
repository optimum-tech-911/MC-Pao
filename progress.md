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

Character selection follow-up, 12 November 2026:
- User requested equal playable leads: choose MC Pao or Marco Mouly at the beginning, with Marco presented in a luxurious robe with a wine bottle.
- Located existing local Desktop repository; no hosted Sites identity is configured. Preserve local project workflow.
- Implementing remembered character choice, a complete Marco hero animation set, reversed rival art/copy, and unchanged shared gameplay physics/scoring.
- Completed equal-size hero selection with saved preference, coherent title/HUD/boss/results/share/editor copy, and remembered Pao outfits. Marco uses the Grand Cru robe with gold embroidery, silver temples, loafers and a labeled green bottle. Added every animation state, including raised-bottle toast and a bottle secured in the sash while swimming.
- Marco faces Pao rivals and a Pao VIP boss. Shared physics, 42×62 collision box, three hearts, pickups, enemy/boss behavior and score rules are unchanged. Automated opening trajectories match exactly for both heroes.
- Fixed compact-menu portrait clipping and mission-ticket overlap after visual inspection; both heroes and Play are visible on 375×667 and 740×320 screens.
- Validation passed: TypeScript, 14 rules tests, production build, existing UI suite, full desktop story for Pao and Marco (including intentional boss death/checkpoint recovery), full actual two-finger touch story for Marco, and new character suite across eight phone/hero scenarios. No browser errors. Ran the original skill Playwright client for Marco jump/double-jump and final yacht/toast; opened screenshots and inspected JSON state.
- Focused production smoke passed: selection and reload persistence, real-time movement/jump, correct Marco HUD, local artwork, and absence of development hooks/query shortcuts. Saved user previews in the current chat outputs folder. No hosting publication or messages sent.
- Added npm run test:characters, npm run test:game:marco, and --marco support with distinct story artifacts. Updated README. Physical device/fresh-player review remains optional external validation. No remaining implementation TODOs for this request.

Reference and motion follow-up, 12 November 2026:
- User supplied two Marco Mouly image-reference screenshots and requested closer likeness, correct motion/actions, and a slightly different adapted parcours.
- Revised native face to cropped receding dark hair, gray temples, olive skin, mature brows/nose and salt-and-pepper stubble. Rebuilt Marco around articulated shoulders/elbows/wrists and hips/knees/ankles. 12-frame run/turbo, 8-frame crawl/toast and dedicated aerial/impact poses.
- Run/sprint use authored80/92px stride distances so stance shoe travel matches world motion; the bottle uses the wrist anchor and swimming sash.
- Added La tournée Grand Cru: optional stepped terrace, cellar gallery/moving lift, raised yacht tasting deck and matching backdrop art. Kept first300px, base floors/water widths, boss/checkpoint/goal and enemy/reward inventories unchanged.
- Fixed existing turbo sprite priority masking jumps/landings/poses and running in place. Added regression coverage. Prevented simultaneous action callouts overlapping and gave Marco slam/toast labels.
- Final validation passed: TypeScript,19 unit/route tests, production build, existing UI suite, character suite(eight phone scenarios), action suite(actual full12-frame run, mirroring, jump/double-jump/slam/landing, toast, damage, crawl/emerge, pause, turbo idle/air/pose/landing), all optional upper ledges and Cuvée through normal controls.
- Full Pao and Marco stories passed intentional checkpoint death/retry,boss and Lambo with3hearts; Marco real two-finger touch story also passed. Improved the old test driver's viaduct caller/distant boss strategy; no game balance changes were made to satisfy the pilot. Route and selected hero are asserted after retries and finale.
- Focused production smoke confirmed route selection/persistence, normal real-time play, switching back to Pao, no debug hooks and no browser errors. Opened and visually inspected final menu, compact mobile menu, actual motion strips, powered jumping/crawl, settled cellar and skill-client action/toast captures.
- Saved updated selection, actual-gameplay animation GIF and cellar route preview to chat outputs. No remaining implementation TODOs for this follow-up.

Approved V2 production animation integration,12 November2026:
- User approved the standalone generated CHARACTER STUDY V2 and explicitly authorized all action animations and integration after verification. Preserved approved master in art/marco/approved-character-v2.png.
- Generated3transparent sprite grids from the exact approved master using built-in ImageGen: ground(run8,idle4,land2,hurt,stomp), actions(jump,apex,fall,doublejump,slam,defeat,carentry,victory,toast8), swim(crawl8). Sourcefilesliveinpublic/assets/marco.
- Added asynchronous approved-sprite extraction with stable cell anchors/shared scale, per-selected-character loading/retry and a Pao escape option. Old code fallback is hidden while Marco's approved art is loading; start remains blocked until generated framescompile.
- Integrated defeat, initial open-door car-entry pose+tween and grounded post-boss celebration; generatedsource marked approved-v2 in debugging to prevent a passing test from silently using old code art.
- Final extraction QA:40populatedapprovedframes, opaqueactor/transparentbackground, noedgeclipping,70pxstandingheight, sharedsheetanchors, groundedshoesrow79, calibratedswimeyes80/30. Exactapprovedmodelandprompts retained with sources.
- Finalvisualfix: generatedposesusegentler30%genericelasticitysofaces/crouchesarenotdoublydistorted. Fatalhitclearsghosts,resetsstretch, showsairrecoilthenkneelingafterlandingbeforegameover.
- Finalvalidation passed:19unit/routetests,TypeScript,productionbuild,existingUIchecks,source-awarecharacter/action/upper-routesuites,8phone/characterlayouts,assetfailure/Paoescape/retry,all40sourceframes,normalstompandallairphases,boostidle/pose/air/landing,crawl/emerge,groundeddefeat,car_entry0/10framesandlambo40frames. No browsererrors.
- CompletePaoandMarcostoriespassedcheckpointdeath/retry,bossandLamboat3hearts;Marcoactualtwo-fingertouchstoryalso3hearts. Reportsconfirmplayer.sprite.source=approved-v2. Skillclientrerunandlatestimage/JSONopened.
- Productioncheckedall3PNGHTTP200,image/png,real-timeapprovedMarcojump/movement,savedselection,noDEVhooksorbrowsererrors. SavedcleanactualgameplayGIF,fullposesheet,menus/gameplayandartnotesinthechatoutputs.
- Existinguserdevserveron3000wasreusedandleftavailable;ownfailedduplicateandtemporaryproductionserverstopped. No publichostingoroutreach. No remainingimplementationTODOs forapprovedV2integration.

Approved Mini MC Pao enemy integration, 12 November 2026:
- User approved standalone ridiculous Mini MC Pao V1 as Marco's bad guy and authorized proceeding.
- Preserved approved model in art/pao-rival; generated two transparent sheets with built-in ImageGen and exact prompts/provenance. 24 distinct frames cover waddle8, caller4, charge anticipation2, charge8 and squished2.
- Added independent approved-rival loader, shared renderer/debug pose selection, action-specific enemy/VIP boss sprites and Marco start/retry gating. Pao's Mini Marco art and all AI/collisions/scoring remain unchanged.
- Validation passed: TypeScript, 19 unit/route tests, production build, original skill-client movement/jump screenshot and JSON, existing UI suite, character/eight-phone suite, complete Pao and Marco keyboard stories, and Marco's actual two-finger touch story. All story runs finish with three hearts after intentional boss death/checkpoint recovery.
- Focused rival suite passed: all 24 approved source frames populated/distinct/transparent/unclipped, all three live patrol types, caller's four animated phone poses leading to an actual projectile, charger anticipation and eight-frame rushing, left/right mirroring, normal-input top stomp (+500, no damage), both seated aftermath poses and collision removal, two phone viewports, failed rival sheet/Pao escape/retry. No page or console errors.
- Corrected source layout drift with fixed column anchors and used 48×38 seated aftermath canvases at the standing scale. Native and actual-game screenshots inspected; final source matches approved caricature.
- Production smoke passed on isolated temporary server: both PNGs HTTP200/image/png, normal Marco start/movement/pause, remembered selection, absent DEV hooks/scene overrides and zero browser errors. Temporary production server stopped; existing user localhost:3000 remains available.
- Saved actual waddle and stomp gameplay GIFs, 24-frame sheet, production gameplay preview and exact built-in generation prompts to chat outputs. No remaining implementation TODOs for approved Mini MC Pao integration.
