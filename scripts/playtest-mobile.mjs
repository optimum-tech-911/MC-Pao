import {chromium,webkit} from 'playwright';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const out='output/mobile-matrix';await fs.mkdir(out,{recursive:true});const results=[],errors=[];
const url=process.env.GAME_URL||'http://localhost:3000';
for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true});
 for(const [width,height]of [[375,667],[390,844],[430,932],[360,800],[844,390],[667,375],[844,320],[740,320],[768,1024]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});const page=await context.newPage();
  page.on('pageerror',e=>errors.push(`${engine} ${width}×${height}: ${e}`));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${engine}: ${r.status()} ${r.url()}`);});
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('[data-start]')?.disabled===false);
  const layout=await page.locator('.lobby').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,scroll:el.scrollHeight,play:document.querySelector('[data-start]').getBoundingClientRect().bottom,scores:document.querySelector('[data-testid="intro-leaderboard"]').getBoundingClientRect().bottom}));
  assert.ok(layout.scrollWidth<=width+1,`${engine}: horizontal overflow`);assert.ok(layout.play<height-10,`${engine} ${width}×${height}: Play must be visible`);assert.ok(layout.scores<height-50);
  await page.locator('[data-testid="title-leaderboard-btn"]').tap();
  await page.locator('[data-testid="leaderboard-tab-boss"]').tap();assert.ok(await page.locator('.leaderboard-empty').isVisible());
  await page.screenshot({path:`${out}/${engine}-${width}x${height}-scores.png`});
  await page.locator('[data-testid="leaderboard-tab-story"]').tap();assert.ok(await page.locator('[data-testid="leaderboard-row-1"]').isVisible());
  await page.locator('[data-testid="leaderboard-close-btn"]').tap();assert.equal(await page.locator('.lobby-records .lobby-record').count(),3);
  const actualArtColors=await page.locator('.lobby-pao').evaluate(canvas=>{const d=canvas.getContext('2d').getImageData(0,0,80,80).data,colors=new Set();for(let i=0;i<d.length;i+=4)if(d[i+3]>160)colors.add(`${d[i]}:${d[i+1]}:${d[i+2]}`);return colors.size;});assert.ok(actualArtColors>80,'loaded artwork must contain the generated character, not a fallback rig');
  const palettes=[];
  for(const costume of ['yacht_black_vip','classic_white','monaco_gold']){
   await page.locator(`[data-testid="outfit-${costume}"]`).tap();
   await page.waitForTimeout(180);
   palettes.push(await page.locator('.lobby-pao').evaluate(canvas=>{
    const d=canvas.getContext('2d').getImageData(0,0,80,80).data;let r=0,g=0,b=0,n=0;
    for(let y=39;y<53;y++)for(let x=28;x<50;x++){const i=(y*80+x)*4;if(d[i+3]){r+=d[i];g+=d[i+1];b+=d[i+2];n++;}}return[r/n,g/n,b/n];
   }));
  }
  assert.ok(palettes[1][0]>palettes[0][0]+35,'white outfit must visibly change the shirt');assert.ok(palettes[2][0]>palettes[0][0]+25&&palettes[2][0]>palettes[2][2]+30,'gold outfit must visibly change the shirt');
  await page.screenshot({path:`${out}/${engine}-${width}x${height}-title.png`});
  await page.evaluate(()=>window.advanceTime(0));await page.locator('[data-start]').tap();await page.waitForTimeout(40);
  if(height>width){assert.equal(await page.locator('.portrait-prompt').count(),0);assert.equal(await page.evaluate(()=>document.body.dataset.state),'playing');}
  const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const tick=async n=>page.evaluate(ms=>window.advanceTime(ms),n*1000/60);
  const pointer=async(id,type,pointerId)=>page.locator(`[data-testid="${id}"]`).dispatchEvent(type,{pointerId,pointerType:'touch',bubbles:true});
  await page.getByRole('button',{name:'Pause Game (P)'}).tap();await page.waitForFunction(()=>document.body.dataset.state==='paused');
  const resume=page.getByRole('button',{name:'ON Y RETOURNE',exact:true});const resumeBox=await resume.boundingBox();assert.ok(resumeBox.y>=0&&resumeBox.y+resumeBox.height<height,'resume must stay visible');
  await page.screenshot({path:`${out}/${engine}-${width}x${height}-pause.png`});await resume.tap();await page.waitForFunction(()=>document.body.dataset.state==='playing');
  const initial=(await read()).player.x;
  await pointer('dpad-right-btn','pointerdown',1);await pointer('action-jump-btn','pointerdown',2);await tick(12);
  assert.ok((await read()).player.x>initial+8);assert.ok((await read()).player.vy<0);
  await pointer('action-jump-btn','pointerup',2);await tick(2);await pointer('action-jump-btn','pointerdown',3);await tick(4);assert.equal((await read()).player.airJumpsLeft,0);
  await pointer('action-jump-btn','pointercancel',3);await pointer('dpad-right-btn','pointercancel',1);await tick(45);const stopped=(await read()).player.x;await tick(20);assert.ok(Math.abs((await read()).player.x-stopped)<1,'pointer cancellation must stop movement');
  await page.screenshot({path:`${out}/${engine}-${width}x${height}-play.png`});
  results.push({engine,width,height,layout,palettes});await context.close();
 }
 await browser.close();
}
// Loading errors must be recoverable and must prevent starting with missing art.
const browser=await chromium.launch({headless:true});const page=await browser.newPage();await page.route('**/game-atlas-v3.png',r=>r.abort());await page.goto(url);await page.waitForSelector('.art-error');assert.ok(await page.locator('[data-start]').isDisabled());await page.unroute('**/game-atlas-v3.png');await page.getByRole('button',{name:'RECHARGER'}).click();await page.waitForFunction(()=>document.querySelector('[data-start]')?.disabled===false);await browser.close();
assert.equal(errors.length,0,errors.join('\n'));await fs.writeFile(out+'/report.json',JSON.stringify({results,errors},null,2));console.log(`Passed ${results.length} phone layouts in Chromium and WebKit, visible outfit palettes, multi-touch, cancellation and asset-failure recovery.`);
