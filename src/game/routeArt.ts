import type { RouteLandmark } from './storyRoutes';

/** Decorative backdrops; the authored platforms remain the collision surfaces. */
export function drawRouteLandmark(ctx: CanvasRenderingContext2D, landmark: RouteLandmark, wine: HTMLCanvasElement) {
  const { x, y, kind, label } = landmark;
  const box = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(x + dx, y + dy, w, h);
  };
  const bottle = (dx: number, dy: number) => ctx.drawImage(wine, x + dx, y + dy, 9, 19);
  const sign = (dx: number, dy: number, w: number) => {
    box(dx - 2, dy - 2, w + 4, 20, '#51323b');
    box(dx, dy, w, 16, '#153b40');
    box(dx, dy, w, 1, '#e1bc72'); box(dx, dy + 15, w, 1, '#b58e51');
    ctx.fillStyle = '#ffe4ac'; ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center'; ctx.fillText(label, x + dx + w / 2, y + dy + 10, w - 8);
  };
  const barrel = (dx: number, dy: number) => {
    box(dx + 3, dy, 22, 4, '#4c3031'); box(dx, dy + 4, 28, 28, '#5b3430');
    box(dx + 2, dy + 3, 24, 29, '#a16946'); box(dx + 5, dy + 4, 3, 26, '#c28e5b');
    box(dx + 12, dy + 3, 2, 28, '#784b36'); box(dx + 20, dy + 5, 3, 24, '#754637');
    box(dx + 1, dy + 7, 26, 3, '#31464a'); box(dx + 1, dy + 24, 26, 3, '#31464a');
    box(dx + 2, dy + 8, 23, 1, '#9ca49a'); box(dx + 2, dy + 25, 23, 1, '#9ca49a');
    box(dx + 4, dy + 31, 20, 2, '#4c3031');
  };

  ctx.save();
  if (kind === 'terrace') {
    // A light pergola leaves the promenade and balcony silhouettes readable.
    box(-10, -114, 174, 5, '#47343a'); box(-8, -111, 170, 4, '#d7b67c');
    box(-6, -106, 6, 106, '#ceb68c'); box(-4, -106, 2, 106, '#f1dbad');
    box(153, -106, 6, 106, '#ceb68c'); box(154, -106, 2, 106, '#f1dbad');
    for (let i = 0; i < 8; i++) box(-7 + i * 23, -107, 11, 13, i % 2 ? '#e6cf9c' : '#87394d');
    sign(22, -139, 112);
    barrel(121, -34); bottle(130, -52);
    box(-6, -90, 10, 28, '#426847'); box(1, -91, 8, 14, '#73925d');
    box(149, -76, 12, 27, '#426847'); box(144, -70, 9, 15, '#73925d');
  } else if (kind === 'cellar') {
    box(-4, -135, 208, 135, '#8b6657'); box(0, -131, 200, 131, '#c4a589');
    box(6, -125, 188, 125, '#dfc7a3'); box(-8, -141, 216, 7, '#593b3d');
    box(-5, -138, 210, 3, '#d8b879');
    for (let row = 0; row < 6; row++) {
      const dy = -113 + row * 22;
      box(3, dy, 194, 1, '#c2a583');
      for (let col = 0; col < 5; col++) box(17 + col * 40 + (row % 2 ? 12 : 0), dy, 1, 21, '#c9ad8b');
    }
    // Recessed arch and wine racks, behind Marco's gallery route.
    box(22, -75, 48, 75, '#73564d'); box(27, -80, 38, 80, '#73564d');
    box(32, -84, 28, 84, '#73564d'); box(29, -72, 34, 72, '#253332');
    box(34, -77, 24, 77, '#253332'); box(37, -79, 18, 79, '#253332');
    box(44, -57, 2, 57, '#41504a'); box(30, -4, 32, 4, '#7e6553');
    box(98, -82, 76, 69, '#66453b'); box(102, -78, 68, 61, '#2c3833');
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) bottle(106 + col * 12, -76 + row * 29);
      box(101, -54 + row * 29, 70, 3, '#a67a54');
    }
    sign(43, -123, 122); barrel(-23, -33); barrel(183, -33);
    box(76, -90, 3, 14, '#6f4f3f'); box(72, -94, 11, 10, '#735443');
    box(75, -93, 5, 8, '#ffe3a0');
  } else {
    // The tasting table belongs to the yacht, with its own small raised stern.
    sign(-13, -113, 114);
    box(-7, -43, 65, 5, '#4c3737'); box(-4, -38, 59, 4, '#d8b579');
    box(-4, -34, 59, 26, '#743149'); box(0, -32, 51, 3, '#b05a6d');
    box(-4, -10, 59, 2, '#e0bb72'); box(0, -8, 5, 8, '#4c3737'); box(46, -8, 5, 8, '#4c3737');
    bottle(19, -61); bottle(31, -61);
    for (const dx of [2, 43]) {
      box(dx, -56, 8, 2, '#f1e2bf'); box(dx + 1, -54, 6, 4, '#b1d5d4');
      box(dx + 3, -50, 2, 7, '#f2e9d1'); box(dx + 1, -44, 6, 1, '#f2e9d1');
    }
  }
  ctx.restore();
}
