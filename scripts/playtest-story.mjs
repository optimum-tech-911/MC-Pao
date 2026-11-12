import assert from 'node:assert/strict';
import {chromium} from 'playwright';import fs from 'node:fs/promises';
const mobile=process.argv.includes('--mobile'),bonus=process.argv.includes('--bonus');
const target = new URL(process.env.GAME_URL || 'http://localhost:3000');
if (process.argv.includes('--marco')) target.searchParams.set('character', 'marco');
const character = target.searchParams.get('character') === 'marco' ? 'marco' : 'pao';
const expectedRoute = character === 'marco' ? 'grand_cru' : 'riviera';
const out=`${process.cwd()}/output/playtest-${bonus?'bonus':'story'}${mobile?'-mobile':''}${character==='marco'?'-marco':''}`;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(target.href,{waitUntil:'networkidle'});await page.evaluate(()=>window.advanceTime(0));await page.locator('[data-start="true"]').click();await page.waitForTimeout(30);
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
assert.equal((await read()).character, character, 'story must retain the selected hero');
assert.equal((await read()).route.id, expectedRoute, 'story must start on the selected hero’s route');
const tick=async frames=>{await page.evaluate(ms=>window.advanceTime(ms),frames*1000/60);};
const cdp=mobile?await page.context().newCDPSession(page):null;
const points={};
if(mobile)for(const [i,key,id]of [[1,'ArrowLeft','dpad-left-btn'],[2,'ArrowRight','dpad-right-btn'],[3,'Space','action-jump-btn']]){
 const box=await page.locator(`[data-testid="${id}"]`).boundingBox();points[key]={id:i,x:box.x+box.width/2,y:box.y+box.height/2};
}
let keys=new Set();const setKeys=async list=>{
 const next=new Set(list);
 if(!mobile){for(const k of keys)if(!next.has(k))await page.keyboard.up(k);for(const k of next)if(!keys.has(k))await page.keyboard.down(k);}
 else{
  const active=new Set(keys);let changed=false;
  for(const k of keys)if(!next.has(k)){active.delete(k);changed=true;}
  if(changed)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[...keys].filter(k=>!next.has(k)).map(k=>points[k])});
  changed=false;for(const k of next)if(!active.has(k)){active.add(k);changed=true;}
  if(changed)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[...active].map(k=>points[k])});
 }
 keys=next;
};
const log=[];let burst=0,cool=0,stuck=0,lastX=84,seenCheckpoint=false,deathChecked=false,retries=0,deathDirection=1;
for(let frame=0;frame<60*180;frame+=4){
 const s=await read(),p=s.player;let action=[];
 if(bonus&&s.secretBottles>0){await page.waitForTimeout(40);assert.equal(await page.locator('[data-testid="game-hint"]').count(),0,'tutorial must yield to the reward callout');await page.screenshot({path:out+'/cuvee-36k.png'});break;}
 if(s.mode==='gameover'){
   log.push({frame,event:'gameover',state:s});await page.waitForFunction(()=>document.body.dataset.state==='gameover');await page.screenshot({path:out+`/gameover-${retries}.png`});
   if(s.checkpoint&&retries<3){await setKeys([]);await page.locator('[data-start="true"]').click();await page.waitForTimeout(30);retries++;deathChecked=true;burst=0;cool=0;assert.equal((await read()).route.id,expectedRoute,'checkpoint retry must retain the selected route');assert.equal((await read()).character,character,'checkpoint retry must retain the selected hero');continue;}
   break;
 }
 if(s.checkpoint&&!seenCheckpoint){seenCheckpoint=true;log.push({frame,event:'checkpoint',state:s});await page.screenshot({path:out+'/checkpoint.png'});}
 if(bonus&&p.x>1400&&p.x<1740){
   const target=1618;
   if(Math.abs(target-p.x)>8)action=[target>p.x?'ArrowRight':'ArrowLeft'];
   if(cool<=0&&(p.grounded||p.swimming||(!p.grounded&&p.airJumpsLeft>0&&p.vy>-60))){burst=18;cool=26;}
 }
 else if(s.boss.defeated){action=['ArrowRight'];if(p.grounded&&p.x<s.goalX-100)burst=10;if(p.inGoldenLambo)action=[];}
 else if(seenCheckpoint&&!deathChecked){
   // Let the boss defeat us once, then verify an actual checkpoint retry.
   if(p.x>3420)deathDirection=-1;if(p.x<3220)deathDirection=1;action=[deathDirection>0?'ArrowRight':'ArrowLeft'];
 }
 else if(p.x>s.boss.x-240 || seenCheckpoint){
   const b=s.boss;
   // Clear the viaduct caller before staging, so a surviving enemy cannot
   // repeatedly fire into our back while we wait for the boss's shield.
   const caller=s.enemies.find(e=>e.state!=='squished'&&e.archetype==='caller'&&e.x<b.x&&Math.abs(e.x-p.x)<350);
   const target=caller?caller.x-2:b.state==='vulnerable'?b.x+5:b.x-210;
   const stoppingDistance=p.vx*Math.abs(p.vx)/(2*1700);
   if(Math.abs(target-p.x-stoppingDistance)>8)action.push(target-p.x-stoppingDistance>0?'ArrowRight':'ArrowLeft');
   const attack=p.grounded&&(caller?Math.abs(target-p.x)<190:b.state==='vulnerable'&&Math.abs(target-p.x)<140);
   const incoming=s.projectiles.some(q=>((q.vx<0&&q.x>p.x-12&&q.x-p.x<130)||(q.vx>0&&q.x<p.x+54&&p.x-q.x<130))&&q.y<p.y+68&&q.y>p.y-70);
   const adjustLanding=caller&&!p.grounded&&p.airJumpsLeft>0&&p.vy>80&&p.y+p.h>caller.y+20;
   // The boss's invoice fan falls short of the distant staging point. Approach
   // only an open shield and jump late enough to descend onto its head.
   if(cool<=0&&(attack||adjustLanding||((p.grounded||p.airJumpsLeft>0)&&incoming))){burst=20;cool=28;}

 }
 else{
   action=['ArrowRight'];
   const nearEnemy=s.enemies.some(e=>e.state!=='squished'&&e.x>p.x-10&&e.x-p.x<95&&Math.abs((e.y+44)-(p.y+62))<40);
   const nearCrate=s.crates.some(c=>c.x>p.x&&c.x-p.x<65&&c.y+32>p.y+20);
   const floor=s.platforms.find(pl=>p.x+21>=pl.x&&p.x+21<=pl.x+pl.w&&Math.abs(p.y+62-pl.y)<9);
   const edge=floor&&floor.x+floor.w-(p.x+42)<65&&!s.platforms.some(pl=>pl!==floor&&Math.abs(pl.x-(floor.x+floor.w))<10&&Math.abs(pl.y-floor.y)<12);
   const bank=s.platforms.find(pl=>pl.x>p.x&&pl.x-p.x<135);
   if(cool<=0&&((p.grounded&&(nearEnemy||nearCrate||edge))||(p.swimming&&bank))){burst=18;cool=26;}
   if(stuck>30&&cool<=0){burst=18;cool=26;stuck=0;}
   if(!p.grounded&&!p.swimming&&p.vy>35&&p.airJumpsLeft>0&&bank&&bank.x>p.x+42&&cool<=0){burst=12;cool=22;}
 }
 if(burst>0){action.push('Space');burst-=4;}cool-=4;
 stuck=Math.abs(p.x-lastX)<.5?stuck+4:0;lastX=p.x;
 await setKeys(action);await tick(4);
 if(frame%180===0){log.push({frame,action,state:await read()});}
 if(p.inGoldenLambo){await tick(180);await page.waitForFunction(()=>document.body.dataset.state==='gameover');log.push({frame,event:'finale',state:await read()});await page.screenshot({path:out+'/victory.png'});break;}
}
await setKeys([]);const end=await read();await page.screenshot({path:out+'/last.png'});await fs.writeFile(out+'/report.json',JSON.stringify({seenCheckpoint,deathChecked,retries,end,log,errors},null,2));await browser.close();
assert.equal(errors.length,0,errors.join('\n'));
assert.equal(end.route.id,expectedRoute,'completed run must retain the selected route');
assert.equal(end.character,character,'completed run must retain the selected hero');
if(bonus){assert.equal(end.secretBottles,1,'must reach and collect the optional 36K bottle');console.log('Secret Cuvée 36K bottle collected through normal controls.');}
else{
assert.ok(seenCheckpoint && deathChecked, 'must exercise death and checkpoint recovery');
assert.equal(end.boss.defeated,true,'must defeat the boss through normal inputs');
assert.equal(end.player.inGoldenLambo,true,'must reach the getaway');
assert.equal(end.mode,'gameover','must finish at the result screen');
console.log(`Story passed (${character}): checkpoint retry, boss victory, ${end.score} €, ${end.player.hp} hearts. Artifacts: ${out}`);

}
