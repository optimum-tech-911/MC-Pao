import type { CharacterId } from './characters';
import { buildMediterraneanLevel, STORY_LEAD_IN, type LevelData, type Platform } from './level';

export interface RouteLandmark {
  x: number;
  y: number;
  label: string;
  kind: 'cellar' | 'tasting' | 'terrace';
}

/** Coordinates use the same shifted world space as the authored story level. */
export const MARCO_ROUTE_LANDMARKS: readonly RouteLandmark[] = [
  { x: 568, y: 252, label: 'TERRASSE GRAND CRU', kind: 'terrace' },
  { x: 1408, y: 250, label: 'CAVES DE LA RIVIERA', kind: 'cellar' },
  { x: 2624, y: 230, label: 'DÉGUSTATION PRIVÉE', kind: 'tasting' },
];

const ROUTES = {
  pao: {
    id: 'riviera', name: 'La Riviera',
    tagline: 'Stomp, turbo, yacht et départ en Lambo.',
    zones: ['Terrasse de la Riviera', 'Le port', 'La grande promenade', 'Duel VIP · Don Marco'],
    landmarks: [] as readonly RouteLandmark[],
  },
  marco: {
    id: 'grand_cru', name: 'La tournée Grand Cru',
    tagline: 'Terrasses, caves et dégustation privée avant le duel VIP.',
    zones: ['Terrasse Grand Cru', 'Les caves de la Riviera', 'Dégustation privée', 'Duel VIP · MC Pao'],
    landmarks: MARCO_ROUTE_LANDMARKS,
  },
} as const;

export function getStoryRoute(character: CharacterId) { return ROUTES[character]; }

/**
 * Marco's route preserves the main coast, swim channels and finale. Three
 * alternate upper routes change the journey without changing character physics,
 * enemy inventory or reward potential. Every call returns fresh simulation data.
 */
export function buildStoryLevel(character: CharacterId): LevelData {
  const level = buildMediterraneanLevel();
  if (character === 'pao') return level;

  const at = (authoredX: number) => authoredX + STORY_LEAD_IN;
  const platformAt = (authoredX: number) => level.platforms.find(p => p.x === at(authoredX))!;
  const pickupAt = (authoredX: number) => level.pickups.find(p => p.x === at(authoredX))!;
  const crateAt = (authoredX: number) => level.crates.find(c => c.x === at(authoredX))!;
  const enemy = (id: number) => level.enemies.find(e => e.id === id)!;
  const ledge = (x: number, y: number, w: number, h = 18): Platform => ({ x, y, w, h, hasIvy: true });

  // 1. Grand Cru terrace: two reachable balcony steps, with the awning on the
  // optional first step. The promenade underneath stays open (68px clearance).
  level.platforms.push(ledge(580, 168, 72, 16));
  Object.assign(platformAt(420), { x: 660, y: 144, w: 128, h: 20 });
  Object.assign(level.springs[0], { x: 600, y: 146 });
  Object.assign(pickupAt(280), { x: 594, y: 126 });
  crateAt(452).y = 82;
  crateAt(484).y = 82;
  Object.assign(enemy(3), { x: 730, y: 100, minX: 668, maxX: 782 });

  // 2. Wine-cellar courtyard: a low balcony leads to the upper gallery and a
  // shorter tasting lift. All remain optional; the original ground is intact.
  level.platforms.push(ledge(1324, 170, 80, 18));
  Object.assign(platformAt(1090), { x: 1436, y: 142, w: 128, h: 24 });
  Object.assign(platformAt(1265), {
    x: 1568, y: 126, baseX: 1568, baseY: 126,
    w: 96, h: 24, moveAmp: 18, moveSpeed: 1.6,
  });
  Object.assign(level.springs[1], { x: 1340, y: 148 });
  Object.assign(enemy(6), { x: 1482, y: 98, minX: 1444, maxX: 1558 });
  Object.assign(enemy(7), { x: 1590, y: 82, minX: 1572, maxX: 1660 });
  Object.assign(pickupAt(1140), { x: 1496, y: 104 });
  Object.assign(pickupAt(1290), { x: 1520, y: 94 });
  Object.assign(pickupAt(1325), { x: 1580, y: 82 });
  Object.assign(pickupAt(1372), { x: 1620, y: 36 });
  Object.assign(pickupAt(1360), { x: 1642, y: 84 });

  // 3. Private yacht tasting: a raised stern gives a different on-deck landing
  // and reward arc, while retaining the entire original safe yacht floor.
  level.platforms.push({ ...ledge(2654, 194, 88, 12), hasIvy: false, isYachtDeck: true });
  Object.assign(pickupAt(2265), { x: 2572, y: 188 });
  Object.assign(pickupAt(2385), { x: 2704, y: 152 });
  Object.assign(crateAt(2290), { x: 2664, y: 92 });
  level.yachts[0].name = 'CUVÉE RIVIERA';
  level.yachts[1].name = 'GRAND CRU PRIVÉ';

  return level;
}
