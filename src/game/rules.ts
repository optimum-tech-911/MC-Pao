export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'editor';
export type MarcoArchetype = 'waddler' | 'caller' | 'charger';
export type WeatherMode = 'heat_haze' | 'golden_breeze' | 'mistral_gulls';
export type PaoCostume = 'yacht_black_vip' | 'classic_white' | 'monaco_gold';
export type PlayerAnimState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'land'
  | 'stomp'
  | 'scooter'
  | 'swim'
  | 'vip_pose'
  | 'lambo'
  | 'hurt';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpringPad extends Rect {
  bounceTimer: number;
}

export interface YachtState extends Rect {
  id: number;
  name: string;
  deckY: number;
  visited: boolean;
  cheerTimer: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  facing: 1 | -1;
  grounded: boolean;
  swimming: boolean;
  inGoldenLambo: boolean;
  vipPoseTimer?: number;
  costume: PaoCostume;
  coyoteTimer: number;
  jumpBufferTimer: number;
  jumpHeld: boolean;
  airJumpsLeft: number;
  groundPounding: boolean;
  landTimer: number;
  landingImpactVy: number;
  hp: number;
  maxHp: number;
  invulnTimer: number;
  scooterTimer: number; // Represents Blue Richard Mille Watch Overdrive timer
  scaleX: number;
  scaleY: number;
  walkDist: number;
  combo: number;
  maxCombo: number;
  score: number;
  chains: number;
  marcosStomped: number;
  animState: PlayerAnimState;
}

export interface EnemyState {
  id: number;
  archetype: MarcoArchetype;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  minX: number;
  maxX: number;
  facing: 1 | -1;
  state: 'patrol' | 'windup' | 'attack' | 'squished';
  stateTimer: number;
  attackCooldown: number;
  walkDist: number;
  hitFlashTimer: number;
  grounded?: boolean;
  landTimer?: number;
}

export interface BossState {
  active: boolean;
  defeated: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  groundY: number;
  minX: number;
  maxX: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  phase: 1 | 2 | 3;
  state:
    | 'patrol_shielded'
    | 'windup_leap'
    | 'leaping'
    | 'windup_charge'
    | 'charging'
    | 'vulnerable'
    | 'hurt'
    | 'defeated';
  stateTimer: number;
  hitFlashTimer: number;
  walkDist: number;
}

export interface CrateState {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  broken: boolean;
  loot: 'chain' | 'espresso' | 'multi_chain' | 'boss_anvil';
  hitBounceTimer: number;
  isMysteryBlock?: boolean;
}

export interface PickupState {
  id: number;
  type: 'chain' | 'espresso' | 'scooter' | 'cuvee'; // 'scooter' slot renders the Electric-Blue Richard Mille Watch
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  collected: boolean;
  bobOffset: number;
}

export interface ProjectileState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  active: boolean;
  rotation: number;
  kind?: 'invoice' | 'shockwave';
}

export const PHYSICS = {
  GRAVITY: 1450,
  FALL_GRAVITY_MULT: 1.35,
  MOVE_ACCEL: 2050,
  MOVE_FRICTION: 1700,
  MAX_RUN_SPEED: 222,
  SCOOTER_SPEED: 355, // Richard Mille Blue Watch Overdrive speed
  SWIM_SPEED: 215, // Mediterranean Freestyle Swim speed
  WATER_SURFACE_Y: 266, // Mediterranean Sea surface level in open harbor lagoons
  SWIM_JUMP_VELOCITY: -565, // Dolphin launch out of water onto Super-Yacht or dock
  JUMP_VELOCITY: -525,
  DOUBLE_JUMP_VELOCITY: -475,
  SPRING_BOUNCE_VELOCITY: -670,
  GROUND_POUND_VELOCITY: 660,
  JUMP_CUT_MULT: 0.45,
  STOMP_BOUNCE_VELOCITY: -495,
  HIGH_STOMP_BOUNCE_VELOCITY: -590,
  COYOTE_TIME: 0.12,
  JUMP_BUFFER_TIME: 0.14,
  GROUND_SNAP_EPSILON: 6, // Snaps actor bottom flush to floor tile within 6px
  LAND_ANIM_DURATION: 0.18, // Duration of 'land' animation state on platform impact
  MAX_DT: 0.05,
  HITSTOP_STOMP: 0.055,
  HITSTOP_CRATE: 0.035,
  HITSTOP_HURT: 0.065,
} as const;

export const COSTUME_OPTIONS: ReadonlyArray<{
  id: PaoCostume;
  label: string;
  shortLabel: string;
  badge: string;
}> = [
  {
    id: 'yacht_black_vip',
    label: 'Black VIP Tee + Blue Shades + Gold Medallion',
    shortLabel: 'BLACK VIP',
    badge: 'VIP',
  },
  {
    id: 'classic_white',
    label: 'Classic White Tee + Silver Cuban Chains',
    shortLabel: 'CLASSIC WHITE',
    badge: 'OG',
  },
  {
    id: 'monaco_gold',
    label: 'Monaco Gold Silk + Sapphire Shades',
    shortLabel: 'MONACO GOLD',
    badge: '24K',
  },
] as const;

export function cyclePaoCostume(current: PaoCostume): PaoCostume {
  if (current === 'yacht_black_vip') return 'classic_white';
  if (current === 'classic_white') return 'monaco_gold';
  return 'yacht_black_vip';
}

export const COMIC_CALLOUTS = [
  'OH LA BOUTEILLE DE VIN À 8 000 € !',
  "RENDS L'ARGENT MARCO !",
  '8 000 EUROS LE PÉTRUS ?!',
  'LA RICHARD MILLE BLEUE MON GARS !',
  'LA GUERRE DES BOUTEILLES !',
  '36 000 ? FAIS MONTER LE SCORE !',
  "TU PAIES L'ADDITION : 8 000 € !",
  'DERNIER MARCO AVANT MONACO !',
] as const;

export function formatEuros(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} €`;
}

export function clampDt(rawDt: number): number {
  if (!Number.isFinite(rawDt) || rawDt < 0) return 0;
  return Math.min(rawDt, PHYSICS.MAX_DT);
}

/**
 * Standard 2D Axis-Aligned Bounding Box (AABB) overlap check.
 */
export function aabbOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * Computes horizontal overlap width between two AABBs (with optional inset margin).
 */
export function aabbHorizontalOverlap(a: Rect, b: Rect, inset: number = 0): number {
  const left = Math.max(a.x + inset, b.x);
  const right = Math.min(a.x + a.w - inset, b.x + b.w);
  return Math.max(0, right - left);
}

export interface PlatformCollisionResult {
  grounded: boolean;
  justLanded: boolean;
  landedPlatform: Rect | null;
  landingImpactVy: number;
}

/**
 * Prevents MC Pao from clipping horizontally into the vertical side walls of solid stone piers.
 */
export function resolvePlayerHorizontalPlatformWall(
  player: Pick<PlayerState, 'x' | 'y' | 'w' | 'h' | 'vx'>,
  prevX: number,
  platforms: ReadonlyArray<Rect & { isYachtDeck?: boolean }>
): void {
  for (const plat of platforms) {
    // Only solid full-depth stone piers (h >= 60, not thin floating ledges or yacht decks) block horizontally
    if (plat.isYachtDeck || plat.h < 60) continue;
    if (player.y + player.h <= plat.y + 8 || player.y >= plat.y + plat.h) continue;
    if (player.x < plat.x + plat.w && player.x + player.w > plat.x) {
      if (prevX + player.w <= plat.x + 8 && player.vx >= 0) {
        player.x = plat.x - player.w;
        player.vx = 0;
      } else if (prevX >= plat.x + plat.w - 8 && player.vx <= 0) {
        player.x = plat.x + plat.w;
        player.vx = 0;
      } else {
        const distLeft = Math.abs(player.x + player.w - plat.x);
        const distRight = Math.abs(plat.x + plat.w - player.x);
        if (distLeft <= distRight) {
          player.x = plat.x - player.w;
        } else {
          player.x = plat.x + plat.w;
        }
        player.vx = 0;
      }
    }
  }
}

/**
 * Determines whether a horizontal X coordinate lies in an open-water Mediterranean sea gap
 * between solid stone piers (`plat.h >= 60 && !plat.isYachtDeck`), returning the exact
 * `[minX, maxX]` water bounds so MC Pao never swims under or inside solid stone floors!
 */
export function getOpenWaterZoneAt(
  centerX: number,
  platforms?: ReadonlyArray<Rect & { isYachtDeck?: boolean }>
): { minX: number; maxX: number } | null {
  if (!platforms || platforms.length === 0) {
    return { minX: 0, maxX: 9999 };
  }

  let leftEdge = 0;
  let rightEdge = 9999;

  for (const plat of platforms) {
    if (plat.isYachtDeck || plat.h < 60) continue;
    // If centerX is over a solid stone pier, it is NOT open water!
    if (centerX >= plat.x + 2 && centerX <= plat.x + plat.w - 2) {
      return null;
    }
    if (plat.x + plat.w <= centerX + 2) {
      leftEdge = Math.max(leftEdge, plat.x + plat.w);
    } else if (plat.x >= centerX - 2) {
      rightEdge = Math.min(rightEdge, plat.x);
    }
  }

  if (rightEdge - leftEdge < 28) {
    return null;
  }

  return { minX: leftEdge, maxX: rightEdge };
}

/**
 * Swept & Discrete AABB Floor/Platform Grounding System for MC Pao.
 * - Resolves top-surface swept AABB landings and continuous ground-snap locking
 *   so MC Pao's bottom edge (`player.y + player.h`) stays mathematically snapped
 *   to `platform.y` without sub-pixel floating or micro-bouncing.
 * - Triggers the `'land'` animation state (`player.landTimer > 0`, `player.animState = 'land'`)
 *   whenever MC Pao transitions from airborne (`!wasGrounded`) to a platform surface.
 */
export function resolvePlayerPlatformAABB(
  player: Pick<
    PlayerState,
    | 'x'
    | 'y'
    | 'w'
    | 'h'
    | 'vx'
    | 'vy'
    | 'grounded'
    | 'airJumpsLeft'
    | 'groundPounding'
    | 'landTimer'
    | 'landingImpactVy'
    | 'scaleX'
    | 'scaleY'
    | 'combo'
    | 'animState'
  > & { swimming?: boolean },
  prevBottom: number,
  wasGrounded: boolean,
  platforms: ReadonlyArray<Rect>
): PlatformCollisionResult {
  const impactVy = player.vy;
  const nextBottom = player.y + player.h;

  if (player.vy < 0) {
    player.grounded = false;
    return {
      grounded: false,
      justLanded: false,
      landedPlatform: null,
      landingImpactVy: 0,
    };
  }

  let bestPlat: Rect | null = null;
  let bestPlatY = Infinity;

  for (const plat of platforms) {
    // Require meaningful horizontal foot overlap (inset by 5px so edges feel fair)
    if (aabbHorizontalOverlap(player, plat, 5) <= 0) {
      continue;
    }

    const sweptCrossedTop = prevBottom <= plat.y + 16 && nextBottom >= plat.y;
    const withinGroundSnap =
      wasGrounded && Math.abs(nextBottom - plat.y) <= PHYSICS.GROUND_SNAP_EPSILON;

    if ((sweptCrossedTop || withinGroundSnap) && plat.y < bestPlatY) {
      bestPlat = plat;
      bestPlatY = plat.y;
    }
  }

  if (bestPlat) {
    // Mathematically snap player bottom flush to the platform top surface
    player.y = bestPlat.y - player.h;
    player.vy = 0;
    player.grounded = true;
    player.swimming = false;
    player.airJumpsLeft = 1;

    const justLanded = !wasGrounded && impactVy >= 40;
    if (justLanded) {
      const heavyImpact = player.groundPounding || impactVy > 380;
      player.landTimer = heavyImpact
        ? PHYSICS.LAND_ANIM_DURATION * 1.25
        : PHYSICS.LAND_ANIM_DURATION;
      player.landingImpactVy = impactVy;
      player.animState = 'land';
      player.scaleX = heavyImpact ? 1.36 : 1.24;
      player.scaleY = heavyImpact ? 0.68 : 0.78;
      player.combo = 0;
    }

    player.groundPounding = false;
    return {
      grounded: true,
      justLanded,
      landedPlatform: bestPlat,
      landingImpactVy: justLanded ? impactVy : 0,
    };
  }

  player.grounded = false;
  return {
    grounded: false,
    justLanded: false,
    landedPlatform: null,
    landingImpactVy: 0,
  };
}

/**
 * Mediterranean Sea Freestyle Swimming Physics for MC Pao (matching Screenshot 3!).
 * When MC Pao drops into an open-water sea lagoon between stone piers (`getOpenWaterZoneAt !== null`),
 * he enters `'swim'` state, floats buoyant on the surface, strokes horizontally within the lagoon bounds,
 * and can Dolphin-Jump (`Space`/`Up`) onto Super-Yachts or Docks without ever swimming under a stone floor!
 */
export function stepSwimmingPhysics(
  player: Pick<
    PlayerState,
    | 'x'
    | 'y'
    | 'w'
    | 'h'
    | 'vx'
    | 'vy'
    | 'grounded'
    | 'swimming'
    | 'airJumpsLeft'
    | 'groundPounding'
    | 'landTimer'
    | 'scaleX'
    | 'scaleY'
    | 'walkDist'
    | 'animState'
  >,
  jumpJustPressed: boolean,
  worldTime: number,
  dt: number,
  platforms?: ReadonlyArray<Rect & { isYachtDeck?: boolean }>
): { enteredWater: boolean; exitedWaterJump: boolean; exitedWaterWithJump: boolean } {
  const swimFloatY = PHYSICS.WATER_SURFACE_Y - player.h + 14;
  let enteredWater = false;
  let exitedWaterJump = false;

  const centerX = player.x + player.w * 0.5;
  const waterZone =
    getOpenWaterZoneAt(centerX, platforms) ??
    (player.swimming
      ? getOpenWaterZoneAt(player.x + player.w + 16, platforms) ??
        getOpenWaterZoneAt(player.x - 16, platforms)
      : null);

  if (!waterZone) {
    if (player.swimming) {
      player.swimming = false;
    }
    return { enteredWater: false, exitedWaterJump: false, exitedWaterWithJump: false };
  }

  if (!player.grounded && !player.swimming && player.vy >= 0 && player.y >= swimFloatY - 4) {
    player.swimming = true;
    player.y = swimFloatY;
    player.vy = 0;
    player.airJumpsLeft = 1;
    player.groundPounding = false;
    player.landTimer = 0;
    player.animState = 'swim';
    enteredWater = true;
  }

  if (player.swimming) {
    // Keep MC Pao strictly within the open-water lagoon between stone piers
    const minSwimX = waterZone.minX + 2;
    const maxSwimX = Math.max(minSwimX, waterZone.maxX - player.w - 2);
    if (player.x < minSwimX) {
      player.x = minSwimX;
      player.vx = 0;
    } else if (player.x > maxSwimX) {
      player.x = maxSwimX;
      player.vx = 0;
    }

    if (jumpJustPressed) {
      player.swimming = false;
      player.vy = PHYSICS.SWIM_JUMP_VELOCITY;
      player.airJumpsLeft = 1;
      player.scaleX = 0.84;
      player.scaleY = 1.22;
      player.animState = 'jump';
      exitedWaterJump = true;
    } else {
      // If MC Pao swims right up to a Super-Yacht bow deck, smoothly vault him onto the yacht deck
      // so he never swims across the white yacht hull!
      if (platforms) {
        for (const plat of platforms) {
          if (!plat.isYachtDeck) continue;
          if (
            player.vx >= -5 &&
            player.x + player.w >= plat.x + 14 &&
            player.x <= plat.x + plat.w - 14
          ) {
            player.swimming = false;
            player.x = Math.max(plat.x + 18, Math.min(player.x, plat.x + plat.w - player.w - 18));
            player.y = plat.y - player.h;
            player.vy = 0;
            player.grounded = true;
            player.airJumpsLeft = 1;
            player.landTimer = PHYSICS.LAND_ANIM_DURATION;
            player.animState = 'land';
            exitedWaterJump = true;
            return { enteredWater, exitedWaterJump, exitedWaterWithJump: true };
          }
        }
      }

      // Gentle Mediterranean wave buoyancy + freestyle stroke advance
      const waveBob = Math.sin(worldTime * 5.2 + player.x * 0.04) * 2.5;
      player.y = swimFloatY + waveBob;
      player.vy = 0;
      player.grounded = false;
      player.airJumpsLeft = 1;
      player.groundPounding = false;
      player.walkDist += (Math.abs(player.vx) + 65) * dt;
      player.animState = 'swim';
    }
  }

  return { enteredWater, exitedWaterJump, exitedWaterWithJump: exitedWaterJump };
}

/**
 * Synchronizes an enemy vertically with floor tiles and moving platforms using
 * AABB foot-overlap and swept gravity resolution, preventing any floating enemies
 * and triggering `enemy.landTimer` when an enemy lands from the air.
 */
export function stepEnemyPlatformGravity(
  enemy: EnemyState,
  platforms: ReadonlyArray<Rect>,
  dt: number
): boolean {
  if (enemy.landTimer && enemy.landTimer > 0) {
    enemy.landTimer = Math.max(0, enemy.landTimer - dt);
  }

  const prevBottom = enemy.y + enemy.h;
  const wasGrounded = enemy.grounded ?? false;

  // 1. Check if enemy is already standing on (or riding) a platform whose surface moved slightly
  if (Math.abs(enemy.vy) < 12) {
    for (const plat of platforms) {
      if (aabbHorizontalOverlap(enemy, plat, 4) > 0) {
        if (Math.abs(prevBottom - plat.y) <= 24) {
          enemy.y = plat.y - enemy.h;
          enemy.vy = 0;
          enemy.grounded = true;
          if (plat.w >= enemy.w + 8) {
            enemy.minX = Math.max(enemy.minX, plat.x + 2);
            enemy.maxX = Math.min(enemy.maxX, plat.x + plat.w - 2);
          }
          return true;
        }
      }
    }
  }

  // 2. Otherwise apply downward gravity until landing on a platform AABB below
  enemy.grounded = false;
  const preLandVy = enemy.vy;
  enemy.vy = Math.min(620, enemy.vy + PHYSICS.GRAVITY * dt);
  enemy.y += enemy.vy * dt;
  const nextBottom = enemy.y + enemy.h;

  for (const plat of platforms) {
    if (
      aabbHorizontalOverlap(enemy, plat, 4) > 0 &&
      prevBottom <= plat.y + 20 &&
      nextBottom >= plat.y
    ) {
      enemy.y = plat.y - enemy.h;
      enemy.vy = 0;
      enemy.grounded = true;
      if (!wasGrounded && preLandVy > 60) {
        enemy.landTimer = 0.16;
      }
      if (plat.w >= enemy.w + 8) {
        enemy.minX = Math.max(plat.x + 2, Math.min(enemy.minX, plat.x + plat.w - enemy.w - 2));
        enemy.maxX = Math.min(plat.x + plat.w - 2, Math.max(enemy.maxX, plat.x + enemy.w + 2));
      }
      return true;
    }
  }

  return false;
}

/**
 * Selects MC Pao's active animation state, prioritizing Golden Lambo getaway,
 * Mediterranean freestyle swimming (`'swim'`), VIP Camera Flex (`'vip_pose'`),
 * and `'land'` crouch on platform impact.
 */
export function selectPlayerAnimState(
  player: Pick<
    PlayerState,
    'scooterTimer' | 'invulnTimer' | 'grounded' | 'vy' | 'vx' | 'landTimer'
  > & { swimming?: boolean; inGoldenLambo?: boolean; vipPoseTimer?: number }
): PlayerAnimState {
  if (player.inGoldenLambo) {
    return 'lambo';
  }
  if (player.swimming) {
    return 'swim';
  }
  if (player.scooterTimer > 0) {
    return 'scooter';
  }
  if (player.invulnTimer > 1.1) {
    return 'hurt';
  }
  if (!player.grounded) {
    return player.vy > 40 ? 'stomp' : 'jump';
  }
  if (player.landTimer > 0 && (player.landTimer > 0.08 || Math.abs(player.vx) < 85)) {
    return 'land';
  }
  if ((player.vipPoseTimer ?? 0) > 0 && Math.abs(player.vx) < 45) {
    return 'vip_pose';
  }
  if (Math.abs(player.vx) > 15) {
    return 'run';
  }
  return 'idle';
}

/**
 * Calculates stomp score in Euros (€) with combo multiplier.
 * Base stomp is 500 €, multiplied by current combo (capped at 8x).
 */
export function calculateStompScore(nextCombo: number): {
  points: number;
  multiplier: number;
  callout: string;
} {
  const clampedCombo = Math.max(1, Math.min(8, Math.floor(nextCombo)));
  const points = 500 * clampedCombo;
  const callout = COMIC_CALLOUTS[(clampedCombo - 1) % COMIC_CALLOUTS.length];
  return { points, multiplier: clampedCombo, callout };
}

/**
 * Evaluates collision between MC Pao and a Mini Marco Mouly enemy.
 */
export function resolvePlayerEnemyInteraction(
  player: Pick<PlayerState, 'x' | 'y' | 'w' | 'h' | 'vy' | 'invulnTimer' | 'scooterTimer'>,
  enemy: Pick<EnemyState, 'x' | 'y' | 'w' | 'h' | 'state'>
): 'stomp' | 'scooter_plow' | 'hurt' | 'none' {
  if (enemy.state === 'squished') return 'none';

  const stompBox: Rect = {
    x: player.x + 2,
    y: player.y,
    w: player.w - 4,
    h: player.h + 4,
  };

  if (!aabbOverlap(stompBox, enemy)) {
    return 'none';
  }

  // Blue Richard Mille Watch overdrive plows straight through enemies!
  if (player.scooterTimer > 0) {
    return 'scooter_plow';
  }

  const playerBottom = player.y + player.h;
  const enemyCenterY = enemy.y + enemy.h * 0.65;

  if (player.vy >= -95 && playerBottom <= enemyCenterY + 14) {
    return 'stomp';
  }

  if (player.invulnTimer > 0) {
    return 'none';
  }

  const hurtBox: Rect = {
    x: player.x + 6,
    y: player.y + 6,
    w: player.w - 12,
    h: player.h - 10,
  };
  const enemyCore: Rect = {
    x: enemy.x + 4,
    y: enemy.y + 4,
    w: enemy.w - 8,
    h: enemy.h - 6,
  };

  return aabbOverlap(hurtBox, enemyCore) ? 'hurt' : 'none';
}

/**
 * Evaluates collision between MC Pao and Boss "Don Marco".
 */
export function resolvePlayerBossInteraction(
  player: Pick<PlayerState, 'x' | 'y' | 'w' | 'h' | 'vy' | 'invulnTimer' | 'scooterTimer'>,
  boss: Pick<BossState, 'x' | 'y' | 'w' | 'h' | 'state' | 'active' | 'defeated'>
): 'boss_stomp' | 'shield_bounce' | 'hurt' | 'none' {
  if (!boss.active || boss.defeated || boss.state === 'defeated' || boss.state === 'hurt') {
    return 'none';
  }

  if (!aabbOverlap(player, boss)) {
    return 'none';
  }

  const playerBottom = player.y + player.h;
  const bossStompZoneY = boss.y + boss.h * 0.55;

  if (player.scooterTimer > 0 && boss.state === 'vulnerable') {
    return 'boss_stomp';
  }

  if (player.vy >= -80 && playerBottom <= bossStompZoneY + 14) {
    if (boss.state === 'vulnerable') {
      return 'boss_stomp';
    }
    return 'shield_bounce';
  }

  if (player.invulnTimer > 0) {
    return 'none';
  }

  // Turbo protects Pao, but Don Marco's shield still needs to be opened.
  if (player.scooterTimer > 0) return 'none';

  return 'hurt';
}

/**
 * Updates Multi-Phase Boss "Don Marco" AI:
 * - Phase 1 (HP 5..6): Patrols with golden briefcase shield -> telegraphs high leap -> slams ground spawning 2 shockwaves -> becomes 'vulnerable' (dizzy)!
 * - Phase 2 (HP 3..4): Faster patrol -> telegraphs bull-charge -> charges across arena, crashes at boundary, and becomes 'vulnerable'!
 * - Phase 3 (HP 1..2): Rapid alternating leap-slams + fan of 3 spinning tax invoices + 'vulnerable' recovery window + drops anvil crate!
 */
export function stepBossAI(
  boss: BossState,
  player: Pick<PlayerState, 'x' | 'y' | 'w' | 'h'>,
  dt: number
): {
  spawnShockwaves: boolean;
  spawnInvoiceBurst: boolean;
  spawnAnvilCrate: boolean;
  telegraphStarted: boolean;
} {
  let spawnShockwaves = false;
  let spawnInvoiceBurst = false;
  let spawnAnvilCrate = false;
  let telegraphStarted = false;

  if (!boss.active || boss.defeated) {
    return { spawnShockwaves, spawnInvoiceBurst, spawnAnvilCrate, telegraphStarted };
  }

  boss.hitFlashTimer = Math.max(0, boss.hitFlashTimer - dt);

  if (boss.hp >= 5) boss.phase = 1;
  else if (boss.hp >= 3) boss.phase = 2;
  else boss.phase = 3;

  const playerCenterX = player.x + player.w * 0.5;
  const bossCenterX = boss.x + boss.w * 0.5;
  const dx = playerCenterX - bossCenterX;

  if (boss.state === 'hurt') {
    boss.stateTimer -= dt;
    if (boss.stateTimer <= 0) {
      boss.state = 'patrol_shielded';
      boss.stateTimer = boss.phase === 3 ? 1.1 : boss.phase === 2 ? 1.4 : 1.7;
      spawnInvoiceBurst = boss.phase >= 2;
    }
    return { spawnShockwaves, spawnInvoiceBurst, spawnAnvilCrate, telegraphStarted };
  }

  if (boss.state === 'vulnerable') {
    boss.vx = 0;
    boss.stateTimer -= dt;
    if (boss.stateTimer <= 0) {
      boss.state = 'patrol_shielded';
      boss.stateTimer = boss.phase === 3 ? 1.2 : 1.8;
    }
    return { spawnShockwaves, spawnInvoiceBurst, spawnAnvilCrate, telegraphStarted };
  }

  if (boss.state === 'patrol_shielded') {
    boss.facing = dx >= 0 ? 1 : -1;
    const speed = boss.phase === 3 ? 85 : boss.phase === 2 ? 68 : 52;
    boss.vx = boss.facing * speed;
    boss.x = Math.max(boss.minX, Math.min(boss.maxX - boss.w, boss.x + boss.vx * dt));
    boss.walkDist += Math.abs(boss.vx * dt);
    boss.stateTimer -= dt;

    if (boss.stateTimer <= 0) {
      telegraphStarted = true;
      if (boss.phase === 2 || (boss.phase === 3 && Math.random() < 0.5)) {
        boss.state = 'windup_charge';
        boss.stateTimer = 0.55;
      } else {
        boss.state = 'windup_leap';
        boss.stateTimer = 0.5;
      }
    }
  } else if (boss.state === 'windup_leap') {
    boss.vx = 0;
    boss.facing = dx >= 0 ? 1 : -1;
    boss.stateTimer -= dt;
    if (boss.stateTimer <= 0) {
      boss.state = 'leaping';
      boss.vy = -490;
      boss.vx = Math.max(-180, Math.min(180, dx * 1.1));
    }
  } else if (boss.state === 'leaping') {
    boss.x = Math.max(boss.minX, Math.min(boss.maxX - boss.w, boss.x + boss.vx * dt));
    boss.vy += PHYSICS.GRAVITY * dt;
    boss.y += boss.vy * dt;

    if (boss.y + boss.h >= boss.groundY) {
      boss.y = boss.groundY - boss.h;
      boss.vy = 0;
      boss.vx = 0;
      boss.state = 'vulnerable';
      boss.stateTimer = boss.phase === 3 ? 2.6 : 3.1;
      spawnShockwaves = true;
      if (boss.phase >= 2) {
        spawnAnvilCrate = true;
      }
    }
  } else if (boss.state === 'windup_charge') {
    boss.vx = 0;
    boss.facing = dx >= 0 ? 1 : -1;
    boss.stateTimer -= dt;
    if (boss.stateTimer <= 0) {
      boss.state = 'charging';
      boss.stateTimer = 1.25;
      if (boss.phase === 3) {
        spawnInvoiceBurst = true;
      }
    }
  } else if (boss.state === 'charging') {
    const chargeSpeed = boss.phase === 3 ? 265 : 230;
    boss.vx = boss.facing * chargeSpeed;
    boss.x += boss.vx * dt;
    boss.walkDist += Math.abs(boss.vx * dt);
    boss.stateTimer -= dt;

    if (boss.x <= boss.minX || boss.x + boss.w >= boss.maxX || boss.stateTimer <= 0) {
      boss.x = Math.max(boss.minX, Math.min(boss.maxX - boss.w, boss.x));
      boss.vx = 0;
      boss.state = 'vulnerable';
      boss.stateTimer = boss.phase === 3 ? 2.5 : 2.9;
      spawnAnvilCrate = true;
    }
  }

  return { spawnShockwaves, spawnInvoiceBurst, spawnAnvilCrate, telegraphStarted };
}

/**
 * Updates coyote time, jump buffering, variable jump velocity cut, and Air-Flex Double Jump.
 */
export function stepJumpMechanics(
  player: Pick<
    PlayerState,
    'vy' | 'grounded' | 'coyoteTimer' | 'jumpBufferTimer' | 'jumpHeld' | 'scaleX' | 'scaleY'
  > & { airJumpsLeft?: number; groundPounding?: boolean; landTimer?: number },
  jumpJustPressed: boolean,
  jumpHeld: boolean,
  dt: number
): { didJump: boolean; didDoubleJump?: boolean } {
  if (player.grounded) {
    player.coyoteTimer = PHYSICS.COYOTE_TIME;
    player.airJumpsLeft = 1;
    player.groundPounding = false;
  } else {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
  }

  if (jumpJustPressed) {
    player.jumpBufferTimer = PHYSICS.JUMP_BUFFER_TIME;
  } else {
    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
  }

  let didJump = false;
  let didDoubleJump = false;

  if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
    player.vy = PHYSICS.JUMP_VELOCITY;
    player.grounded = false;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;
    player.jumpHeld = true;
    player.groundPounding = false;
    player.landTimer = 0;
    player.scaleX = 0.82;
    player.scaleY = 1.2;
    didJump = true;
  } else if (
    jumpJustPressed &&
    !player.grounded &&
    player.coyoteTimer <= 0 &&
    (player.airJumpsLeft ?? 0) > 0
  ) {
    player.airJumpsLeft = (player.airJumpsLeft ?? 1) - 1;
    player.vy = PHYSICS.DOUBLE_JUMP_VELOCITY;
    player.jumpBufferTimer = 0;
    player.jumpHeld = true;
    player.groundPounding = false;
    player.landTimer = 0;
    player.scaleX = 1.24;
    player.scaleY = 0.8;
    didJump = true;
    didDoubleJump = true;
  }

  if (!jumpHeld && player.jumpHeld && player.vy < -120) {
    player.vy *= PHYSICS.JUMP_CUT_MULT;
    player.jumpHeld = false;
  }

  if (!jumpHeld) {
    player.jumpHeld = false;
  }

  return { didJump, didDoubleJump };
}

/**
 * Updates the 3 distinct Mini Marco Mouly AI movement and behavior policies.
 */
export function stepMarcoAI(
  enemy: EnemyState,
  player: Pick<PlayerState, 'x' | 'y' | 'w' | 'h'>,
  dt: number,
  canStartCrowdAttack: boolean
): { spawnProjectile: boolean; telegraphStarted: boolean } {
  let spawnProjectile = false;
  let telegraphStarted = false;

  if (enemy.state === 'squished') {
    enemy.stateTimer -= dt;
    enemy.vx = 0;
    return { spawnProjectile, telegraphStarted };
  }

  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
  enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);

  const playerCenterX = player.x + player.w * 0.5;
  const enemyCenterX = enemy.x + enemy.w * 0.5;
  const dx = playerCenterX - enemyCenterX;
  const absDx = Math.abs(dx);
  const dy = player.y + player.h * 0.5 - (enemy.y + enemy.h * 0.5);
  const absDy = Math.abs(dy);

  // An invalid/narrow authored patrol must never alternate its facing every frame.
  if (enemy.maxX - enemy.minX <= enemy.w + 2) {
    enemy.x = enemy.minX;
    enemy.vx = 0;
    return { spawnProjectile, telegraphStarted };
  }

  if (enemy.archetype === 'waddler') {
    const isPanicked = absDx < 145 && absDy < 120;
    const speed = isPanicked ? 96 : 52;
    enemy.vx = enemy.facing * speed;
    enemy.x += enemy.vx * dt;
    enemy.walkDist += Math.abs(enemy.vx * dt);

    if (enemy.x <= enemy.minX) {
      enemy.x = enemy.minX;
      enemy.facing = 1;
    } else if (enemy.x + enemy.w >= enemy.maxX) {
      enemy.x = enemy.maxX - enemy.w;
      enemy.facing = -1;
    }
  } else if (enemy.archetype === 'caller') {
    if (enemy.state === 'windup') {
      enemy.vx = 0;
      enemy.stateTimer -= dt;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'patrol';
        enemy.attackCooldown = 2.4;
        spawnProjectile = true;
      }
    } else {
      if (absDx < 260) {
        enemy.facing = dx >= 0 ? 1 : -1;
      }
      if (absDx < 110 && absDy < 90) {
        const retreatDir = dx >= 0 ? -1 : 1;
        enemy.vx = retreatDir * 68;
      } else {
        enemy.vx = enemy.facing * 38;
      }

      enemy.x += enemy.vx * dt;
      enemy.walkDist += Math.abs(enemy.vx * dt);

      if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.facing = 1;
      } else if (enemy.x + enemy.w >= enemy.maxX) {
        enemy.x = enemy.maxX - enemy.w;
        enemy.facing = -1;
      }

      if (
        canStartCrowdAttack &&
        enemy.attackCooldown <= 0 &&
        absDx > 65 &&
        absDx < 240 &&
        absDy < 110
      ) {
        enemy.state = 'windup';
        enemy.stateTimer = 0.45;
        enemy.facing = dx >= 0 ? 1 : -1;
        telegraphStarted = true;
      }
    }
  } else if (enemy.archetype === 'charger') {
    if (enemy.state === 'windup') {
      enemy.vx = 0;
      enemy.stateTimer -= dt;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'attack';
        enemy.stateTimer = 0.85;
      }
    } else if (enemy.state === 'attack') {
      enemy.vx = enemy.facing * 180;
      enemy.x += enemy.vx * dt;
      enemy.walkDist += Math.abs(enemy.vx * dt);
      enemy.stateTimer -= dt;

      if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.state = 'patrol';
        enemy.attackCooldown = 1.6;
        enemy.facing = 1;
      } else if (enemy.x + enemy.w >= enemy.maxX) {
        enemy.x = enemy.maxX - enemy.w;
        enemy.state = 'patrol';
        enemy.attackCooldown = 1.6;
        enemy.facing = -1;
      } else if (enemy.stateTimer <= 0) {
        enemy.state = 'patrol';
        enemy.attackCooldown = 1.6;
      }
    } else {
      enemy.vx = enemy.facing * 54;
      enemy.x += enemy.vx * dt;
      enemy.walkDist += Math.abs(enemy.vx * dt);

      if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.facing = 1;
      } else if (enemy.x + enemy.w >= enemy.maxX) {
        enemy.x = enemy.maxX - enemy.w;
        enemy.facing = -1;
      }

      if (
        canStartCrowdAttack &&
        enemy.attackCooldown <= 0 &&
        absDx < 190 &&
        absDy < 44
      ) {
        enemy.state = 'windup';
        enemy.stateTimer = 0.5;
        enemy.facing = dx >= 0 ? 1 : -1;
        telegraphStarted = true;
      }
    }
  }

  return { spawnProjectile, telegraphStarted };
}

export interface CustomLevelItem {
  kind:
    | 'platform'
    | 'crate_chain'
    | 'crate_espresso'
    | 'marco_waddler'
    | 'marco_caller'
    | 'marco_charger'
    | 'rm_watch'
    | 'vespa'
    | 'chain'
    | 'espresso'
    | 'spring_awning'
    | 'barrel_plant'
    | 'boss_don_marco';
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export interface CustomLevelPayload {
  version: 1;
  name: string;
  author: string;
  weather: WeatherMode;
  items: CustomLevelItem[];
}

export function encodeLevelShareCode(payload: CustomLevelPayload): string {
  const json = JSON.stringify(payload);
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return 'MCPAO1_' + window.btoa(encodeURIComponent(json));
  }
  return 'MCPAO1_' + Buffer.from(encodeURIComponent(json), 'utf-8').toString('base64');
}

export function decodeLevelShareCode(code: string): CustomLevelPayload | null {
  try {
    const trimmed = code.trim();
    const rawBase64 = trimmed.startsWith('MCPAO1_') ? trimmed.slice(7) : trimmed;
    const decodedUri =
      typeof window !== 'undefined' && typeof window.atob === 'function'
        ? window.atob(rawBase64)
        : Buffer.from(rawBase64, 'base64').toString('utf-8');
    const json = decodeURIComponent(decodedUri);
    const parsed = JSON.parse(json) as CustomLevelPayload;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ============================================================================
// WORLDWIDE LEADERBOARD PURE LOGIC & VALIDATION
// ============================================================================

export type LeaderboardMode = 'story' | 'boss' | 'custom';
export type LeaderboardCountryCode =
  | 'FR'
  | 'MC'
  | 'IT'
  | 'CH'
  | 'BE'
  | 'ES'
  | 'US'
  | 'GB'
  | 'MA'
  | 'DZ'
  | 'TN'
  | 'INT';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  country: LeaderboardCountryCode;
  score: number; // In Euros (€)
  chains: number;
  marcosStomped: number;
  maxCombo: number;
  mode: LeaderboardMode;
  victory: boolean;
  verifiedCode: string;
  createdAt: string;
}

export interface LeaderboardSubmissionInput {
  playerName: string;
  country?: string;
  score: number;
  chains: number;
  marcosStomped: number;
  maxCombo: number;
  mode?: LeaderboardMode;
  victory?: boolean;
}

const VALID_COUNTRIES: ReadonlySet<LeaderboardCountryCode> = new Set([
  'FR',
  'MC',
  'IT',
  'CH',
  'BE',
  'ES',
  'US',
  'GB',
  'MA',
  'DZ',
  'TN',
  'INT',
]);

export function sanitizePlayerName(raw: string): string {
  const cleaned = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 _\-€]/g, '')
    .trim()
    .slice(0, 16);
  return cleaned.length >= 2 ? cleaned : 'MC PAO 92';
}

export function generateVerifiedScoreCode(
  playerName: string,
  score: number,
  marcosStomped: number,
  maxCombo: number
): string {
  const clean = sanitizePlayerName(playerName).replace(/\s+/g, '');
  const prefix = clean.slice(0, 3).padEnd(3, 'X');
  const checksum = ((Math.round(score) * 31 + marcosStomped * 17 + maxCombo * 13) % 997)
    .toString(16)
    .toUpperCase()
    .padStart(3, '0');
  return `RM-${prefix}-${Math.round(score)}E-${checksum}`;
}

export function validateAndNormalizeScoreSubmission(
  input: LeaderboardSubmissionInput
): LeaderboardEntry | null {
  if (!input || !Number.isFinite(input.score) || input.score < 0 || input.score > 999999) {
    return null;
  }
  const playerName = sanitizePlayerName(input.playerName);
  const rawCountry = String(input.country || 'FR').toUpperCase() as LeaderboardCountryCode;
  const country: LeaderboardCountryCode = VALID_COUNTRIES.has(rawCountry)
    ? rawCountry
    : 'FR';
  const score = Math.round(Math.max(0, Math.min(999999, input.score)));
  const chains = Math.round(Math.max(0, Math.min(999, Number(input.chains) || 0)));
  const marcosStomped = Math.round(
    Math.max(0, Math.min(999, Number(input.marcosStomped) || 0))
  );
  const maxCombo = Math.round(
    Math.max(1, Math.min(99, Number(input.maxCombo) || 1))
  );
  const mode: LeaderboardMode =
    input.mode === 'boss' || input.mode === 'custom' ? input.mode : 'story';
  const victory = input.victory === true;
  const verifiedCode = generateVerifiedScoreCode(
    playerName,
    score,
    marcosStomped,
    maxCombo
  );

  return {
    id: `${playerName.replace(/\s+/g, '_')}_${mode}_${Date.now()}`,
    playerName,
    country,
    score,
    chains,
    marcosStomped,
    maxCombo,
    mode,
    victory,
    verifiedCode,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Sorts and merges leaderboard entries descending by Euro score, keeping the highest
 * score per (playerName + mode) pair so a player updating their personal best moves up cleanly.
 */
export function sortAndRankLeaderboard(
  entries: ReadonlyArray<LeaderboardEntry>,
  limit: number = 50
): LeaderboardEntry[] {
  const bestByPlayerAndMode = new Map<string, LeaderboardEntry>();

  for (const entry of entries) {
    if (!entry || !Number.isFinite(entry.score) || typeof entry.playerName !== 'string' || typeof entry.id !== 'string' || !['story','boss','custom'].includes(entry.mode)) continue;
    const key = `${entry.playerName.toUpperCase()}__${entry.mode}`;
    const existing = bestByPlayerAndMode.get(key);
    if (
      !existing ||
      entry.score > existing.score ||
      (entry.score === existing.score && entry.marcosStomped > existing.marcosStomped)
    ) {
      bestByPlayerAndMode.set(key, entry);
    }
  }

  return Array.from(bestByPlayerAndMode.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.marcosStomped !== a.marcosStomped) return b.marcosStomped - a.marcosStomped;
      return b.maxCombo - a.maxCombo;
    })
    .slice(0, limit);
}

/**
 * Computes the 1-based worldwide rank (#1, #2, ...) for a given Euro score.
 */
export function computeProjectedWorldwideRank(
  score: number,
  entries: ReadonlyArray<LeaderboardEntry>
): number {
  let rank = 1;
  for (const e of entries) {
    if (e.score > score) {
      rank++;
    }
  }
  return rank;
}
