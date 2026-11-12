import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const url = process.env.GAME_URL || 'http://localhost:3000';
const out = path.join(process.cwd(), 'output/marco-actions');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], snapshots = [], runFrames = [], swimFrames = [];
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const tick = async (frames = 0) => {
  await page.evaluate(ms => window.advanceTime(ms), frames * 1000 / 60);
  await page.waitForTimeout(20);
};
let held = new Set();
const keys = async list => {
  const next = new Set(list);
  for (const key of held) if (!next.has(key)) await page.keyboard.up(key);
  for (const key of next) if (!held.has(key)) await page.keyboard.down(key);
  held = next;
};
const open = async query => {
  await keys([]);
  await page.goto(`${url}/?character=marco&${query || ''}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.advanceTime === 'function');
  await tick();
  await page.waitForFunction(async () => {
    const { getPlayerSpriteSet } = await import('/src/game/heroSprites.ts');
    const { getSpriteBank } = await import('/src/game/sprites.ts');
    return getPlayerSpriteSet(getSpriteBank(), 'marco', 'yacht_black_vip').source === 'approved-v2';
  }, undefined, { timeout: 30000 });
  if ((await state()).mode === 'title') {
    await page.waitForFunction(() => document.querySelector('[data-start]')?.disabled === false);
    await page.locator('[data-start]').click();
    await page.waitForFunction(() => document.body.dataset.state === 'playing');
    await tick();
  }
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'playing');
  await tick();
  const current = await state();
  assert.equal(current.character, 'marco');
  assert.equal(current.player.sprite.source, 'approved-v2', 'Every gameplay capture must use the approved generated character');
};
const shot = async label => {
  const s = await state();
  assert.equal(s.player.sprite.source, 'approved-v2');
  snapshots.push({ label, state: s });
  await page.screenshot({ path: `${out}/${label}.png` });
  return s;
};
const actorFrame = async (label, list) => {
  const s = await state();
  assert.equal(s.player.sprite.source, 'approved-v2');
  const data = await page.evaluate(() => {
    const s = JSON.parse(window.render_game_to_text()), source = document.querySelector('[data-testid="game-canvas"]');
    const scale = source.height / s.viewport.height;
    const cx = s.player.x - s.cameraX + 21, footY = s.player.y + 62;
    const width = 140, height = 116;
    const canvas = document.createElement('canvas'); canvas.width = width * 3; canvas.height = height * 3;
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, (cx - width / 2) * scale, (footY - 100) * scale, width * scale, height * scale, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0c2635'; ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    ctx.fillStyle = '#f4d28d'; ctx.font = '14px monospace';
    const info = s.player.sprite ? `${s.player.sprite.state} ${s.player.sprite.frame}` : s.player.animation;
    ctx.fillText(`${info} · x ${s.player.x} · vx ${s.player.vx}`, 8, canvas.height - 10);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const file = `${out}/${label}.png`;
  await fs.writeFile(file, Buffer.from(data, 'base64'));
  list?.push({ file, state: s });
  return s;
};
const spriteState = s => s.player.sprite?.state || s.player.animation;
const writeStrip = async (frames, name, columns = 8) => {
  const images = await Promise.all(frames.map(async frame => ({ data: (await fs.readFile(frame.file)).toString('base64') })));
  const data = await page.evaluate(async ({ images, columns }) => {
    const frames = await Promise.all(images.map(item => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = `data:image/png;base64,${item.data}`; })));
    const width = frames[0].width, height = frames[0].height;
    const sheet = document.createElement('canvas'); sheet.width = Math.min(columns, frames.length) * width; sheet.height = Math.ceil(frames.length / columns) * height;
    const ctx = sheet.getContext('2d'); ctx.fillStyle = '#0c2635'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    frames.forEach((frame, i) => ctx.drawImage(frame, i % columns * width, Math.floor(i / columns) * height));
    return sheet.toDataURL('image/png').split(',')[1];
  }, { images, columns });
  await fs.writeFile(`${out}/${name}.png`, Buffer.from(data, 'base64'));
};


const upperRouteOnly = process.argv.includes('--upper-route');
async function verifyUpperRoutes() {
  const trace = [];
  const log = async label => { const s = await state(); trace.push({ label, ...s }); return s; };
  const seekInput = (p, targetX) => {
    const delta = targetX - p.x;
    const stop = p.vx * p.vx / (2 * 1700) + 3;
    if (Math.abs(delta) < 3 || (Math.sign(delta) === Math.sign(p.vx) && Math.abs(delta) < stop)) return [];
    return [delta > 0 ? 'ArrowRight' : 'ArrowLeft'];
  };
  const walkTo = async targetX => {
    for (let i = 0; i < 240; i++) {
      const s = await log('walk');
      if (Math.abs(s.player.x - targetX) < 4 && Math.abs(s.player.vx) < 20) return;
      await keys(seekInput(s.player, targetX)); await tick(1);
    }
    throw new Error(`Could not walk to ${targetX}: ${JSON.stringify((await state()).player)}`);
  };
  const landAt = async (targetX, targetY, label) => {
    let jumpHeld = 0, jumpRest = 0;
    for (let i = 0; i < 420; i++) {
      const s = await log(label), p = s.player;
      const footY = p.y + 62;
      const actualY = typeof targetY === 'function' ? targetY(s) : targetY;
      if (p.grounded && Math.abs(footY - actualY) < 5 && Math.abs(p.x - targetX) < 19) {
        await keys([]); await shot(label); return s;
      }
      if (s.mode === 'gameover') throw new Error(`Died seeking ${label}`);
      const action = seekInput(p, targetX);
      if (jumpRest > 0) jumpRest--;
      if (jumpHeld <= 0 && jumpRest <= 0 && ((p.grounded && footY > actualY + 5) || p.swimming || (!p.grounded && p.airJumpsLeft > 0 && p.vy > -80 && footY > actualY - 45))) {
        jumpHeld = 16; jumpRest = 20;
      }
      if (jumpHeld > 0) { action.push('Space'); jumpHeld--; }
      await keys(action); await tick(1);
    }
    throw new Error(`Could not land ${label}: ${JSON.stringify((await state()).player)}`);
  };
  try {
    await open();
    await walkTo(390);
    await landAt(556, 168, 'upper-01-terrace-step');
    await landAt(676, 144, 'upper-02-terrace-balcony');
    await open('yacht=1');
    await walkTo(1235);
    await landAt(1298, 170, 'upper-03-cellar-step');
    await landAt(1440, 142, 'upper-04-cellar-gallery');
    await keys(['ArrowRight']); await tick(1); await keys([]); await tick(30);
    await shot('upper-04b-cellar-settled');
    await landAt(1602, s => s.platforms.find(p => p.x === 1568)?.y ?? 126, 'upper-05-tasting-lift');
    // A small hop through the cuvée's arc collects it without any teleport.
    for (let i = 0; i < 120 && (await state()).secretBottles === 0; i++) {
      const s = await state(), action = seekInput(s.player, 1612);
      if (i < 18 || (i >= 30 && i < 42)) action.push('Space');
      await keys(action); await tick(1);
    }
    const end = await shot('upper-06-cuvee');
    assert.equal(end.secretBottles, 1, 'Optional Grand Cru bottle must be reachable through all three cellar ledges');
    assert.equal(end.route.id, 'grand_cru');
    assert.equal(errors.length, 0, errors.join('\n'));
    await fs.writeFile(`${out}/upper-route-report.json`, JSON.stringify({ end, trace, errors }, null, 2));
    console.log('Marco upper routes passed: terrace step/balcony, cellar step/gallery/lift and optional cuvée reached with controls.');
  } catch (error) {
    const end = await shot('upper-route-failed');
    await fs.writeFile(`${out}/upper-route-failed.json`, JSON.stringify({ end, trace, error: String(error), errors }, null, 2));
    throw error;
  }
}

try {
  if (upperRouteOnly) { await verifyUpperRoutes(); } else {
  // Capture a complete run cycle from the real renderer, with a recovery foot
  // visible above the grounded contact foot, rather than only checking x motion.
  await open();
  const initialRoute = (await state()).route;
  assert.ok(initialRoute?.id && initialRoute?.name, 'Selected story route must be visible in debug state');
  await shot('01-idle');
  await keys(['ArrowRight']);
  await tick(10);
  for (let i = 0; i < 22; i++) {
    await tick(1);
    const s = await actorFrame(`run-${String(i).padStart(2, '0')}`, runFrames);
    assert.equal(s.player.grounded, true);
    assert.equal(spriteState(s), 'run');
    assert.ok(s.player.vx > 0);
    assert.equal(s.player.facing, 1);
  }
  if (runFrames.every(frame => frame.state.player.sprite)) {
    assert.ok(new Set(runFrames.map(frame => frame.state.player.sprite.frame)).size >= 8, 'Running must use all approved animation frames');
  }
  await writeStrip(runFrames, 'run-gameplay-strip');
  await keys(['ArrowLeft']);
  await tick(18);
  const mirrored = await shot('02-turn-left');
  assert.equal(mirrored.player.facing, -1);
  assert.ok(mirrored.player.vx < 0, 'Turning must eventually reverse velocity');
  await keys([]);
  await tick(18);

  // A single jump needs its own rise/apex/fall sequence; the double-jump
  // pose must not accidentally mask the ordinary falling and landing states.
  const singleJumpStates = [];
  await keys(['Space']); await tick(1);
  for (let i = 0; i < 100; i++) {
    const s = await state(), name = spriteState(s);
    singleJumpStates.push(name);
    if (name === 'apex' && !singleJumpStates.slice(0, -1).includes(name)) await shot('02a-single-jump-apex');
    if (name === 'fall' && !singleJumpStates.slice(0, -1).includes(name)) await shot('02b-single-jump-fall');
    if (i > 4 && s.player.grounded) break;
    if (i === 18) await keys([]);
    await tick(1);
  }
  await keys([]); await tick(15);
  for (const name of ['jump', 'apex', 'fall', 'land']) assert.ok(singleJumpStates.includes(name), `Single jump must render ${name}`);

  // Jump, rising tuck, double-jump, controlled slam and the contact/recovery
  // landing states must occur in order through real controls.
  await keys(['Space']);
  await tick(7);
  const jump = await shot('03-first-jump');
  assert.ok(jump.player.vy < 0 && !jump.player.grounded);
  await keys([]); await tick(3);
  await keys(['Space']); await tick(6);
  const doubleJump = await shot('04-double-jump');
  assert.equal(doubleJump.player.airJumpsLeft, 0);
  assert.ok(doubleJump.player.vy < 0);
  await keys([]);
  for (let i = 0; i < 40 && (await state()).player.vy < -200; i++) await tick(1);
  await keys(['ArrowDown']); await tick(1);
  const slam = await shot('05-ground-pound');
  assert.equal(slam.player.groundPounding, true);
  if (slam.callouts) {
    assert.ok(slam.callouts.includes('SLAM GRAND CRU !'));
    assert.ok(!slam.callouts.includes('DOUBLE SAUT !'), 'New action label must replace the previous one');
  }
  assert.ok(slam.player.vy > 400);
  await keys([]);
  const landing = [];
  for (let i = 0; i < 50; i++) {
    await tick(1); const s = await state();
    if (s.player.grounded) {
      landing.push(await actorFrame(`land-${String(landing.length).padStart(2, '0')}`));
      if (landing.length >= 12) break;
    }
  }
  assert.ok(landing.length >= 10, 'Slam must return to a grounded landing');
  assert.ok(landing.some(s => spriteState(s) === 'land'), 'Landing must render a contact/recovery pose');
  await tick(12);

  // A held pose input triggers once. Release and press again starts a new toast.
  await keys(['ArrowDown']); await tick(1);
  const toastStart = await shot('06-toast-start');
  assert.equal(spriteState(toastStart), 'toast');
  assert.ok(toastStart.player.poseSeconds > 1.4);
  await tick(25);
  const toastRaised = await shot('07-toast-raised');
  assert.ok(toastRaised.player.poseSeconds < toastStart.player.poseSeconds);
  await tick(95);
  const heldToast = await state();
  assert.equal(heldToast.player.poseSeconds, 0, 'Holding pose must not restart the toast');
  await keys([]); await tick(2);
  await keys(['ArrowDown']); await tick(1);
  assert.ok((await state()).player.poseSeconds > 1.4, 'A released and pressed pose must start again');
  await keys([]);
  await page.getByRole('button', { name: 'Pause Game (P)', exact: true }).click();
  await page.waitForFunction(() => document.body.dataset.state === 'paused');
  const frozen = await state();
  await tick(90);
  const afterPause = await state();
  assert.deepEqual(afterPause.player, frozen.player, 'Pause must freeze action timers and player');
  if (frozen.player.sprite) assert.deepEqual(afterPause.player.sprite, frozen.player.sprite, 'Pause must freeze the rendered frame');
  await page.getByRole('button', { name: 'ON Y RETOURNE', exact: true }).click();
  await page.waitForFunction(() => document.body.dataset.state === 'playing');
  await tick(10);
  assert.ok((await state()).player.poseSeconds < frozen.player.poseSeconds);

  // The adapted route is chosen once and remains attached to play and replay.
  assert.equal((await state()).route.id, initialRoute.id);
  await page.getByRole('button', { name: 'Pause Game (P)', exact: true }).click();
  await page.getByRole('button', { name: 'RECOMMENCER LE PARCOURS', exact: true }).click();
  await page.waitForFunction(() => document.body.dataset.state === 'playing');
  await tick();
  assert.equal((await state()).route.id, initialRoute.id);

  // Land on a real rival and capture the brief impact pose, independently
  // from a downward slam or a turbo plow. The first rival is before the watch.
  await open();
  let stomped;
  let stompJump = 0, stompRest = 0;
  for (let i = 0; i < 420; i++) {
    const s = await state(), p = s.player;
    if (s.marcosStomped > 0) { stomped = s; break; }
    assert.notEqual(s.mode, 'gameover', 'Stomp approach must not lose all hearts');
    const rival = s.enemies.find(enemy => enemy.id === 1 && enemy.state !== 'squished');
    const target = rival ? rival.x - 3 : p.x + 80;
    const stop = p.vx * Math.abs(p.vx) / (2 * 1700);
    const delta = target - p.x - stop;
    const action = Math.abs(delta) > 5 ? [delta > 0 ? 'ArrowRight' : 'ArrowLeft'] : [];
    stompRest--;
    if (rival && p.grounded && Math.abs(target - p.x) < 150 && stompRest <= 0) { stompJump = 18; stompRest = 22; }
    if (stompJump > 0) { action.push('Space'); stompJump--; }
    await keys(action); await tick(1);
  }
  assert.ok(stomped && stomped.score > 0, 'A top stomp must defeat the rival and award points');
  assert.equal(spriteState(stomped), 'stomp');
  assert.equal(stomped.player.overdriveSeconds, 0);
  await keys([]); await shot('07a-rival-stomp');

  // Real contact with a rival must show the hurt state, knockback and loss of
  // exactly one heart, rather than swapping only a decorative sprite.
  await open(); await keys(['ArrowRight']);
  let hurt;
  for (let frame = 0; frame < 180; frame++) {
    await tick(1); const s = await state();
    if (s.player.hp < 3) { hurt = s; break; }
  }
  if (!hurt) { const missed = await shot('08-hurt-navigation-failed'); await fs.writeFile(`${out}/08-hurt-navigation-failed.json`, JSON.stringify(missed, null, 2)); }
  assert.ok(hurt, 'Walking into the first rival must produce damage');
  assert.equal(hurt.player.hp, 2);
  assert.equal(spriteState(hurt), 'hurt');
  await keys([]);
  await shot('08-hurt');
  const damageFrames = [];
  for (let i = 0; i < 8; i++) { await tick(1); await actorFrame(`hurt-${String(i).padStart(2, '0')}`, damageFrames); }
  await writeStrip(damageFrames, 'hurt-gameplay-strip', 4);

  // A real defeat needs the approved defeat pose during the short delay;
  // invulnerability blinking must not erase the final action artwork.
  await open('boss=1'); await keys(['ArrowRight']);
  let defeated;
  for (let i = 0; i < 400; i++) {
    await tick(4); const s = await state();
    if (s.player.hp === 0) { defeated = s; break; }
  }
  assert.ok(defeated, 'Boss contact must eventually produce a real defeat');
  assert.equal(spriteState(defeated), 'defeat');
  await keys([]); await actorFrame('08a-defeat'); await shot('08b-defeat-scene');
  let groundedDefeat;
  for (let i = 0; i < 50; i++) {
    const s = await state();
    if (s.mode === 'gameover') break;
    if (s.player.grounded && s.player.sprite.frame === 1) { groundedDefeat = await shot('08c-defeat-grounded'); break; }
    await tick(1);
  }
  assert.ok(groundedDefeat, 'The approved kneeling defeat must appear grounded before the result modal');
  await tick(45);
  assert.equal((await state()).mode, 'gameover');

  // Reach the watch with ordinary controls and verify turbo's movement/state.
  await open();
  let turbo;
  await keys(['ArrowRight']);
  for (let frame = 0; frame < 240; frame += 2) {
    await tick(2);
    const s = await state();
    if (s.player.overdriveSeconds > 0) { turbo = s; break; }
    if (s.mode === 'gameover') break;
  }
  if (!turbo) { const failed = await shot('turbo-navigation-failed'); await fs.writeFile(`${out}/turbo-navigation-failed.json`, JSON.stringify(failed, null, 2)); }
  assert.ok(turbo?.player.overdriveSeconds > 0, 'The watch must be reachable on Marco’s adapted route');
  const turboFrames = [];
  for (let i = 0; i < 8; i++) { await keys(['ArrowRight']); await tick(2); const s = await actorFrame(`turbo-${String(i).padStart(2, '0')}`, turboFrames); assert.equal(spriteState(s), 'turbo'); }
  assert.ok(turboFrames.some(f => Math.abs(f.state.player.vx) > 300), 'Turbo must increase running speed');
  await shot('09-turbo');
  await writeStrip(turboFrames, 'turbo-gameplay-strip', 4);
  // Power must not force a running pose while still or cover jump/landing art.
  await keys(['ArrowLeft']);
  for (let i = 0; i < 90 && (await state()).player.x > 300; i++) await tick(1);
  await keys([]); await tick(22);
  const turboIdle = await shot('09a-turbo-idle');
  assert.ok(turboIdle.player.overdriveSeconds > 0 && turboIdle.player.grounded);
  assert.equal(spriteState(turboIdle), 'turbo_idle', 'Turbo while still needs a resting pose');
  await keys(['ArrowDown']); await tick(1);
  assert.equal(spriteState(await state()), 'toast', 'Turbo must preserve the toast action');
  await keys([]); await tick(4);
  await keys(['Space']); await tick(7);
  const boostedJump = await shot('09b-turbo-jump');
  assert.ok(boostedJump.player.overdriveSeconds > 0 && boostedJump.player.vy < 0);
  assert.equal(spriteState(boostedJump), 'jump', 'Turbo must preserve the rising jump pose');
  await keys([]); await tick(3); await keys(['Space']); await tick(5);
  assert.equal(spriteState(await state()), 'double_jump', 'Turbo must preserve the double-jump pose');
  await keys([]);
  let boostedLanding;
  for (let i = 0; i < 90; i++) {
    await tick(1); const s = await state();
    if (s.player.grounded) { boostedLanding = s; break; }
  }
  assert.ok(boostedLanding?.player.overdriveSeconds > 0);
  assert.equal(spriteState(boostedLanding), 'land', 'Turbo must preserve landing contact');
  await shot('09c-turbo-land');

  // Freestyle cycles at the surface; a dolphin jump emerges and boards a yacht.
  await open('swim=1');
  assert.equal((await state()).player.swimming, true);
  await keys(['ArrowRight']);
  for (let i = 0; i < 8; i++) {
    await tick(2); const s = await actorFrame(`swim-${String(i).padStart(2, '0')}`, swimFrames);
    assert.equal(s.player.swimming, true); assert.equal(spriteState(s), 'swim');
  }
  await shot('10-swim-crawl');
  await writeStrip(swimFrames, 'swim-gameplay-strip', 4);
  await keys(['ArrowRight', 'Space']); await tick(3);
  const emerged = await shot('11-dolphin-jump');
  assert.equal(emerged.player.swimming, false);
  assert.ok(emerged.player.vy < 0);
  await keys(['ArrowRight']);
  let boarded;
  for (let i = 0; i < 100; i++) {
    await tick(1); const s = await state();
    if (s.player.grounded) { boarded = s; break; }
    if (s.player.vy > -70 && s.player.airJumpsLeft > 0) { await keys(['ArrowRight', 'Space']); await tick(1); await keys(['ArrowRight']); }
  }
  assert.ok(boarded?.player.grounded && !boarded.player.swimming, 'Dolphin jump must return to solid yacht/pier footing');
  await keys([]); await shot('12-boarded');

  // The approved car-entry pose must actually appear before Marco disappears
  // into the getaway. Freeze time early in open() so this short phase is testable.
  await open('lambo=1');
  const entry = await shot('13-car-entry-start');
  assert.equal(spriteState(entry), 'car_entry');
  assert.equal(entry.player.inGoldenLambo, true);
  await tick(10);
  assert.equal(spriteState(await shot('14-car-entry-mid')), 'car_entry');
  await tick(30);
  assert.equal(spriteState(await shot('15-lambo-driving')), 'lambo');
  await tick(150);
  assert.equal((await state()).mode, 'gameover');
  assert.equal((await state()).character, 'marco');
  assert.equal(await page.locator('#gameover-modal-title').innerText(), 'CIAO PAO !');

  // The exact native frames used by rendering get a contact sheet and looping
  // animation, allowing a human to assess knees, arm counter-swing and likeness.
  const art = await page.evaluate(async () => {
    const { getPlayerSpriteSet } = await import('/src/game/heroSprites.ts');
    const { getSpriteBank } = await import('/src/game/sprites.ts');
    const hero = getPlayerSpriteSet(getSpriteBank(), 'marco', 'yacht_black_vip');
    if (hero.source !== 'approved-v2') throw new Error('Animation sheet must use approved generated art');
    const named = [ ...hero.run.map((f, i) => [`run ${i}`, f]), ['idle', hero.idle[0]], ['jump', hero.jump], ['double jump', hero.doubleJump], ['slam', hero.groundPound], ...hero.land.map((f, i) => [`land ${i}`, f]), ...hero.vipPose.map((f, i) => [`toast ${i}`, f]), ...hero.swim.map((f, i) => [`swim ${i}`, f]), ['hurt', hero.hurt], ['defeat', hero.defeat], ['car entry', hero.carEntry], ['victory', hero.victory] ];
    const cellWidth = 240, cellHeight = 270, columns = 8;
    const sheet = document.createElement('canvas'); sheet.width = columns * cellWidth; sheet.height = Math.ceil(named.length / columns) * cellHeight;
    const ctx = sheet.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#153442'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    named.forEach(([name, sprite], i) => { const x = i % columns * cellWidth, y = Math.floor(i / columns) * cellHeight; const scale = Math.min(3, 220 / sprite.width); ctx.strokeStyle = '#557682'; ctx.strokeRect(x, y, cellWidth, cellHeight); ctx.fillStyle = '#a3c6cb'; ctx.fillRect(x + 6, y + 242, cellWidth - 12, 1); ctx.drawImage(sprite, x + (cellWidth - sprite.width * scale) / 2, y + 242 - sprite.height * scale, sprite.width * scale, sprite.height * scale); ctx.fillStyle = '#f3d08b'; ctx.font = '14px monospace'; ctx.fillText(name, x + 8, y + 262); });
    const run = hero.run.map(sprite => { const c = document.createElement('canvas'); c.width = 320; c.height = 320; const context = c.getContext('2d'); context.imageSmoothingEnabled = false; context.fillStyle = '#153442'; context.fillRect(0, 0, 320, 320); context.fillStyle = '#a3c6cb'; context.fillRect(0, 315, 320, 1); context.drawImage(sprite, 0, -4, 320, 320); return c.toDataURL('image/png').split(',')[1]; });
    return { sheet: sheet.toDataURL('image/png').split(',')[1], run };
  });
  await fs.writeFile(`${out}/marco-motion-sheet.png`, Buffer.from(art.sheet, 'base64'));
  for (let i = 0; i < art.run.length; i++) await fs.writeFile(`${out}/native-run-${String(i).padStart(2, '0')}.png`, Buffer.from(art.run[i], 'base64'));
  let animation;
  try {
    execFileSync('ffmpeg', ['-y', '-framerate', String(art.run.length * 222 / 80), '-i', `${out}/native-run-%02d.png`, '-frames:v', String(art.run.length), '-filter_complex', '[0:v]split[a][b];[a]palettegen[p];[b][p]paletteuse', '-loop', '0', `${out}/marco-run.gif`], { stdio: 'pipe' });
    execFileSync('ffmpeg', ['-y', '-framerate', '60', '-i', `${out}/run-%02d.png`, '-frames:v', String(runFrames.length), '-filter_complex', '[0:v]split[a][b];[a]palettegen[p];[b][p]paletteuse', '-loop', '0', `${out}/marco-gameplay-run.gif`], { stdio: 'pipe' });
    execFileSync('ffmpeg', ['-y', '-framerate', '60', '-i', `${out}/run-%02d.png`, '-frames:v', String(runFrames.length), '-filter_complex', '[0:v]crop=iw:ih-30:0:0,split[a][b];[a]palettegen[p];[b][p]paletteuse', '-loop', '0', `${out}/marco-approved-gameplay-run.gif`], { stdio: 'pipe' });
    animation = `${out}/marco-approved-gameplay-run.gif`;
  } catch { animation = 'ffmpeg unavailable; PNG sequence retained'; }
  assert.equal(errors.length, 0, errors.join('\n'));
  await fs.writeFile(`${out}/report.json`, JSON.stringify({ initialRoute, snapshots, runStates: runFrames.map(f => f.state), swimStates: swimFrames.map(f => f.state), animation, errors }, null, 2));
  console.log(`Marco actions passed: actual run cycle, turn, jump/double jump/slam/landing, held/released toast, pause frame, restart route, hurt, reachable turbo, swimming and emerging. Artifacts: ${out}`);
  }
} finally {
  await keys([]).catch(() => {});
  await browser.close();
}
