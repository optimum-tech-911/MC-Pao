import { useEffect, useRef } from 'react';
import { getSpriteBank } from '../game/sprites';
import { getPlayerSpriteSet } from '../game/heroSprites';
import { getMarcoArtStatus, preloadMarcoArtwork } from '../game/approvedMarcoSprites';
import type { CharacterId } from '../game/characters';
import type { PaoCostume } from '../game/rules';

export function CharacterPortrait({kind,costume='yacht_black_vip',className}: {kind:CharacterId;costume?:PaoCostume;className?:string}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const bank=getSpriteBank();
    if(kind==='marco')preloadMarcoArtwork();
    const draw=()=>{
      const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d')!;
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
      if(kind === 'pao' && !bank.costumes.yacht_black_vip.polished)return;
      if(kind === 'marco' && !getMarcoArtStatus().ready)return;
      const frames=getPlayerSpriteSet(bank,kind,costume).idle;
      const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const frame=frames[reducedMotion?0:Math.floor(performance.now()/440)%frames.length];
      ctx.drawImage(frame,0,0,canvas.width,canvas.height);
    };
    draw();const timer=window.setInterval(draw,160);window.addEventListener('mcpao-art-ready',draw);
    return()=>{clearInterval(timer);window.removeEventListener('mcpao-art-ready',draw);};
  },[kind,costume]);
  return <canvas ref={ref} width={80} height={80} className={className ?? `title-${kind}`} aria-hidden="true"/>;
}
