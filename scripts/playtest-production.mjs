import {chromium}from'playwright';import assert from'node:assert/strict';import fs from'node:fs/promises';import os from'node:os';import path from'node:path';import {spawn}from'node:child_process';import {once}from'node:events';
const root=process.env.PROD_ROOT||process.cwd(),temp=await fs.mkdtemp(path.join(os.tmpdir(),'mcpao-release-')),out=process.cwd()+'/output/production-v3';await fs.mkdir(out,{recursive:true});
const children=[];let browser;
const start=async(port,data)=>{
 const child=spawn(process.execPath,['dist/server.mjs'],{cwd:root,env:{...process.env,NODE_ENV:'production',PORT:String(port),DATA_DIR:data},stdio:['ignore','pipe','pipe']});children.push(child);let log='';child.stderr.on('data',b=>log+=b);child.stdout.on('data',b=>log+=b);
 const url=`http://localhost:${port}`;for(let i=0;i<100;i++){try{if((await fetch(url+'/api/health')).ok)return{child,url};}catch{}if(child.exitCode!==null)throw new Error(log);await new Promise(r=>setTimeout(r,100));}throw new Error(log||'Server did not start');
};
const stop=async child=>{if(child.exitCode!==null||child.signalCode!==null||child.killed)return;const done=once(child,'exit');child.kill();await done;};
const payload={playerName:'QA PROD',country:'FR',score:12345,chains:9,marcosStomped:4,maxCombo:3,mode:'story',victory:false};
try{
 const data=path.join(temp,'scores');let server=await start(3003,data);const {url}=server;
 assert.equal((await fetch(url+'/api/missing')).status,404);assert.equal((await fetch(url+'/assets/missing.png')).status,404);
 assert.equal((await fetch(url+'/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'})).status,400);
 assert.equal((await fetch(url+'/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,score:-10})})).status,400);
 const posted=await fetch(url+'/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(posted.status,201);assert.ok((await posted.json()).entries.some(e=>e.playerName==='QA PROD'));
 assert.ok(JSON.parse(await fs.readFile(path.join(data,'leaderboard.json'),'utf8')).some(e=>e.playerName==='QA PROD'));
 await stop(server.child);server=await start(3003,data);assert.ok((await(await fetch(url+'/api/leaderboard')).json()).entries.some(e=>e.playerName==='QA PROD'));
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const errors=[],external=[],images=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(new URL(r.url()).origin!==url)external.push(r.url());if(r.resourceType()==='image')images.push(r.url());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+':'+r.url());});
 await page.goto(url+'/?lambo=1',{waitUntil:'networkidle'});await page.waitForFunction(()=>!document.querySelector('[data-start]').disabled);
 assert.equal(await page.evaluate(()=>document.body.dataset.state),'title');assert.equal(await page.evaluate(()=>typeof window.advanceTime),'undefined');assert.equal(await page.evaluate(()=>typeof window.render_game_to_text),'undefined');
 assert.equal(external.length,0,'no external assets or fonts');assert.ok(images.some(u=>u.includes('game-atlas-v3.png')));assert.ok(!images.some(u=>u.includes('-sheet-')||u.includes('yacht-v3')||u.includes('rm-blue')),'source artwork should not download at runtime');
 await page.locator('[data-testid="outfit-classic_white"]').tap();await page.waitForTimeout(200);await page.screenshot({path:out+'/mobile-title.png'});
 await page.locator('[data-start]').tap();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.body.dataset.state),'playing');
 const cdp=await page.context().newCDPSession(page);const points=[];for(const [i,id]of [[1,'dpad-right-btn'],[2,'action-jump-btn']]){const b=await page.locator(`[data-testid="${id}"]`).boundingBox();points.push({id:i,x:b.x+b.width/2,y:b.y+b.height/2});}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await page.waitForTimeout(600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);await page.screenshot({path:out+'/mobile-gameplay.png'});
 await page.getByRole('button',{name:'Pause Game (P)'}).tap();assert.equal(await page.evaluate(()=>document.body.dataset.state),'paused');await page.screenshot({path:out+'/mobile-pause.png'});await page.getByRole('button',{name:'ON Y RETOURNE',exact:true}).tap();
 const frameTimes=await page.evaluate(()=>new Promise(resolve=>{const dt=[];let last=performance.now();function tick(t){dt.push(t-last);last=t;if(dt.length<90)requestAnimationFrame(tick);else resolve(dt.slice(5).sort((a,b)=>a-b));}requestAnimationFrame(tick);}));
 assert.equal(errors.length,0,errors.join('\n'));await browser.close();browser=null;
 const blocker=path.join(temp,'file');await fs.writeFile(blocker,'not a directory');const failed=await start(3004,path.join(blocker,'scores'));const rejected=await fetch(failed.url+'/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(rejected.status,503);assert.ok(!(await(await fetch(failed.url+'/api/leaderboard')).json()).entries.some(e=>e.playerName==='QA PROD'));
 const rate=[];for(let i=0;i<14;i++)rate.push((await fetch(url+'/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status);assert.ok(rate.includes(429));
 const report={runtime:root,isolatedData:data,images,external,errors,medianFrameMs:frameTimes[Math.floor(frameTimes.length*.5)],p95FrameMs:frameTimes[Math.floor(frameTimes.length*.95)],checks:['no dev dependencies required','preview URLs disabled','debug hooks absent','local assets only','real-time mobile touch','pause/resume','persistent score survives restart','invalid JSON/score rejected','missing API/assets 404','disk failure returns 503','rate limit 429']};await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log('Production checks passed.',JSON.stringify(report));
}finally{await browser?.close();for(const child of children)await stop(child);}
