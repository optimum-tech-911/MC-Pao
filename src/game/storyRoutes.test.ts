import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMediterraneanLevel, createInitialPlayer, type Platform } from './level';
import { PHYSICS, getOpenWaterZoneAt, resolvePlayerPlatformAABB, stepJumpMechanics } from './rules';
import { buildStoryLevel, getStoryRoute, MARCO_ROUTE_LANDMARKS } from './storyRoutes';

const inventory = <T extends string>(values: readonly T[]) => [...values].sort();

test('Pao retains the exact original story and each build has independent state', () => {
  assert.deepEqual(buildStoryLevel('pao'), buildMediterraneanLevel());
  const first = buildStoryLevel('marco');
  first.boss.hp = 0;
  first.pickups[0].collected = true;
  first.platforms[0].x = 100;
  const next = buildStoryLevel('marco');
  assert.equal(next.boss.hp, 6);
  assert.equal(next.pickups[0].collected, false);
  assert.equal(next.platforms[0].x, 0);
});

test('Marco has distinct terrace, cellar and yacht geometry with valid world coordinates', () => {
  const pao = buildStoryLevel('pao'), marco = buildStoryLevel('marco');
  assert.notDeepEqual(marco.platforms, pao.platforms);
  for (const [from, to] of [[520, 800], [1308, 1668], [2452, 2752]]) {
    const section = (platforms: Platform[]) => platforms.filter(p => p.x >= from && p.x < to);
    assert.notDeepEqual(section(marco.platforms), section(pao.platforms), `geometry changes in ${from}..${to}`);
  }
  for (const item of [...marco.platforms, ...marco.crates, ...marco.pickups, ...marco.enemies]) {
    assert.ok(item.x >= 0 && item.x + item.w <= marco.width, `x bounds: ${JSON.stringify(item)}`);
    assert.ok(item.y >= 0 && item.y <= marco.height, `surface y bounds: ${JSON.stringify(item)}`);
    assert.ok(item.w > 0 && item.h > 0);
  }
  assert.equal(getStoryRoute('marco').name, 'La tournée Grand Cru');
  assert.equal(new Set(MARCO_ROUTE_LANDMARKS.map(l => l.kind)).size, 3);
});

test('both routes preserve the opening, swim safety, boss and exact reward inventories', () => {
  const pao = buildStoryLevel('pao'), marco = buildStoryLevel('marco');
  const opening = (level: typeof pao) => ({
    platforms: level.platforms.filter(p => p.x < 300),
    enemies: level.enemies.filter(e => e.x < 300),
    pickups: level.pickups.filter(p => p.x < 300),
    crates: level.crates.filter(c => c.x < 300),
  });
  assert.deepEqual(opening(marco), opening(pao));
  assert.deepEqual(marco.platforms.filter(p => p.h >= 60), pao.platforms.filter(p => p.h >= 60));
  for (let x = 0; x <= pao.width; x += 8) {
    assert.deepEqual(getOpenWaterZoneAt(x, marco.platforms), getOpenWaterZoneAt(x, pao.platforms), `water safety at ${x}`);
  }
  assert.equal(marco.width, pao.width);
  assert.equal(marco.goalX, pao.goalX);
  assert.deepEqual(marco.boss, pao.boss);
  assert.deepEqual(marco.decos, pao.decos);
  assert.deepEqual(inventory(marco.pickups.map(p => p.type)), inventory(pao.pickups.map(p => p.type)));
  assert.deepEqual(inventory(marco.crates.map(c => `${c.loot}:${c.isMysteryBlock}`)), inventory(pao.crates.map(c => `${c.loot}:${c.isMysteryBlock}`)));
  assert.deepEqual(inventory(marco.enemies.map(e => e.archetype)), inventory(pao.enemies.map(e => e.archetype)));
  assert.equal(marco.springs.length, pao.springs.length);
  assert.equal(marco.yachts.length, pao.yachts.length);
  for (const e of marco.enemies) {
    assert.ok(marco.platforms.some(p => e.x + e.w > p.x && e.x < p.x + p.w && Math.abs(e.y + e.h - p.y) < .01), `enemy ${e.id} starts on a floor`);
    assert.ok(e.minX <= e.x && e.maxX >= e.x + e.w, `enemy ${e.id} has a full patrol span`);
  }
});

// Use the actual jump and swept landing rules, with the game's rising/falling
// gravity, to prove each optional branch can be reached without an extra jump,
// a watch boost or a spring. Search valid launch positions/speeds, as a player can.
function canJumpOnto(from: Platform, to: Platform): boolean {
  const dt = 1 / 120;
  for (let launchX = from.x; launchX <= from.x + from.w - 42; launchX += 8) {
    for (const speed of [80, 120, 160, 190, PHYSICS.MAX_RUN_SPEED]) {
      const player = createInitialPlayer(launchX, from.y - 62);
      player.vx = speed;
      stepJumpMechanics(player, true, true, dt);
      for (let frame = 0; frame < 180; frame++) {
        player.vy = Math.min(680, player.vy + PHYSICS.GRAVITY * (player.vy > 0 ? PHYSICS.FALL_GRAVITY_MULT : 1) * dt);
        player.x += player.vx * dt;
        const previousBottom = player.y + player.h;
        player.y += player.vy * dt;
        const landing = resolvePlayerPlatformAABB(player, previousBottom, false, [to]);
        if (landing.landedPlatform === to) return true;
        if (player.y > from.y + 80 || player.x > to.x + to.w) break;
      }
    }
  }
  return false;
}

test('the three optional upper paths are reachable with the shared unboosted jump physics', () => {
  const level = buildStoryLevel('marco');
  const platform = (x: number) => level.platforms.find(p => p.x === x)!;
  const links = [[524, 580], [580, 660], [1308, 1324], [1324, 1436], [1436, 1568], [2452, 2654]];
  for (const [start, end] of links) {
    const target = platform(end);
    assert.ok(canJumpOnto(platform(start), target), `normal jump reaches ${start} → ${end}`);
    if (target.moveAxis === 'y') {
      assert.ok(canJumpOnto(platform(start), { ...target, y: target.y - target.moveAmp! }), 'moving lift reachable even at its highest point');
    }
  }
});
