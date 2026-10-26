import type {
  BossState,
  CrateState,
  CustomLevelItem,
  CustomLevelPayload,
  EnemyState,
  MarcoArchetype,
  PaoCostume,
  PickupState,
  PlayerState,
  ProjectileState,
  Rect,
  SpringPad,
  WeatherMode,
  YachtState,
} from './rules';

export interface Platform extends Rect {
  hasIvy: boolean;
  isYachtDeck?: boolean;
  hasRailing?: boolean;
  railingStartX?: number;
  railingEndX?: number;
  hasVillaLeft?: boolean;
  moveAxis?: 'x' | 'y';
  moveAmp?: number;
  moveSpeed?: number;
  baseX?: number;
  baseY?: number;
}

export interface DecoProp {
  type: 'barrel_plant' | 'rm_watch_pedestal' | 'goal_arch' | 'golden_lambo';
  x: number;
  y: number;
}

export interface LevelData {
  width: number;
  height: number;
  goalX: number;
  platforms: Platform[];
  yachts: YachtState[];
  springs: SpringPad[];
  crates: CrateState[];
  enemies: EnemyState[];
  boss: BossState;
  pickups: PickupState[];
  projectiles: ProjectileState[];
  decos: DecoProp[];
}

export function createInitialPlayer(
  spawnX: number = 84,
  spawnY: number = 184,
  costume: PaoCostume = 'yacht_black_vip'
): PlayerState {
  return {
    x: spawnX,
    y: spawnY,
    vx: 0,
    vy: 0,
    w: 42,
    h: 62,
    facing: 1,
    grounded: true,
    swimming: false,
    inGoldenLambo: false,
    vipPoseTimer: 0,
    costume,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    jumpHeld: false,
    airJumpsLeft: 1,
    groundPounding: false,
    landTimer: 0,
    landingImpactVy: 0,
    hp: 3,
    maxHp: 3,
    invulnTimer: 0,
    scooterTimer: 0,
    scaleX: 1,
    scaleY: 1,
    walkDist: 0,
    combo: 0,
    maxCombo: 0,
    score: 0,
    chains: 0,
    marcosStomped: 0,
    animState: 'idle',
  };
}

export function createInitialBoss(
  x: number = 3060,
  groundY: number = 246,
  minX: number = 2826,
  maxX: number = 3270
): BossState {
  return {
    active: true,
    defeated: false,
    x,
    y: groundY - 72,
    vx: 0,
    vy: 0,
    w: 60,
    h: 72,
    groundY,
    minX,
    maxX,
    facing: -1,
    hp: 6,
    maxHp: 6,
    phase: 1,
    state: 'patrol_shielded',
    stateTimer: 1.6,
    hitFlashTimer: 0,
    walkDist: 0,
  };
}

export const STORY_LEAD_IN = 256;

export function buildMediterraneanLevel(): LevelData {
  // Two Complete, Full-Length (340px wide) Gleaming White Mediterranean Super-Yachts with Glamorous VIP Women on Deck!
  const yachts: YachtState[] = [
    {
      id: 1,
      name: 'LADY RIVIERA',
      x: 696,
      y: 125,
      w: 340,
      h: 192,
      deckY: 230,
      visited: false,
      cheerTimer: 0,
    },
    {
      id: 2,
      name: 'MONACO QUEEN',
      x: 2176,
      y: 125,
      w: 340,
      h: 192,
      deckY: 230,
      visited: false,
      cheerTimer: 0,
    },
  ];

  const platforms: Platform[] = [
    // 1. Iconic Starting Terrace (matches left & center of reference screenshot!)
    {
      x: 0,
      y: 246,
      w: 268,
      h: 120,
      hasIvy: true,
      hasVillaLeft: true,
      hasRailing: true,
      railingStartX: 118,
      railingEndX: 172,
    },
    // 2. Stepped Crate Terrace (above water level y=252 so MC Pao never swims in the stone floor!)
    {
      x: 268,
      y: 252,
      w: 272,
      h: 120,
      hasIvy: true,
      hasRailing: true,
      railingStartX: 420,
      railingEndX: 520,
    },
    // 3. Elevated Stone Balcony over Piazza
    {
      x: 420,
      y: 172,
      w: 128,
      h: 28,
      hasIvy: true,
    },
    // 3B. Playable Full Deck of Super-Yacht #1 "LADY RIVIERA" (after open-water swim channel x=540..696!)
    {
      x: 716,
      y: 230,
      w: 300,
      h: 16,
      hasIvy: false,
      isYachtDeck: true,
    },
    // 4. Harbor Promenade Deck (starts at x=1052 after the full Super-Yacht stern!)
    {
      x: 1052,
      y: 250,
      w: 360,
      h: 120,
      hasIvy: true,
      hasRailing: true,
      railingStartX: 1080,
      railingEndX: 1190,
    },
    // 5. High Café Pergola Ledge
    {
      x: 1090,
      y: 168,
      w: 160,
      h: 28,
      hasIvy: true,
    },
    // 7. Moving Harbor Gondola Stone Ledge (glides smoothly up & down!)
    {
      x: 1265,
      y: 152,
      baseX: 1265,
      baseY: 152,
      w: 140,
      h: 28,
      hasIvy: true,
      moveAxis: 'y',
      moveAmp: 24,
      moveSpeed: 2.0,
    },
    // 8. Riviera Richard Mille Overdrive Promenade
    {
      x: 1412,
      y: 252,
      w: 636,
      h: 120,
      hasIvy: true,
      hasRailing: true,
      railingStartX: 1440,
      railingEndX: 1720,
    },
    // 9A. Playable Full Deck of Super-Yacht #2 "MONACO QUEEN" (after open-water swim channel x=2048..2176!)
    {
      x: 2196,
      y: 230,
      w: 300,
      h: 16,
      hasIvy: false,
      isYachtDeck: true,
    },
    // 9B. Coastal Viaduct Terrace
    {
      x: 2536,
      y: 212,
      baseX: 2536,
      baseY: 212,
      w: 280,
      h: 160,
      hasIvy: true,
    },
    // 10. Grand Campanile Boss Arena & Golden Lamborghini VIP Pier
    {
      x: 2816,
      y: 246,
      w: 844,
      h: 120,
      hasIvy: true,
      hasRailing: true,
      railingStartX: 2850,
      railingEndX: 3180,
    },
    // Keep the boss's attack lane open; suspended anvil crates provide counterplay.
  ];

  // Bouncy Riviera Café Awnings (SpringPads that launch MC Pao high into the air!)
  const springs: SpringPad[] = [
    { x: 396, y: 230, w: 48, h: 22, bounceTimer: 0 },
    { x: 1066, y: 228, w: 48, h: 22, bounceTimer: 0 },
    { x: 2546, y: 190, w: 48, h: 22, bounceTimer: 0 },
    { x: 2834, y: 224, w: 48, h: 22, bounceTimer: 0 },
    { x: 3175, y: 224, w: 48, h: 22, bounceTimer: 0 },
  ];

  let crateId = 1;
  const addCrate = (
    x: number,
    y: number,
    loot: CrateState['loot'] = 'chain',
    isMysteryBlock: boolean = false
  ): CrateState => ({
    id: crateId++,
    x,
    y,
    w: 32,
    h: 32,
    broken: false,
    loot,
    hitBounceTimer: 0,
    isMysteryBlock,
  });

  const crates: CrateState[] = [
    // Exact L-shaped crate stack + Golden '?' Mystery Block on Platform 2 (flush at y=252)
    addCrate(220, 126, 'multi_chain', true),

    // Zone 1 elevated Golden '?' Mystery Blocks (matching Screenshot 1!)
    addCrate(452, 110, 'multi_chain', true),
    addCrate(484, 110, 'espresso', true),

    // Golden '?' Mystery Block suspended above Super-Yacht #1 "LADY RIVIERA" (matching Screenshot 2!)
    addCrate(786, 96, 'multi_chain', true),

    // Zone 2 harbor crates (flush at y=250)
    addCrate(1130, 218, 'multi_chain', false),
    addCrate(1162, 218, 'espresso', true),

    // Richard Mille Overdrive smashable crate pyramid (flush at y=252)
    addCrate(1780, 220, 'chain', false),
    addCrate(1812, 220, 'multi_chain', true),
    addCrate(1844, 220, 'chain', false),
    addCrate(1796, 188, 'espresso', true),
    addCrate(1828, 188, 'chain', false),

    // Golden '?' Mystery Block above Super-Yacht #2 "MONACO QUEEN"
    addCrate(2290, 96, 'multi_chain', true),

    // Boss Arena Explosive Anvil Crates (smashing these stuns & damages Boss Don Marco!)
    addCrate(2922, 122, 'boss_anvil', false),
    addCrate(3142, 122, 'boss_anvil', false),
    addCrate(3040, 214, 'espresso', false),
  ];

  let enemyId = 1;
  const addMarco = (
    archetype: MarcoArchetype,
    x: number,
    groundY: number,
    minX: number,
    maxX: number,
    facing: 1 | -1 = -1
  ): EnemyState => ({
    id: enemyId++,
    archetype,
    x,
    y: groundY - 44,
    vx: 0,
    vy: 0,
    w: 38,
    h: 44,
    minX,
    maxX,
    facing,
    state: 'patrol',
    stateTimer: 0,
    attackCooldown: 1.6,
    walkDist: 0,
    hitFlashTimer: 0,
  });

  const enemies: EnemyState[] = [
    // 1. Iconic Screenshot Mini Marco Mouly on the edge of the first stone ledge!
    addMarco('waddler', 238, 246, 180, 276, -1),

    // 2. Stepped right terrace Marcos
    addMarco('waddler', 420, 252, 374, 464, -1),
    addMarco('waddler', 494, 252, 478, 540, -1),

    // 3. Harbor Promenade (All 3 archetypes!)
    addMarco('waddler', 1120, 250, 1060, 1240, 1),
    addMarco('charger', 1260, 250, 1120, 1390, -1),
    addMarco('caller', 1140, 168, 1096, 1236, -1),

    // 4. Moving Gondola Ledge
    addMarco('caller', 1300, 152, 1270, 1395, -1),

    // 5. Riviera Overdrive Promenade
    addMarco('waddler', 1580, 252, 1520, 1740, -1),
    addMarco('waddler', 1650, 252, 1540, 1760, -1),
    addMarco('charger', 1720, 252, 1580, 1770, -1),
    addMarco('caller', 1910, 252, 1870, 2030, -1),
    addMarco('charger', 1970, 252, 1880, 2038, -1),

    // 6. Viaduct
    addMarco('caller', 2660, 212, 2545, 2795, -1),
  ];

  let pickupId = 1;
  const addPickup = (
    type: PickupState['type'],
    x: number,
    y: number
  ): PickupState => ({
    id: pickupId++,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    w: type === 'scooter' ? 38 : 20,
    h: type === 'scooter' ? 50 : type === 'cuvee' ? 36 : 20,
    collected: false,
    bobOffset: (pickupId * 0.7) % (Math.PI * 2),
  });

  const pickups: PickupState[] = [
    addPickup('chain', 236, 156),
    addPickup('chain', 258, 140),
    addPickup('chain', 280, 156),
    // Iconic Electric-Blue Richard Mille Watch Power-Up on the first stepped terrace!
    addPickup('scooter', 362, 198),

    // Floating Mediterranean Sea Euro Pickups for Freestyle Swimming & Yacht Deck (matching Screenshots 2 & 3!)
    addPickup('chain', 568, 224),
    addPickup('chain', 612, 186),
    addPickup('chain', 656, 208),
    addPickup('chain', 770, 192),
    addPickup('chain', 900, 192),
    addPickup('chain', 980, 192),

    addPickup('espresso', 1140, 134),
    addPickup('chain', 1290, 108),
    addPickup('chain', 1325, 108),
    // Optional high-route prize, inspired by the public bottle-war clips. Fictional game points.
    addPickup('cuvee', 1372, 60),
    addPickup('espresso', 1360, 108),

    // Second Electric-Blue Richard Mille Watch Power-Up before the Overdrive Promenade!
    addPickup('scooter', 1448, 198),

    addPickup('chain', 1550, 214),
    addPickup('chain', 1590, 214),
    addPickup('chain', 1630, 214),
    addPickup('chain', 1670, 214),
    addPickup('chain', 1900, 214),
    addPickup('chain', 1940, 214),

    // Second Marina Swim Lagoon & Yacht #2 Pickups
    addPickup('chain', 2088, 224),
    addPickup('chain', 2132, 200),
    addPickup('chain', 2265, 192),
    addPickup('chain', 2385, 192),
    addPickup('espresso', 2895, 210),
  ];

  const decos: DecoProp[] = [
    { type: 'barrel_plant', x: 48, y: 186 },
    { type: 'barrel_plant', x: 1056, y: 190 },
    { type: 'barrel_plant', x: 1424, y: 192 },
    { type: 'barrel_plant', x: 2820, y: 186 },
    { type: 'goal_arch', x: 3440, y: 126 },
    // 24K Golden Lamborghini Aventador SVJ waiting at the VIP Finale Pier!
    { type: 'golden_lambo', x: 3250, y: 194 },
  ];

  for (const platform of platforms) {
    if (platform.x === 0) platform.w += STORY_LEAD_IN;
    else platform.x += STORY_LEAD_IN;
    if (platform.baseX !== undefined) platform.baseX += STORY_LEAD_IN;
    if (platform.railingStartX !== undefined) platform.railingStartX += STORY_LEAD_IN;
    if (platform.railingEndX !== undefined) platform.railingEndX += STORY_LEAD_IN;
  }
  for (const item of [...yachts, ...springs, ...crates, ...pickups, ...decos]) item.x += STORY_LEAD_IN;
  for (const enemy of enemies) { enemy.x += STORY_LEAD_IN; enemy.minX += STORY_LEAD_IN; enemy.maxX += STORY_LEAD_IN; }
  const boss = createInitialBoss(3040 + STORY_LEAD_IN, 246, 2850 + STORY_LEAD_IN, 3210 + STORY_LEAD_IN);

  return {
    width: 3660 + STORY_LEAD_IN,
    height: 320,
    goalX: 3285 + STORY_LEAD_IN,
    platforms,
    yachts,
    springs,
    crates,
    enemies,
    boss,
    pickups,
    projectiles: [],
    decos,
  };
}

/**
 * Builds a playable LevelData from a user-authored CustomLevelPayload (from the Level Editor).
 */
export function buildLevelFromCustomPayload(payload: CustomLevelPayload): LevelData {
  const basePlatforms: Platform[] = [
    {
      x: 0,
      y: 246,
      w: 256,
      h: 120,
      hasIvy: true,
      hasVillaLeft: true,
      hasRailing: true,
      railingStartX: 118,
      railingEndX: 172,
    },
  ];

  const yachts: YachtState[] = [];
  const springs: SpringPad[] = [];
  const crates: CrateState[] = [];
  const enemies: EnemyState[] = [];
  const pickups: PickupState[] = [];
  const decos: DecoProp[] = [
    { type: 'rm_watch_pedestal', x: 8, y: 204 },
    { type: 'barrel_plant', x: 48, y: 186 },
  ];

  let boss: BossState = {
    ...createInitialBoss(950, 246, 750, 1180),
    active: false,
    defeated: true,
  };

  let maxCoordX = 960;
  let idCounter = 100;

  for (const item of payload.items) {
    maxCoordX = Math.max(maxCoordX, item.x + (item.w || 160));
    if (item.kind === 'platform') {
      basePlatforms.push({
        x: item.x,
        y: item.y,
        w: item.w || 128,
        h: item.h || 96,
        hasIvy: true,
      });
    } else if (item.kind === 'spring_awning') {
      springs.push({
        x: item.x,
        y: item.y,
        w: 48,
        h: 22,
        bounceTimer: 0,
      });
    } else if (item.kind === 'crate_chain' || item.kind === 'crate_espresso') {
      crates.push({
        id: idCounter++,
        x: item.x,
        y: item.y,
        w: 32,
        h: 32,
        broken: false,
        loot: item.kind === 'crate_espresso' ? 'espresso' : 'chain',
        hitBounceTimer: 0,
      });
    } else if (
      item.kind === 'marco_waddler' ||
      item.kind === 'marco_caller' ||
      item.kind === 'marco_charger'
    ) {
      const arch: MarcoArchetype =
        item.kind === 'marco_caller'
          ? 'caller'
          : item.kind === 'marco_charger'
          ? 'charger'
          : 'waddler';
      enemies.push({
        id: idCounter++,
        archetype: arch,
        x: item.x,
        y: item.y,
        vx: 0,
        vy: 0,
        w: 38,
        h: 44,
        minX: Math.max(0, item.x - 110),
        maxX: item.x + 140,
        facing: -1,
        state: 'patrol',
        stateTimer: 0,
        attackCooldown: 0.5,
        walkDist: 0,
        hitFlashTimer: 0,
      });
    } else if (
      item.kind === 'rm_watch' ||
      item.kind === 'vespa' ||
      item.kind === 'chain' ||
      item.kind === 'espresso'
    ) {
      const pType =
        item.kind === 'rm_watch' || item.kind === 'vespa' ? 'scooter' : item.kind;
      pickups.push({
        id: idCounter++,
        type: pType,
        x: item.x,
        y: item.y,
        vx: 0,
        vy: 0,
        w: pType === 'scooter' ? 38 : 20,
        h: pType === 'scooter' ? 50 : 20,
        collected: false,
        bobOffset: (idCounter * 0.5) % 6,
      });
    } else if (item.kind === 'barrel_plant') {
      decos.push({
        type: 'barrel_plant',
        x: item.x,
        y: item.y,
      });
    } else if (item.kind === 'boss_don_marco') {
      const bossGroundY = item.y + 72;
      basePlatforms.push({
        x: Math.max(256, item.x - 180),
        y: bossGroundY,
        w: 420,
        h: 120,
        hasIvy: true,
      });
      crates.push({
        id: idCounter++,
        x: item.x - 90,
        y: bossGroundY - 32,
        w: 32,
        h: 32,
        broken: false,
        loot: 'boss_anvil',
        hitBounceTimer: 0,
      });
      boss = createInitialBoss(
        item.x,
        bossGroundY,
        Math.max(260, item.x - 170),
        item.x + 230
      );
      maxCoordX = Math.max(maxCoordX, item.x + 320);
    }
  }

  const goalX = maxCoordX + 120;
  basePlatforms.push({
    x: maxCoordX - 40,
    y: 246,
    w: 280,
    h: 120,
    hasIvy: true,
  });
  decos.push({ type: 'goal_arch', x: goalX + 10, y: 126 });
  decos.push({ type: 'golden_lambo', x: goalX - 36, y: 193 });

  return {
    width: goalX + 180,
    height: 320,
    goalX,
    platforms: basePlatforms,
    yachts,
    springs,
    crates,
    enemies,
    boss,
    pickups,
    projectiles: [],
    decos,
  };
}

export function createStarterCustomLevel(weather: WeatherMode = 'heat_haze'): CustomLevelPayload {
  const items: CustomLevelItem[] = [
    { kind: 'platform', x: 272, y: 256, w: 256, h: 100 },
    { kind: 'crate_chain', x: 296, y: 224 },
    { kind: 'crate_espresso', x: 328, y: 224 },
    { kind: 'marco_waddler', x: 188, y: 202 },
    { kind: 'rm_watch', x: 372, y: 214 },
    { kind: 'spring_awning', x: 468, y: 234 },
    { kind: 'platform', x: 560, y: 216, w: 224, h: 120 },
    { kind: 'chain', x: 600, y: 170 },
    { kind: 'chain', x: 635, y: 155 },
    { kind: 'chain', x: 670, y: 170 },
    { kind: 'marco_charger', x: 660, y: 172 },
    { kind: 'boss_don_marco', x: 960, y: 174 },
  ];
  return {
    version: 1,
    name: 'My Riviera Custom Stage',
    author: 'MC Pao',
    weather,
    items,
  };
}
