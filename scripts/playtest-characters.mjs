import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.GAME_URL || 'http://localhost:3000';
const out = `${process.cwd()}/output/characters`;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const results = [];
const captureErrors = page => {
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
};
const read = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const tick = async (page, frames = 0) => {
  await page.evaluate(ms => window.advanceTime(ms), frames * 1000 / 60);
  await page.waitForTimeout(25);
};
const open = async (page, query = '') => {
  await page.goto(`${url}/${query}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.advanceTime === 'function');
  await tick(page);
  if (!query.includes('autostart') && !query.includes('lambo') && !query.includes('boss')) {
    await page.waitForFunction(() => document.querySelector('[data-start]')?.disabled === false);
  }
};
const choose = async (page, character) => {
  await page.getByTestId(`character-${character}`).click();
  await page.waitForFunction(id => document.querySelector(`[data-testid="character-${id}"]`)?.getAttribute('aria-pressed') === 'true', character);
  await tick(page);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(180);
  if (character === 'marco') {
    await waitForApprovedMarco(page);
    await page.waitForFunction(() => document.querySelector('[data-start]')?.disabled === false);
  }
};
const waitForApprovedMarco = async page => {
  await page.waitForFunction(async () => {
    const { getSpriteBank } = await import('/src/game/sprites.ts');
    const { getPlayerSpriteSet } = await import('/src/game/heroSprites.ts');
    return getPlayerSpriteSet(getSpriteBank(), 'marco', 'yacht_black_vip').source === 'approved-v2';
  }, undefined, { timeout: 30000 });
};
const start = async page => {
  await page.locator('[data-start="true"]').click();
  await page.waitForFunction(() => document.body.dataset.state === 'playing');
  await tick(page);
};
const backToTitle = async page => {
  if ((await read(page)).mode === 'playing') {
    await page.getByRole('button', { name: 'Pause Game (P)', exact: true }).click();
    await page.waitForFunction(() => document.body.dataset.state === 'paused');
  }
  await page.getByRole('button', { name: 'Retour à l’accueil', exact: true }).click();
  await page.waitForFunction(() => document.body.dataset.state === 'title');
  await tick(page);
};

try {
  // A fresh profile must offer both heroes before the first run. Selection is a
  // user preference; reloading must retain it without altering Pao's outfit.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  captureErrors(page);
  await open(page);
  assert.equal(await page.getByTestId('character-pao').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByTestId('character-marco').getAttribute('aria-pressed'), 'false');
  await page.getByTestId('outfit-monaco_gold').click();
  await choose(page, 'marco');
  assert.equal(await page.evaluate(() => localStorage.getItem('mcpao_character')), 'marco');
  await page.screenshot({ path: `${out}/desktop-marco-selection.png` });
  await open(page);
  assert.equal(await page.getByTestId('character-marco').getAttribute('aria-pressed'), 'true');
  assert.ok(await page.getByText('GRAND CRU', { exact: true }).count());
  await choose(page, 'pao');
  assert.equal(await page.getByTestId('outfit-monaco_gold').getAttribute('aria-pressed'), 'true');
  await page.getByTestId('outfit-yacht_black_vip').click();

  // Identical timed controls must produce identical physics and resource states.
  const trajectories = {};
  const routeLayouts = {};
  for (const character of ['pao', 'marco']) {
    await choose(page, character);
    await page.screenshot({ path: `${out}/desktop-${character}-selection.png` });
    await start(page);
    const states = [];
    const sample = async label => {
      const state = await read(page);
      assert.equal(state.character, character);
      assert.equal(state.player.character, character);
      if (character === 'marco') assert.equal(state.player.sprite.source, 'approved-v2', 'Marco must render the approved generated design, never the old code fallback');
      assert.equal(state.route.id, character === 'marco' ? 'grand_cru' : 'riviera');
      assert.ok(state.route.name);
      assert.equal(state.rivalCharacter, character === 'pao' ? 'marco' : 'pao');
      assert.equal(state.boss.name, character === 'pao' ? 'DON MARCO' : 'MC PAO VIP');
      states.push({ label, ...state.player, score: state.score, chains: state.chains });
      return state;
    };
    const initial = await sample('start');
    assert.equal(initial.player.hp, 3);
    assert.equal(initial.score, 0);
    await page.keyboard.down('ArrowRight');
    await tick(page, 22);
    await sample('run');
    await page.screenshot({ path: `${out}/desktop-${character}-run.png` });
    await page.keyboard.up('ArrowRight');
    await tick(page, 4);
    await page.keyboard.down('Space');
    await tick(page, 9);
    const firstJump = await sample('jump');
    assert.ok(firstJump.player.vy < 0, `${character} must jump`);
    await page.keyboard.up('Space');
    await tick(page, 3);
    await page.keyboard.down('Space');
    await tick(page, 6);
    const doubleJump = await sample('double-jump');
    assert.equal(doubleJump.player.airJumpsLeft, 0);
    await page.keyboard.up('Space');
    await page.screenshot({ path: `${out}/desktop-${character}-jump.png` });
    await page.keyboard.down('ArrowDown');
    await tick(page, 4);
    const slam = await sample('slam');
    assert.equal(slam.player.groundPounding, true);
    await page.keyboard.up('ArrowDown');
    await tick(page, 45);
    const landed = await sample('land');
    assert.equal(landed.player.grounded, true);
    await page.keyboard.down('ArrowDown');
    await tick(page, 20);
    const pose = await sample('toast');
    assert.ok(pose.player.poseSeconds > 0);
    await page.screenshot({ path: `${out}/desktop-${character}-toast.png` });
    await page.keyboard.up('ArrowDown');

    await page.getByRole('button', { name: 'Pause Game (P)', exact: true }).click();
    await page.waitForFunction(() => document.body.dataset.state === 'paused');
    const paused = await read(page);
    await tick(page, 60);
    assert.deepEqual((await read(page)).player, paused.player, 'pause must freeze the selected hero');
    await page.getByRole('button', { name: 'ON Y RETOURNE', exact: true }).click();
    await page.waitForFunction(() => document.body.dataset.state === 'playing');
    await tick(page);
    assert.equal((await read(page)).character, character);
    await page.getByRole('button', { name: 'Pause Game (P)', exact: true }).click();
    await page.getByRole('button', { name: 'RECOMMENCER LE PARCOURS', exact: true }).click();
    await page.waitForFunction(() => document.body.dataset.state === 'playing');
    await tick(page);
    const restarted = await read(page);
    assert.equal(restarted.character, character);
    assert.equal(restarted.player.x, initial.player.x);
    assert.equal(restarted.player.hp, initial.player.hp);
    assert.equal(restarted.score, 0);
    trajectories[character] = states;
    await page.keyboard.down('ArrowRight');
    await tick(page, 64);
    await page.keyboard.up('ArrowRight');
    await tick(page, 1);
    const routeView = await read(page);
    routeLayouts[character] = { route: routeView.route, platforms: routeView.platforms, pickups: routeView.pickups };
    await page.screenshot({ path: `${out}/desktop-${character}-route.png` });
    await backToTitle(page);
    assert.equal(await page.getByTestId(`character-${character}`).getAttribute('aria-pressed'), 'true');
  }
  const physicsOnly = states => states.map(({ label, x, y, vx, vy, hp, grounded, swimming, airJumpsLeft, groundPounding, overdriveSeconds, score, chains }) =>
    ({ label, x, y, vx, vy, hp, grounded, swimming, airJumpsLeft, groundPounding, overdriveSeconds, score, chains }));
  assert.deepEqual(physicsOnly(trajectories.marco), physicsOnly(trajectories.pao), 'Both heroes must have equal movement, jumps, slam, health and rewards');
  assert.notDeepEqual(routeLayouts.marco.platforms, routeLayouts.pao.platforms, 'Marco must get an adapted parcours, not only a renamed route');
  assert.ok(routeLayouts.marco.platforms.some(platform => platform.x === 580 && platform.y === 168), 'Grand Cru terrace step must be present in live gameplay');
  results.push({ scenario: 'physics and persistence', trajectories, routeLayouts });

  // Real result/replay transitions must keep Marco selected and use Pao names.
  await open(page, '?lambo=1&character=marco');
  await tick(page, 180);
  await page.waitForFunction(() => document.body.dataset.state === 'gameover');
  assert.equal((await read(page)).character, 'marco');
  assert.equal(await page.locator('#gameover-modal-title').innerText(), 'CIAO PAO !');
  await page.screenshot({ path: `${out}/marco-victory.png` });
  await page.getByRole('button', { name: 'ENCORE UN TOUR', exact: true }).click();
  await page.waitForFunction(() => document.body.dataset.state === 'playing');
  await tick(page);
  assert.equal((await read(page)).character, 'marco');
  assert.equal((await read(page)).player.hp, 3);
  await context.close();

  // All frames need visible coherent artwork, including aquatic/impact poses.
  const artContext = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const artPage = await artContext.newPage();
  captureErrors(artPage);
  await open(artPage);
  await waitForApprovedMarco(artPage);
  const artReport = await artPage.evaluate(async () => {
    const { getSpriteBank } = await import('/src/game/sprites.ts');
    const { getPlayerSpriteSet } = await import('/src/game/heroSprites.ts');
    const bank = getSpriteBank();
    const marco = getPlayerSpriteSet(bank, 'marco', 'yacht_black_vip');
    const named = [
      ...marco.idle.map((frame, i) => [`idle ${i}`, frame]),
      ...marco.run.map((frame, i) => [`run ${i}`, frame]),
      ['jump', marco.jump], ['apex', marco.apex], ['fall', marco.fall], ['double jump', marco.doubleJump],
      ['stomp', marco.stomp], ['slam', marco.groundPound],
      ...marco.land.map((frame, i) => [`land ${i}`, frame]),
      ...marco.swim.map((frame, i) => [`swim ${i}`, frame]),
      ...marco.vipPose.map((frame, i) => [`toast ${i}`, frame]),
      ...marco.scooter.map((frame, i) => [`turbo ${i}`, frame]), ['hurt', marco.hurt],
      ['defeat', marco.defeat], ['car entry', marco.carEntry], ['victory', marco.victory],
    ];
    const columns = 8, cellWidth = 128, cellHeight = 130;
    const sheet = document.createElement('canvas');
    sheet.id = 'character-frame-sheet';
    sheet.width = columns * cellWidth;
    sheet.height = Math.ceil(named.length / columns) * cellHeight;
    sheet.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;';
    const ctx = sheet.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#123343'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    const report = named.map(([name, sprite], index) => {
      if (!sprite) return { name, missing: true };
      const x = index % columns * cellWidth, y = Math.floor(index / columns) * cellHeight;
      ctx.strokeStyle = '#3e6470'; ctx.strokeRect(x, y, cellWidth, cellHeight);
      const scale = Math.min(1.3, 120 / sprite.width, 105 / sprite.height);
      ctx.drawImage(sprite, x + (cellWidth - sprite.width * scale) / 2, y + 108 - sprite.height * scale, sprite.width * scale, sprite.height * scale);
      ctx.fillStyle = '#edc675'; ctx.font = '10px monospace'; ctx.fillText(name, x + 6, y + 121);
      const pixels = sprite.getContext('2d').getImageData(0, 0, sprite.width, sprite.height).data;
      let opaque = 0, green = 0, burgundy = 0, gold = 0, hash = 2166136261;
      let left = sprite.width, right = -1, top = sprite.height, bottom = -1;
      const cornerAlphas = [3, (sprite.width - 1) * 4 + 3, (sprite.height - 1) * sprite.width * 4 + 3, (sprite.width * sprite.height - 1) * 4 + 3].map(i => pixels[i]);
      for (let i = 0; i < pixels.length; i += 4) {
        for (let channel = 0; channel < 4; channel++) { hash ^= pixels[i + channel]; hash = Math.imul(hash, 16777619); }
        const [r, g, b, a] = pixels.slice(i, i + 4);
        if (a < 128) continue;
        opaque++;
        const pixel = i / 4, px = pixel % sprite.width, py = Math.floor(pixel / sprite.width);
        left = Math.min(left, px); right = Math.max(right, px); top = Math.min(top, py); bottom = Math.max(bottom, py);
        if (g > r * 1.2 && g > b * 1.1) green++;
        if (r > g * 1.35 && r > b * 1.1 && r > 40) burgundy++;
        if (r > 150 && g > 100 && b < g * 0.8) gold++;
      }
      return { name, width: sprite.width, height: sprite.height, opaque, green, burgundy, gold, hash: hash >>> 0, cornerAlphas, bounds: { left, right, top, bottom } };
    });
    document.body.append(sheet);
    return { source: marco.source, counts: { run: marco.run.length, idle: marco.idle.length, toast: marco.vipPose.length, swim: marco.swim.length }, frames: report };
  });
  const frameReport = artReport.frames;
  assert.equal(artReport.source, 'approved-v2');
  assert.ok(artReport.counts.run >= 8 && artReport.counts.toast >= 8 && artReport.counts.swim >= 8, 'Approved art must provide full run, toast and crawl cycles');
  assert.ok(frameReport.every(frame => !frame.missing && frame.opaque > 250), 'All playable Marco states need visible artwork');
  assert.ok(frameReport.every(frame => frame.cornerAlphas.every(alpha => alpha === 0) && frame.opaque < frame.width * frame.height * .8), 'Every extracted sprite must retain transparent background');
  assert.ok(frameReport.every(frame => frame.bounds.left > 0 && frame.bounds.right < frame.width - 1), 'Arms, bottle and shoes must fit without side clipping');
  for (const [name, minimum] of [['run', 7], ['toast', 5], ['swim', 6]]) {
    assert.ok(new Set(frameReport.filter(frame => frame.name.startsWith(name + ' ')).map(frame => frame.hash)).size >= minimum, `${name} needs distinct posed frames, not duplicated still images`);
  }
  const idle = frameReport.find(frame => frame.name === 'idle 0');
  assert.ok(idle.burgundy > 100 && idle.gold > 10 && idle.green > 5, 'Marco needs the burgundy robe, gold trim and green bottle');
  await artPage.locator('#character-frame-sheet').screenshot({ path: `${out}/marco-animation-sheet.png` });
  results.push({ scenario: 'Approved Marco animation states', ...artReport });
  await artContext.close();

  // A missing approved sheet must never silently substitute the older code
  // hero. After the failed request is allowed again, the visible retry recovers.
  const recoveryContext = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const recovery = await recoveryContext.newPage();
  const recoveryErrors = [];
  recovery.on('pageerror', error => recoveryErrors.push(String(error)));
  let failSheet = true;
  await recovery.route('**/assets/marco/marco-ground-v2.png*', route => failSheet ? route.abort() : route.continue());
  await recovery.goto(`${url}/?character=marco`, { waitUntil: 'networkidle' });
  await recovery.locator('.art-error').waitFor({ state: 'visible' });
  assert.equal(await recovery.locator('[data-start]').isDisabled(), true, 'A missing Marco sheet must block playing an unapproved fallback');
  const failedPortraitPixels = await recovery.locator('.lobby-marco').evaluate(canvas => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0; for (let i = 3; i < data.length; i += 4) if (data[i] > 127) opaque++;
    return opaque;
  });
  assert.equal(failedPortraitPixels, 0, 'A loading failure must not show the older Marco drawing');
  await recovery.screenshot({ path: `${out}/marco-sheet-error.png` });
  await recovery.getByRole('button', { name: 'CHOISIR MC PAO', exact: true }).click();
  await recovery.waitForFunction(() => document.body.dataset.character === 'pao' && document.querySelector('[data-start]')?.disabled === false);
  assert.equal(await recovery.locator('.art-error').count(), 0, 'Pao must remain available when only Marco artwork fails');
  await recovery.getByTestId('character-marco').click();
  await recovery.locator('.art-error').waitFor({ state: 'visible' });
  failSheet = false;
  await recovery.getByRole('button', { name: 'RECHARGER', exact: true }).click();
  await waitForApprovedMarco(recovery);
  await recovery.waitForFunction(() => document.querySelector('[data-start]')?.disabled === false);
  assert.equal(await recovery.locator('.art-error').count(), 0);
  await recovery.locator('[data-start]').click();
  await recovery.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'playing');
  assert.equal((await read(recovery)).player.sprite.source, 'approved-v2');
  assert.equal(recoveryErrors.length, 0, recoveryErrors.join('\n'));
  results.push({ scenario: 'approved sheet failure and retry', failedPortraitPixels, recovered: true, errors: recoveryErrors });
  await recoveryContext.close();

  // Selection and Play stay accessible at narrow and shallow phone dimensions.
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 740, height: 320 }]) {
    const mobileContext = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
    const mobile = await mobileContext.newPage();
    captureErrors(mobile);
    await open(mobile);
    await waitForApprovedMarco(mobile);
    for (const character of ['pao', 'marco']) {
      await choose(mobile, character);
      const layout = await mobile.evaluate(() => {
        const lobby = document.querySelector('.lobby');
        const play = document.querySelector('[data-start]');
        const cards = ['pao', 'marco'].map(id => {
          const b = document.querySelector(`[data-testid="character-${id}"]`).getBoundingClientRect();
          return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
        });
        const b = play.getBoundingClientRect();
        const portrait = document.querySelector('.lobby-marco'), scene = document.querySelector('.lobby-scene');
        const portraitRect = portrait.getBoundingClientRect(), sceneRect = scene.getBoundingClientRect();
        const pixels = portrait.getContext('2d').getImageData(0, 0, portrait.width, portrait.height).data;
        let minY = portrait.height, maxY = -1;
        for (let y = 0; y < portrait.height; y++) for (let x = 0; x < portrait.width; x++) if (pixels[(y * portrait.width + x) * 4 + 3] > 127) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
        const heroTop = portraitRect.top + minY / portrait.height * portraitRect.height;
        const heroBottom = portraitRect.top + (maxY + 1) / portrait.height * portraitRect.height;
        return { clientWidth: lobby.clientWidth, scrollWidth: lobby.scrollWidth, playTop: b.top, playBottom: b.bottom, cards, marcoArt: { visible: maxY >= 0, top: heroTop, bottom: heroBottom, sceneTop: sceneRect.top, sceneBottom: sceneRect.bottom } };
      });
      assert.ok(layout.marcoArt.visible && layout.marcoArt.top >= layout.marcoArt.sceneTop - 1 && layout.marcoArt.bottom <= layout.marcoArt.sceneBottom + 1, 'Marco’s actual opaque head and feet must fit inside the mobile lobby scene');
      assert.ok(layout.scrollWidth <= viewport.width + 1, `No horizontal overflow at ${viewport.width}×${viewport.height}`);
      assert.ok(layout.playTop >= 0 && layout.playBottom < viewport.height, `Play must stay visible at ${viewport.width}×${viewport.height}`);
      assert.ok(layout.cards.every(b => b.left >= 0 && b.right <= viewport.width && b.top >= 0 && b.bottom < viewport.height), 'Both character choices must stay on the first screen');
      await mobile.screenshot({ path: `${out}/mobile-${viewport.width}x${viewport.height}-${character}-selection.png` });
      await start(mobile);
      assert.equal((await read(mobile)).character, character);
      const right = mobile.getByTestId('dpad-right-btn');
      const jump = mobile.getByTestId('action-jump-btn');
      await right.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true });
      await jump.dispatchEvent('pointerdown', { pointerId: 2, pointerType: 'touch', bubbles: true });
      await tick(mobile, 10);
      const moving = await read(mobile);
      assert.ok(moving.player.x > 84 && moving.player.vy < 0);
      await jump.dispatchEvent('pointercancel', { pointerId: 2, pointerType: 'touch', bubbles: true });
      await right.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch', bubbles: true });
      await mobile.screenshot({ path: `${out}/mobile-${viewport.width}x${viewport.height}-${character}-play.png` });
      await backToTitle(mobile);
      results.push({ scenario: 'mobile selection and play', viewport, character, layout });
    }
    await mobileContext.close();
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  await fs.writeFile(`${out}/report.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(`Character checks passed: saved selection, equal opening physics, adapted live route, swapped rivalry, pause/restart/replay, Marco animation states and ${results.filter(r => r.scenario === 'mobile selection and play').length} phone scenarios. Artifacts: ${out}`);
} finally {
  await browser.close();
}
