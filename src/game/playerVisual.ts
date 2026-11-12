import type { PlayerState } from './rules';
import type { PaoSpriteSet } from './sprites';

export function selectPlayerVisual(player: PlayerState, bank: PaoSpriteSet, time: number, stompSeconds: number, context: {carEntry?:boolean;victory?:boolean} = {}) {
  const frame = (images: HTMLCanvasElement[], index: number, state: string, lean = 0) => {
    const n = Math.max(0, Math.min(images.length - 1, index));
    return { image: images[n], state, frame: n, lean, source: bank.source ?? 'pao-atlas' };
  };
  const single = (image: HTMLCanvasElement, state: string, lean = 0) => ({ image, state, frame: 0, lean, source: bank.source ?? 'pao-atlas' });
  if (player.hp <= 0 && bank.defeat) {
    const pose = single(player.grounded ? bank.defeat : bank.hurt, 'defeat');
    return { ...pose, frame: player.grounded ? 1 : 0 };
  }
  if (context.carEntry && bank.carEntry) return single(bank.carEntry, 'car_entry');
  if (player.inGoldenLambo) return single(bank.idle[0], 'lambo');
  if (context.victory && bank.victory) return single(bank.victory, 'victory');
  if (player.swimming || player.animState === 'swim') {
    const rate = Math.abs(player.vx) > 35 ? 7 : 3;
    return frame(bank.swim, Math.floor(time * rate * bank.swim.length / 4) % bank.swim.length, 'swim');
  }
  if (player.groundPounding) return single(bank.groundPound, 'slam');
  if (stompSeconds > 0) return single(bank.stomp, 'stomp');
  if (player.animState === 'scooter') {
    const cycle = bank.sprintCycleDistance ? player.walkDist / bank.sprintCycleDistance : time * 3.5;
    return frame(bank.scooter, Math.floor(cycle * bank.scooter.length) % bank.scooter.length, 'turbo', .05);
  }
  if (player.animState === 'hurt') return single(bank.hurt, 'hurt');
  if (player.animState === 'jump') {
    const lean = Math.max(-.08, Math.min(.08, player.vx * player.facing * .0003));
    if (player.airJumpsLeft === 0) return single(bank.doubleJump, 'double_jump', lean);
    if (Math.abs(player.vy) < 85) return single(bank.apex ?? bank.jump, 'apex', lean);
    return single(bank.jump, 'jump', lean);
  }
  if (player.animState === 'stomp') return single(bank.fall ?? bank.stomp, 'fall');
  if (player.animState === 'land') return frame(bank.land, player.landTimer > .09 ? 0 : 1, 'land');
  if (player.animState === 'vip_pose') {
    const progress = 1 - Math.min(1.6, player.vipPoseTimer ?? 0) / 1.6;
    return frame(bank.vipPose, Math.floor(progress * bank.vipPose.length), 'toast');
  }
  if (player.animState === 'run') {
    // A full stride covers the same distance for every sprite sheet length.
    const distance = bank.runCycleDistance ?? 8 / .07;
    return frame(bank.run, Math.floor(player.walkDist * bank.run.length / distance) % bank.run.length, 'run', Math.min(.05, Math.abs(player.vx) * .00022));
  }
  return frame(bank.idle, Math.floor(time * .8 * bank.idle.length) % bank.idle.length, player.scooterTimer > 0 ? 'turbo_idle' : 'idle');
}
