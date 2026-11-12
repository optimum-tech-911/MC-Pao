import type { EnemyState, BossState } from './rules';
import type { SpriteBank } from './sprites';

/** Shared by rendering and the inspection hook, so tests report the drawn pose. */
export function selectEnemyVisual(enemy: EnemyState, bank: SpriteBank['marco']) {
  const art = bank[enemy.archetype];
  let state: 'walk' | 'windup' | 'charge' | 'squished' = 'walk';
  let frames = art.walk;
  let frame = Math.floor(enemy.walkDist * .14) % frames.length;
  if (enemy.state === 'squished') {
    state = 'squished';
    frames = art.squishedFrames ?? [art.squished];
    frame = Math.min(frames.length - 1, Math.floor(Math.max(0, .65 - enemy.stateTimer) * 8));
  } else if (enemy.state === 'windup') {
    state = 'windup';
    frames = art.windupFrames ?? [art.windup];
    const duration = enemy.archetype === 'caller' ? .45 : .5;
    frame = Math.min(frames.length - 1, Math.floor(Math.max(0, duration - enemy.stateTimer) / duration * frames.length));
  } else if (enemy.state === 'attack' && art.charge?.length) {
    state = 'charge';
    frames = art.charge;
    frame = Math.floor(enemy.walkDist / 56 * frames.length) % frames.length;
  } else if (art.source) {
    // Eight little steps over a 56px stride, without cycling while stationary.
    frame = Math.abs(enemy.vx) < 1 ? 1 : Math.floor(enemy.walkDist / 56 * frames.length) % frames.length;
  }
  return { sprite: frames[frame], state, frame, source: art.source ?? 'original-mini-marco' };
}

export function selectBossVisual(boss: BossState, art: SpriteBank['boss'], worldTime: number) {
  let state = 'shielded', frames = art.shielded;
  let frame = Math.floor(boss.walkDist * .1) % frames.length;
  if (boss.state === 'vulnerable' || boss.state === 'hurt') {
    state = 'vulnerable'; frames = art.vulnerable;
    frame = Math.floor(worldTime * 6) % frames.length;
  } else if (boss.state === 'windup_charge' || boss.state === 'windup_leap') {
    state = 'windup'; frames = art.windupFrames ?? [art.charging];
    frame = Math.min(frames.length - 1, Math.floor(Math.max(0, .55 - boss.stateTimer) * 8));
  } else if (boss.state === 'charging' || boss.state === 'leaping') {
    state = 'charge'; frames = art.chargingFrames ?? [art.charging];
    frame = Math.floor(boss.walkDist / 80 * frames.length) % frames.length;
  }
  return { sprite: frames[frame], state, frame, source: art.source ?? 'original-mini-marco' };
}
