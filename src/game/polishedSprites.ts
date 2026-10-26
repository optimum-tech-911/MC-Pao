import type { SpriteBank, PaoSpriteSet } from './sprites';
import { ART_ATLAS } from './artAtlas';
import type { PaoCostume, MarcoArchetype } from './rules';

const loaded = new Set<string>();
const failed = new Set<string>();
const ART_COUNT = 6;
export function getArtStatus() {
  return { ready: loaded.size === ART_COUNT, loaded: loaded.size, total: ART_COUNT, errors: [...failed] };
}
function loadArt(name: string, url: string, install: (image: HTMLImageElement) => void) {
  const image = new Image();
  image.onload = () => {
    try { install(image); loaded.add(name); }
    catch (error) { failed.add(name); console.error(`Artwork ${name}:`, error); }
    window.dispatchEvent(new Event('mcpao-art-ready'));
  };
  image.onerror = () => { failed.add(name); window.dispatchEvent(new Event('mcpao-art-ready')); };
  image.src = url;
}

type Bounds = { x: number; y: number; w: number; h: number };

function cell(image: HTMLImageElement, column: number, row: number, columns: number, rows: number): Bounds {
  return { x: Math.round(column * image.width / columns), y: Math.round(row * image.height / rows),
    w: Math.floor(image.width / columns), h: Math.floor(image.height / rows) };
}

const cells = new WeakMap<HTMLImageElement, Map<string, { canvas: HTMLCanvasElement; box: Bounds }>>();

// Generated sheets occasionally contain a few pixels from a neighbouring frame.
// Keep the connected actor, removing isolated fragments from neighbouring cells.
function cleanCell(image: HTMLImageElement, rect: Bounds) {
  const key = `${rect.x}:${rect.y}:${rect.w}:${rect.h}`;
  let cache = cells.get(image); if (!cache) { cache = new Map(); cells.set(image, cache); }
  const saved = cache.get(key); if (saved) return saved;
  const canvas = document.createElement('canvas'); canvas.width = rect.w; canvas.height = rect.h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  const data = ctx.getImageData(0,0,rect.w,rect.h), pixels = data.data;
  const seen = new Uint8Array(rect.w*rect.h), queue = new Int32Array(seen.length);
  const components: { indices: number[]; area: number; height: number }[] = [];
  for(let n=0;n<seen.length;n++) {
    if(seen[n] || pixels[n*4+3]<160) continue;
    let head=0,tail=1,minY=rect.h,maxY=0;queue[0]=n;seen[n]=1;const indices:number[]=[];
    while(head<tail){
      const i=queue[head++],x=i%rect.w,y=Math.floor(i/rect.w);indices.push(i);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy,j=ny*rect.w+nx;
        if(nx<0||ny<0||nx>=rect.w||ny>=rect.h||seen[j]||pixels[j*4+3]<160)continue;
        seen[j]=1;queue[tail++]=j;
      }
    }
    components.push({indices,area:indices.length,height:maxY-minY+1});
  }
  const biggest = Math.max(1,...components.map(c=>c.area));
  const keep = new Uint8Array(seen.length);
  for(const c of components)if(c.area===biggest)for(const i of c.indices)keep[i]=1;
  let left=rect.w,top=rect.h,right=0,bottom=0;
  for(let i=0;i<keep.length;i++){
    if(!keep[i]){pixels[i*4+3]=0;continue;}
    const x=i%rect.w,y=Math.floor(i/rect.w);left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
  }
  ctx.putImageData(data,0,0);
  const result={canvas,box:{x:left,y:top,w:Math.max(1,right-left+1),h:Math.max(1,bottom-top+1)}};
  cache.set(key,result);return result;
}

function bounds(image: HTMLImageElement, rect: Bounds): Bounds {
  const b=cleanCell(image,rect).box;
  return {x:rect.x+b.x,y:rect.y+b.y,w:b.w,h:b.h};
}

function frame(image: HTMLImageElement, rect: Bounds, scale: number, width = 80, height = 80, costume: PaoCostume = 'yacht_black_vip') {
  const cleaned = cleanCell(image,rect);
  const b = cleaned.box;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!; ctx.imageSmoothingEnabled = false;
  const w = Math.round(b.w * scale), h = Math.round(b.h * scale);
  ctx.drawImage(cleaned.canvas, b.x, b.y, b.w, b.h, Math.round((width - w) / 2), height - h - 1, w, h);
  tintOutfit(canvas,costume);

  return canvas;
}

function tintOutfit(canvas:HTMLCanvasElement,costume:PaoCostume,swimming=false){
  if(costume==='yacht_black_vip')return;
  const ctx=canvas.getContext('2d',{willReadFrequently:true})!,width=canvas.width,height=canvas.height;
  const image=ctx.getImageData(0,0,width,height),d=image.data;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(swimming ? (x<width*.3 || x>width*.68 || y<height*.35 || y>height*.8) : (y<height*.46 || y>height*.79))continue;
    const i=(y*width+x)*4,r=d[i],g=d[i+1],b=d[i+2],l=(r+g+b)/3;
    if(!d[i+3] || l<22 || l>155 || (r>g*1.18&&r>b*1.28))continue;
    if(costume==='classic_white'){d[i]=Math.min(250,174+l*.8);d[i+1]=Math.min(250,177+l*.8);d[i+2]=Math.min(245,168+l*.75);}
    else {d[i]=Math.min(249,150+l);d[i+1]=Math.min(210,91+l*.9);d[i+2]=Math.min(100,23+l*.45);}
  }
  ctx.putImageData(image,0,0);
}

export function installPolishedSprites(bank: SpriteBank) {
  loadArt('pao', '/assets/polish/pao-sheet-v2.png', pao => {
    const scale = 68 / bounds(pao, cell(pao, 0, 1, 8, 4)).h;
    for (const costume of Object.keys(bank.costumes) as PaoCostume[]) {
      const f = (c: number, r: number) => frame(pao, cell(pao, c, r, 8, 4), scale, 80, 80, costume);
      const set = bank.costumes[costume];
      Object.assign(set, {
        idle: [0, 1, 2, 3].map(c => f(c, 1)), run: Array.from({length: 8}, (_, c) => f(c, 0)),
        land: [f(4, 1), f(5, 1)], hurt: f(6, 1), jump: f(0, 2), apex: f(1, 2), fall: f(2, 2),
        doubleJump: f(3, 2), groundPound: f(5, 2), stomp: f(6, 2),
        scooter: [0, 2, 4, 6].map(c => f(c, 0)),
        vipPose: [4, 5, 6, 7].map(c => f(c, 3)), polished: true,
      } satisfies Partial<PaoSpriteSet>);
      const ctx = set.headIcon.getContext('2d')!; ctx.clearRect(0, 0, 24, 24); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(set.idle[0], 20, 10, 40, 36, 0, 0, 24, 24);
    }
  });

  loadArt('marco', '/assets/polish/marco-sheet-v2.png', marco => {
    const scale = 44 / bounds(marco, cell(marco, 0, 0, 8, 2)).h;
    // The second row contains wider acting poses; give each its own source window.
    const edges = [0, .105, .235, .385, .515, .65, .755, .865, 1];
    const act = (i: number): Bounds => ({x: Math.round(edges[i] * marco.width), y: Math.floor(marco.height / 2), w: Math.round((edges[i + 1] - edges[i]) * marco.width), h: Math.floor(marco.height / 2)});
    for (const kind of ['waddler', 'caller', 'charger'] as MarcoArchetype[]) {
      bank.marco[kind].walk = Array.from({length:8}, (_, c) => {
        const canvas = frame(marco, cell(marco, c, 0, 8, 2), scale, 48, 48);
        const ctx = canvas.getContext('2d')!;
        if (kind === 'caller') { ctx.fillStyle='#142a3a';ctx.fillRect(37,16,5,10);ctx.fillStyle='#8ae0ed';ctx.fillRect(38,17,3,7); }
        if (kind === 'charger') { ctx.fillStyle='#9e332c';ctx.fillRect(12,7,25,3);ctx.fillStyle='#f9d784';ctx.fillRect(13,7,4,2); }
        return canvas;
      });
      bank.marco[kind].windup = frame(marco, act(kind==='caller'?1:kind==='charger'?3:0), scale, 48,48);
      bank.marco[kind].squished = frame(marco, act(7), scale, 48,22);
    }
    const boss = (pose: number, stunned = false) => {
      const canvas = frame(marco, act(pose), scale * 1.5, 80,80);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle='#2a202c';ctx.fillRect(24,2,32,11);ctx.fillStyle='#edb94d';ctx.fillRect(25,5,30,7);
      for(const x of [25,38,51]) ctx.fillRect(x,0,5,8);
      ctx.fillStyle='#fff0b5';ctx.fillRect(39,1,3,3);
      if(stunned){ctx.fillStyle='#ffe5a0';for(const x of [18,40,62])ctx.fillRect(x,14,3,3);}
      return canvas;
    };
    bank.boss.shielded=[boss(0),boss(1)]; bank.boss.vulnerable=[boss(5,true),boss(6,true)]; bank.boss.charging=boss(4);
  });
  installSwimming(bank);
  installLuxuryProps(bank);
}

export function installPolishedYacht(bank: SpriteBank) {
  loadArt('yacht', '/assets/polish/yacht-v3.png', image => {
    const b = bounds(image, {x:0,y:0,w:image.width,h:image.height});
    const stage = document.createElement('canvas'); stage.width=340;stage.height=192;
    const ctx=stage.getContext('2d')!;ctx.imageSmoothingEnabled=false;
    const scale=330/b.w;
    ctx.drawImage(image,b.x,b.y,b.w,b.h,5,Math.round(105-b.h*.678*scale),330,Math.round(b.h*scale));
    const dst=bank.props.superYacht;const target=dst.getContext('2d')!;target.clearRect(0,0,dst.width,dst.height);target.imageSmoothingEnabled=false;
    target.drawImage(stage,0,0,dst.width,dst.height);
    for(const guest of bank.props.vipWomen) guest.getContext('2d')!.clearRect(0,0,guest.width,guest.height);
  });
}

function installSwimming(bank: SpriteBank) {
  loadArt('swimming', '/assets/polish/pao-swim-v3.png', image => {
    // Use the four coherent crawl poses. Anchor on the goggles so his head stays
    // at the surface while the recovery arm and alternating feet move around it.
    const source = [0,1,2,3].map(c => cleanCell(image, cell(image,c,0,4,2)));
    const scale = 92 / Math.max(...source.map(s => s.box.w));
    for(const costume of Object.keys(bank.costumes) as PaoCostume[]) {
      bank.costumes[costume].swim = source.map(({canvas,box}) => {
        const pixels=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;
        let sx=0,sy=0,n=0;
        for(let y=box.y;y<box.y+box.h;y++)for(let x=Math.round(box.x+box.w*.56);x<box.x+box.w;x++){
          const i=(y*canvas.width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
          if(pixels[i+3]>160 && b>75 && b>r*1.6 && g>r*1.2){sx+=x;sy+=y;n++;}
        }
        const eyeX=n?sx/n:box.x+box.w*.76, eyeY=n?sy/n:box.y+box.h*.39;
        const out=document.createElement('canvas');out.width=108;out.height=72;
        const ctx=out.getContext('2d')!;ctx.imageSmoothingEnabled=false;
        ctx.drawImage(canvas,box.x,box.y,box.w,box.h,Math.round(80+(box.x-eyeX)*scale),Math.round(30+(box.y-eyeY)*scale),Math.round(box.w*scale),Math.round(box.h*scale));
        tintOutfit(out,costume,true);
        return out;
      });
    }
  });
}

function installLuxuryProps(bank: SpriteBank) {
  loadArt('watch','/assets/polish/rm-blue-v3.png',image=>{
    const clean=cleanCell(image,{x:0,y:0,w:image.width,h:image.height}),b=clean.box;
    bank.props.scooterPickup=[0,1].map(i=>{
      const out=document.createElement('canvas');out.width=38;out.height=50;
      const ctx=out.getContext('2d')!;ctx.imageSmoothingEnabled=false;
      const scale=Math.min(37/b.w,49/b.h),w=Math.round(b.w*scale),h=Math.round(b.h*scale);
      ctx.drawImage(clean.canvas,b.x,b.y,b.w,b.h,Math.round((38-w)/2),0,w,h);
      if(i){ctx.fillStyle='#efffff';ctx.fillRect(28,10,5,1);ctx.fillRect(30,8,1,5);}
      return out;
    });
  });
  loadArt('car','/assets/polish/aventador-gold-v3.png',image=>{
    const source=[{x:0,y:0,w:image.width,h:600},{x:0,y:600,w:image.width,h:image.height-600}].map(r=>cleanCell(image,r));
    bank.props.goldenLambo=source.map(({canvas,box})=>{
      const out=document.createElement('canvas');out.width=176;out.height=96;
      const ctx=out.getContext('2d')!;ctx.imageSmoothingEnabled=false;
      const scale=Math.min(172/box.w,94/box.h),w=Math.round(box.w*scale),h=Math.round(box.h*scale);
      ctx.drawImage(canvas,box.x,box.y,box.w,box.h,Math.round((176-w)/2),95-h,w,h);
      return out;
    });
  });
}

export function installPackedSprites(bank:SpriteBank) {
  loadArt('pao','/assets/polish/game-atlas-v3.png',image=>{
    for(const f of ART_ATLAS){
      const canvas=document.createElement('canvas');canvas.width=f.w;canvas.height=f.h;
      const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
      ctx.drawImage(image,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
      const parts=f.path.split('.');let target:any=bank;
      for(const part of parts.slice(0,-1))target=target[part];
      target[parts[parts.length-1]]=canvas;
    }
    for(const set of Object.values(bank.costumes))set.polished=true;
    for(const guest of bank.props.vipWomen)guest.getContext('2d')!.clearRect(0,0,guest.width,guest.height);
    for(const name of ['marco','swimming','watch','car','yacht'])loaded.add(name);
  });
}
