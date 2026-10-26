import { useEffect, useRef } from 'react';
import type { TouchInputRef } from './GameCanvas';

export type MobileControlMode = 'gestures' | 'joystick' | 'buttons';

const CONTROL_MODES: Array<{ id: MobileControlMode; label: string; description: string }> = [
  { id: 'gestures', label: 'GESTES', description: 'Glisse gauche ou droite pour bouger, vers le haut pour sauter, vers le bas pour faire un slam.' },
  { id: 'joystick', label: 'JOYSTICK', description: 'Pousse le joystick à gauche ou à droite pour bouger, vers le haut pour sauter, vers le bas pour faire un slam.' },
  { id: 'buttons', label: 'BOUTONS', description: 'Utilise les flèches à gauche, SAUT pour sauter et SLAM pour plonger.' },
];

export function MobileControlPicker({ mode, onChange }: { mode: MobileControlMode; onChange: (mode: MobileControlMode) => void }) {
  return <div className="control-picker" role="group" aria-label="Mode de commandes tactiles">
    {CONTROL_MODES.map(option => <button
      key={option.id}
      type="button"
      title={option.description}
      aria-label={`${option.label} : ${option.description}`}
      aria-pressed={mode === option.id}
      className={mode === option.id ? 'selected' : ''}
      onClick={() => onChange(option.id)}
    >{option.label}</button>)}
  </div>;
}

type GesturePointer = { startX: number; startY: number; left: boolean; right: boolean; jump: boolean; down: boolean };

export function MobileControls({ input, mode }: { input: React.RefObject<TouchInputRef>; mode: MobileControlMode }) {
  const directionPointer = useRef<number | null>(null);
  const actionPointers = useRef(new Map<number, 'jump' | 'down'>());
  const gesturePointers = useRef(new Map<number, GesturePointer>());
  const joystickPointer = useRef<number | null>(null);
  const joystickKnob = useRef<HTMLSpanElement>(null);
  const dpadState = useRef({ left: false, right: false });
  const joystickState = useRef({ left: false, right: false, jump: false, down: false });

  const syncInputs = (jumpWasHeld = input.current.jump, downWasHeld = Boolean(input.current.down)) => {
    const gestures = [...gesturePointers.current.values()];
    const actions = [...actionPointers.current.values()];
    const left = dpadState.current.left || joystickState.current.left || gestures.some(pointer => pointer.left);
    const right = dpadState.current.right || joystickState.current.right || gestures.some(pointer => pointer.right);
    const jump = joystickState.current.jump || gestures.some(pointer => pointer.jump) || actions.includes('jump');
    const down = joystickState.current.down || gestures.some(pointer => pointer.down) || actions.includes('down');
    Object.assign(input.current, { left, right, jump, down });
    if (jump && !jumpWasHeld) input.current.jumpJustPressed = true;
    if (down && !downWasHeld) input.current.downJustPressed = true;
  };

  const reset = () => {
    directionPointer.current = null;
    actionPointers.current.clear();
    gesturePointers.current.clear();
    joystickPointer.current = null;
    dpadState.current = { left: false, right: false };
    joystickState.current = { left: false, right: false, jump: false, down: false };
    if (joystickKnob.current) {
      joystickKnob.current.style.setProperty('--joy-x', '0px');
      joystickKnob.current.style.setProperty('--joy-y', '0px');
    }
    Object.assign(input.current, { left: false, right: false, jump: false, jumpJustPressed: false, down: false, downJustPressed: false });
  };

  useEffect(() => {
    window.addEventListener('blur', reset);
    window.addEventListener('resize', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      reset();
      window.removeEventListener('blur', reset);
      window.removeEventListener('resize', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [mode]);

  const capture = (e: React.PointerEvent<HTMLElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* Synthetic events can omit native pointer state. */ }
  };

  const startGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    capture(e);
    gesturePointers.current.set(e.pointerId, { startX: e.clientX, startY: e.clientY, left: false, right: false, jump: false, down: false });
  };

  const moveGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    const pointer = gesturePointers.current.get(e.pointerId);
    if (!pointer) return;
    e.preventDefault();
    const dx = e.clientX - pointer.startX;
    const dy = e.clientY - pointer.startY;
    const threshold = 24;
    pointer.left = Math.abs(dx) > threshold && Math.abs(dx) >= Math.abs(dy) && dx < 0;
    pointer.right = Math.abs(dx) > threshold && Math.abs(dx) >= Math.abs(dy) && dx > 0;
    pointer.jump = Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx) && dy < 0;
    pointer.down = Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx) && dy > 0;
    syncInputs();
  };

  const endGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!gesturePointers.current.delete(e.pointerId)) return;
    syncInputs();
  };

  const direction = (e: React.PointerEvent<HTMLDivElement>, start = false) => {
    if (start) { e.preventDefault(); directionPointer.current = e.pointerId; capture(e); }
    if (directionPointer.current !== e.pointerId) return;
    const target = start ? (e.target as HTMLElement).closest<HTMLElement>('[data-direction]') : null;
    const rect = e.currentTarget.getBoundingClientRect();
    const left = target ? target.dataset.direction === 'left' : e.clientX < rect.left + rect.width / 2;
    dpadState.current = { left, right: !left };
    syncInputs();
  };

  const releaseDirection = (e: React.PointerEvent) => {
    if (directionPointer.current !== e.pointerId) return;
    directionPointer.current = null;
    dpadState.current = { left: false, right: false };
    syncInputs();
  };

  const endAction = (e: React.PointerEvent) => {
    const action = actionPointers.current.get(e.pointerId);
    if (!action) return;
    actionPointers.current.delete(e.pointerId);
    syncInputs();
  };

  const startAction = (e: React.PointerEvent<HTMLButtonElement>, action: 'jump' | 'down') => {
    e.preventDefault();
    capture(e);
    actionPointers.current.set(e.pointerId, action);
    syncInputs();
  };

  const moveJoystick = (e: React.PointerEvent<HTMLDivElement>, start = false) => {
    if (start) {
      e.preventDefault();
      joystickPointer.current = e.pointerId;
      capture(e);
    }
    if (joystickPointer.current !== e.pointerId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const radius = Math.max(1, rect.width / 2 - 22);
    const rawX = e.clientX - (rect.left + rect.width / 2);
    const rawY = e.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(rawX, rawY);
    const scale = distance > radius ? radius / distance : 1;
    const x = rawX * scale;
    const y = rawY * scale;
    joystickKnob.current?.style.setProperty('--joy-x', `${x}px`);
    joystickKnob.current?.style.setProperty('--joy-y', `${y}px`);
    joystickState.current = {
      left: x < -radius * 0.3,
      right: x > radius * 0.3,
      jump: y < -radius * 0.36,
      down: y > radius * 0.36,
    };
    syncInputs();
  };

  const endJoystick = (e: React.PointerEvent) => {
    if (joystickPointer.current !== e.pointerId) return;
    joystickPointer.current = null;
    if (joystickKnob.current) {
      joystickKnob.current.style.setProperty('--joy-x', '0px');
      joystickKnob.current.style.setProperty('--joy-y', '0px');
    }
    joystickState.current = { left: false, right: false, jump: false, down: false };
    syncInputs();
  };

  return <div data-testid="mobile-touch-overlay" className={`mobile-controls mobile-controls-${mode}`}>
    {mode === 'gestures' && <div
      className="gesture-surface"
      data-testid="mobile-gesture-surface"
      aria-label="Glisse à gauche ou à droite pour bouger, vers le haut pour sauter, vers le bas pour faire un slam"
      onPointerDown={startGesture}
      onPointerMove={moveGesture}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onLostPointerCapture={endGesture}
    />}
    {mode === 'buttons' && <div data-testid="mobile-dpad" className="mobile-dpad" onPointerDown={e => direction(e, true)} onPointerMove={e => direction(e)} onPointerUp={releaseDirection} onPointerCancel={releaseDirection} onLostPointerCapture={releaseDirection}>
      <button type="button" data-testid="dpad-left-btn" data-direction="left" aria-label="Move Left">◀</button>
      <button type="button" data-testid="dpad-right-btn" data-direction="right" aria-label="Move Right">▶</button>
    </div>}
    {mode === 'joystick' && <div
      className="mobile-joystick"
      data-testid="mobile-joystick"
      role="group"
      aria-label="Joystick tactile : gauche et droite pour bouger, haut pour sauter, bas pour faire un slam"
      onPointerDown={e => moveJoystick(e, true)}
      onPointerMove={e => moveJoystick(e)}
      onPointerUp={endJoystick}
      onPointerCancel={endJoystick}
      onLostPointerCapture={endJoystick}
    ><span ref={joystickKnob} className="mobile-joystick-knob" /></div>}
    <div className="mobile-actions">
      <button type="button" data-testid="action-slam-btn" aria-label="Ground Pound Slam or VIP Camera Pose" onPointerDown={e => startAction(e, 'down')} onPointerUp={endAction} onPointerCancel={endAction} onLostPointerCapture={endAction}><span>SLAM</span><small>POSE AU SOL</small></button>
      <button type="button" data-testid="action-jump-btn" aria-label="Jump and Stomp" onPointerDown={e => startAction(e, 'jump')} onPointerUp={endAction} onPointerCancel={endAction} onLostPointerCapture={endAction}><span>SAUT</span><small>×2</small></button>
    </div>
  </div>;
}
