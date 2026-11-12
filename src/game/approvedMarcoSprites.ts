import type { PaoSpriteSet } from './sprites';

/** Generated from the user's approved V2 model; no game physics live here. */
const SHEETS = {
  ground: { url: '/assets/marco/marco-ground-v2.png', columns: 4, rows: 4 },
  actions: { url: '/assets/marco/marco-actions-v2.png', columns: 4, rows: 4 },
  swim: { url: '/assets/marco/marco-swim-v2.png', columns: 4, rows: 2 },
} as const;
type SheetName = keyof typeof SHEETS;
type Box = { x: number; y: number; w: number; h: number };
type Cell = { canvas: HTMLCanvasElement; box: Box; column: number; row: number; sheet: SheetName };
export type MarcoFrameAudit = {
  name: string; sheet: SheetName; column: number; row: number;
  sourceSize: { width: number; height: number }; content: Box;
  outputSize: { width: number; height: number }; scale: number;
  anchor: { sourceX: number; sourceY: number; outputX: number; outputY: number };
};
type Runtime = {
  images: Map<SheetName, HTMLImageElement>; pending: Set<SheetName>; failed: Set<string>;
  started: boolean; approved?: PaoSpriteSet; audit: MarcoFrameAudit[];
};
const host = window as Window & { __mcpaoApprovedMarcoV2?: Runtime };
// Vite's hot URLs and unversioned inspection imports must observe one loader.
const runtime: Runtime = host.__mcpaoApprovedMarcoV2 ??= {
  images: new Map(), pending: new Set(), failed: new Set(), started: false, audit: [],
};
const { images, pending, failed } = runtime;
if (import.meta.hot) import.meta.hot.dispose(() => { delete host.__mcpaoApprovedMarcoV2; });

function notify() { window.dispatchEvent(new Event('mcpao-art-ready')); }
export function getMarcoArtStatus() {
  return { ready: !!runtime.approved, loaded: images.size, total: Object.keys(SHEETS).length, errors: [...failed] };
}
export function getMarcoFrameAudit(): readonly MarcoFrameAudit[] { return runtime.audit; }

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!; ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}
function median(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered.length % 2 ? ordered[Math.floor(ordered.length / 2)] : (ordered[ordered.length / 2 - 1] + ordered[ordered.length / 2]) / 2;
}

/** Remove only tiny remote flecks; retain separate fingers, bottle glints and shoes. */
function inspectCell(image: HTMLImageElement, sheet: SheetName, column: number, row: number): Cell {
  const layout = SHEETS[sheet];
  const left = Math.round(column * image.width / layout.columns), top = Math.round(row * image.height / layout.rows);
  const width = Math.round((column + 1) * image.width / layout.columns) - left;
  const height = Math.round((row + 1) * image.height / layout.rows) - top;
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.drawImage(image, left, top, width, height, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height), pixels = data.data;
  // Generated transparent PNGs can retain alpha1–2 residue and a faint halo.
  // Native game pixels need binary coverage, without altering their RGB palette.
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = pixels[i] >= 128 ? 255 : 0;
  const seen = new Uint8Array(width * height), queue = new Int32Array(seen.length);
  const components: { indices: number[]; box: Box }[] = [];
  for (let n = 0; n < seen.length; n++) {
    if (seen[n] || pixels[n * 4 + 3] < 64) continue;
    let head = 0, tail = 1, minX = width, minY = height, maxX = -1, maxY = -1;
    queue[0] = n; seen[n] = 1; const indices: number[] = [];
    while (head < tail) {
      const i = queue[head++], x = i % width, y = Math.floor(i / width);
      indices.push(i); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, j = ny * width + nx;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen[j] || pixels[j * 4 + 3] < 64) continue;
        seen[j] = 1; queue[tail++] = j;
      }
    }
    components.push({ indices, box: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } });
  }
  const main = components.reduce<(typeof components)[number] | undefined>((largest, part) => !largest || part.indices.length > largest.indices.length ? part : largest, undefined);
  if (!main || main.indices.length < width * height * .015) throw new Error(`Marco ${sheet} ${column},${row} has no complete actor`);
  const transparent = pixels.reduce((count, value, index) => count + (index % 4 === 3 && value < 32 ? 1 : 0), 0);
  if (transparent < width * height * .03) throw new Error(`Marco ${sheet} must preserve a transparent sprite background`);
  const margin = Math.max(width, height) * .07;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (const part of components) {
    const b = part.box;
    const near = b.x + b.w >= main.box.x - margin && b.x <= main.box.x + main.box.w + margin
      && b.y + b.h >= main.box.y - margin && b.y <= main.box.y + main.box.h + margin;
    const significant = part.indices.length >= main.indices.length * .003;
    if (!near && !significant) { for (const i of part.indices) pixels[i * 4 + 3] = 0; continue; }
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w - 1); maxY = Math.max(maxY, b.y + b.h - 1);
  }
  ctx.putImageData(data, 0, 0);
  return { canvas, sheet, column, row, box: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } };
}

function compile() {
  if (images.size !== Object.keys(SHEETS).length) return;
  const cells = {} as Record<SheetName, Cell[]>;
  for (const sheet of Object.keys(SHEETS) as SheetName[]) {
    const layout = SHEETS[sheet];
    cells[sheet] = Array.from({ length: layout.columns * layout.rows }, (_, i) => inspectCell(images.get(sheet)!, sheet, i % layout.columns, Math.floor(i / layout.columns)));
  }
  runtime.audit = [];
  const idle = cells.ground.slice(8, 12);
  const standingActions = [cells.actions[7], ...cells.actions.slice(8)];
  // Each sheet uses a fixed hip centre and foot baseline, but the generated
  // portrait action sheet has a different cell aspect ratio and actor scale.
  // Calibrate its standing poses once, never resize each action to tight bounds.
  const calibrate = (reference: Cell[], all: Cell[]) => {
    const baseline = median(reference.map(c => (c.box.y + c.box.h) / c.canvas.height));
    const nominal = 70 / median(reference.map(c => c.box.h / c.canvas.height));
    const horizontal = Math.max(...all.map(c => Math.max(Math.abs((c.box.x - c.canvas.width / 2) / c.canvas.height), Math.abs((c.box.x + c.box.w - c.canvas.width / 2) / c.canvas.height))));
    const highest = Math.max(...all.map(c => baseline - c.box.y / c.canvas.height));
    return { baseline, unit: Math.min(nominal, 38 / Math.max(.01, horizontal), 77 / Math.max(.01, highest)) };
  };
  const calibration = {
    ground: calibrate(idle, cells.ground),
    actions: calibrate(standingActions, cells.actions),
  };
  const paint = (cell: Cell, name: string, outputWidth = 80, outputHeight = 80, sourceAnchor?: { x: number; y: number }, outputAnchor = { x: 40, y: 79 }, scaleOverride?: number) => {
    const { canvas, ctx } = makeCanvas(outputWidth, outputHeight);
    const fixed = cell.sheet === 'actions' ? calibration.actions : calibration.ground;
    const anchor = sourceAnchor ?? { x: cell.canvas.width / 2, y: cell.canvas.height * fixed.baseline };
    const scale = scaleOverride ?? fixed.unit / cell.canvas.height;
    const dx = Math.round(outputAnchor.x - anchor.x * scale);
    // The portrait sheet's resampling otherwise rounds the common shoe line
    // one native pixel above the ground sheet. One shared offset preserves air.
    const sheetOffset = cell.sheet === 'actions' ? 1 : 0;
    const dy = Math.round(outputAnchor.y - anchor.y * scale) + sheetOffset;
    ctx.drawImage(cell.canvas, dx, dy, Math.round(cell.canvas.width * scale), Math.round(cell.canvas.height * scale));
    runtime.audit.push({ name, sheet: cell.sheet, column: cell.column, row: cell.row, sourceSize: { width: cell.canvas.width, height: cell.canvas.height }, content: { ...cell.box }, outputSize: { width: outputWidth, height: outputHeight }, scale, anchor: { sourceX: anchor.x, sourceY: anchor.y, outputX: outputAnchor.x, outputY: outputAnchor.y + sheetOffset } });
    return canvas;
  };
  const ground = (index: number, name: string) => paint(cells.ground[index], name);
  const action = (index: number, name: string) => paint(cells.actions[index], name);
  const idleFrames = Array.from({ length: 4 }, (_, i) => ground(i + 8, `idle.${i}`));
  const run = Array.from({ length: 8 }, (_, i) => ground(i, `run.${i}`));
  const { canvas: icon, ctx: iconCtx } = makeCanvas(24, 24);
  iconCtx.drawImage(idleFrames[0], 22, 7, 36, 34, 0, 0, 24, 24);
  // Horizontal sheets are authored around a fixed eye point, preserving a calm
  // head at the waterline while recovery arms and flutter kick move around it.
  const swimUnit = 92 / median(cells.swim.map(c => c.box.w / c.canvas.width));
  const swim = cells.swim.map((c, i) => paint(c, `swim.${i}`, 108, 72,
    { x: c.canvas.width * .718, y: c.canvas.height * .398 }, { x: 80, y: 30 }, swimUnit / c.canvas.width));
  runtime.approved = {
    source: 'approved-v2', polished: true, runCycleDistance: 80, sprintCycleDistance: 92,
    idle: idleFrames, run, land: [ground(12, 'land.0'), ground(13, 'land.1')],
    hurt: ground(14, 'hurt'), stomp: ground(15, 'stomp'),
    jump: action(0, 'jump'), apex: action(1, 'apex'), fall: action(2, 'fall'), doubleJump: action(3, 'doubleJump'),
    groundPound: action(4, 'groundPound'), defeat: action(5, 'defeat'), carEntry: action(6, 'carEntry'), victory: action(7, 'victory'),
    vipPose: Array.from({ length: 8 }, (_, i) => action(i + 8, `vipPose.${i}`)),
    scooter: run, swim, headIcon: icon,
  };
}

/** Start once; retry=true reloads only failed sheets and retries compilation. */
export function preloadMarcoArtwork(retry = false) {
  if (runtime.approved || (runtime.started && !retry)) return;
  runtime.started = true;
  if (retry) failed.clear();
  for (const sheet of Object.keys(SHEETS) as SheetName[]) {
    if (images.has(sheet) || pending.has(sheet)) continue;
    pending.add(sheet);
    const image = new Image();
    image.onload = () => {
      pending.delete(sheet); images.set(sheet, image);
      try { compile(); } catch (error) { failed.add('marco-frames'); console.error('Approved Marco artwork:', error); }
      notify();
    };
    image.onerror = () => { pending.delete(sheet); failed.add(`marco-${sheet}`); notify(); };
    image.src = SHEETS[sheet].url;
  }
  if (retry && images.size === Object.keys(SHEETS).length) {
    try { compile(); } catch (error) { failed.add('marco-frames'); console.error('Approved Marco artwork:', error); }
    notify();
  }
}
export function getApprovedMarcoSpriteSet(fallback: PaoSpriteSet): PaoSpriteSet {
  preloadMarcoArtwork();
  return runtime.approved ?? fallback;
}
