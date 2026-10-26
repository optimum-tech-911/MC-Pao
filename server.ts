import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeProjectedWorldwideRank, validateAndNormalizeScoreSubmission, type LeaderboardEntry, type LeaderboardSubmissionInput } from './src/game/rules.ts';
import { mergeLeaderboard } from './src/game/leaderboard.ts';

const location = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.basename(location) === 'dist' ? path.dirname(location) : location;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT_DIR, 'data'));
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

function validStoredEntry(value:unknown):value is LeaderboardEntry {
  const e=value as LeaderboardEntry;
  return !!e && typeof e.id==='string' && typeof e.playerName==='string' && typeof e.createdAt==='string'
    && ['story','boss','custom'].includes(e.mode) && Number.isFinite(e.score) && e.score>=0 && e.score<=999999
    && [e.chains,e.maxCombo,e.marcosStomped].every(n=>Number.isFinite(n)&&n>=0);
}
function readLeaderboard():LeaderboardEntry[] {
  if(!fs.existsSync(LEADERBOARD_FILE))return mergeLeaderboard([],100);
  const parsed:unknown=JSON.parse(fs.readFileSync(LEADERBOARD_FILE,'utf8'));
  if(!Array.isArray(parsed))throw new Error('Leaderboard data must be an array.');
  return mergeLeaderboard(parsed.filter(validStoredEntry),100);
}
function writeLeaderboard(entries:LeaderboardEntry[]) {
  fs.mkdirSync(DATA_DIR,{recursive:true});
  // Rename replaces the complete file atomically, preserving the previous scores
  // if writing fails. A persistent DATA_DIR is required on hosted containers.
  const temporary=LEADERBOARD_FILE+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify(entries,null,2),'utf8');
  fs.renameSync(temporary,LEADERBOARD_FILE);
}

async function startServer() {
  const app=express();app.disable('x-powered-by');
  app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');next();});
  app.use(express.json({limit:'16kb'}));
  let store=readLeaderboard();
  app.get('/api/health',(_req,res)=>res.json({ok:true}));
  app.get('/api/leaderboard',(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    const mode=req.query.mode;
    const entries=['story','boss','custom'].includes(String(mode))?store.filter(e=>e.mode===mode):store;
    res.json({entries:entries.slice(0,50),totalPlayers:store.filter(e=>!e.id.startsWith('seed_')).length,updatedAt:new Date().toISOString()});
  });
  const submissions=new Map<string,{count:number;until:number}>();
  app.post('/api/leaderboard',(req,res)=>{
    const now=Date.now(),key=req.ip||'local';
    for(const [ip,limit] of submissions)if(limit.until<now)submissions.delete(ip);
    const limit=submissions.get(key)||{count:0,until:now+60000};
    if(++limit.count>12){res.setHeader('Retry-After','60');res.status(429).json({error:'Trop de scores envoyés. Réessaie dans une minute.'});return;}
    submissions.set(key,limit);
    const entry=validateAndNormalizeScoreSubmission(req.body as LeaderboardSubmissionInput);
    if(!entry){res.status(400).json({error:'Score invalide.'});return;}
    const updated=mergeLeaderboard([...store,entry],100);
    try{writeLeaderboard(updated);}catch(error){console.error('Score persistence failed:',error);res.status(503).json({error:'Le classement est temporairement indisponible.'});return;}
    store=updated;
    const best=store.find(e=>e.playerName===entry.playerName&&e.mode===entry.mode)||entry;
    res.status(201).json({entry:best,rank:computeProjectedWorldwideRank(best.score,store),entries:store.slice(0,50)});
  });
  app.use('/api',(_req,res)=>res.status(404).json({error:'API inconnue.'}));
  if(process.env.NODE_ENV!=='production'){
    const {createServer}=await import('vite');
    const vite=await createServer({root:ROOT_DIR,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);
  }else{
    const dist=path.join(ROOT_DIR,'dist');
    app.use(express.static(dist,{index:false}));
    // Never answer a missing JS/image request with HTML.
    app.get('*',(req,res)=>{if(path.extname(req.path)){res.sendStatus(404);return;}res.setHeader('Cache-Control','no-cache');res.sendFile(path.join(dist,'index.html'));});
  }
  app.use((error:Error & {status?:number},_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(error.status===400||error.status===413?error.status:500).json({error:'Requête invalide.'});});
  const port=Number(process.env.PORT)||3000;
  const server=app.listen(port,'0.0.0.0',()=>console.log(`MC Pao running on http://localhost:${port}`));
  server.on('error',error=>{console.error(error);process.exitCode=1;});
}
startServer().catch(error=>{console.error('Server startup failed:',error);process.exitCode=1;});
