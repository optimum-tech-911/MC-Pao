import { useEffect, useRef } from 'react';
import type { TouchInputRef } from './GameCanvas';

export function MobileControls({input}:{input:React.RefObject<TouchInputRef>}) {
  const directionPointer=useRef<number|null>(null);
  const actionPointers=useRef(new Map<number,'jump'|'down'>());
  const reset=()=>{
    directionPointer.current=null;actionPointers.current.clear();
    Object.assign(input.current,{left:false,right:false,jump:false,jumpJustPressed:false,down:false});
  };
  useEffect(()=>{
    window.addEventListener('blur',reset);window.addEventListener('resize',reset);
    document.addEventListener('visibilitychange',reset);
    return()=>{reset();window.removeEventListener('blur',reset);window.removeEventListener('resize',reset);document.removeEventListener('visibilitychange',reset);};
  },[]);
  const capture=(e:React.PointerEvent<HTMLElement>)=>{try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* Synthetic test events have no native pointer. */}};
  const releaseDirection=(e:React.PointerEvent)=>{
    if(directionPointer.current!==e.pointerId)return;
    directionPointer.current=null;input.current.left=false;input.current.right=false;
  };
  const direction=(e:React.PointerEvent<HTMLDivElement>,start=false)=>{
    if(start){e.preventDefault();directionPointer.current=e.pointerId;capture(e);}
    if(directionPointer.current!==e.pointerId)return;
    const target=start?(e.target as HTMLElement).closest<HTMLElement>('[data-direction]'):null;
    const r=e.currentTarget.getBoundingClientRect();
    const left=target?target.dataset.direction==='left':e.clientX<r.left+r.width/2;
    input.current.left=left;input.current.right=!left;
  };
  const endAction=(e:React.PointerEvent)=>{
    const action=actionPointers.current.get(e.pointerId);if(!action)return;
    actionPointers.current.delete(e.pointerId);
    input.current[action]=[...actionPointers.current.values()].includes(action);
  };
  const startAction=(e:React.PointerEvent<HTMLButtonElement>,action:'jump'|'down')=>{
    e.preventDefault();capture(e);
    if(action==='jump'&&!input.current.jump)input.current.jumpJustPressed=true;
    actionPointers.current.set(e.pointerId,action);input.current[action]=true;
  };
  return <div data-testid="mobile-touch-overlay" className="mobile-controls">
    <div data-testid="mobile-dpad" className="mobile-dpad" onPointerDown={e=>direction(e,true)} onPointerMove={e=>direction(e)} onPointerUp={releaseDirection} onPointerCancel={releaseDirection} onLostPointerCapture={releaseDirection}>
      <button type="button" data-testid="dpad-left-btn" data-direction="left" aria-label="Move Left">◀</button>
      <button type="button" data-testid="dpad-right-btn" data-direction="right" aria-label="Move Right">▶</button>
    </div>
    <div className="mobile-actions">
      <button type="button" data-testid="action-slam-btn" aria-label="Ground Pound Slam or VIP Camera Pose" onPointerDown={e=>startAction(e,'down')} onPointerUp={endAction} onPointerCancel={endAction} onLostPointerCapture={endAction}><span>SLAM</span><small>POSE AU SOL</small></button>
      <button type="button" data-testid="action-jump-btn" aria-label="Jump and Stomp" onPointerDown={e=>startAction(e,'jump')} onPointerUp={endAction} onPointerCancel={endAction} onLostPointerCapture={endAction}><span>SAUT</span><small>×2</small></button>
    </div>
  </div>;
}
