import type { MarcoArchetype } from './rules';
import type { SpriteBank } from './sprites';

const SOURCE = 'approved-mini-pao-v1' as const;
const SHEETS = {
  ground: { url: '/assets/pao-rival/mini-pao-ground-v1.png', columns: 4, rows: 4 },
  charge: { url: '/assets/pao-rival/mini-pao-charge-v1.png', columns: 4, rows: 2 },
} as const;
type SheetName = keyof typeof SHEETS;
type Box = { x: number; y: number; w: number; h: number };
type Cell = { canvas: HTMLCanvasElement; box: Box; column: number; row: number; sheet: SheetName };
type RivalPose = SpriteBank['marco'][MarcoArchetype] & {
  source: typeof SOURCE; windupFrames: HTMLCanvasElement[]; charge: HTMLCanvasElement[]; squishedFrames: HTMLCanvasElement[];
};
type RivalBoss = SpriteBank['boss'] & {
  source: typeof SOURCE; chargingFrames: HTMLCanvasElement[]; windupFrames: HTMLCanvasElement[];
};
export type PaoRivalFrameAudit = {
  name: string; sheet: SheetName; column: number; row: number; content: Box;
  sourceSize: { width: number; height: number }; outputSize: { width: number; height: number };
  scale: number; anchor: { sourceX: number; sourceY: number; outputX: number; outputY: number };
};
type Runtime = {
  images: Map<SheetName, HTMLImageElement>; pending: Set<SheetName>; failed: Set<string>; started: boolean;
  rivals?: Record<MarcoArchetype, RivalPose>; boss?: RivalBoss; audit: PaoRivalFrameAudit[];
};
const host = window as Window & { __mcpaoApprovedPaoRivalsV1?: Runtime };
const runtime: Runtime = host.__mcpaoApprovedPaoRivalsV1 ??= {
  images: new Map(), pending: new Set(), failed: new Set(), started: false, audit: [],
};
const { images, pending, failed } = runtime;
if (import.meta.hot) import.meta.hot.dispose(() => { delete host.__mcpaoApprovedPaoRivalsV1; });
function notify() { window.dispatchEvent(new Event('mcpao-art-ready')); }
export function getPaoRivalArtStatus() {
  return { ready: !!runtime.rivals && !!runtime.boss, loaded: images.size, total: 2, errors: [...failed] };
}
export function getPaoRivalFrameAudit(): readonly PaoRivalFrameAudit[] { return runtime.audit; }
function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!; ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}
function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function inspectCell(image: HTMLImageElement, sheet: SheetName, column: number, row: number): Cell {
  const layout = SHEETS[sheet];
  const left = Math.round(column * image.width / layout.columns), top = Math.round(row * image.height / layout.rows);
  const width = Math.round((column + 1) * image.width / layout.columns) - left;
  const height = Math.round((row + 1) * image.height / layout.rows) - top;
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.drawImage(image, left, top, width, height, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height), pixels = data.data;
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = pixels[i] >= 128 ? 255 : 0;
  const seen = new Uint8Array(width * height), queue = new Int32Array(seen.length);
  const components: { indices: number[]; box: Box }[] = [];
  for (let n = 0; n < seen.length; n++) {
    if (seen[n] || pixels[n * 4 + 3] === 0) continue;
    let head = 0, tail = 1, minX = width, minY = height, maxX = -1, maxY = -1;
    queue[0] = n; seen[n] = 1; const indices: number[] = [];
    while (head < tail) {
      const i = queue[head++], x = i % width, y = Math.floor(i / width);
      indices.push(i); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, j = ny * width + nx;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen[j] || pixels[j * 4 + 3] === 0) continue;
        seen[j] = 1; queue[tail++] = j;
      }
    }
    components.push({ indices, box: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } });
  }
  const main = components.reduce<(typeof components)[number] | undefined>((largest, part) => !largest || part.indices.length > largest.indices.length ? part : largest, undefined);
  if (!main || main.indices.length < width * height * .01) throw new Error(`Mini Pao ${sheet} ${column},${row} has no actor`);
  let transparent = 0; for (let i = 3; i < pixels.length; i += 4) if (!pixels[i]) transparent++;
  if (transparent < width * height * .03) throw new Error(`Mini Pao ${sheet} must have transparent cells`);
  const margin = Math.max(width, height) * .07;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (const part of components) {
    const b = part.box;
    const near = b.x + b.w >= main.box.x - margin && b.x <= main.box.x + main.box.w + margin
      && b.y + b.h >= main.box.y - margin && b.y <= main.box.y + main.box.h + margin;
    if (!near && part.indices.length < main.indices.length * .003) { for (const i of part.indices) pixels[i * 4 + 3] = 0; continue; }
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w - 1); maxY = Math.max(maxY, b.y + b.h - 1);
  }
  ctx.putImageData(data, 0, 0);
  return { canvas, sheet, column, row, box: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } };
}
function calibration(reference: Cell[], all: Cell[], actorHeight: number, maxWidth: number, maxHeight: number) {
  const baseline = median(reference.map(c => (c.box.y + c.box.h) / c.canvas.height));
  const nominal = actorHeight / median(reference.map(c => c.box.h / c.canvas.height));
  const horizontal = Math.max(...all.map(c => Math.max(Math.abs((c.box.x - c.canvas.width / 2) / c.canvas.height), Math.abs((c.box.x + c.box.w - c.canvas.width / 2) / c.canvas.height))));
  const highest = Math.max(...all.map(c => baseline - c.box.y / c.canvas.height));
  return { baseline, unit: Math.min(nominal, maxWidth / (2 * Math.max(.01, horizontal)), maxHeight / Math.max(.01, highest)) };
}
function compile() {
  if (images.size !== 2) return;
  const cells = {} as Record<SheetName, Cell[]>;
  for (const sheet of Object.keys(SHEETS) as SheetName[]) {
    const layout = SHEETS[sheet];
    cells[sheet] = Array.from({ length: layout.columns * layout.rows }, (_, i) => inspectCell(images.get(sheet)!, sheet, i % layout.columns, Math.floor(i / layout.columns)));
  }
  runtime.audit = [];
  const references = { ground: cells.ground.slice(8, 12), charge: cells.charge };
  // The generated ground sheet's column centres drift progressively left.
  // One calibrated hip centre per column corrects layout drift, while keeping
  // each pose's own limb/head motion rather than centring every tight box.
  const groundCentres = Array.from({ length: 4 }, (_, column) => median([0, 1, 2].map(row => { const c = cells.ground[row * 4 + column]; return (c.box.x + c.box.w / 2) / c.canvas.width; })));
  const chargeCentre = median(cells.charge.map(c => (c.box.x + c.box.w / 2) / c.canvas.width));
  const anticipationBaseline = median(cells.ground.slice(12, 14).map(c => (c.box.y + c.box.h) / c.canvas.height));
  const seatedBaseline = median(cells.ground.slice(14).map(c => (c.box.y + c.box.h) / c.canvas.height));
  const mini = {
    ground: calibration(references.ground, cells.ground.slice(0, 14), 44, 46, 46),
    charge: calibration(references.charge, cells.charge, 44, 46, 46),
  };
  const boss = {
    ground: calibration(references.ground, cells.ground.slice(0, 14), 74, 77, 77),
    charge: calibration(references.charge, cells.charge, 74, 77, 77),
  };
  const paint = (cell: Cell, name: string, large = false, squished = false) => {
    const width = large ? 80 : 48, height = squished ? 38 : large ? 80 : 48;
    const fixed = (large ? boss : mini)[cell.sheet];
    let scale = fixed.unit / cell.canvas.height;
    if (squished) {
      const half = Math.max(...cells.ground.slice(14).map(c => { const centre = groundCentres[c.column] * c.canvas.width; return Math.max(Math.abs(c.box.x - centre), Math.abs(c.box.x + c.box.w - centre)); }));
      scale = Math.min(scale, 23 / half, 36 / Math.max(...cells.ground.slice(14).map(c => c.box.h)));
    }
    const groundIndex = cell.row * 4 + cell.column;
    const baseline = squished ? seatedBaseline : cell.sheet === 'ground' && groundIndex >= 12 ? anticipationBaseline : fixed.baseline;
    const anchor = { x: cell.canvas.width * (cell.sheet === 'ground' ? groundCentres[cell.column] : chargeCentre), y: cell.canvas.height * baseline };
    // Source baselines describe the boundary below the last shoe pixel.
    const output = { x: width / 2, y: height };
    const { canvas, ctx } = makeCanvas(width, height);
    ctx.drawImage(cell.canvas, Math.round(output.x - anchor.x * scale), Math.round(output.y - anchor.y * scale), Math.round(cell.canvas.width * scale), Math.round(cell.canvas.height * scale));
    runtime.audit.push({ name, sheet: cell.sheet, column: cell.column, row: cell.row, content: { ...cell.box }, sourceSize: { width: cell.canvas.width, height: cell.canvas.height }, outputSize: { width, height }, scale, anchor: { sourceX: anchor.x, sourceY: anchor.y, outputX: output.x, outputY: output.y } });
    return canvas;
  };
  const walk = cells.ground.slice(0, 8).map((c, i) => paint(c, `walk.${i}`));
  const phone = cells.ground.slice(8, 12).map((c, i) => paint(c, `phone.${i}`));
  const anticipation = cells.ground.slice(12, 14).map((c, i) => paint(c, `anticipation.${i}`));
  const squished = cells.ground.slice(14).map((c, i) => paint(c, `squished.${i}`, false, true));
  const charge = cells.charge.map((c, i) => paint(c, `charge.${i}`));
  const rivals = {} as Record<MarcoArchetype, RivalPose>;
  for (const kind of ['waddler', 'caller', 'charger'] as MarcoArchetype[]) {
    const windupFrames = kind === 'caller' ? phone : anticipation;
    rivals[kind] = { source: SOURCE, walk, windup: windupFrames[0], windupFrames, charge, squished: squished[0], squishedFrames: squished };
  }
  runtime.rivals = rivals;
  const chargingFrames = cells.charge.map((c, i) => paint(c, `boss.charge.${i}`, true));
  const windupFrames = cells.ground.slice(12, 14).map((c, i) => paint(c, `boss.windup.${i}`, true));
  runtime.boss = {
    source: SOURCE,
    shielded: [paint(cells.ground[0], 'boss.shielded.0', true), paint(cells.ground[4], 'boss.shielded.1', true)],
    vulnerable: [paint(cells.ground[11], 'boss.vulnerable.0', true), paint(cells.ground[12], 'boss.vulnerable.1', true)],
    charging: chargingFrames[0], chargingFrames, windupFrames,
  };
}
export function preloadPaoRivalArtwork(retry = false) {
  if ((runtime.rivals && runtime.boss) || (runtime.started && !retry)) return;
  runtime.started = true;
  if (retry) failed.clear();
  for (const sheet of Object.keys(SHEETS) as SheetName[]) {
    if (images.has(sheet) || pending.has(sheet)) continue;
    pending.add(sheet);
    const image = new Image();
    image.onload = () => {
      pending.delete(sheet); images.set(sheet, image);
      try { compile(); } catch (error) { failed.add('pao-rival-frames'); console.error('Approved Mini Pao artwork:', error); }
      notify();
    };
    image.onerror = () => { pending.delete(sheet); failed.add(`pao-rival-${sheet}`); notify(); };
    image.src = SHEETS[sheet].url;
  }
  if (retry && images.size === 2) {
    try { compile(); } catch (error) { failed.add('pao-rival-frames'); console.error('Approved Mini Pao artwork:', error); }
    notify();
  }
}
export function getApprovedPaoRivals(fallback: SpriteBank['marco']): SpriteBank['marco'] {
  preloadPaoRivalArtwork(); return runtime.rivals ?? fallback;
}
export function getApprovedPaoBoss(fallback: SpriteBank['boss']): SpriteBank['boss'] {
  preloadPaoRivalArtwork(); return runtime.boss ?? fallback;
}
