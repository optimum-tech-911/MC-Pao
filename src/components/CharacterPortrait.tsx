import { useEffect, useRef } from 'react';
import { getSpriteBank } from '../game/sprites';
import type { PaoCostume } from '../game/rules';

export function CharacterPortrait({kind,costume='yacht_black_vip',className}: {kind:'pao'|'marco';costume?:PaoCostume;className?:string}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const bank=getSpriteBank();
    const draw=()=>{
      const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d')!;
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
      if(!bank.costumes.yacht_black_vip.polished)return;
      const frames=kind==='pao'?bank.costumes[costume].idle:bank.marco.waddler.walk;
      const frame=frames[Math.floor(performance.now()/(kind==='pao'?440:180))%frames.length];
      ctx.drawImage(frame,0,0,canvas.width,canvas.height);
    };
    draw();const timer=window.setInterval(draw,160);window.addEventListener('mcpao-art-ready',draw);
    return()=>{clearInterval(timer);window.removeEventListener('mcpao-art-ready',draw);};
  },[kind,costume]);
  return <canvas ref={ref} width={kind==='pao'?80:48} height={kind==='pao'?80:48} className={className ?? `title-${kind}`} aria-hidden="true"/>;
}
