# MC Pao: Ciao Marco! — release quality polish plan

Review date: 26 October 2026.

Implementation update: this assessment has now been acted on. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for delivered changes, verification and remaining physical-device/human checks.

Goal: make a funny, immediately understandable fan game that MC Pao would enjoy playing and sharing. This is an assessment and proposed implementation order; no gameplay redesign was applied during this review.

## Assessment

The current prototype has a clear setting and plenty of implemented mechanics: variable jump height, a double jump, coyote time, buffered jumps, swimming, a ground pound, stomp combos, a speed/invulnerability power-up, three enemy behaviors, a phased boss, and a finale. Preserve these foundations while improving how clearly they are taught, drawn and animated.

The main quality gaps are character animation, consistency of artwork, presentation on phones, and the pacing/readability of the opening. More modes are a lower priority than these.

Evidence reviewed:
- Desktop/mobile screenshots and browser input/state checks from the local game.
- The actual rendered animation bank, captured in `output/audit/animation-sheet.png`.
- `src/game/sprites.ts`, `src/game/rules.ts`, `src/game/level.ts`, `src/components/GameCanvas.tsx`, and `src/game/audio.ts`.
- One public MC Pao interview thumbnail and its transcript/description from [Monaco News](https://www.youtube.com/watch?v=vAB7GB5k_Bc). This is a starting reference, not a complete likeness or performance study. The full video was not watched or listened to in this review.

The PNGs contain transparency. Raw image previews were initially misleading; background removal is not established as the main defect. Check actual composited frames when judging asset quality.

## 1. Lock the art direction and character identity

Recommended direction: expressive pixel-art caricatures in a sunny Riviera world, with a shared pixel scale, outline treatment, lighting direction and palette. Keep the humor and recognizable accessories.

Current observations:
- Pao is the most visually developed character. Sunglasses, hair, beard and stocky silhouette establish useful recognition cues.
- The world uses coarse tile pixels, while the watch and yacht have much finer, smoother detail. The supporting characters use another illustration treatment. The mixed resolutions and shading weaken cohesion.
- The repeated Marco face has a readable worried expression but limited expression range. The boss mostly enlarges that design and adds a crown.

Work:
- Assemble three to five reliable photo/video references for each real person: face, three-quarter/profile, full body, outfit and characteristic gesture. Separate observed references from invented game jokes.
- Create front/three-quarter/side character model sheets. Lock hair contour, beard outline, glasses, face proportions, build, jewellery and clothing marks before making variants.
- Validate recognition at actual phone gameplay size, without a name label. A portrait can support the intro/results screen; the small gameplay sprite still needs a clear silhouette.
- Redraw the yacht, watch, supporting characters and key props to match the same game art rules. Use one approved Pao model across walking, swimming, posing and driving.
- Give enemy types distinct silhouettes/props and windup poses. Make the boss recognizable through posture, behavior and expression as well as size.

Acceptance: assets look as if one artist made them; likeness holds across poses; outlines and pixel density stay consistent; hazards remain clear against the scenery.

## 2. Rebuild the core character animation

Current implementation: `stampArticulatedPaoFrame` cuts one image into two leg sections and a combined upper-body section. Several pose fields for independent head/arm movement do not affect the image-based upper body. Rotating the legs also rotates any unrelated pixels captured in those rectangles.

Visible issues in the frame sheet:
- Detached skin-colored fragments and awkward limb joins in parts of the run cycle.
- Similar upper-body silhouettes across idle, run, jump and hurt.
- The VIP toast overlays glints and a glass while the hand remains largely in its original position.
- Swimming has limited pose variation across its six frames.

Work:
- Use purpose-drawn sprite frames or a properly separated layered rig with complete limbs and clean overlap areas.
- Build a deliberate six-to-eight-frame run cycle: contact, compression, passing and lift. Keep planted feet stable, pair opposite arm/leg swings, and tie cadence to travel speed.
- Distinguish rising, apex, falling, double jump, slam and landing. Keep the jump response immediate; animation must not delay input.
- Give hurt a readable recoil, the slam a clear preparation/impact/recovery, and the toast a real arm lift and head turn.
- Add small secondary motion to hair, shirt and chain after the main body movement reads well.
- Give Marco anticipation, reaction and recovery frames, with clearly different attack poses for each enemy behavior.

Acceptance: no detached pixels or visible cut seams; feet do not skate; transitions preserve body proportions; each action is identifiable in silhouette and in motion at gameplay size.

## 3. Tune gameplay around a clear learning sequence

Current strengths: coyote time and input buffering already exist; the player can vary jump height, double jump and bounce after a stomp. Keep those systems.

Current observations:
- In a simple hold-right check, the first hit was observed by frame 30, about half a second after movement began. This is a pacing observation, not proof that the level is unfair.
- The opening presents enemies, crates, collectibles, an elevated path, a watch and a spring in a short stretch.
- The visible player art extends beyond its collision rectangle. This can be intentional, but the relation between feet, body and hazards needs a fairness check.
- The camera already follows with smoothing and a 24-pixel facing-direction look-ahead. Tune that lead against running/overdrive speed if fresh players lack time to read upcoming hazards.
- A defeated run returns to a fresh start; checkpoint behavior is not currently implemented.

Work:
- Establish a simple objective with one short French intro. Example invented story: retrieve an expensive bottle from Marco before reaching the VIP party.
- Teach one action at a time: safe movement, one clear stomp, a forgiving jump, then the watch and a short line of enemies that demonstrates its effect.
- Arrange enemy spacing to support intentional bounce chains. Make pickups trace useful jump arcs.
- Tune tap/hold jump height, stopping distance, aerial steering, stomp detection and bounce height together in a small test section.
- Use distinct shape/pose/audio cues for attack preparation, shielded states and vulnerability. Test boss readability without relying on text or color alone.
- Add a checkpoint before the boss and a fast retry flow if fresh-player tests show repetition becoming frustrating.
- Make the yacht a brief reward beat and the finale a payoff to a stated objective.

Acceptance: fresh players discover the first stomp and power-up without explanation; deaths have an understandable cause; retries are quick; mobile controls support simultaneous movement and jumping reliably.

## 4. Improve presentation and feedback

Current observations:
- The toolbar exposes costume, weather, boss, ranking, editor, audio and other controls during play.
- Multiple pickup labels overlap. A large quote banner, local reward text, particles and character effects can compete at once.
- Portrait phone layout leaves gameplay in a small horizontal strip.

Work:
- Keep health, score and pause as the main HUD; put secondary actions in pause/settings. Show touch controls when relevant to the device.
- Choose a deliberate landscape phone layout and a useful rotate prompt/portrait fallback. Account for safe areas and device browser controls.
- Reserve one location for the main punchline. Consolidate rapid pickups into one reward counter and limit speech/banner frequency.
- Use French consistently in the main flow. Explain the objective and controls through short, contextual prompts.
- Keep collision edges and interactive objects visually clearer than background decoration. Add depth and landmarks selectively.
- Give the finish screen a short payoff, replay and a shareable result with creator credit.

Acceptance: player, next hazard and landing surface are readable at all times; no HUD/popup overlaps the relevant action; phone controls are comfortable and do not cover the route.

## 5. Give the game an appropriate sound identity

Current implementation: synthesized retro effects and music, plus French browser speech synthesis. `speakFrenchCallout` cancels the previous utterance each time a new one starts. This can truncate dialogue during rapid events. The actual mix was not listened to during this review.

Work:
- Use a short original musical theme that fits the intended Riviera/trap comedy tone and works with the chosen pixel-art direction.
- Use a small set of approved recordings or a strong original French voice performance; browser TTS cannot reproduce a person's delivery.
- Space voice events and avoid repeating the same line on every pickup/enemy. Prioritize major events and briefly lower the music during dialogue.
- Keep useful sounds for jump, landing, hurt, attack preparation, pickups and boss vulnerability distinct.
- Test music/SFX/voice balance, mute persistence, and mobile audio start/resume on actual devices.

Acceptance: dialogue finishes intelligibly, sound supports timing, repeated actions do not become tiring, and the game remains understandable when muted.

## Implementation order

1. Prove the target quality in the first 20–30 seconds: final Pao/Marco designs, clean run/jump/stomp animations, readable phone view and one satisfying encounter/power-up sequence.
2. Apply that art/animation system across the level and balance the route, enemies and boss.
3. Polish music/voice, yacht reward and the ending; then prepare the shareable presentation.
4. Watch five fresh players play on desktop and actual phones. Fix observed confusion and frustration before expanding content.

Release gate: target stable 60 fps on the chosen target phones; dependable controls; cohesive assets; immediate character recognition among viewers familiar with them; readable combat; a complete beginning-to-end run; replay and failure recovery; stable audio and no browser errors. Validate these through observation and profiling, not a promise based on headless checks alone.

Unresolved: broader likeness references for both characters; observed first-time player feedback; a full story/boss playthrough; an audible mix review; actual iOS/Android device checks. These must be completed before calling the game release-ready.
