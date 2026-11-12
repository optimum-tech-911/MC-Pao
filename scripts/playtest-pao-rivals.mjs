import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const url = process.env.GAME_URL || 'http://localhost:3000';
const out = path.join(process.cwd(), 'output/pao-rivals');
const approvedSource = 'approved-mini-pao-v1';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], scenarios = [];
const watchErrors = page => {
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
};
const read = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const tick = async (page, frames = 0) => {
  await page.evaluate(ms => window.advanceTime(ms), frames * 1000 / 60);
  await page.waitForTimeout(15);
};
const waitForRivals = async page => {
  await page.waitForFunction(async () => {
    const { preloadPaoRivalArtwork, getPaoRivalArtStatus } = await import('/src/game/approvedPaoRivals.ts');
    const { getRivalSpriteSet } = await import('/src/game/heroSprites.ts');
    const { getSpriteBank } = await import('/src/game/sprites.ts');
    preloadPaoRivalArtwork();
    return getPaoRivalArtStatus().ready && getRivalSpriteSet(getSpriteBank(), 'marco', 'yacht_black_vip').waddler.source === 'approved-mini-pao-v1';
  }, undefined, { timeout: 30000 });
};
const freeze = async page => {
  await page.waitForFunction(() => typeof window.advanceTime === 'function');
  await tick(page);
};
const openStory = async (page, character = 'marco', extra = '') => {
  await page.goto(`${url}/?character=${character}&${extra}`, { waitUntil: 'domcontentloaded' });
  await freeze(page);
  if (character === 'marco') await waitForRivals(page);
  if ((await read(page)).mode === 'title') {
    await page.waitForFunction(() => document.querySelector('[data-start]')?.disabled === false);
    await page.locator('[data-start]').click();
  }
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'playing');
  await tick(page);
  const s = await read(page);
  assert.equal(s.character, character);
  return s;
};
const screenshot = async (page, name) => {
  await page.screenshot({ path: `${out}/${name}.png` });
  return read(page);
};
const gameplayFrame = async (page, index) => {
  const data = await page.getByTestId('game-canvas').evaluate(source => {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = Math.round(640 * source.height / source.width);
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await fs.writeFile(`${out}/stomp-motion-${String(index).padStart(3, '0')}.png`, Buffer.from(data, 'base64'));
};

// Test arenas are authored with the game's public share-code editor UI. This
// keeps the same collision, enemy AI and input loop without hidden teleports.
const arenaCode = archetype => {
  const payload = { version: 1, name: `Mini Pao ${archetype} review`, author: 'Playtest', weather: 'heat_haze', items: [
    { kind: 'platform', x: 256, y: 246, w: 900, h: 120 },
    { kind: `marco_${archetype}`, x: archetype === 'waddler' ? 340 : archetype === 'caller' ? 300 : 250, y: 202 },
  ] };
  return 'MCPAO1_' + Buffer.from(encodeURIComponent(JSON.stringify(payload))).toString('base64');
};
const openArena = async (page, archetype) => {
  await page.goto(`${url}/?editor=1&character=marco`, { waitUntil: 'domcontentloaded' });
  await freeze(page); await waitForRivals(page);
  await page.getByTestId('editor-share').click();
  await page.getByTestId('share-code-textarea').fill(arenaCode(archetype));
  await page.getByTestId('import-code-confirm').click();
  await page.getByTestId('editor-test-play').click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'playing');
  await tick(page);
  const s = await read(page);
  assert.equal(s.route.id, 'custom');
  assert.equal(s.enemies.length, 1);
  assert.equal(s.enemies[0].archetype, archetype);
  assert.equal(s.enemies[0].sprite.source, approvedSource);
  return s.enemies[0].id;
};
const enemyImage = async (page, enemyId, label, list) => {
  const result = await page.evaluate(id => {
    const s = JSON.parse(window.render_game_to_text()), e = s.enemies.find(enemy => enemy.id === id);
    if (!e) throw new Error(`Enemy ${id} is outside the visible scene`);
    const source = document.querySelector('[data-testid="game-canvas"]');
    const scale = source.height / s.viewport.height, width = 100, height = 82;
    const cx = e.x + e.w / 2 - s.cameraX, footY = e.y + e.h;
    const canvas = document.createElement('canvas'); canvas.width = width * 3; canvas.height = height * 3;
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, (cx - width / 2) * scale, (footY - 66) * scale, width * scale, height * scale, 0, 0, canvas.width, canvas.height);
    return { image: canvas.toDataURL('image/png').split(',')[1], enemy: e, score: s.score, hp: s.player.hp };
  }, enemyId);
  assert.equal(result.enemy.sprite.source, approvedSource);
  await fs.writeFile(`${out}/${label}.png`, Buffer.from(result.image, 'base64'));
  if (list) list.push({ file: `${out}/${label}.png`, ...result, image: undefined });
  return result;
};

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage(); watchErrors(page);
  let s = await openStory(page, 'marco');
  assert.equal(s.rivalCharacter, 'pao');
  assert.ok(s.enemies.length > 0);
  assert.ok(s.enemies.every(e => e.sprite.source === approvedSource), 'Marco must face the new generated Mini Pao art');
  await screenshot(page, 'story-marco-mini-pao');
  s = await openStory(page, 'pao');
  assert.equal(s.rivalCharacter, 'marco');
  assert.ok(s.enemies.every(e => e.sprite.source !== approvedSource), 'Pao’s original mini-Marco route must be preserved');
  assert.equal(await page.evaluate(async () => {
    const { getSpriteBank } = await import('/src/game/sprites.ts');
    const { getRivalSpriteSet } = await import('/src/game/heroSprites.ts');
    const bank = getSpriteBank();
    return getRivalSpriteSet(bank, 'pao', 'yacht_black_vip').waddler.walk[0] === bank.marco.waddler.walk[0];
  }), true);
  await screenshot(page, 'story-pao-original-mini-marco');
  scenarios.push({ scenario: 'story rivalry source', marco: approvedSource, pao: 'original Marco atlas' });

  // Inspect every distinct generated cell actually exposed to the renderer.
  await waitForRivals(page);
  const art = await page.evaluate(async () => {
    const { getSpriteBank } = await import('/src/game/sprites.ts');
    const { getRivalSpriteSet } = await import('/src/game/heroSprites.ts');
    const { getPaoRivalFrameAudit } = await import('/src/game/approvedPaoRivals.ts');
    const bank = getRivalSpriteSet(getSpriteBank(), 'marco', 'yacht_black_vip');
    const named = [], seen = new Set(), counts = {};
    const add = (label, images) => images.forEach((image, i) => { if (!seen.has(image)) { seen.add(image); named.push([`${label} ${i}`, image]); } });
    for (const kind of ['waddler', 'caller', 'charger']) {
      const role = bank[kind];
      if (role.source !== 'approved-mini-pao-v1') throw new Error(`Unapproved ${kind} art`);
      counts[kind] = { walk: role.walk.length, windup: role.windupFrames?.length ?? 1, charge: role.charge?.length ?? 0, squish: role.squishedFrames?.length ?? 1 };
    }
    add('patrol', bank.waddler.walk);
    add('caller phone', bank.caller.windupFrames ?? [bank.caller.windup]);
    add('charger anticipation', bank.charger.windupFrames ?? [bank.charger.windup]);
    add('stomp aftermath', bank.waddler.squishedFrames ?? [bank.waddler.squished]);
    add('charge', bank.charger.charge ?? []);
    const columns = 8, cw = 160, ch = 170;
    const sheet = document.createElement('canvas'); sheet.width = columns * cw; sheet.height = Math.ceil(named.length / columns) * ch;
    const ctx = sheet.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#143343'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    const frames = named.map(([name, image], i) => {
      const x = i % columns * cw, y = Math.floor(i / columns) * ch;
      ctx.strokeStyle = '#52717a'; ctx.strokeRect(x, y, cw, ch);
      ctx.fillStyle = '#8cb7c0'; ctx.fillRect(x + 5, y + 143, cw - 10, 1);
      ctx.drawImage(image, x + (cw - image.width * 2.8) / 2, y + 143 - image.height * 2.8, image.width * 2.8, image.height * 2.8);
      ctx.fillStyle = '#f6d48d'; ctx.font = '10px monospace'; ctx.fillText(name, x + 5, y + 160, cw - 10);
      const pixels = image.getContext('2d').getImageData(0, 0, image.width, image.height).data;
      let left = image.width, right = -1, top = image.height, bottom = -1, opaque = 0, hash = 2166136261;
      for (let k = 0; k < pixels.length; k += 4) {
        for (let channel = 0; channel < 4; channel++) { hash ^= pixels[k + channel]; hash = Math.imul(hash, 16777619); }
        if (pixels[k + 3] < 128) continue;
        opaque++; const n = k / 4, px = n % image.width, py = Math.floor(n / image.width);
        left = Math.min(left, px); right = Math.max(right, px); top = Math.min(top, py); bottom = Math.max(bottom, py);
      }
      const cornerAlphas = [3, (image.width - 1) * 4 + 3, ((image.height - 1) * image.width) * 4 + 3, (image.width * image.height - 1) * 4 + 3].map(k => pixels[k]);
      return { name, width: image.width, height: image.height, opaque, bounds: { left, right, top, bottom }, cornerAlphas, hash: hash >>> 0 };
    });
    return { frames, counts, audit: getPaoRivalFrameAudit(), sheet: sheet.toDataURL('image/png').split(',')[1] };
  });
  const uniqueCells = new Set(art.audit.map(frame => `${frame.sheet}:${frame.column}:${frame.row}`));
  assert.equal(uniqueCells.size, 24, 'All 24 generated cells must reach the sprite pipeline');
  assert.equal(art.frames.length, 24, 'The runtime must expose all 24 distinct generated frames');
  assert.ok(art.frames.every(f => f.opaque > 100 && f.opaque < f.width * f.height * .85));
  assert.ok(art.frames.every(f => f.cornerAlphas.every(a => a === 0)), 'Sprites need transparent corners');
  assert.ok(art.frames.every(f => f.bounds.left > 0 && f.bounds.right < f.width - 1 && f.bounds.top > 0), 'Head, hands and shoes must remain unclipped');
  assert.ok(art.counts.waddler.walk >= 8 && art.counts.caller.windup >= 4 && art.counts.charger.windup >= 2 && art.counts.charger.charge >= 8 && art.counts.waddler.squish >= 2);
  const distinct = prefix => new Set(art.frames.filter(f => f.name.startsWith(prefix)).map(f => f.hash)).size;
  assert.ok(distinct('patrol') >= 7 && distinct('charge ') >= 7 && distinct('caller phone') >= 3, 'Walking, phone windup and charging must use distinct poses');
  const soles = art.frames.filter(f => f.name.startsWith('patrol')).map(f => f.bounds.bottom);
  assert.ok(Math.max(...soles) - Math.min(...soles) <= 3, 'Patrol shoes must remain aligned to the floor');
  await fs.writeFile(`${out}/mini-pao-animation-sheet.png`, Buffer.from(art.sheet, 'base64'));
  scenarios.push({ scenario: '24 approved generated frames', counts: art.counts, frames: art.frames, cells: [...uniqueCells] });

  // All three archetypes use the same physical AI/collision rules as before.
  const behavior = {}, patrolFrames = [];
  for (const kind of ['waddler', 'caller', 'charger']) {
    const id = await openArena(page, kind), frameIds = new Set(), windupIds = new Set(), attackIds = new Set(), facings = new Set();
    let projectile = false, windup = false, attack = false, patrol = false;
    for (let i = 0; i < 180; i++) {
      const current = await read(page), e = current.enemies.find(enemy => enemy.id === id);
      assert.ok(e); assert.equal(e.sprite.source, approvedSource); facings.add(e.facing);
      if (e.state === 'patrol') { patrol = true; frameIds.add(e.sprite.frame); }
      if (e.state === 'windup') { windup = true; windupIds.add(e.sprite.frame); }
      if (e.state === 'attack') { attack = true; attackIds.add(e.sprite.frame); }
      if (current.projectiles.some(p => p.kind === 'invoice')) projectile = true;
      if (kind === 'waddler' && i < 36) await enemyImage(page, id, `patrol-${String(i).padStart(2, '0')}`, patrolFrames);
      if (e.state === 'windup' && windupIds.size === 1) await screenshot(page, `${kind}-windup`);
      if (e.state === 'attack' && attackIds.size === 1) await screenshot(page, `${kind}-charge`);
      if (kind === 'caller' && projectile) await screenshot(page, 'caller-projectile');
      if (kind === 'waddler' && frameIds.size >= 7 && facings.size === 2 && i >= 36) break;
      if (kind === 'caller' && windupIds.size >= 3 && projectile) break;
      if (kind === 'charger' && windup && attack && attackIds.size >= 3) break;
      await tick(page, 2);
    }
    assert.ok(patrol && frameIds.size >= 2, `${kind} must animate its patrol`);
    if (kind === 'waddler') assert.equal(facings.size, 2, 'The patrol must turn and mirror both ways');
    if (kind === 'caller') assert.ok(windup && windupIds.size >= 3 && projectile, 'Phone windup must lead to a real invoice projectile');
    if (kind === 'charger') assert.ok(windup && attack && attackIds.size >= 3, 'Angry anticipation must lead to an animated physical charge');
    behavior[kind] = { patrol: [...frameIds], windup: [...windupIds], attack: [...attackIds], facings: [...facings], projectile };
    await screenshot(page, `${kind}-behavior`);
  }
  scenarios.push({ scenario: 'three live behaviors', behavior });

  // A true top stomp must squash Mini Pao, bounce Marco, award points and leave
  // the defeated rival harmless. No watch pickup exists in this editor arena.
  const stompId = await openArena(page, 'waddler');
  let held = new Set(), jumpHeld = 0, rest = 0, stomp, stompMotionFrames = 0;
  const setKeys = async list => {
    const next = new Set(list);
    for (const key of held) if (!next.has(key)) await page.keyboard.up(key);
    for (const key of next) if (!held.has(key)) await page.keyboard.down(key);
    held = next;
  };
  for (let i = 0; i < 420; i++) {
    const current = await read(page), p = current.player, e = current.enemies.find(enemy => enemy.id === stompId);
    if (i % 2 === 0) await gameplayFrame(page, stompMotionFrames++);
    if (e.state === 'squished') { stomp = current; break; }
    assert.notEqual(current.mode, 'gameover');
    const stop = p.vx * Math.abs(p.vx) / (2 * 1700), delta = e.x - 2 - p.x - stop;
    const action = Math.abs(delta) > 5 ? [delta > 0 ? 'ArrowRight' : 'ArrowLeft'] : [];
    rest--;
    if (p.grounded && Math.abs(e.x - p.x) < 150 && rest <= 0) { jumpHeld = 18; rest = 22; }
    if (jumpHeld > 0) { action.push('Space'); jumpHeld--; }
    await setKeys(action); await tick(page, 1);
  }
  assert.ok(stomp && stomp.score > 0 && stomp.marcosStomped === 1, 'Top collision must defeat Mini Pao and award points');
  assert.equal(stomp.player.hp, 3); assert.equal(stomp.player.overdriveSeconds, 0);
  assert.ok(stomp.player.vy < 0, 'Stomp must bounce the player upwards');
  await setKeys([]); await screenshot(page, 'mini-pao-stomp');
  const squishFrames = new Set();
  for (let i = 0; i < 30; i++) {
    const current = await read(page), e = current.enemies.find(enemy => enemy.id === stompId);
    squishFrames.add(e.sprite.frame); assert.equal(e.sprite.source, approvedSource);
    if (i === 0 || i === 20) await enemyImage(page, stompId, `squish-${i}`);
    if (i % 2 === 0) await gameplayFrame(page, stompMotionFrames++);
    await tick(page, 1);
  }
  assert.equal(squishFrames.size, 2, 'Both stomped reaction frames must render');
  await tick(page, 100);
  assert.equal((await read(page)).player.hp, 3, 'The stomped rival must no longer damage the player');
  scenarios.push({ scenario: 'stomp collision and squash', score: stomp.score, hp: stomp.player.hp, frames: [...squishFrames] });
  await context.close();

  // On compact phones, the actual Mini Pao stays fully visible and readable.
  for (const viewport of [{ width: 375, height: 667 }, { width: 844, height: 390 }]) {
    const mobileContext = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
    const mobile = await mobileContext.newPage(); watchErrors(mobile);
    await openStory(mobile);
    await mobile.getByTestId('dpad-right-btn').dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true });
    for (let i = 0; i < 90; i++) {
      const current = await read(mobile), e = current.enemies[0];
      if (e && e.x - current.cameraX > 5 && e.x + e.w - current.cameraX < current.viewport.width - 8) break;
      await tick(mobile, 2);
    }
    await mobile.getByTestId('dpad-right-btn').dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch', bubbles: true });
    await tick(mobile, 15);
    const current = await screenshot(mobile, `phone-${viewport.width}x${viewport.height}`), e = current.enemies[0];
    assert.equal(e.sprite.source, approvedSource);
    assert.ok(e.x - current.cameraX > 0 && e.x + e.w - current.cameraX < current.viewport.width);
    const size = await mobile.getByTestId('game-canvas').evaluate(canvas => {
      const b = canvas.getBoundingClientRect(); return Math.min(b.width / canvas.width, b.height / canvas.height) * 3;
    });
    assert.ok(e.h * size >= 40, 'Mini Pao needs a readable on-screen height on the phone');
    scenarios.push({ scenario: 'phone rival readability', viewport, enemy: e, renderedHeight: e.h * size });
    await mobileContext.close();
  }

  // Broken rival art must block Marco’s run, preserve Pao’s original route, then
  // recover through the visible retry. Expected aborted-request logs stay local.
  const recoveryContext = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const recovery = await recoveryContext.newPage(); const recoveryErrors = [];
  recovery.on('pageerror', error => recoveryErrors.push(String(error)));
  let failSheet = true;
  await recovery.route('**/assets/pao-rival/mini-pao-charge-v1.png*', route => failSheet ? route.abort() : route.continue());
  await recovery.goto(`${url}/?character=marco`, { waitUntil: 'networkidle' });
  await recovery.locator('.art-error').waitFor({ state: 'visible' });
  assert.equal(await recovery.locator('[data-start]').isDisabled(), true);
  await screenshot(recovery, 'rival-sheet-error');
  await recovery.getByRole('button', { name: 'CHOISIR MC PAO', exact: true }).click();
  await recovery.waitForFunction(() => document.body.dataset.character === 'pao' && document.querySelector('[data-start]')?.disabled === false);
  assert.equal(await recovery.locator('.art-error').count(), 0);
  await recovery.getByTestId('character-marco').click(); await recovery.locator('.art-error').waitFor({ state: 'visible' });
  failSheet = false; await recovery.getByRole('button', { name: 'RECHARGER', exact: true }).click();
  await waitForRivals(recovery);
  await recovery.waitForFunction(() => document.querySelector('[data-start]')?.disabled === false);
  await recovery.locator('[data-start]').click(); await recovery.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'playing');
  assert.ok((await read(recovery)).enemies.every(e => e.sprite.source === approvedSource));
  assert.equal(recoveryErrors.length, 0, recoveryErrors.join('\n'));
  scenarios.push({ scenario: 'rival sheet failure and retry', recovered: true, errors: recoveryErrors });
  await recoveryContext.close();

  const animation = `${out}/mini-pao-gameplay.gif`;
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '30', '-i', `${out}/patrol-%02d.png`, '-frames:v', String(patrolFrames.length), '-filter_complex', '[0:v]split[a][b];[a]palettegen[p];[b][p]paletteuse', '-loop', '0', animation], { stdio: 'pipe' });
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '30', '-i', `${out}/stomp-motion-%03d.png`, '-frames:v', String(stompMotionFrames), '-filter_complex', '[0:v]split[a][b];[a]palettegen[p];[b][p]paletteuse', '-loop', '0', `${out}/mini-pao-stomp-gameplay.gif`], { stdio: 'pipe' });
  } catch { /* PNG sequence and behavior captures remain useful without ffmpeg. */ }
  assert.equal(errors.length, 0, errors.join('\n'));
  await fs.writeFile(`${out}/report.json`, JSON.stringify({ scenarios, animation, errors }, null, 2));
  await fs.rm(`${out}/failure.json`, { force: true });
  console.log(`Mini Pao checks passed: 24 approved frames, 3 patrols, phone windup/projectile, charge, mirroring, stomp squash/collision, 2 phones and asset recovery. Artifacts: ${out}`);
} catch (error) {
  await fs.writeFile(`${out}/failure.json`, JSON.stringify({ error: String(error), scenarios, errors }, null, 2));
  throw error;
} finally {
  await browser.close();
}
