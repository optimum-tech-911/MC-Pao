import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDt,
  calculateStompScore,
  cyclePaoCostume,
  formatEuros,
  getOpenWaterZoneAt,
  resolvePlayerHorizontalPlatformWall,
  resolvePlayerPlatformAABB,
  selectPlayerAnimState,
  resolvePlayerEnemyInteraction,
  resolvePlayerBossInteraction,
  stepJumpMechanics,
  stepMarcoAI,
  stepBossAI,
  stepEnemyPlatformGravity,
  stepSwimmingPhysics,
  encodeLevelShareCode,
  decodeLevelShareCode,
  validateAndNormalizeScoreSubmission,
  sortAndRankLeaderboard,
  computeProjectedWorldwideRank,
  PHYSICS,
  type EnemyState,
  type BossState,
  type CustomLevelPayload,
  type PlayerAnimState,
} from './rules';
import type { Platform } from './level';
import { buildMediterraneanLevel, createInitialPlayer } from './level';

test('clampDt clamps negative and large dt values safely', () => {
  assert.equal(clampDt(-0.1), 0);
  assert.equal(clampDt(0.016), 0.016);
  assert.equal(clampDt(0.25), PHYSICS.MAX_DT);
});

test('calculateStompScore scales with combo multiplier up to 8x and returns viral French callouts in Euros', () => {
  const first = calculateStompScore(1);
  assert.equal(first.points, 500);
  assert.equal(first.multiplier, 1);
  assert.equal(first.callout, 'OH LA BOUTEILLE DE VIN À 8 000 € !');

  const second = calculateStompScore(2);
  assert.equal(second.points, 1000);
  assert.equal(second.multiplier, 2);
  assert.equal(second.callout, "RENDS L'ARGENT MARCO !");

  const capped = calculateStompScore(12);
  assert.equal(capped.points, 4000);
  assert.equal(capped.multiplier, 8);
  assert.ok(formatEuros(8000).includes('€'));
});

test('resolvePlayerPlatformAABB snaps MC Pao flush to floor tile and triggers landing animation state', () => {
  const floorTile = { x: 0, y: 246, w: 480, h: 74 };
  const player = {
    x: 84,
    y: 246 - 58 + 5, // swept 5px below surface this frame
    vx: 10,
    vy: 310,
    w: 44,
    h: 58,
    grounded: false,
    airJumpsLeft: 0,
    groundPounding: false,
    landTimer: 0,
    landingImpactVy: 0,
    scaleX: 1,
    scaleY: 1,
    combo: 3,
    animState: 'stomp' as PlayerAnimState,
  };

  const prevBottom = 242; // was 4px above floorTile.y (246)
  const res = resolvePlayerPlatformAABB(player, prevBottom, false, [floorTile]);

  assert.equal(res.grounded, true);
  assert.equal(res.justLanded, true);
  assert.equal(player.y + player.h, floorTile.y);
  assert.equal(player.vy, 0);
  assert.ok(player.landTimer > 0);
  assert.equal(player.animState, 'land');
  assert.equal(
    selectPlayerAnimState({
      scooterTimer: 0,
      invulnTimer: 0,
      grounded: player.grounded,
      vy: player.vy,
      vx: player.vx,
      landTimer: player.landTimer,
    }),
    'land'
  );

  // Verify continuous ground-snap keeps player locked to surface without floating
  player.y = floorTile.y - player.h - 3; // 3px micro-gap within GROUND_SNAP_EPSILON
  const snapRes = resolvePlayerPlatformAABB(
    player,
    player.y + player.h,
    true,
    [floorTile]
  );
  assert.equal(snapRes.grounded, true);
  assert.equal(player.y + player.h, floorTile.y);
});

test('stepEnemyPlatformGravity keeps enemies locked on moving platforms and drops floating enemies onto ledges', () => {
  const movingPlatform = { x: 1240, y: 164, w: 160, h: 28 };
  const marcoOnMovingPlat: EnemyState = {
    id: 8,
    archetype: 'caller',
    x: 1290,
    y: 152 - 44, // was at y=108 before platform moved down to 164
    vx: 0,
    vy: 0,
    w: 38,
    h: 44,
    minX: 1246,
    maxX: 1390,
    facing: -1,
    state: 'patrol',
    stateTimer: 0,
    attackCooldown: 0,
    walkDist: 0,
    hitFlashTimer: 0,
  };

  const grounded = stepEnemyPlatformGravity(marcoOnMovingPlat, [movingPlatform], 0.016);
  assert.equal(grounded, true);
  assert.equal(marcoOnMovingPlat.y + marcoOnMovingPlat.h, movingPlatform.y);
});

test('resolvePlayerEnemyInteraction detects top stomp vs side hurt vs scooter plow', () => {
  const enemy = {
    x: 100,
    y: 200,
    w: 32,
    h: 36,
    state: 'patrol' as const,
  };

  const stompingPlayer = {
    x: 96,
    y: 162,
    w: 38,
    h: 48,
    vy: 180,
    invulnTimer: 0,
    scooterTimer: 0,
  };
  assert.equal(resolvePlayerEnemyInteraction(stompingPlayer, enemy), 'stomp');

  const sidePlayer = {
    x: 92,
    y: 192,
    w: 38,
    h: 48,
    vy: 0,
    invulnTimer: 0,
    scooterTimer: 0,
  };
  assert.equal(resolvePlayerEnemyInteraction(sidePlayer, enemy), 'hurt');

  const scooterPlayer = {
    ...sidePlayer,
    scooterTimer: 5.0,
  };
  assert.equal(resolvePlayerEnemyInteraction(scooterPlayer, enemy), 'scooter_plow');

  assert.equal(
    resolvePlayerEnemyInteraction(sidePlayer, { ...enemy, state: 'squished' }),
    'none'
  );
});

test('stepJumpMechanics supports coyote time, jump buffering, variable jump velocity cut, and Air-Flex double jump', () => {
  const player = {
    vy: 0,
    grounded: false,
    coyoteTimer: 0.08,
    jumpBufferTimer: 0,
    jumpHeld: false,
    airJumpsLeft: 1,
    groundPounding: false,
    scaleX: 1,
    scaleY: 1,
  };

  const res = stepJumpMechanics(player, true, true, 0.016);
  assert.equal(res.didJump, true);
  assert.equal(res.didDoubleJump, false);
  assert.equal(player.vy, PHYSICS.JUMP_VELOCITY);
  assert.ok(player.scaleY > 1);

  stepJumpMechanics(player, false, false, 0.016);
  assert.ok(Math.abs(player.vy - PHYSICS.JUMP_VELOCITY * PHYSICS.JUMP_CUT_MULT) < 1);

  // Trigger Air-Flex Double Jump while airborne with coyoteTimer = 0
  const airRes = stepJumpMechanics(player, true, true, 0.016);
  assert.equal(airRes.didJump, true);
  assert.equal(airRes.didDoubleJump, true);
  assert.equal(player.vy, PHYSICS.DOUBLE_JUMP_VELOCITY);
  assert.equal(player.airJumpsLeft, 0);
});

test('stepMarcoAI executes 3 distinct enemy behaviors (waddler, caller, charger)', () => {
  const baseEnemy: EnemyState = {
    id: 1,
    archetype: 'waddler',
    x: 200,
    y: 200,
    vx: 0,
    vy: 0,
    w: 32,
    h: 36,
    minX: 100,
    maxX: 400,
    facing: 1,
    state: 'patrol',
    stateTimer: 0,
    attackCooldown: 0,
    walkDist: 0,
    hitFlashTimer: 0,
  };

  const waddlerFar = { ...baseEnemy };
  stepMarcoAI(waddlerFar, { x: 600, y: 200, w: 38, h: 48 }, 0.016, true);
  const waddlerNear = { ...baseEnemy };
  stepMarcoAI(waddlerNear, { x: 240, y: 200, w: 38, h: 48 }, 0.016, true);
  assert.ok(Math.abs(waddlerNear.vx) > Math.abs(waddlerFar.vx));

  const caller: EnemyState = { ...baseEnemy, archetype: 'caller' };
  const t1 = stepMarcoAI(caller, { x: 320, y: 200, w: 38, h: 48 }, 0.016, true);
  assert.equal(t1.telegraphStarted, true);
  assert.equal(caller.state, 'windup');
  const t2 = stepMarcoAI(caller, { x: 320, y: 200, w: 38, h: 48 }, 0.5, true);
  assert.equal(t2.spawnProjectile, true);
  assert.equal(caller.state, 'patrol');

  const charger: EnemyState = { ...baseEnemy, archetype: 'charger' };
  const c1 = stepMarcoAI(charger, { x: 310, y: 195, w: 38, h: 48 }, 0.016, true);
  assert.equal(c1.telegraphStarted, true);
  assert.equal(charger.state, 'windup');
  stepMarcoAI(charger, { x: 310, y: 195, w: 38, h: 48 }, 0.55, true);
  assert.equal(charger.state, 'attack');
  stepMarcoAI(charger, { x: 310, y: 195, w: 38, h: 48 }, 0.016, true);
  assert.ok(Math.abs(charger.vx) >= 170);
});

test('Boss Don Marco AI transitions through shielded patrol, leap slam, and vulnerable stomp window', () => {
  const boss: BossState = {
    active: true,
    defeated: false,
    x: 2950,
    y: 176,
    vx: 0,
    vy: 0,
    w: 58,
    h: 70,
    groundY: 246,
    minX: 2820,
    maxX: 3360,
    facing: -1,
    hp: 6,
    maxHp: 6,
    phase: 1,
    state: 'patrol_shielded',
    stateTimer: 0.02,
    hitFlashTimer: 0,
    walkDist: 0,
  };

  const stompingPlayer = {
    x: 2955,
    y: 138,
    w: 42,
    h: 56,
    vy: 150,
    invulnTimer: 0,
    scooterTimer: 0,
  };

  assert.equal(resolvePlayerBossInteraction(stompingPlayer, boss), 'shield_bounce');
  assert.equal(
    resolvePlayerBossInteraction({ ...stompingPlayer, scooterTimer: 8 }, boss),
    'shield_bounce',
    'turbo must preserve the shield mechanic'
  );
  assert.equal(
    resolvePlayerBossInteraction({ ...stompingPlayer, y: 190, scooterTimer: 8 }, boss),
    'none',
    'turbo protects against side contact without damaging a closed shield'
  );

  const r1 = stepBossAI(boss, stompingPlayer, 0.05);
  assert.equal(r1.telegraphStarted, true);
  assert.equal(boss.state, 'windup_leap');

  stepBossAI(boss, stompingPlayer, 0.55);
  assert.equal(boss.state, 'leaping');

  boss.y = 240;
  boss.vy = 300;
  const r2 = stepBossAI(boss, stompingPlayer, 0.05);
  assert.equal(r2.spawnShockwaves, true);
  assert.equal(boss.state, 'vulnerable');

  assert.equal(resolvePlayerBossInteraction(stompingPlayer, boss), 'boss_stomp');
  assert.equal(
    resolvePlayerBossInteraction({ ...stompingPlayer, y: 190, scooterTimer: 8 }, boss),
    'boss_stomp',
    'turbo can ram the boss after the shield opens'
  );
});

test('story gives time to learn movement and keeps the boss stomp lane open', () => {
  const level = buildMediterraneanLevel();
  const player = createInitialPlayer();
  const firstEnemy = Math.min(...level.enemies.map(e => e.x));
  assert.ok(firstEnemy - (player.x + player.w) > PHYSICS.MAX_RUN_SPEED * 1.2);
  const firstWatch = level.pickups.find(p => p.type === 'scooter');
  assert.ok(firstWatch && firstWatch.x > firstEnemy);
  assert.ok(level.goalX > level.boss.maxX);
  assert.ok(!level.platforms.some(p =>
    p.y < level.boss.groundY && p.x < level.boss.maxX && p.x + p.w > level.boss.minX
  ), 'overhead platforms must not prevent stomping a stunned boss');
});

test('Custom level share code encoding and decoding round-trips accurately', () => {
  const sample: CustomLevelPayload = {
    version: 1,
    name: 'Riviera Rooftops',
    author: 'MC Pao',
    weather: 'mistral_gulls',
    items: [
      { kind: 'platform', x: 320, y: 220, w: 128, h: 64 },
      { kind: 'marco_caller', x: 360, y: 180 },
      { kind: 'vespa', x: 180, y: 208 },
      { kind: 'boss_don_marco', x: 640, y: 176 },
    ],
  };

  const code = encodeLevelShareCode(sample);
  assert.ok(code.startsWith('MCPAO1_'));
  const decoded = decodeLevelShareCode(code);
  assert.deepEqual(decoded, sample);
  assert.equal(decodeLevelShareCode('invalid_corrupted_code'), null);
});

test('Worldwide leaderboard validation, deduplication, and ranking work accurately', () => {
  const e1 = validateAndNormalizeScoreSubmission({
    playerName: 'mc pao 92',
    country: 'FR',
    score: 24500,
    chains: 14,
    marcosStomped: 12,
    maxCombo: 5,
    mode: 'story',
    victory: true,
  });
  assert.ok(e1);
  assert.equal(e1.playerName, 'MC PAO 92');
  assert.ok(e1.verifiedCode.startsWith('RM-MCP-24500E-'));

  const e2 = validateAndNormalizeScoreSubmission({
    playerName: 'RIVIERA KING',
    country: 'MC',
    score: 32000,
    chains: 18,
    marcosStomped: 15,
    maxCombo: 8,
    mode: 'story',
    victory: true,
  });
  assert.ok(e2);

  // Updating personal best for same player & mode replaces lower score
  const e1Higher = validateAndNormalizeScoreSubmission({
    playerName: 'MC PAO 92',
    country: 'FR',
    score: 36500,
    chains: 20,
    marcosStomped: 15,
    maxCombo: 8,
    mode: 'story',
    victory: true,
  });
  assert.ok(e1Higher);

  const ranked = sortAndRankLeaderboard([e1, e2, e1Higher]);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].playerName, 'MC PAO 92');
  assert.equal(ranked[0].score, 36500);
  assert.equal(ranked[1].playerName, 'RIVIERA KING');

  assert.equal(computeProjectedWorldwideRank(40000, ranked), 1);
  assert.equal(computeProjectedWorldwideRank(30000, ranked), 3);
});

test('cyclePaoCostume cycles cleanly through Black VIP, Classic White, and Monaco Gold outfits', () => {
  assert.equal(cyclePaoCostume('yacht_black_vip'), 'classic_white');
  assert.equal(cyclePaoCostume('classic_white'), 'monaco_gold');
  assert.equal(cyclePaoCostume('monaco_gold'), 'yacht_black_vip');
});

test('stepSwimmingPhysics restricts swimming strictly to open-water sea gaps between stone piers and supports Dolphin Jump', () => {
  const piers: Platform[] = [
    { x: 268, y: 252, w: 272, h: 80, hasIvy: false }, // Solid stone pier #2 (x: 268..540)
    { x: 616, y: 230, w: 236, h: 18, hasIvy: false, isYachtDeck: true }, // Super-Yacht deck floating on water
    { x: 878, y: 244, w: 260, h: 90, hasIvy: false }, // Solid stone pier #3 (x: 878..1138)
  ];

  // Over solid stone pier (x=400), open water zone is null
  assert.equal(getOpenWaterZoneAt(400, piers), null);
  // In the open sea gap between Pier #2 (540) and Pier #3 (878), open water zone is [540, 878]
  assert.deepEqual(getOpenWaterZoneAt(580, piers), { minX: 540, maxX: 878 });

  const player = {
    x: 560,
    y: 224, // bottom at 282 >= WATER_SURFACE_Y + 4 (270)
    vx: 120,
    vy: 240,
    w: 44,
    h: 58,
    grounded: false,
    swimming: false,
    airJumpsLeft: 0,
    groundPounding: false,
    landTimer: 0,
    scaleX: 1,
    scaleY: 1,
    walkDist: 0,
    animState: 'jump' as PlayerAnimState,
  };

  // 1. Over solid stone pier (x=350), player must NEVER enter swimming state!
  player.x = 350;
  const overPierRes = stepSwimmingPhysics(player, false, 1.0, 0.016, piers);
  assert.equal(overPierRes.enteredWater, false);
  assert.equal(player.swimming, false);

  // 2. In open water sea gap (x=560), player enters buoyant freestyle swimming!
  player.x = 560;
  const r1 = stepSwimmingPhysics(player, false, 1.0, 0.016, piers);
  assert.equal(r1.enteredWater, true);
  assert.equal(player.swimming, true);
  assert.equal(player.animState, 'swim');

  // 3. Attempting to swim left under Pier #2 (x < 540) clamps player at pier wall (542)
  player.x = 510;
  player.vx = -150;
  stepSwimmingPhysics(player, false, 1.05, 0.016, piers);
  assert.equal(player.x, 542);
  assert.equal(player.vx, 0);

  // 4. Horizontal wall collision stops player from walking through a solid stone pier wall
  const runner = { x: 840, y: 250, vx: 180, w: 44, h: 58 };
  resolvePlayerHorizontalPlatformWall(runner, 830, piers);
  assert.equal(runner.x, 878 - 44);
  assert.equal(runner.vx, 0);

  // 5. Pressing Jump while swimming triggers a high Dolphin Jump out of the water
  const r2 = stepSwimmingPhysics(player, true, 1.1, 0.016, piers);
  assert.equal(r2.exitedWaterWithJump, true);
  assert.equal(player.swimming, false);
  assert.equal(player.vy, PHYSICS.SWIM_JUMP_VELOCITY);

  // Golden Lambo state takes priority in selectPlayerAnimState
  assert.equal(
    selectPlayerAnimState({
      scooterTimer: 5,
      invulnTimer: 0,
      grounded: true,
      swimming: false,
      inGoldenLambo: true,
      vy: 0,
      vx: 240,
      landTimer: 0,
    }),
    'lambo'
  );

  // VIP Pose triggers when grounded near the VIP women with vipPoseTimer > 0
  assert.equal(
    selectPlayerAnimState({
      scooterTimer: 0,
      invulnTimer: 0,
      grounded: true,
      swimming: false,
      inGoldenLambo: false,
      vipPoseTimer: 1.5,
      vy: 0,
      vx: 10,
      landTimer: 0,
    }),
    'vip_pose'
  );

  // 6. Swimming up to the Super-Yacht bow deck smoothly vaults MC Pao onto the yacht deck
  player.swimming = true;
  player.x = 605; // centerX = 627 inside yacht deck [616..852]
  player.y = 216;
  const r3 = stepSwimmingPhysics(player, false, 1.2, 0.016, piers);
  assert.equal(r3.exitedWaterWithJump, true);
  assert.equal(player.swimming, false);
  assert.equal(player.grounded, true);
  assert.equal(player.y + player.h, 230);
  assert.equal(player.animState, 'land');
});




test('first Marco patrol stays inside a valid range without frame-by-frame facing flips', () => {
  const level=buildMediterraneanLevel();const enemy=level.enemies[0];
  assert.ok(enemy.maxX-enemy.minX>enemy.w+20);
  const player={x:84,y:184,w:42,h:62};let flips=0,last=enemy.facing;
  for(let i=0;i<180;i++){stepMarcoAI(enemy,player,1/60,true);if(enemy.facing!==last)flips++;last=enemy.facing;assert.ok(enemy.x>=enemy.minX&&enemy.x+enemy.w<=enemy.maxX+.01);}
  assert.ok(flips<=5,`unexpected jitter: ${flips} flips in three seconds`);
  const narrow={...enemy,minX:100,maxX:120,x:100,facing:1 as const};
  for(let i=0;i<120;i++)stepMarcoAI(narrow,player,1/60,true);
  assert.equal(narrow.x,100);assert.equal(narrow.facing,1);assert.equal(narrow.vx,0);
});
