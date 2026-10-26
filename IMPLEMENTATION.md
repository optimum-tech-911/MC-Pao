# Riviera polish pass — implemented

26 October 2026. Local game: http://localhost:3000 . Start with `npm run dev`.

## Gameplay

- Extended the starting promenade with contextual French movement, stomp, watch and swimming hints.
- Kept variable jump height, double jump, coyote time, jump buffering, stomp chains, swimming and the watch power-up.
- Added a checkpoint before Don Marco. A failed story run can resume there with restored health and the checkpoint's score/progress. Full restart remains available in pause.
- Kept the boss arena open so overhead platforms cannot block the required stomp. Added a visible briefcase shield, attack labels, vulnerability indicator and recognizable anvil crate art.
- Fixed the watch bypass of the boss shield: turbo protects Pao, but damage requires an open shield. Anvil crates remain an alternative attack.
- Recovering the bottle is followed by a playable approach to the gold Lambo, then the getaway/results screen.
- Added a fixed simulation step, complete pause freezing, stronger directional camera lead and one-shot handling for held touch slam/pose input.

## Artwork and animation

- Added Pao and Marco animation sheets and a matching pixel-art yacht with VIP guests, keeping the original assets available.
- Replaced the image-slice character animation with complete generated poses, with consistent scaling, isolated-fragment cleanup and costume palette variants.
- Added rising/apex/falling poses, distinct double jump, landing, hurt, slam, stomp impact and a toast with a moving arm.
- Tuned run cadence against travel distance. Updated the world to a softer coastal palette and aligned the yacht deck art to the actual collision surface.
- Created animated character portraits for the title screen using the same in-game sprite bank.
- Files and exact built-in ImageGen prompts: `public/assets/polish/ASSET_NOTES.md`.

## Interface and sound

- Rebuilt the French title, objective, compact HUD and results screen. Moved secondary tools into extras/pause menus.
- Consolidated rapid reward popups and limited simultaneous quote banners.
- Added a wider landscape viewport, safe-area-aware touch controls, a paused rotation prompt and a portrait fallback.
- Added fullscreen, persistent audio preferences, original synthesized music with bass/drums/plucked melody, optional French narration and support for supplied voice clips.
- Added result sharing/copying and marked demonstration leaderboard entries. Real MC Pao recordings are not bundled or impersonated.
- Voice setup: `public/assets/audio/README.md`.

## Verification

- `npm run lint`, `npm test` (13 passing tests) and `npm run build` pass.
- `npm run test:game` completed the entire story through normal keyboard input, an intentional boss death, checkpoint retry, boss defeat and the Lambo result screen; the successful verification finished with two hearts.
- `npm run test:ui` passed costume/light cycling, fullscreen, saved audio settings, result copying, full replay, editor entry, simultaneous touch movement/double jump, held-pose input and portrait rotation pause.
- The web game skill's original Playwright client was also run and its screenshots/state inspected.
- Browser screenshot artifacts are in `output/final-check`, `output/playtest-story` and `output/final-skill-playtest`. Console/page errors were checked.
- Production smoke check passed for the built game, leaderboard and all three PNG assets, with development hooks absent. A desktop timing sample measured 16.7 ms median and 17.9 ms at the 95th percentile.
- A synthesized audio capture was produced and measured without clipping. Listening review of the actual mix and tests on physical iOS/Android devices remain external checks; desktop timing is not a substitute for those.

## Remaining real-world checks

Watch a few people familiar with MC Pao/Marco play without coaching; confirm likeness, joke timing and difficulty. Test touch comfort, audio unlock and performance on actual target phones. Optional real voice clips need a supplied/approved recording. These are not claimed complete by browser emulation.

No public deployment, social post or outreach was performed.

## Mobile correction pass

The lobby is now a compact navy/gold arcade screen with three visible outfit
previews and a top-three scoreboard. The pause screen keeps Resume at the top;
the leaderboard has a compact phone layout and consistent mode filtering.

The first enemy's invalid patrol range is fixed and regression-tested. The blue
watch, gold Aventador SVJ, dedicated freestyle crawl and ~22% taller yacht guests
are integrated through a lossless native sprite atlas. Swimming is anchored at
the waterline with underwater transparency, local clipping, wake and splashes.
Title and gameplay both honor the selected outfit; white and gold visibly recolor
the shirt. Public bottle-war references inspired an optional Cuvée 36K collectible;
source observations and fictional game writing are separated in RESEARCH.md.

Production now runs a bundled Node server without tsx/Vite at runtime. Shared
scores use atomic file writes and a configurable persistent DATA_DIR. Invalid
submissions, missing routes/assets, storage failures and excessive submissions
return explicit HTTP errors. Scene shortcuts/debug hooks are development-only.
Fonts and artwork require no third-party runtime requests.
