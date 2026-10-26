import type { MarcoArchetype, PaoCostume } from './rules';
import { installPolishedSprites, installPolishedYacht, installPackedSprites } from './polishedSprites';

export interface PaoSpriteSet {
  polished?: boolean;
  apex?: HTMLCanvasElement;
  fall?: HTMLCanvasElement;
  idle: HTMLCanvasElement[]; // 4-frame breathing + chain swing + blink
  run: HTMLCanvasElement[]; // 6-frame full articulated arm/leg/torso run cycle
  land: HTMLCanvasElement[]; // 2-frame impact crouch + spring recovery on landing
  jump: HTMLCanvasElement;
  doubleJump: HTMLCanvasElement;
  stomp: HTMLCanvasElement;
  groundPound: HTMLCanvasElement;
  scooter: HTMLCanvasElement[]; // 4-frame Electric-Blue Richard Mille Watch Overdrive sprint!
  swim: HTMLCanvasElement[]; // 6-frame Mediterranean freestyle swimming animation (matching Screenshot 3!)
  vipPose: HTMLCanvasElement[]; // 4-frame Camera Look, Sunglasses Wink & VIP Peace/Toast Flex with the women!
  hurt: HTMLCanvasElement;
  headIcon: HTMLCanvasElement;
}

export interface SpriteBank {
  pao: PaoSpriteSet;
  costumes: Record<PaoCostume, PaoSpriteSet>;
  marco: Record<
    MarcoArchetype,
    {
      walk: HTMLCanvasElement[]; // 4-frame articulated waddle + arm wave + head tilt
      windup: HTMLCanvasElement;
      squished: HTMLCanvasElement;
    }
  >;
  boss: {
    shielded: HTMLCanvasElement[];
    vulnerable: HTMLCanvasElement[];
    charging: HTMLCanvasElement;
  };
  props: {
    crate: HTMLCanvasElement;
    mysteryBlock: HTMLCanvasElement[]; // 2-frame Golden '?' Mystery Block (matching Screenshots 1 & 2!)
    anvilCrate: HTMLCanvasElement;
    scooterPickup: HTMLCanvasElement[]; // 2-frame animated Real Carbon-TPT + Sky-Blue Richard Mille Watch!
    springAwning: HTMLCanvasElement[]; // 2-frame Bouncy Riviera Cafe Awning (idle + compressed)
    barrelPlant: HTMLCanvasElement;
    chain: HTMLCanvasElement[]; // Animated Euro (€) Banknote & Coin / Chain Stack
    espresso: HTMLCanvasElement;
    wineBottle: HTMLCanvasElement; // 8 000 € Grand Cru Wine Bottle popup prop!
    invoice: HTMLCanvasElement;
    superYacht: HTMLCanvasElement; // Full 340px Gleaming White Mediterranean Super-Yacht!
    vipWomen: HTMLCanvasElement[]; // 4-frame Glamorous Blonde (Red Gown) & Brunette (Black Gown) VIP Women!
    goldenLambo: HTMLCanvasElement[]; // 2-frame 24K Golden Lamborghini Aventador SVJ (Open Door + Driving Off!)
    stoneTileTop: HTMLCanvasElement;
    stoneTileBody: HTMLCanvasElement;
    ivyOverlay: HTMLCanvasElement;
  };
}

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function pxOval(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string
) {
  ctx.fillStyle = color;
  const minX = Math.floor(cx - rx);
  const maxX = Math.ceil(cx + rx);
  const minY = Math.floor(cy - ry);
  const maxY = Math.ceil(cy + ry);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1.0) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

/**
 * Quantizes alpha values on a canvas so rotated sprite limbs retain 100% razor-sharp
 * 16-bit pixel-art edges with zero blurry sub-pixel anti-aliasing.
 */
function quantizePixelAlpha(ctx: CanvasRenderingContext2D, w: number, h: number) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i + 3] = d[i + 3] >= 110 ? 255 : 0;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Ignore if tainted
  }
}

/**
 * Programmatically inspects the pixel alpha buffer of a grounded sprite canvas
 * and shifts the image downward so the bottom-most opaque pixel row sits 100%
 * flush with row `h - 1`, eliminating any transparent gap beneath shoes/feet.
 */
function snapSpriteBottomToFloor(ctx: CanvasRenderingContext2D, w: number, h: number) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    let maxY = -1;
    for (let y = h - 1; y >= 0; y--) {
      let rowHasOpaque = false;
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] >= 128) {
          rowHasOpaque = true;
          break;
        }
      }
      if (rowHasOpaque) {
        maxY = y;
        break;
      }
    }
    if (maxY >= 0 && maxY < h - 1) {
      const shiftDown = h - 1 - maxY;
      const shifted = ctx.createImageData(w, h);
      const sd = shifted.data;
      for (let y = 0; y <= maxY; y++) {
        const destY = y + shiftDown;
        for (let x = 0; x < w; x++) {
          const srcIdx = (y * w + x) * 4;
          const dstIdx = (destY * w + x) * 4;
          sd[dstIdx] = d[srcIdx];
          sd[dstIdx + 1] = d[srcIdx + 1];
          sd[dstIdx + 2] = d[srcIdx + 2];
          sd[dstIdx + 3] = d[srcIdx + 3];
        }
      }
      ctx.putImageData(shifted, 0, 0);
    }
  } catch {
    // Ignore if tainted
  }
}

interface PaoRigPose {
  torsoY: number;
  torsoTiltDeg: number;
  headY: number;
  headTiltDeg: number;
  leftArmDeg: number;
  leftArmOffsetY: number;
  rightArmDeg: number;
  rightArmOffsetY: number;
  leftLegDeg: number;
  leftLegOffsetX: number;
  leftLegOffsetY: number;
  rightLegDeg: number;
  rightLegOffsetX: number;
  rightLegOffsetY: number;
  chainSparkle: number; // 0: none, 1: left, 2: center, 3: right
  blink: boolean;
  hypeMouth: boolean;
  rmWatchOverdrive: boolean;
  airborneLegs?: boolean;
}

/**
 * Draws a single articulated 16-bit pixel-art track-pant leg (with white side stripes)
 * and red/white sneaker for MC Pao so his legs never have a tear/gap and his planted
 * sneaker sits 100% flush with the ground row (y = 69..70)!
 */
function drawGroundedPaoTrackLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  footX: number,
  footY: number,
  isBackLeg: boolean,
  costume: PaoCostume = 'yacht_black_vip'
) {
  const OUT = '#120b07';
  const PANT_MAIN = isBackLeg ? '#181c26' : '#222736';
  const PANT_SHADE = '#12151e';
  const STRIPE =
    costume === 'monaco_gold'
      ? '#facc15'
      : isBackLeg
      ? '#cbd5e1'
      : '#ffffff';

  const kneeX = Math.round((hipX + footX) * 0.5 + (footX >= hipX ? 2 : -1));
  const kneeY = Math.round((hipY + footY) * 0.5);

  // Upper thigh & lower calf segments (8 steps for solid, gap-free pixel coverage)
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const cx =
      t < 0.5
        ? hipX + (kneeX - hipX) * (t * 2)
        : kneeX + (footX - kneeX) * ((t - 0.5) * 2);
    const cy =
      t < 0.5
        ? hipY + (kneeY - hipY) * (t * 2)
        : kneeY + (footY - kneeY) * ((t - 0.5) * 2);
    const legW = t < 0.5 ? 11 : 10;
    const lx = Math.round(cx - legW * 0.5);
    const ly = Math.round(cy);

    px(ctx, lx - 1, ly, legW + 2, 4, OUT);
    px(ctx, lx, ly, legW, 3, PANT_MAIN);
    px(ctx, lx, ly, 2, 3, PANT_SHADE);
    // Iconic side stripe along outer seam!
    px(ctx, lx + Math.floor(legW * 0.5), ly, 2, 3, STRIPE);
  }

  // Iconic Red & White Sneaker planted at (footX, footY)
  const sx = Math.round(footX - 6);
  const sy = Math.round(footY - 7);

  px(ctx, sx - 1, sy, 15, 7, OUT);
  px(ctx, sx + 1, sy - 1, 10, 2, OUT);

  px(ctx, sx, sy + 1, 13, 4, '#ffffff');
  px(ctx, sx + 2, sy, 8, 2, '#f8fafc');

  const shoeAccent = costume === 'monaco_gold' ? '#eab308' : '#d92323';
  const shoeBright = costume === 'monaco_gold' ? '#facc15' : '#ef4444';
  px(ctx, sx, sy + 3, 5, 2, shoeAccent);
  px(ctx, sx + 5, sy + 2, 6, 2, shoeBright);
  px(ctx, sx + 9, sy + 3, 4, 2, shoeAccent);

  px(ctx, sx, sy + 5, 13, 1, '#cbd5e1');
  px(ctx, sx - 1, sy + 6, 15, 1, OUT);
}

/**
 * Procedural fallback for MC Pao (58x70) before /assets/sprites/pao_clean.png finishes loading.
 */
function renderPaoFallback(
  pose: PaoRigPose,
  costume: PaoCostume = 'yacht_black_vip'
): HTMLCanvasElement {
  const [c, ctx] = createCanvas(58, 70);
  const OUT = '#140c08';
  const by = pose.torsoY;

  // Pelvis / Track-pants waist bridge
  px(ctx, 18, 44 + by, 22, 9, OUT);
  px(ctx, 19, 45 + by, 20, 7, '#1e222d');

  // Articulated Grounded Track Legs
  const leftFootX = 23 + pose.leftLegOffsetX * 1.4;
  const leftFootY = Math.min(70, 70 + pose.leftLegOffsetY);
  const rightFootX = 35 + pose.rightLegOffsetX * 1.4;
  const rightFootY = Math.min(70, 70 + pose.rightLegOffsetY);

  drawGroundedPaoTrackLeg(ctx, 33, 47 + by, rightFootX, rightFootY, true, costume);
  drawGroundedPaoTrackLeg(ctx, 24, 47 + by, leftFootX, leftFootY, false, costume);

  // Torso (Costume-matched!)
  const teeColor =
    costume === 'yacht_black_vip'
      ? '#181c26'
      : costume === 'monaco_gold'
      ? '#eab308'
      : '#f8fafc';
  pxOval(ctx, 29, 36 + by, 13, 11, OUT);
  pxOval(ctx, 29, 36 + by, 11.5, 9.5, teeColor);
  pxOval(
    ctx,
    29,
    30 + by,
    7,
    5,
    costume === 'classic_white' ? '#cbd5e1' : '#facc15'
  );
  if (costume !== 'classic_white') {
    // Gold Medallion Pendant at chest center (matching Screenshot 2!)
    pxOval(ctx, 29, 36 + by, 3.2, 3.2, '#120b07');
    pxOval(ctx, 29, 36 + by, 2.2, 2.2, '#facc15');
    px(ctx, 29, 36 + by, 1, 1, '#fef08a');
  }

  // Head
  const hy = 5 + pose.headY;
  pxOval(ctx, 29, hy + 13, 11, 10, OUT);
  pxOval(ctx, 29, hy + 12, 9.5, 8.5, '#f6b286');
  pxOval(ctx, 29, hy + 16, 9.5, 6, '#3b2215');
  px(ctx, 26, hy + 15, 7, 2, '#ffffff');
  pxOval(ctx, 29, hy + 4, 11, 6, '#22150f');
  if (costume !== 'classic_white') {
    // Dark Blue Sunglasses (matching Screenshots 1 & 2!)
    px(ctx, 24, hy + 9, 13, 4, '#090d16');
    px(ctx, 25, hy + 10, 5, 2, '#1d4ed8');
    px(ctx, 31, hy + 10, 5, 2, '#1d4ed8');
  }
  return c;
}

/**
 * Draws a rotated anatomical sub-region of an image around a specified pivot point.
 */
function drawRotatedPart(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  pivotLocalX: number,
  pivotLocalY: number,
  angleDeg: number
) {
  ctx.save();
  ctx.translate(dx + pivotLocalX, dy + pivotLocalY);
  if (angleDeg !== 0) {
    ctx.rotate((angleDeg * Math.PI) / 180);
  }
  ctx.drawImage(img, sx, sy, sw, sh, -pivotLocalX, -pivotLocalY, dw, dh);
  ctx.restore();
}

/**
 * Recolors MC Pao's black VIP shirt pixels to 24K Monaco Gold Silk when costume === 'monaco_gold',
 * preserving skin tones, dark outlines, blue sunglasses, and his diamond medallion chain.
 */
function applyMonacoGoldTintToVipCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const minY = Math.floor(h * 0.41);
    const maxY = Math.floor(h * 0.72);
    const minX = Math.floor(w * 0.16);
    const maxX = Math.floor(w * 0.84);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * w + x) * 4;
        if (d[idx + 3] < 128) continue;
        const r = d[idx];
        const g = d[idx + 1];
        const b = d[idx + 2];
        // Identify dark charcoal/navy shirt interior pixels (not skin, not bright chain, not pure black outline)
        const isDarkShirt =
          r >= 16 &&
          r <= 58 &&
          g >= 18 &&
          g <= 64 &&
          b >= 22 &&
          b <= 78 &&
          Math.abs(r - g) <= 16;
        if (isDarkShirt) {
          const lum = (r + g + b) / (3 * 70);
          d[idx] = Math.min(255, Math.round(175 + lum * 75));
          d[idx + 1] = Math.min(255, Math.round(125 + lum * 70));
          d[idx + 2] = Math.min(255, Math.round(14 + lum * 28));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Ignore if tainted
  }
}

/**
 * Stamps a clean, high-resolution (174x210 = 3x of 58x70) articulated frame of MC Pao
 * directly from `/assets/sprites/pao_vip_clean.png` (extracted from Screenshot 1: Black VIP Tee,
 * Dark Blue Sunglasses, Curly Hair, Full Beard, Diamond Medallion Chain, Track Pants & Sneakers)
 * or `/assets/sprites/pao_clean.png` (for Classic White Tee), with ZERO cluttered rectangles over his face!
 */
function stampArticulatedPaoFrame(
  targetCanvas: HTMLCanvasElement,
  img: HTMLImageElement,
  pose: PaoRigPose,
  costume: PaoCostume = 'yacht_black_vip',
  isVipSource: boolean = true
) {
  const S = 3;
  const W = 58 * S; // 174
  const H = 70 * S; // 210
  if (targetCanvas.width !== W) targetCanvas.width = W;
  if (targetCanvas.height !== H) targetCanvas.height = H;

  const ctx = targetCanvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  if (isVipSource) {
    // Source `/assets/sprites/pao_vip_clean.png` is 340 x 416 RGBA (from Screenshot 1!)
    const srcW = img.width; // 340
    const srcH = img.height; // 416
    const drawW = 54 * S; // 162
    const drawH = 67 * S; // 201
    const baseX = 2 * S; // 6
    const baseY = 2 * S; // 6

    const hipSplitSrcY = Math.round(srcH * 0.7); // 291
    const legSrcH = srcH - hipSplitSrcY; // 125
    const upperSrcH = Math.round(srcH * 0.74); // 308 (slight overlap at waist so zero gap!)

    const hipDstY = baseY + Math.round(drawH * 0.7) + pose.torsoY * S;
    const legDstH = drawH - Math.round(drawH * 0.7);

    // 1. RIGHT (BACK) LEG + SNEAKER (srcX: 170..340, srcY: 291..416)
    drawRotatedPart(
      ctx,
      img,
      Math.floor(srcW * 0.5),
      hipSplitSrcY,
      Math.ceil(srcW * 0.5),
      legSrcH,
      baseX + Math.floor(drawW * 0.5) + pose.rightLegOffsetX * S * 0.85,
      hipDstY + pose.rightLegOffsetY * S * 0.75,
      Math.ceil(drawW * 0.5),
      legDstH,
      12,
      6,
      pose.rightLegDeg * 0.55
    );

    // 2. LEFT (FRONT) LEG + SNEAKER (srcX: 0..170, srcY: 291..416)
    drawRotatedPart(
      ctx,
      img,
      0,
      hipSplitSrcY,
      Math.floor(srcW * 0.5),
      legSrcH,
      baseX + pose.leftLegOffsetX * S * 0.85,
      hipDstY + pose.leftLegOffsetY * S * 0.75,
      Math.floor(drawW * 0.5),
      legDstH,
      Math.floor(drawW * 0.5) - 12,
      6,
      pose.leftLegDeg * 0.55
    );

    // 3. UPPER BODY: TORSO + ARMS + DIAMOND MEDALLION + HEAD + BLUE SUNGLASSES (srcY: 0..308)
    const upperDstH = Math.round(drawH * 0.74);
    drawRotatedPart(
      ctx,
      img,
      0,
      0,
      srcW,
      upperSrcH,
      baseX,
      baseY + pose.torsoY * S,
      drawW,
      upperDstH,
      Math.round(drawW * 0.5),
      Math.round(upperDstH * 0.85),
      pose.torsoTiltDeg * 0.55
    );

    if (costume === 'monaco_gold') {
      applyMonacoGoldTintToVipCanvas(ctx, W, H);
    }
  } else {
    // Classic White Tee source (`/assets/sprites/pao_clean.png`, 380 x 510)
    const srcW = img.width; // 380
    const srcH = img.height; // 510
    const drawW = 52 * S; // 156
    const drawH = 67 * S; // 201
    const baseX = 3 * S;
    const baseY = 2 * S;

    const hipSplitSrcY = Math.round(srcH * 0.67);
    const legSrcH = srcH - hipSplitSrcY;
    const upperSrcH = Math.round(srcH * 0.71);

    const hipDstY = baseY + Math.round(drawH * 0.67) + pose.torsoY * S;
    const legDstH = drawH - Math.round(drawH * 0.67);

    // 1. Right Leg
    drawRotatedPart(
      ctx,
      img,
      Math.floor(srcW * 0.5),
      hipSplitSrcY,
      Math.ceil(srcW * 0.5),
      legSrcH,
      baseX + Math.floor(drawW * 0.5) + pose.rightLegOffsetX * S * 0.85,
      hipDstY + pose.rightLegOffsetY * S * 0.75,
      Math.ceil(drawW * 0.5),
      legDstH,
      12,
      6,
      pose.rightLegDeg * 0.55
    );

    // 2. Left Leg
    drawRotatedPart(
      ctx,
      img,
      0,
      hipSplitSrcY,
      Math.floor(srcW * 0.5),
      legSrcH,
      baseX + pose.leftLegOffsetX * S * 0.85,
      hipDstY + pose.leftLegOffsetY * S * 0.75,
      Math.floor(drawW * 0.5),
      legDstH,
      Math.floor(drawW * 0.5) - 12,
      6,
      pose.leftLegDeg * 0.55
    );

    // 3. Upper Body
    const upperDstH = Math.round(drawH * 0.71);
    drawRotatedPart(
      ctx,
      img,
      0,
      0,
      srcW,
      upperSrcH,
      baseX,
      baseY + pose.torsoY * S,
      drawW,
      upperDstH,
      Math.round(drawW * 0.5),
      Math.round(upperDstH * 0.85),
      pose.torsoTiltDeg * 0.55
    );
  }

  quantizePixelAlpha(ctx, W, H);
}

/**
 * Defines all articulated poses for MC Pao so he looks genuinely alive and 100% grounded!
 */
const PAO_IDLE_POSES: PaoRigPose[] = [
  {
    torsoY: 0,
    torsoTiltDeg: 0,
    headY: 0,
    headTiltDeg: 0,
    leftArmDeg: 4,
    leftArmOffsetY: 0,
    rightArmDeg: -4,
    rightArmOffsetY: 0,
    leftLegDeg: 0,
    leftLegOffsetX: 0,
    leftLegOffsetY: 0,
    rightLegDeg: 0,
    rightLegOffsetX: 0,
    rightLegOffsetY: 0,
    chainSparkle: 1,
    blink: false,
    hypeMouth: false,
    rmWatchOverdrive: false,
  },
  {
    torsoY: 1,
    torsoTiltDeg: 1,
    headY: 1,
    headTiltDeg: 2,
    leftArmDeg: -5,
    leftArmOffsetY: 1,
    rightArmDeg: 5,
    rightArmOffsetY: 1,
    leftLegDeg: 0,
    leftLegOffsetX: 0,
    leftLegOffsetY: 0,
    rightLegDeg: 0,
    rightLegOffsetX: 0,
    rightLegOffsetY: 0,
    chainSparkle: 2,
    blink: false,
    hypeMouth: false,
    rmWatchOverdrive: false,
  },
  {
    torsoY: 2,
    torsoTiltDeg: 0,
    headY: 2,
    headTiltDeg: -1,
    leftArmDeg: -10,
    leftArmOffsetY: 1,
    rightArmDeg: 8,
    rightArmOffsetY: 1,
    leftLegDeg: 0,
    leftLegOffsetX: 0,
    leftLegOffsetY: 0,
    rightLegDeg: 0,
    rightLegOffsetX: 0,
    rightLegOffsetY: 0,
    chainSparkle: 3,
    blink: false,
    hypeMouth: false,
    rmWatchOverdrive: false,
  },
  {
    torsoY: 1,
    torsoTiltDeg: -1,
    headY: 1,
    headTiltDeg: 0,
    leftArmDeg: 2,
    leftArmOffsetY: 0,
    rightArmDeg: -2,
    rightArmOffsetY: 0,
    leftLegDeg: 0,
    leftLegOffsetX: 0,
    leftLegOffsetY: 0,
    rightLegDeg: 0,
    rightLegOffsetX: 0,
    rightLegOffsetY: 0,
    chainSparkle: 2,
    blink: true,
    hypeMouth: false,
    rmWatchOverdrive: false,
  },
];

// 6-Frame Full Dynamic Run Cycle (Contact -> Down -> Pass -> High-Knee -> Reach -> Plant)
// Planted leg always has LegOffsetY = 0 so MC Pao's sneakers firmly touch the ground!
const PAO_RUN_POSES: PaoRigPose[] = [
  // Frame 0: Left Leg Forward Plant (on ground), Right Leg Back Kick
  {
    torsoY: 0,
    torsoTiltDeg: 6,
    headY: 0,
    headTiltDeg: 3,
    leftArmDeg: 24,
    leftArmOffsetY: 0,
    rightArmDeg: -26,
    rightArmOffsetY: -1,
    leftLegDeg: -28,
    leftLegOffsetX: 4,
    leftLegOffsetY: 0,
    rightLegDeg: 28,
    rightLegOffsetX: -4,
    rightLegOffsetY: -3,
    chainSparkle: 1,
    blink: false,
    hypeMouth: false,
    rmWatchOverdrive: false,
  },
  // Frame 1: Down / Absorption stride (Left foot planted on ground)
  {
    torsoY: 2,
    torsoTiltDeg: 7,
    headY: 2,
    headTiltDeg: 4,
    leftArmDeg: 14,
    leftArmOffsetY: 1,
    rightArmDeg: -16,
    rightArmOffsetY: 1,
    leftLegDeg: -12,
    leftLegOffsetX: 2,
    leftLegOffsetY: 0,
    rightLegDeg: 14,
    rightLegOffsetX: -2,
    rightLegOffsetY: -2,
    chainSparkle: 2,
    blink: false,
    hypeMouth: false,
    rmWatchOverdrive: false,
  },
  // Frame 2: Mid-Pass High Knee Lift (Left foot planted, Right knee lifting)
  {
    torsoY: 1,
    torsoTiltDeg: 5,
    headY: 1,
    headTiltDeg: 2,
    leftArmDeg: -8,
    leftArmOffsetY: 0,
    rightArmDeg: 8,
    rightArmOffsetY: 0,
    leftLegDeg: 6,
    leftLegOffsetX: -1,
    leftLegOffsetY: 0,
    rightLegDeg: -14,
    rightLegOffsetX: 2,
    rightLegOffsetY: -4,
    chainSparkle: 3,
    blink: false,
    hypeMouth: false,
    rmWatchOverdrive: false,
  },
  // Frame 3: Right Leg Forward Plant (on ground), Left Leg Back Push, Left Arm Flexing RM Watch!
  {
    torsoY: 0,
    torsoTiltDeg: 6,
    headY: 0,
    headTiltDeg: 3,
    leftArmDeg: -28,
    leftArmOffsetY: -1,
    rightArmDeg: 24,
    rightArmOffsetY: 0,
    leftLegDeg: 28,
    leftLegOffsetX: -4,
    leftLegOffsetY: -3,
    rightLegDeg: -28,
    rightLegOffsetX: 4,
    rightLegOffsetY: 0,
    chainSparkle: 2,
    blink: false,
    hypeMouth: true,
    rmWatchOverdrive: false,
  },
  // Frame 4: Down / Compression stride (Right foot planted on ground)
  {
    torsoY: 2,
    torsoTiltDeg: 7,
    headY: 2,
    headTiltDeg: 4,
    leftArmDeg: -16,
    leftArmOffsetY: 1,
    rightArmDeg: 14,
    rightArmOffsetY: 1,
    leftLegDeg: 14,
    leftLegOffsetX: -2,
    leftLegOffsetY: -2,
    rightLegDeg: -12,
    rightLegOffsetX: 2,
    rightLegOffsetY: 0,
    chainSparkle: 1,
    blink: false,
    hypeMouth: false,
    rmWatchOverdrive: false,
  },
  // Frame 5: Recovery Pass (Right foot planted, Left knee lifting)
  {
    torsoY: 1,
    torsoTiltDeg: 5,
    headY: 1,
    headTiltDeg: 2,
    leftArmDeg: 10,
    leftArmOffsetY: 0,
    rightArmDeg: -10,
    rightArmOffsetY: 0,
    leftLegDeg: -14,
    leftLegOffsetX: 2,
    leftLegOffsetY: -4,
    rightLegDeg: 6,
    rightLegOffsetX: -1,
    rightLegOffsetY: 0,
    chainSparkle: 3,
    blink: false,
    hypeMouth: false,
    rmWatchOverdrive: false,
  },
];

const PAO_JUMP_POSE: PaoRigPose = {
  torsoY: -1,
  torsoTiltDeg: -4,
  headY: -2,
  headTiltDeg: -6,
  leftArmDeg: -38,
  leftArmOffsetY: -2,
  rightArmDeg: -32,
  rightArmOffsetY: -2,
  leftLegDeg: -24,
  leftLegOffsetX: 3,
  leftLegOffsetY: -4,
  rightLegDeg: 22,
  rightLegOffsetX: -3,
  rightLegOffsetY: -2,
  chainSparkle: 2,
  blink: false,
  hypeMouth: true,
  rmWatchOverdrive: false,
};

const PAO_DOUBLE_JUMP_POSE: PaoRigPose = {
  torsoY: -2,
  torsoTiltDeg: 5,
  headY: -2,
  headTiltDeg: -4,
  leftArmDeg: -44,
  leftArmOffsetY: -3,
  rightArmDeg: 36,
  rightArmOffsetY: -2,
  leftLegDeg: -34,
  leftLegOffsetX: 4,
  leftLegOffsetY: -5,
  rightLegDeg: -24,
  rightLegOffsetX: -2,
  rightLegOffsetY: -3,
  chainSparkle: 3,
  blink: false,
  hypeMouth: true,
  rmWatchOverdrive: true,
};

const PAO_STOMP_POSE: PaoRigPose = {
  torsoY: 1,
  torsoTiltDeg: 5,
  headY: 1,
  headTiltDeg: 7,
  leftArmDeg: -26,
  leftArmOffsetY: -1,
  rightArmDeg: 24,
  rightArmOffsetY: -1,
  leftLegDeg: -12,
  leftLegOffsetX: 2,
  leftLegOffsetY: 0,
  rightLegDeg: 10,
  rightLegOffsetX: -1,
  rightLegOffsetY: -2,
  chainSparkle: 2,
  blink: false,
  hypeMouth: true,
  rmWatchOverdrive: false,
};

const PAO_GROUND_POUND_POSE: PaoRigPose = {
  torsoY: 2,
  torsoTiltDeg: 9,
  headY: 3,
  headTiltDeg: 10,
  leftArmDeg: -42,
  leftArmOffsetY: -2,
  rightArmDeg: 40,
  rightArmOffsetY: -2,
  leftLegDeg: -6,
  leftLegOffsetX: 1,
  leftLegOffsetY: 0,
  rightLegDeg: 6,
  rightLegOffsetX: -1,
  rightLegOffsetY: 0,
  chainSparkle: 3,
  blink: false,
  hypeMouth: true,
  rmWatchOverdrive: true,
};

const PAO_HURT_POSE: PaoRigPose = {
  torsoY: 1,
  torsoTiltDeg: -10,
  headY: 1,
  headTiltDeg: -12,
  leftArmDeg: 32,
  leftArmOffsetY: 1,
  rightArmDeg: -28,
  rightArmOffsetY: 1,
  leftLegDeg: 18,
  leftLegOffsetX: -2,
  leftLegOffsetY: -1,
  rightLegDeg: -16,
  rightLegOffsetX: 2,
  rightLegOffsetY: 0,
  chainSparkle: 0,
  blink: true,
  hypeMouth: true,
  rmWatchOverdrive: false,
};

const PAO_LAND_POSES: PaoRigPose[] = [
  // Frame 0: Deep Street-Stance Landing Crouch (knees bent low, arms flared out for balance, sneakers wide & flat on floor)
  {
    torsoY: 4,
    torsoTiltDeg: 8,
    headY: 4,
    headTiltDeg: 5,
    leftArmDeg: -34,
    leftArmOffsetY: 2,
    rightArmDeg: 32,
    rightArmOffsetY: 2,
    leftLegDeg: 22,
    leftLegOffsetX: -3,
    leftLegOffsetY: 0,
    rightLegDeg: -22,
    rightLegOffsetX: 3,
    rightLegOffsetY: 0,
    chainSparkle: 2,
    blink: false,
    hypeMouth: true,
    rmWatchOverdrive: false,
  },
  // Frame 1: Spring-Up Landing Recovery (rising from crouch back to athletic stance)
  {
    torsoY: 2,
    torsoTiltDeg: 4,
    headY: 2,
    headTiltDeg: 2,
    leftArmDeg: -16,
    leftArmOffsetY: 1,
    rightArmDeg: 16,
    rightArmOffsetY: 1,
    leftLegDeg: 10,
    leftLegOffsetX: -1.5,
    leftLegOffsetY: 0,
    rightLegDeg: -10,
    rightLegOffsetX: 1.5,
    rightLegOffsetY: 0,
    chainSparkle: 3,
    blink: false,
    hypeMouth: false,
    rmWatchOverdrive: false,
  },
];

/**
 * Stamps the articulated 4-frame waddle, windup, squished, and Boss Don Marco sprites
 * from /assets/sprites/marco_clean.png with feet planted flush at y = H (46)!
 */
function stampAuthenticMarcoBank(bank: SpriteBank, marcoImg: HTMLImageElement) {
  const archetypes: MarcoArchetype[] = ['waddler', 'caller', 'charger'];
  const srcW = marcoImg.width; // 196
  const srcH = marcoImg.height; // 222

  // Planted foot always has LegY = 0 and reaches y = 46 so Marco never floats above platforms!
  const walkConfigs = [
    { headTilt: -6, headY: 0, torsoY: 0, leftLegY: -3, rightLegY: 0, leftLegX: -2, rightLegX: 2, sweat: true },
    { headTilt: 0, headY: 1, torsoY: 1, leftLegY: 0, rightLegY: 0, leftLegX: 0, rightLegX: 0, sweat: false },
    { headTilt: 6, headY: 0, torsoY: 0, leftLegY: 0, rightLegY: -3, leftLegX: 2, rightLegX: -2, sweat: true },
    { headTilt: 0, headY: 1, torsoY: 1, leftLegY: -1, rightLegY: 0, leftLegX: 0, rightLegX: 0, sweat: false },
  ];

  for (const arch of archetypes) {
    // 1. 4-Frame Articulated Waddle Cycle (40x46)
    walkConfigs.forEach((cfg, fIdx) => {
      const c = bank.marco[arch].walk[fIdx];
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      const W = c.width; // 40
      const H = c.height; // 46
      ctx.clearRect(0, 0, W, H);

      // Left Leg (srcY: 162..222, srcX: 0..98) -> drawn down to y=46 (32 + 14 = 46)
      ctx.drawImage(
        marcoImg,
        0,
        162,
        98,
        60,
        2 + cfg.leftLegX,
        32 + cfg.leftLegY,
        18,
        14
      );
      // Right Leg (srcY: 162..222, srcX: 98..196) -> drawn down to y=46 (32 + 14 = 46)
      ctx.drawImage(
        marcoImg,
        98,
        162,
        98,
        60,
        20 + cfg.rightLegX,
        32 + cfg.rightLegY,
        18,
        14
      );

      // Torso & Panicked Arms (srcY: 108..172)
      ctx.drawImage(
        marcoImg,
        0,
        108,
        srcW,
        64,
        2,
        21 + cfg.torsoY,
        36,
        14
      );

      // Head with expressive side-to-side tilt (srcY: 0..118)
      drawRotatedPart(
        ctx,
        marcoImg,
        0,
        0,
        srcW,
        118,
        2,
        1 + cfg.headY,
        36,
        23,
        18,
        20,
        cfg.headTilt
      );

      // Animated panic sweat droplet flying off Marco's temple!
      if (cfg.sweat) {
        px(ctx, fIdx === 0 ? 4 : 33, 5, 2, 3, '#38bdf8');
        px(ctx, fIdx === 0 ? 4 : 33, 4, 1, 1, '#bae6fd');
      }

      // Archetype signature gear
      if (arch === 'caller') {
        const phoneBob = fIdx % 2 === 0 ? -1 : 1;
        px(ctx, W - 7, 11 + phoneBob, 5, 9, '#120b07');
        px(ctx, W - 6, 12 + phoneBob, 3, 7, '#facc15');
        px(ctx, W - 5, 9 + phoneBob, 1, 3, '#e2e8f0');
      } else if (arch === 'charger') {
        px(ctx, 11, 13 + cfg.headY, 19, 4, '#111115');
        px(ctx, 13, 14 + cfg.headY, 5, 2, '#ef4444');
        px(ctx, 23, 14 + cfg.headY, 5, 2, '#ef4444');
      }

      quantizePixelAlpha(ctx, W, H);
      snapSpriteBottomToFloor(ctx, W, H);
    });

    // 2. Windup frame (feet flush at y=46)
    {
      const c = bank.marco[arch].windup;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      const W = c.width;
      const H = c.height;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(marcoImg, 0, 0, srcW, srcH, 1, 2, W - 2, H - 2);
      if (arch === 'caller') {
        px(ctx, W - 7, 11, 5, 9, '#120b07');
        px(ctx, W - 6, 12, 3, 7, '#facc15');
        px(ctx, W - 7, 6, 5, 4, '#ef4444');
      } else if (arch === 'charger') {
        px(ctx, 11, 15, 19, 4, '#111115');
        px(ctx, 13, 16, 5, 2, '#fef08a');
        px(ctx, 23, 16, 5, 2, '#fef08a');
      }
      quantizePixelAlpha(ctx, W, H);
      snapSpriteBottomToFloor(ctx, W, H);
    }

    // 3. Squished flattened pancake frame (42x22)
    {
      const c = bank.marco[arch].squished;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      const W = c.width;
      const H = c.height;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(marcoImg, 0, 0, srcW, srcH, 1, 5, W - 2, H - 5);
      px(ctx, 8, 1, 3, 3, '#facc15');
      px(ctx, 20, 0, 3, 3, '#fef08a');
      px(ctx, 31, 2, 3, 3, '#facc15');
      quantizePixelAlpha(ctx, W, H);
      snapSpriteBottomToFloor(ctx, W, H);
    }
  }

  // 4. Stamp Boss "Don Marco — King of the Scam" (64x74) with articulated legs & royal crown
  const drawBossFrame = (
    c: HTMLCanvasElement,
    mode: 'shield0' | 'shield1' | 'vuln0' | 'vuln1' | 'charge'
  ) => {
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const W = c.width; // 64
    const H = c.height; // 74
    ctx.clearRect(0, 0, W, H);

    const bob = mode === 'shield1' || mode === 'vuln1' ? 2 : 0;
    const legLiftL = mode === 'shield0' ? -3 : mode === 'charge' ? -4 : 0;
    const legLiftR = mode === 'shield1' ? -3 : 0;
    const bodyY = mode === 'vuln0' || mode === 'vuln1' ? 12 + bob : 8 + bob;

    // Articulated Boss Legs reaching y=74
    ctx.drawImage(marcoImg, 0, 162, 98, 60, 6, 54 + legLiftL, 26, 20);
    ctx.drawImage(marcoImg, 98, 162, 98, 60, 32, 54 + legLiftR, 26, 20);

    // Boss Torso & Head
    ctx.drawImage(marcoImg, 0, 0, srcW, 170, 4, bodyY, W - 8, 50);

    // Royal Gold King Crown
    const crownY = bodyY - 7;
    px(ctx, 18, crownY + 2, 28, 7, '#120b07');
    px(ctx, 19, crownY + 3, 26, 5, '#facc15');
    px(ctx, 19, crownY - 1, 5, 4, '#facc15');
    px(ctx, 29, crownY - 3, 6, 6, '#fef08a');
    px(ctx, 40, crownY - 1, 5, 4, '#facc15');
    px(ctx, 21, crownY + 4, 3, 3, '#dc2626');
    px(ctx, 31, crownY + 4, 3, 3, '#ef4444');
    px(ctx, 41, crownY + 4, 3, 3, '#dc2626');

    if (mode === 'shield0' || mode === 'shield1' || mode === 'charge') {
      const sy = mode === 'charge' ? 32 : 28 + bob;
      px(ctx, 40, sy, 22, 18, '#120b07');
      px(ctx, 41, sy + 1, 20, 16, '#d97706');
      px(ctx, 42, sy + 2, 18, 14, '#facc15');
      px(ctx, 47, sy - 3, 8, 4, '#120b07');
      px(ctx, 48, sy - 2, 6, 2, '#fef08a');
      px(ctx, 49, sy + 5, 4, 8, '#120b07');
    } else {
      const starShift = mode === 'vuln1' ? 4 : 0;
      px(ctx, 10 + starShift, 4, 5, 5, '#fef08a');
      px(ctx, 28, 1, 6, 6, '#facc15');
      px(ctx, 48 - starShift, 4, 5, 5, '#fef08a');
    }
    quantizePixelAlpha(ctx, W, H);
    snapSpriteBottomToFloor(ctx, W, H);
  };

  drawBossFrame(bank.boss.shielded[0], 'shield0');
  drawBossFrame(bank.boss.shielded[1], 'shield1');
  drawBossFrame(bank.boss.vulnerable[0], 'vuln0');
  drawBossFrame(bank.boss.vulnerable[1], 'vuln1');
  drawBossFrame(bank.boss.charging, 'charge');
}

function renderMarcoFallback(
  archetype: MarcoArchetype,
  pose: 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'windup' | 'squished'
): HTMLCanvasElement {
  if (pose === 'squished') {
    const [c, ctx] = createCanvas(42, 22);
    pxOval(ctx, 21, 15, 18, 5, '#140c08');
    pxOval(ctx, 21, 15, 16.5, 3.8, '#f2a272');
    px(ctx, 9, 1, 3, 3, '#facc15');
    px(ctx, 20, 0, 3, 3, '#fef08a');
    return c;
  }
  const [c, ctx] = createCanvas(40, 46);
  const bob = pose === 'walk1' || pose === 'walk3' ? 1 : 0;
  pxOval(ctx, 20, 31 + bob, 11, 14, '#140c08');
  pxOval(ctx, 20, 31 + bob, 9.5, 12.5, '#f2a272');
  pxOval(ctx, 20, 15 + bob, 11, 10, '#140c08');
  pxOval(ctx, 20, 15 + bob, 9.5, 8.5, '#f2a272');
  if (archetype === 'charger') {
    px(ctx, 12, 13 + bob, 16, 4, '#111115');
  }
  return c;
}

/**
 * Renders the authentic Richard Mille RM 53-01 / RM 011 Carbon TPT + Sky-Blue Vented Strap Watch
 * matching the user's reference photo:
 * - Sky-blue vented rubber strap (#29b6f6, #149be6) with black aerodynamic slots
 * - Dark Carbon TPT tonneau bezel (#26292e) with wavy Damascus carbon striations (#454a54)
 * - 8 Silver 5-spline titanium screws + Sky-Blue inner flange ring
 * - Openworked silver/titanium suspended tourbillon bridges + Sky-Blue & Silver Crown!
 */
function renderBlueRichardMilleWatchFrames(): HTMLCanvasElement[] {
  return [0, 1].map((frame) => {
    const [c, ctx] = createCanvas(38, 42);
    const OUT = '#090d16';
    const STRAP_BLUE = '#29b6f6';
    const STRAP_SHADE = '#0288d1';
    const CARBON_DARK = '#1f2229';
    const CARBON_MID = '#323640';
    const CARBON_WAVE = '#4b515e';

    // 1. Top & Bottom Sky-Blue Vented Rubber Straps
    px(ctx, 11, 0, 15, 9, OUT);
    px(ctx, 12, 1, 13, 8, STRAP_BLUE);
    px(ctx, 22, 1, 3, 8, STRAP_SHADE);
    // Black vent slots on top strap
    px(ctx, 14, 3, 3, 2, OUT);
    px(ctx, 19, 3, 3, 2, OUT);

    px(ctx, 11, 32, 15, 10, OUT);
    px(ctx, 12, 32, 13, 9, STRAP_BLUE);
    px(ctx, 22, 32, 3, 9, STRAP_SHADE);
    // Angled black vent louvers on bottom sky-blue strap (just like reference photo!)
    px(ctx, 14, 34, 4, 2, OUT);
    px(ctx, 19, 34, 4, 2, OUT);
    px(ctx, 14, 38, 4, 2, OUT);
    px(ctx, 19, 38, 4, 2, OUT);

    // 2. Massive Sky-Blue & Silver Conical Crown on Right Side
    px(ctx, 31, 17, 6, 8, OUT);
    px(ctx, 31, 18, 3, 6, STRAP_BLUE);
    px(ctx, 34, 19, 2, 4, '#cbd5e1');

    // 3. Curved Tonneau Dark Carbon TPT Bezel
    px(ctx, 7, 7, 23, 27, OUT);
    px(ctx, 6, 9, 25, 23, OUT);
    px(ctx, 8, 8, 21, 25, CARBON_DARK);
    px(ctx, 7, 10, 23, 21, CARBON_MID);
    // Wavy Damascus Carbon TPT striations across bezel
    for (let ry = 9; ry <= 30; ry += 3) {
      px(ctx, 8 + (ry % 2), ry, 20, 1, CARBON_WAVE);
    }

    // 8 Signature Silver Titanium Spline Screws on the Carbon TPT Bezel
    const screws = [
      [10, 9],
      [25, 9],
      [8, 15],
      [27, 15],
      [8, 24],
      [27, 24],
      [10, 30],
      [25, 30],
    ];
    for (const [sx, sy] of screws) {
      px(ctx, sx, sy, 2, 2, '#e2e8f0');
    }

    // 4. Sky-Blue Inner Flange Ring & Deep Black Skeleton Dial Cavity
    px(ctx, 11, 11, 15, 19, STRAP_BLUE);
    px(ctx, 12, 12, 13, 17, '#090d16');

    // 5. Curved Silver/Titanium Suspended Tourbillon Bridges (characteristic RM 53-01 X/Arc cables!)
    px(ctx, 13, 13, 2, 15, '#94a3b8');
    px(ctx, 22, 13, 2, 15, '#94a3b8');
    px(ctx, 15, 15, 7, 2, '#cbd5e1');
    px(ctx, 15, 24, 7, 2, '#cbd5e1');
    // Ruby jewel bearing + spinning tourbillon cage at 6 o'clock
    px(ctx, 18, 23, 2, 2, '#e11d48');
    px(ctx, 18, 16, 2, 2, '#e11d48');
    // Skeleton Hands with Sky-Blue Tips
    px(ctx, 18, 15, 2, 6, '#f8fafc');
    px(ctx, 18, 14, 2, 2, STRAP_BLUE);
    px(ctx, 18, 19, 5, 2, '#f8fafc');

    // 6. Luxury Diamond Sparkle Star
    const spX = frame === 0 ? 5 : 32;
    const spY = frame === 0 ? 7 : 10;
    px(ctx, spX - 2, spY, 5, 1, '#ffffff');
    px(ctx, spX, spY - 2, 1, 5, '#ffffff');
    px(ctx, spX, spY, 1, 1, STRAP_BLUE);

    return c;
  });
}

/**
 * Stamps the clean extracted Richard Mille watch photo (/assets/sprites/rm_watch_clean.png)
 * onto the 2-frame pickup canvases so the in-game watch looks 100% like the user's screenshot!
 */
function stampAuthenticRMWatchFrames(frames: HTMLCanvasElement[], rmImg: HTMLImageElement) {
  frames.forEach((c, idx) => {
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const W = c.width; // 38
    const H = c.height; // 42
    ctx.clearRect(0, 0, W, H);

    // Draw dark pixel-art silhouette halo + crisp downsampled real RM watch
    ctx.drawImage(rmImg, 0, 0, rmImg.width, rmImg.height, 3, 1, W - 6, H - 2);
    quantizePixelAlpha(ctx, W, H);

    // Add animated tourbillon/diamond glint star
    const spX = idx === 0 ? 6 : W - 6;
    const spY = idx === 0 ? 7 : 11;
    px(ctx, spX - 2, spY, 5, 1, '#ffffff');
    px(ctx, spX, spY - 2, 1, 5, '#ffffff');
    px(ctx, spX, spY, 1, 1, '#29b6f6');
  });
}

/**
 * Renders the Bouncy Riviera Cafe Canopy Awning (SpringPad) in idle and compressed states.
 */
function renderSpringAwningFrames(): HTMLCanvasElement[] {
  return [0, 1].map((compressed) => {
    const [c, ctx] = createCanvas(48, 24);
    const yOff = compressed ? 5 : 0;
    const h = compressed ? 11 : 16;
    const OUT = '#1a0d06';

    // Wrought-iron support brackets
    px(ctx, 4, 14, 3, 10, '#181c26');
    px(ctx, 41, 14, 3, 10, '#181c26');

    // Canopy outer border
    px(ctx, 1, 2 + yOff, 46, h, OUT);

    // Striped Mediterranean Terracotta-Red & Sunlit Cream Fabric Stripes
    for (let i = 0; i < 6; i++) {
      const sx = 3 + i * 7;
      const isRed = i % 2 === 0;
      px(ctx, sx, 4 + yOff, 7, h - 4, isRed ? '#dc2626' : '#fef3c7');
      px(ctx, sx, 4 + yOff, 7, 3, isRed ? '#f87171' : '#ffffff');
      // Scalloped fringe at bottom of awning
      px(ctx, sx + 1, 2 + yOff + h, 5, 3, OUT);
      px(ctx, sx + 2, 1 + yOff + h, 3, 3, isRed ? '#b91c1c' : '#fde68a');
    }

    return c;
  });
}

function renderWoodenCrate(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(32, 32);
  const OUT = '#241004';
  const WOOD_D = '#8f3d08';
  const WOOD_M = '#c86018';
  const WOOD_L = '#e88334';
  const WOOD_H = '#f7a85e';

  px(ctx, 0, 0, 32, 32, OUT);
  px(ctx, 2, 2, 28, 28, WOOD_D);
  px(ctx, 5, 5, 22, 22, WOOD_M);
  for (let i = 4; i < 25; i++) {
    px(ctx, i, i, 4, 3, WOOD_L);
    px(ctx, 28 - i, i, 4, 3, WOOD_M);
  }
  px(ctx, 1, 1, 30, 4, WOOD_L);
  px(ctx, 2, 1, 28, 1, WOOD_H);
  px(ctx, 1, 27, 30, 4, WOOD_M);
  px(ctx, 1, 5, 4, 22, WOOD_L);
  px(ctx, 27, 5, 4, 22, WOOD_M);
  return c;
}

function renderAnvilCrate(): HTMLCanvasElement {
  const [c,ctx]=createCanvas(32,32);
  px(ctx,0,0,32,32,'#173746');px(ctx,2,2,28,28,'#b5753e');px(ctx,4,4,24,24,'#e8bf73');
  px(ctx,5,6,22,20,'#173746');px(ctx,7,10,18,4,'#d6e9e5');px(ctx,10,14,12,6,'#9bb7b7');px(ctx,8,20,16,4,'#d6e9e5');
  for(const x of [3,27])for(const y of [3,27])px(ctx,x,y,2,2,'#fff1cb');
  return c;
}

function renderBarrelPlant(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(38, 62);
  const OUT = '#1a0d06';

  pxOval(ctx, 19, 46, 14.5, 15.5, OUT);
  pxOval(ctx, 19, 46, 13.0, 14.2, '#9c4211');
  pxOval(ctx, 18, 46, 9.5, 14.0, '#c85e20');
  pxOval(ctx, 17, 46, 5.0, 13.8, '#e07634');
  px(ctx, 7, 32, 24, 2, OUT);
  px(ctx, 7, 59, 24, 2, OUT);
  px(ctx, 12, 34, 1, 25, '#6e2b07');
  px(ctx, 19, 34, 1, 25, '#6e2b07');
  px(ctx, 25, 34, 1, 25, '#6e2b07');
  px(ctx, 6, 37, 26, 3, '#272a30');
  px(ctx, 7, 38, 24, 1, '#525866');
  px(ctx, 6, 52, 26, 3, '#272a30');
  px(ctx, 7, 53, 24, 1, '#525866');

  px(ctx, 9, 21, 20, 12, OUT);
  px(ctx, 7, 19, 24, 4, OUT);
  px(ctx, 8, 20, 22, 2, '#e0723e');
  px(ctx, 10, 23, 18, 9, '#b84b1e');
  px(ctx, 12, 23, 10, 9, '#d96936');

  const fronds = [
    { x: 19, y: 9, rx: 9, ry: 7 },
    { x: 11, y: 12, rx: 7, ry: 4.5 },
    { x: 27, y: 12, rx: 7, ry: 4.5 },
    { x: 14, y: 6, rx: 6, ry: 4.5 },
    { x: 24, y: 6, rx: 6, ry: 4.5 },
  ];
  for (const f of fronds) {
    pxOval(ctx, f.x, f.y, f.rx + 1, f.ry + 1, '#143d17');
  }
  for (const f of fronds) {
    pxOval(ctx, f.x, f.y, f.rx, f.ry, '#297329');
    pxOval(ctx, f.x - 1, f.y - 1, f.rx * 0.65, f.ry * 0.65, '#5cb83c');
  }
  pxOval(ctx, 18, 6, 4.5, 2.5, '#9be564');

  return c;
}

function renderStoneTileTop(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(32, 32);
  px(ctx, 0, 0, 32, 14, '#1f120b');
  pxOval(ctx, 8, 6.5, 7.2, 5.8, '#ebbf94');
  px(ctx, 2, 1, 12, 3, '#fae3cb');
  px(ctx, 2, 9, 12, 3, '#c48d5e');

  pxOval(ctx, 24, 6.5, 7.5, 5.8, '#e5b587');
  px(ctx, 18, 1, 12, 3, '#fae3cb');
  px(ctx, 18, 9, 12, 3, '#ba8254');

  px(ctx, 0, 14, 32, 18, '#382014');
  px(ctx, 1, 15, 18, 8, '#8f5838');
  px(ctx, 2, 16, 15, 5, '#a86b47');
  px(ctx, 20, 15, 11, 8, '#7d4b2e');
  px(ctx, 1, 24, 11, 7, '#754429');
  px(ctx, 13, 24, 18, 7, '#8f5838');
  return c;
}

function renderStoneTileBody(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(32, 32);
  px(ctx, 0, 0, 32, 32, '#2e1a10');
  px(ctx, 1, 1, 14, 14, '#704127');
  px(ctx, 2, 2, 11, 11, '#855032');
  px(ctx, 16, 1, 15, 14, '#633820');
  px(ctx, 1, 16, 19, 15, '#5e341e');
  px(ctx, 21, 16, 10, 15, '#754429');
  return c;
}

function renderIvyOverlay(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(32, 32);
  const leaves = [
    { x: 6, y: 3, r: 4.5 },
    { x: 8, y: 9, r: 4.0 },
    { x: 6, y: 15, r: 3.2 },
    { x: 22, y: 4, r: 5.0 },
    { x: 25, y: 11, r: 4.2 },
    { x: 23, y: 18, r: 3.8 },
    { x: 24, y: 24, r: 2.8 },
  ];
  for (const lf of leaves) {
    pxOval(ctx, lf.x, lf.y, lf.r + 1, lf.r + 1, '#163d18');
  }
  for (const lf of leaves) {
    pxOval(ctx, lf.x, lf.y, lf.r, lf.r, '#2f752b');
    pxOval(ctx, lf.x - 0.8, lf.y - 0.8, lf.r * 0.6, lf.r * 0.6, '#65c442');
  }
  return c;
}

/**
 * Renders Collectible Euro (€) Banknote Bundles & Gold Euro (€) Medallions!
 */
function renderChainFrames(): HTMLCanvasElement[] {
  return [0, 1].map((f) => {
    const [c, ctx] = createCanvas(24, 22);
    const OUT = '#120b07';

    // Crisp 500€ Purple/Gold Banknote Bundle & Gold € Coin
    px(ctx, 1, 5, 18, 12, OUT);
    px(ctx, 2, 6, 16, 10, '#c084fc'); // 500€ banknote purple-lilac
    px(ctx, 3, 7, 14, 8, '#e9d5ff');
    // Gold strap around the Euro bundle
    px(ctx, 8, 6, 4, 10, '#facc15');
    px(ctx, 9, 6, 2, 10, '#fef08a');

    // Gold Euro (€) Coin badge overlapping right side
    pxOval(ctx, 16, 13, 6.2, 6.2, OUT);
    pxOval(ctx, 16, 13, 5.0, 5.0, '#facc15');
    pxOval(ctx, 16, 13, 3.8, 3.8, '#eab308');

    // Pixel '€' symbol on the coin
    px(ctx, 15, 10, 3, 1, '#120b07');
    px(ctx, 14, 11, 1, 4, '#120b07');
    px(ctx, 13, 12, 4, 1, '#120b07');
    px(ctx, 15, 15, 3, 1, '#120b07');

    // Sparkle glint
    const sx = f === 0 ? 5 : 19;
    const sy = f === 0 ? 4 : 6;
    px(ctx, sx, sy - 2, 1, 5, '#ffffff');
    px(ctx, sx - 2, sy, 5, 1, '#ffffff');
    px(ctx, sx, sy, 1, 1, '#fef08a');
    return c;
  });
}

/**
 * Renders the iconic 8 000 € Pétrus Grand Cru Wine Bottle prop!
 */
function renderWineBottle8000(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(18, 26);
  const OUT = '#120b07';
  // Red foil capsule & cork neck
  px(ctx, 6, 0, 6, 7, OUT);
  px(ctx, 7, 1, 4, 4, '#dc2626');
  px(ctx, 7, 5, 4, 3, '#14532d');
  // Dark emerald Bordeaux bottle body
  px(ctx, 3, 7, 12, 18, OUT);
  px(ctx, 4, 8, 10, 16, '#14532d');
  px(ctx, 5, 8, 3, 15, '#166534');
  // Cream & Gold 'PÉTRUS 8000€' Label
  px(ctx, 4, 12, 10, 8, '#fef3c7');
  px(ctx, 5, 13, 8, 2, '#b91c1c');
  px(ctx, 5, 16, 8, 2, '#d97706');
  return c;
}

function renderEspresso(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(20, 20);
  px(ctx, 7, 2, 2, 3, '#ffffff');
  px(ctx, 11, 1, 2, 4, '#e2e8f0');
  px(ctx, 3, 15, 14, 3, '#120b07');
  px(ctx, 4, 16, 12, 1, '#f8fafc');
  px(ctx, 5, 7, 11, 9, '#120b07');
  px(ctx, 6, 8, 8, 7, '#ffffff');
  px(ctx, 7, 8, 6, 2, '#451a03');
  px(ctx, 14, 9, 3, 4, '#ffffff');
  px(ctx, 6, 11, 8, 2, '#16a34a');
  px(ctx, 6, 13, 8, 1, '#dc2626');
  return c;
}

function renderInvoiceProjectile(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(16, 16);
  px(ctx, 2, 1, 12, 14, '#120b07');
  px(ctx, 3, 2, 10, 12, '#fef9c3');
  px(ctx, 4, 4, 8, 2, '#dc2626');
  px(ctx, 4, 8, 7, 1, '#475569');
  px(ctx, 4, 10, 6, 1, '#475569');
  return c;
}

/**
 * Renders the 2-frame Golden '?' Mystery Block (32x32) matching Screenshots 1 & 2!
 */
function renderMysteryBlockFrames(): HTMLCanvasElement[] {
  return [0, 1].map((f) => {
    const [c, ctx] = createCanvas(32, 32);
    const OUT = '#1a0c04';
    const GOLD_DARK = '#b45309';
    const GOLD_MAIN = f === 0 ? '#f59e0b' : '#eab308';
    const GOLD_BRIGHT = f === 0 ? '#fde047' : '#fef08a';

    // Outer border & beveled 16-bit gold casing
    px(ctx, 0, 0, 32, 32, OUT);
    px(ctx, 2, 2, 28, 28, GOLD_DARK);
    px(ctx, 3, 3, 26, 25, GOLD_MAIN);
    px(ctx, 3, 2, 26, 3, GOLD_BRIGHT);
    px(ctx, 3, 5, 2, 22, GOLD_BRIGHT);

    // 4 Corner Bolts / Rivets
    const rivets = [
      [4, 4],
      [25, 4],
      [4, 25],
      [25, 25],
    ];
    for (const [rx, ry] of rivets) {
      px(ctx, rx, ry, 3, 3, OUT);
      px(ctx, rx + 1, ry + 1, 1, 1, GOLD_BRIGHT);
    }

    // Bold 16-Bit Pixel '?' Emblem in Center (with dark drop-shadow)
    const drawQ = (ox: number, oy: number, col: string) => {
      px(ctx, 11 + ox, 7 + oy, 10, 3, col);
      px(ctx, 9 + ox, 9 + oy, 4, 4, col);
      px(ctx, 18 + ox, 9 + oy, 4, 6, col);
      px(ctx, 14 + ox, 14 + oy, 6, 3, col);
      px(ctx, 14 + ox, 16 + oy, 4, 4, col);
      px(ctx, 14 + ox, 22 + oy, 4, 4, col);
    };
    drawQ(1, 1, OUT);
    drawQ(0, 0, '#fffbeb');

    return c;
  });
}

/**
 * Renders the 6-frame Horizontal Mediterranean Freestyle Swimming Animation (204x144 = 3x of 68x48)
 * for MC Pao (matching Screenshot 3 `/assets/sprites/pao_swim_clean.png`: horizontal swimmer,
 * blue sunglasses, beard, raised freestyle stroke arm, dark underwater refraction silhouette,
 * and rich frothy white/turquoise kicking wake splash!).
 */
function renderPaoSwimFrames(
  costume: PaoCostume,
  swimImg?: HTMLImageElement
): HTMLCanvasElement[] {
  const S = 3;
  const W = 68 * S; // 204
  const H = 48 * S; // 144

  const strokeTilts = [-3.2, -1.2, 1.8, 3.2, 1.2, -1.8];
  const strokeBobY = [0, 1, 2, 2, 1, 0];
  const strokeReachX = [0, 1, 2, 1, 0, -1];

  return [0, 1, 2, 3, 4, 5].map((f) => {
    const [c, ctx] = createCanvas(W, H);
    ctx.imageSmoothingEnabled = false;

    const bobY = strokeBobY[f] * S;
    const reachX = strokeReachX[f] * S;
    const tiltDeg = strokeTilts[f];

    // 1. Authentic Underwater Body Refraction Shadow beneath MC Pao (matching Screenshot 3 `12.44.44`!)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.44)';
    pxOval(ctx, (41 + strokeReachX[f]) * S, (35 + strokeBobY[f]) * S, 13 * S, 5.5 * S, 'rgba(15, 23, 42, 0.42)');
    pxOval(ctx, (35 + strokeReachX[f]) * S, (39 + strokeBobY[f]) * S, 8 * S, 4 * S, 'rgba(15, 23, 42, 0.32)');

    // 2. Frothy White & Turquoise Flutter-Kick Wake Trail behind MC Pao's legs (matching `12.44.44`!)
    const wakePhase = f * 3;
    pxOval(ctx, (14 + (f % 3) * 2) * S, (29 + (f % 2)) * S, 11 * S, 4.5 * S, '#bae6fd');
    pxOval(ctx, (18 + (f % 2) * 2) * S, (28 + ((f + 1) % 2)) * S, 9 * S, 4 * S, '#ffffff');
    pxOval(ctx, (9 + (f % 3)) * S, (27 + (f % 2)) * S, 6.5 * S, 3 * S, '#e0f2fe');
    px(ctx, 6 * S, (31 + (f % 2)) * S, 24 * S, 2 * S, '#7dd3fc');
    px(ctx, 10 * S, (33 + (f % 2)) * S, 28 * S, 2 * S, '#38bdf8');

    // Airborne Kicking Water Droplets behind & above the swimmer
    const dropPositions: Array<[number, number, string]> = [
      [8 + (wakePhase % 7), 18 - (f % 3) * 2, '#ffffff'],
      [15 + ((wakePhase + 4) % 8), 15 - ((f + 1) % 3) * 2, '#e0f2fe'],
      [22 + ((wakePhase + 2) % 6), 19 - (f % 2) * 2, '#ffffff'],
      [54 + (f % 3) * 2, 27 + (f % 2), '#ffffff'],
    ];
    for (const [dx, dy, col] of dropPositions) {
      px(ctx, dx * S, dy * S, 2 * S, 2 * S, col);
    }

    if (swimImg) {
      // 3. Stamp articulated horizontal swimmer from `/assets/sprites/pao_swim_clean.png`
      drawRotatedPart(
        ctx,
        swimImg,
        0,
        0,
        swimImg.width,
        swimImg.height,
        3 * S + reachX,
        2 * S + bobY,
        W - 6 * S,
        H - 7 * S,
        Math.round((W - 6 * S) * 0.52),
        Math.round((H - 7 * S) * 0.58),
        tiltDeg
      );
      if (costume === 'monaco_gold') {
        applyMonacoGoldTintToVipCanvas(ctx, W, H);
      }

      // 4. Dynamic Freestyle Stroke Water Arc & Bow Wave Crest at Chest
      if (f === 1 || f === 2) {
        // Overhead stroke water droplet arc off raised hand
        px(ctx, (36 + f * 3) * S, (6 + bobY / S) * S, 3 * S, 2 * S, '#ffffff');
        px(ctx, (40 + f * 3) * S, (8 + bobY / S) * S, 2 * S, 2 * S, '#bae6fd');
      }
      // Crisp white bow-wave foam collar around chest & chin
      px(ctx, (42 + strokeReachX[f]) * S, (29 + strokeBobY[f]) * S, 13 * S, 2 * S, '#ffffff');
      px(ctx, (44 + strokeReachX[f]) * S, (31 + strokeBobY[f]) * S, 12 * S, 2 * S, '#7dd3fc');

      quantizePixelAlpha(ctx, W, H);
      return c;
    }

    // Procedural fallback before swimImg loads
    const OUT = '#120b07';
    const teeCol =
      costume === 'yacht_black_vip'
        ? '#181c26'
        : costume === 'monaco_gold'
        ? '#eab308'
        : '#f8fafc';
    const kickUp = (f % 2 === 0 ? -2 : 2) * S;
    pxOval(ctx, 33 * S, 28 * S, 13 * S, 7.5 * S, OUT);
    pxOval(ctx, 33 * S, 28 * S, 11.5 * S, 6.2 * S, teeCol);
    pxOval(ctx, 49 * S, 15 * S, 10 * S, 9 * S, OUT);
    pxOval(ctx, 49 * S, 14 * S, 8.5 * S, 7.5 * S, '#f6b286');
    px(ctx, 45 * S, 13 * S, 13 * S, 4 * S, '#090d16');
    px(ctx, 46 * S, 14 * S, 5 * S, 2 * S, '#1d4ed8');
    px(ctx, 52 * S, 14 * S, 5 * S, 2 * S, '#1d4ed8');
    px(ctx, 14 * S, 34 * S + kickUp * 0.3, 48 * S, 3 * S, '#ffffff');
    px(ctx, 16 * S, 37 * S, 44 * S, 3 * S, '#38bdf8');
    return c;
  });
}

/**
 * Renders the Complete, Full-Length Gleaming White Mediterranean Luxury Super-Yacht
 * (1020x576 = 3x of 340x192 world units).
 * - Uses `/assets/sprites/yacht_clean.png` for the authentic bow, railings, front cabin,
 *   and the Glamorous Blonde & Brunette VIP Women on deck.
 * - Seamlessly completes the entire right aft cabin, flybridge radar arch, rear champagne sun-deck,
 *   raked transom stern, teak hydraulic swim platform, and Monaco/Riviera stern flag so the boat is
 *   a 100% complete luxury Super-Yacht from bow to stern (never a cut-off "semi yacht"!).
 */
function renderSuperYacht(yachtImg?: HTMLImageElement): HTMLCanvasElement {
  const S = 3;
  const W = 340 * S; // 1020
  const H = 192 * S; // 576
  const [c, ctx] = createCanvas(W, H);
  ctx.imageSmoothingEnabled = false;

  if (yachtImg) {
    const frontW = 246 * S; // 738 px
    // 1. Draw the authentic bow, front bridge, railings & VIP Women from `yacht_clean.png`
    ctx.drawImage(yachtImg, 0, 0, yachtImg.width - 4, yachtImg.height, 0, 0, frontW, H);

    // 2. Clean stray mid-air diagonal line to the left of the bow (`worldX < 104, worldY < 91`)
    // and stray pixels underneath the sloped bow hull (`worldX < 68`)
    ctx.clearRect(0, 0, 38 * S, H);
    ctx.clearRect(38 * S, 0, 66 * S, 91 * S);
    for (let x = 38 * S; x < 72 * S; x++) {
      const worldX = x / S;
      const hullStart = Math.round((95 + (worldX - 38) * 1.15) * S);
      ctx.clearRect(x, hullStart, 1, H - hullStart);
    }

    // 3. Seamlessly extend the authentic shaded cabin, windows, stainless railings & fiberglass hull
    // into the Aft Section (x = 242*S .. 328*S) by mirroring the right 35% of `yachtImg`!
    const aftSpanW = 86 * S; // 258 px (from 242*S to 328*S)
    const srcStripW = Math.round(yachtImg.width * 0.35);
    const srcStripX = yachtImg.width - 6 - srcStripW;
    ctx.save();
    ctx.translate(242 * S + aftSpanW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      yachtImg,
      srcStripX,
      0,
      srcStripW,
      yachtImg.height,
      0,
      0,
      aftSpanW,
      H
    );
    ctx.restore();

    // 4. Sculpt the Authentic Stepped Super-Yacht Stern Silhouette directly out of the shaded texture!
    for (let y = 0; y < H; y++) {
      const wy = y / S;
      let sternWorldX = 326;
      if (wy < 15) {
        // Above flybridge roof
        sternWorldX = 242;
      } else if (wy < 62) {
        // Upper Flybridge raked aft pillar (x = 274 .. 294)
        sternWorldX = 274 + (wy - 15) * 0.42;
      } else if (wy < 104) {
        // Main Salon & Covered Rear Deck overhang (x = 294 .. 322)
        sternWorldX = 294 + (wy - 62) * 0.66;
      } else {
        // Lower Fiberglass Hull raked transom stern tapering inward toward waterline (x = 322 .. 304)
        sternWorldX = 322 - (wy - 104) * 0.26;
      }

      const cutX = Math.round(sternWorldX * S);
      if (wy >= 15) {
        ctx.clearRect(cutX, y, W - cutX, 1);
        // Crisp shaded fiberglass contour along the sculpted aft edge
        if (wy >= 16 && wy <= 170) {
          px(ctx, cutX - 2 * S, y, 2 * S, 1, wy < 104 ? '#64748b' : '#475569');
          px(ctx, cutX - 4 * S, y, 2 * S, 1, wy < 104 ? '#f1f5f9' : '#cbd5e1');
        }
      }
    }

    // 5. Add the Extended Teak & White Hydraulic Swim Platform at the Stern Waterline (x = 304..328, y = 158..165)
    px(ctx, 304 * S, 158 * S, 24 * S, 7 * S, '#334155');
    px(ctx, 305 * S, 159 * S, 22 * S, 3 * S, '#e2e8f0');
    px(ctx, 305 * S, 162 * S, 22 * S, 2 * S, '#d97706');

    // 6. Raked Stern Flagstaff & Fluttering Riviera Tricolor Yacht Ensign (x = 318..334, y = 78..104)
    for (let i = 0; i < 24; i++) {
      px(ctx, (318 + i * 0.22) * S, (103 - i) * S, 1.5 * S, S, '#475569');
    }
    px(ctx, 323 * S, 79 * S, 3 * S, 7 * S, '#1d4ed8');
    px(ctx, 326 * S, 80 * S, 3 * S, 7 * S, '#ffffff');
    px(ctx, 329 * S, 81 * S, 3 * S, 7 * S, '#ef4444');

    // 7. Frothy Mediterranean Wave Crests lapping along the bottom waterline of the full hull!
    for (let wx = 54; wx < 322; wx += 14) {
      const waveY = 171 + Math.round(Math.sin(wx * 0.18) * 2);
      pxOval(ctx, wx * S, waveY * S, 9 * S, 3.5 * S, '#bae6fd');
      pxOval(ctx, (wx + 2) * S, (waveY - 1) * S, 7 * S, 2.5 * S, '#ffffff');
    }

    return c;
  }

  // High-res fallback before `/assets/sprites/yacht_clean.png` finishes loading
  const OUT = '#0f172a';
  px(ctx, 60 * S, 62 * S, 230 * S, 43 * S, OUT);
  px(ctx, 62 * S, 64 * S, 226 * S, 40 * S, '#f8fafc');
  px(ctx, 74 * S, 70 * S, 190 * S, 14 * S, '#1e3a8a');
  px(ctx, 12 * S, 74 * S, 310 * S, 2 * S, '#1e293b');
  px(ctx, 12 * S, 75 * S, 310 * S, 1 * S, '#ffffff');
  for (let rx = 20; rx <= 316; rx += 16) {
    px(ctx, rx * S, 75 * S, 2 * S, 30 * S, '#1e293b');
  }
  for (let row = 0; row < 56; row++) {
    const y = (105 + row) * S;
    const leftX = (14 + Math.floor(row * 0.65)) * S;
    const rightX = (326 - Math.floor(row * 0.25)) * S;
    const rw = Math.max(30 * S, rightX - leftX);
    px(ctx, leftX - 2 * S, y, rw + 4 * S, S, OUT);
    px(ctx, leftX, y, rw, S, row < 44 ? '#ffffff' : '#0f172a');
  }
  return c;
}

/**
 * Renders the 4-frame Glamorous VIP Women Duo (192x192 = 3x of 64x64)
 * from `/assets/sprites/vip_women_clean.png` (Blonde in Crimson Gown & Brunette in Jet-Black Gown!).
 */
function renderVipWomenFrames(womenImg?: HTMLImageElement): HTMLCanvasElement[] {
  const S = 3;
  const W = 64 * S; // 192
  const H = 64 * S; // 192

  return [0, 1, 2, 3].map((f) => {
    const [c, ctx] = createCanvas(W, H);
    ctx.imageSmoothingEnabled = false;

    if (womenImg) {
      const bobY = (f % 2 === 0 ? 0 : 1) * S;
      ctx.drawImage(
        womenImg,
        0,
        0,
        womenImg.width,
        womenImg.height,
        4 * S,
        2 * S + bobY,
        W - 8 * S,
        H - 2 * S - bobY
      );
    }

    // Floating Pink & Gold Glamour Hearts above the VIP Women!
    const hx = (f % 2 === 0 ? 25 : 31) * S;
    const hy = (2 + (f % 3)) * S;
    px(ctx, hx, hy, 2 * S, 2 * S, '#ec4899');
    px(ctx, hx + 3 * S, hy, 2 * S, 2 * S, '#ec4899');
    px(ctx, hx - 1 * S, hy + 1 * S, 7 * S, 2 * S, '#f472b6');
    px(ctx, hx, hy + 3 * S, 5 * S, 2 * S, '#ec4899');
    px(ctx, hx + 2 * S, hy + 5 * S, 1 * S, 1 * S, '#be185d');

    return c;
  });
}

/**
 * Renders the 2-frame 24K Golden Lamborghini Aventador SVJ Supercar (384x162 = 3x of 128x54)
 * for the Boss Defeat Finale!
 * - Unmistakable low-slung Italian wedge silhouette with razor-sharp pointed nose,
 *   steeply raked panoramic sapphire windshield, hexagonal side carbon air intake,
 *   aerodynamic SVJ rear wing, and multi-spoke gold Y-rims with red Brembo calipers!
 * - Frame 0: Parked on the Riviera Pier with its iconic Scissor Door open upward waiting for MC Pao!
 * - Frame 1: Scissor door closed, MC Pao (with blue sunglasses & beard) + VIP Blonde inside,
 *   twin V12 blue/gold exhaust flames roaring out the back as he speeds off to Monaco!
 */
function renderGoldenLamboFrames(paoVipImg?: HTMLImageElement): HTMLCanvasElement[] {
  const S = 3;
  const W = 128 * S; // 384
  const H = 54 * S; // 162

  const drawPoly = (
    ctx: CanvasRenderingContext2D,
    pts: Array<[number, number]>,
    fill: string,
    stroke?: string,
    lineW: number = 6
  ) => {
    ctx.beginPath();
    pts.forEach(([x, y], idx) => {
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineW;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  return [0, 1].map((occupied) => {
    const [c, ctx] = createCanvas(W, H);
    ctx.imageSmoothingEnabled = false;
    const OUT = '#120b07';

    // 1. Roaring V12 Twin-Turbo Exhaust Afterburner Flames when driving off (Frame 1)!
    if (occupied === 1) {
      drawPoly(
        ctx,
        [
          [2, 108],
          [46, 98],
          [46, 122],
        ],
        '#f97316',
        OUT,
        4
      );
      drawPoly(
        ctx,
        [
          [10, 108],
          [46, 102],
          [46, 118],
        ],
        '#facc15'
      );
      drawPoly(
        ctx,
        [
          [22, 108],
          [46, 105],
          [46, 114],
        ],
        '#38bdf8'
      );
    }

    // 2. Aventador SVJ Carbon-Fiber Rear Wing Spoiler (left stern, x=24..68, y=52..88)
    drawPoly(
      ctx,
      [
        [24, 52],
        [66, 56],
        [62, 66],
        [20, 62],
      ],
      '#facc15',
      OUT,
      5
    );
    // Wing strut
    drawPoly(
      ctx,
      [
        [40, 64],
        [52, 64],
        [58, 88],
        [44, 88],
      ],
      '#1e293b',
      OUT,
      4
    );

    // 3. Upward-Opening Lamborghini Scissor Door when waiting for MC Pao (Frame 0)!
    if (occupied === 0) {
      drawPoly(
        ctx,
        [
          [176, 58],
          [242, 8],
          [268, 22],
          [232, 74],
        ],
        '#facc15',
        OUT,
        6
      );
      drawPoly(
        ctx,
        [
          [184, 54],
          [238, 15],
          [256, 24],
          [224, 66],
        ],
        '#fef08a'
      );
      drawPoly(
        ctx,
        [
          [192, 56],
          [232, 26],
          [244, 34],
          [220, 64],
        ],
        '#1e293b',
        OUT,
        3
      );
    }

    // 4. Steeply Raked Supercar Canopy & Sapphire-Tinted Panoramic Windshield
    drawPoly(
      ctx,
      [
        [98, 82],
        [156, 48],
        [232, 48],
        [312, 86],
        [110, 88],
      ],
      '#0f172a',
      OUT,
      6
    );
    // Raked Sapphire Windshield Reflection
    drawPoly(
      ctx,
      [
        [226, 52],
        [304, 84],
        [282, 84],
        [212, 52],
      ],
      '#38bdf8'
    );
    drawPoly(
      ctx,
      [
        [244, 58],
        [296, 82],
        [288, 82],
        [236, 58],
      ],
      '#bae6fd'
    );

    // Cockpit Interior: Luxury Quilted Seats or MC Pao + VIP Blonde Inside (Frame 1)!
    if (occupied === 1) {
      // VIP Blonde Companion in passenger seat
      pxOval(ctx, 174, 66, 13, 14, OUT);
      pxOval(ctx, 174, 66, 11, 12, '#facc15');
      pxOval(ctx, 176, 68, 8, 8, '#f6b286');
      // MC Pao in driver seat behind the wheel!
      if (paoVipImg) {
        ctx.drawImage(paoVipImg, 40, 0, 260, 210, 186, 42, 54, 45);
      } else {
        pxOval(ctx, 212, 66, 14, 14, '#f6b286');
        px(ctx, 204, 62, 18, 7, '#1d4ed8');
      }
    } else {
      // Tan/Gold Italian leather bucket seats visible inside open cockpit
      drawPoly(
        ctx,
        [
          [158, 56],
          [176, 56],
          [184, 84],
          [162, 84],
        ],
        '#d97706',
        OUT,
        3
      );
      drawPoly(
        ctx,
        [
          [194, 58],
          [212, 58],
          [220, 84],
          [198, 84],
        ],
        '#b45309',
        OUT,
        3
      );
    }

    // 5. Sculpted 24K Gold Lamborghini Aventador SVJ Wedge Bodywork
    // Main faceted chassis silhouette from rear diffuser to razor-sharp front splitter
    drawPoly(
      ctx,
      [
        [32, 84],
        [108, 78],
        [238, 78],
        [314, 84],
        [374, 110],
        [378, 124],
        [356, 132],
        [44, 132],
        [28, 116],
      ],
      '#eab308',
      OUT,
      6
    );

    // Upper 24K Specular Gold Shoulder & Hood Highlight Facet
    drawPoly(
      ctx,
      [
        [36, 86],
        [110, 81],
        [238, 81],
        [312, 86],
        [368, 110],
        [332, 110],
        [236, 94],
        [42, 96],
      ],
      '#fef08a'
    );

    // Mid-Body Bright Gold Sculpted Door & Fender Plane
    drawPoly(
      ctx,
      [
        [42, 95],
        [238, 92],
        [354, 108],
        [368, 118],
        [48, 118],
      ],
      '#facc15'
    );

    // Lower Deep-Gold Side Skirt & Shadow Crease
    drawPoly(
      ctx,
      [
        [48, 116],
        [362, 116],
        [354, 129],
        [46, 129],
      ],
      '#a16207'
    );

    // 6. Signature Lamborghini Hexagonal Carbon-Fiber Side Air Intake Scoop!
    drawPoly(
      ctx,
      [
        [136, 86],
        [194, 86],
        [208, 102],
        [182, 118],
        [128, 116],
        [144, 100],
      ],
      '#090d16',
      OUT,
      4
    );
    drawPoly(
      ctx,
      [
        [146, 90],
        [186, 90],
        [196, 102],
        [176, 113],
        [138, 112],
      ],
      '#1e293b'
    );
    // Gold intake strake
    drawPoly(
      ctx,
      [
        [144, 100],
        [196, 100],
        [192, 105],
        [140, 105],
      ],
      '#facc15'
    );

    // 7. Carbon-Fiber Front Splitter, Rear Diffuser & Angular Y-Pattern LED Headlight
    drawPoly(
      ctx,
      [
        [324, 122],
        [380, 122],
        [374, 132],
        [318, 132],
      ],
      '#090d16',
      OUT,
      3
    );
    // Sharp Y-LED Headlight on sloped front hood
    drawPoly(
      ctx,
      [
        [326, 96],
        [362, 108],
        [354, 114],
        [318, 102],
      ],
      '#ffffff',
      OUT,
      3
    );
    drawPoly(
      ctx,
      [
        [330, 99],
        [358, 108],
        [352, 111],
        [324, 102],
      ],
      '#38bdf8'
    );

    // Rear Triple-Y LED Taillight & Carbon Diffuser
    drawPoly(
      ctx,
      [
        [28, 86],
        [52, 86],
        [48, 96],
        [26, 96],
      ],
      '#ef4444',
      OUT,
      3
    );

    // 8. Deep-Dish Black & 24K Gold Forgiato Y-Spoke Supercar Wheels (Rear x=94, Front x=294)
    const wheels = [94, 294];
    const wy = 124;
    for (const wx of wheels) {
      // Wheel arch cutout shadow
      ctx.beginPath();
      ctx.arc(wx, wy, 35, Math.PI, 0, false);
      ctx.fillStyle = '#090d16';
      ctx.fill();

      // Pirelli P-Zero Low-Profile Tire
      ctx.beginPath();
      ctx.arc(wx, wy, 31, 0, Math.PI * 2);
      ctx.fillStyle = '#18181b';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = OUT;
      ctx.stroke();

      // Inner Dark Alloy Barrel
      ctx.beginPath();
      ctx.arc(wx, wy, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#090d16';
      ctx.fill();

      // Red Brembo Carbon-Ceramic Brake Caliper
      ctx.beginPath();
      ctx.arc(wx, wy, 17, Math.PI * 0.75, Math.PI * 1.35);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 6;
      ctx.stroke();

      // 24K Gold Multi-Spoke Star Rim
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.5;
      for (let s = 0; s < 6; s++) {
        const ang = (s / 6) * Math.PI * 2 + (occupied ? 0.35 : 0);
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + Math.cos(ang) * 21, wy + Math.sin(ang) * 21);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(wx, wy, 21, 0, Math.PI * 2);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Center Gold Bull Hubcap
      ctx.beginPath();
      ctx.arc(wx, wy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 9. Luxury Diamond Sparkles on the 24K Gold Paint!
    const spX = (occupied === 0 ? 255 : 315);
    const spY = 76;
    px(ctx, spX - 8, spY, 17, 3, '#ffffff');
    px(ctx, spX - 1, spY - 7, 3, 17, '#ffffff');
    px(ctx, spX - 2, spY - 1, 5, 5, '#fef08a');

    snapSpriteBottomToFloor(ctx, W, H);
    return c;
  });
}

/**
 * Renders the 4-frame Camera Look, Sunglasses Star-Wink & VIP Flex Pose (174x210 = 3x of 58x70)
 * triggered when MC Pao meets the Glamorous Blonde & Brunette Women on the Super-Yacht!
 */
function renderPaoVipPoseFrames(
  costume: PaoCostume,
  paoImg?: HTMLImageElement,
  isVipSource: boolean = true
): HTMLCanvasElement[] {
  const S = 3;
  const W = 58 * S; // 174
  const H = 70 * S; // 210

  const vipPoses: PaoRigPose[] = [0, 1, 2, 3].map((f) => ({
    ...PAO_IDLE_POSES[f % PAO_IDLE_POSES.length],
    torsoY: f % 2 === 0 ? 0 : 1,
    torsoTiltDeg: f === 0 ? -2 : f === 2 ? 2 : 0,
  }));

  return vipPoses.map((pose, f) => {
    const c = renderPaoFallback(pose, costume);
    if (paoImg) {
      stampArticulatedPaoFrame(c, paoImg, pose, costume, isVipSource);
    }
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;

    // 1. 24K Gold Chain & Medallion Highlight (matching Screenshot 2 `12.44.28` on the yacht!)
    const medX = 29 * S;
    const medY = (35 + pose.torsoY) * S;
    pxOval(ctx, medX, medY, 2.8 * S, 2.8 * S, '#120b07');
    pxOval(ctx, medX, medY, 2.0 * S, 2.0 * S, '#facc15');
    px(ctx, medX - 0.8 * S, medY - 0.8 * S, 1.5 * S, 1.5 * S, '#fef08a');

    // 2. Camera-Facing Blue Sunglasses Star-Wink Glint (`✦`)
    const glintX = (f % 2 === 0 ? 33 : 25) * S;
    const glintY = (17 + pose.torsoY) * S;
    px(ctx, glintX - 3 * S, glintY, 7 * S, 1.2 * S, '#ffffff');
    px(ctx, glintX, glintY - 3 * S, 1.2 * S, 7 * S, '#ffffff');
    px(ctx, glintX - 1 * S, glintY - 1 * S, 3 * S, 3 * S, '#38bdf8');

    // 3. Raised VIP Champagne Flute / Peace Flex in his left hand toward the camera!
    const handX = 43 * S;
    const handY = (27 + (f % 2 === 0 ? -2 : 0)) * S;
    // Golden Champagne Flute with rising bubbles!
    px(ctx, handX, handY - 6 * S, 5 * S, 6 * S, '#120b07');
    px(ctx, handX + 1 * S, handY - 5 * S, 3 * S, 4 * S, '#fef08a');
    px(ctx, handX + 1 * S, handY - 5 * S, 3 * S, 1.5 * S, '#ffffff');
    px(ctx, handX + 2 * S, handY, 1.2 * S, 3 * S, '#facc15');
    px(ctx, handX + 0.5 * S, handY + 3 * S, 4 * S, 1.2 * S, '#facc15');
    // Champagne sparkle above glass
    if (f % 2 === 0) {
      px(ctx, handX + 2 * S, handY - 9 * S, 1.5 * S, 1.5 * S, '#ffffff');
      px(ctx, handX + 4 * S, handY - 8 * S, 1.2 * S, 1.2 * S, '#f472b6');
    }

    snapSpriteBottomToFloor(ctx, W, H);
    return c;
  });
}

function buildPaoSpriteSetForCostume(
  costume: PaoCostume,
  rmWatchPoses: PaoRigPose[],
  paoVipImg?: HTMLImageElement,
  paoWhiteImg?: HTMLImageElement,
  swimImg?: HTMLImageElement
): PaoSpriteSet {
  const idle = PAO_IDLE_POSES.map((p) => renderPaoFallback(p, costume));
  const run = PAO_RUN_POSES.map((p) => renderPaoFallback(p, costume));
  const land = PAO_LAND_POSES.map((p) => renderPaoFallback(p, costume));
  const scooter = rmWatchPoses.map((p) => renderPaoFallback(p, costume));
  const swim = renderPaoSwimFrames(costume, swimImg);
  const vipPose = renderPaoVipPoseFrames(costume, undefined, costume !== 'classic_white');
  const jump = renderPaoFallback(PAO_JUMP_POSE, costume);
  const doubleJump = renderPaoFallback(PAO_DOUBLE_JUMP_POSE, costume);
  const stomp = renderPaoFallback(PAO_STOMP_POSE, costume);
  const groundPound = renderPaoFallback(PAO_GROUND_POUND_POSE, costume);
  const hurt = renderPaoFallback(PAO_HURT_POSE, costume);
  const [headIcon] = createCanvas(24, 24);

  const sourceImg = costume === 'classic_white' ? paoWhiteImg : paoVipImg;
  if (sourceImg) {
    stampPaoSpriteSetFromImage(
      {
        idle,
        run,
        land,
        jump,
        doubleJump,
        stomp,
        groundPound,
        scooter,
        swim,
        vipPose,
        hurt,
        headIcon,
      },
      sourceImg,
      rmWatchPoses,
      costume,
      costume !== 'classic_white',
      swimImg
    );
  }

  return {
    idle,
    run,
    land,
    jump,
    doubleJump,
    stomp,
    groundPound,
    scooter,
    swim,
    vipPose,
    hurt,
    headIcon,
  };
}

function stampPaoSpriteSetFromImage(
  set: PaoSpriteSet,
  paoImg: HTMLImageElement,
  rmWatchPoses: PaoRigPose[],
  costume: PaoCostume,
  isVipSource: boolean = true,
  swimImg?: HTMLImageElement
) {
  const W = 58 * 3; // 174
  const H = 70 * 3; // 210

  PAO_IDLE_POSES.forEach((pose, idx) => {
    stampArticulatedPaoFrame(set.idle[idx], paoImg, pose, costume, isVipSource);
    const ctx = set.idle[idx].getContext('2d')!;
    snapSpriteBottomToFloor(ctx, W, H);
  });
  PAO_RUN_POSES.forEach((pose, idx) => {
    stampArticulatedPaoFrame(set.run[idx], paoImg, pose, costume, isVipSource);
    const ctx = set.run[idx].getContext('2d')!;
    snapSpriteBottomToFloor(ctx, W, H);
  });
  PAO_LAND_POSES.forEach((pose, idx) => {
    stampArticulatedPaoFrame(set.land[idx], paoImg, pose, costume, isVipSource);
    const ctx = set.land[idx].getContext('2d')!;
    snapSpriteBottomToFloor(ctx, W, H);
  });
  rmWatchPoses.forEach((pose, idx) => {
    stampArticulatedPaoFrame(set.scooter[idx], paoImg, pose, costume, isVipSource);
    const ctx = set.scooter[idx].getContext('2d')!;
    snapSpriteBottomToFloor(ctx, W, H);
  });

  // Stamp 4-frame Camera VIP Pose with Sunglasses Star-Wink & Champagne Flex
  const stampedVip = renderPaoVipPoseFrames(costume, paoImg, isVipSource);
  stampedVip.forEach((srcCanvas, idx) => {
    const dst = set.vipPose[idx];
    if (!dst) return;
    if (dst.width !== srcCanvas.width) dst.width = srcCanvas.width;
    if (dst.height !== srcCanvas.height) dst.height = srcCanvas.height;
    const dstCtx = dst.getContext('2d')!;
    dstCtx.clearRect(0, 0, dst.width, dst.height);
    dstCtx.drawImage(srcCanvas, 0, 0);
  });

  if (swimImg) {
    const stampedSwim = renderPaoSwimFrames(costume, swimImg);
    stampedSwim.forEach((srcCanvas, idx) => {
      const dst = set.swim[idx];
      if (!dst) return;
      if (dst.width !== srcCanvas.width) dst.width = srcCanvas.width;
      if (dst.height !== srcCanvas.height) dst.height = srcCanvas.height;
      const dstCtx = dst.getContext('2d')!;
      dstCtx.clearRect(0, 0, dst.width, dst.height);
      dstCtx.drawImage(srcCanvas, 0, 0);
    });
  }

  stampArticulatedPaoFrame(set.jump, paoImg, PAO_JUMP_POSE, costume, isVipSource);
  stampArticulatedPaoFrame(set.doubleJump, paoImg, PAO_DOUBLE_JUMP_POSE, costume, isVipSource);
  stampArticulatedPaoFrame(set.stomp, paoImg, PAO_STOMP_POSE, costume, isVipSource);
  stampArticulatedPaoFrame(set.groundPound, paoImg, PAO_GROUND_POUND_POSE, costume, isVipSource);
  stampArticulatedPaoFrame(set.hurt, paoImg, PAO_HURT_POSE, costume, isVipSource);

  const hCtx = set.headIcon.getContext('2d')!;
  hCtx.imageSmoothingEnabled = false;
  hCtx.clearRect(0, 0, 24, 24);
  hCtx.drawImage(paoImg, 60, 0, 220, 200, 0, 0, 24, 24);
}

let cachedBank: SpriteBank | null = null;

export function getSpriteBank(): SpriteBank {
  if (cachedBank) return cachedBank;

  const archetypes: MarcoArchetype[] = ['waddler', 'caller', 'charger'];
  const marcoBank = {} as SpriteBank['marco'];
  for (const arch of archetypes) {
    marcoBank[arch] = {
      walk: [
        renderMarcoFallback(arch, 'walk0'),
        renderMarcoFallback(arch, 'walk1'),
        renderMarcoFallback(arch, 'walk2'),
        renderMarcoFallback(arch, 'walk3'),
      ],
      windup: renderMarcoFallback(arch, 'windup'),
      squished: renderMarcoFallback(arch, 'squished'),
    };
  }

  // 4-frame Richard Mille Blue Watch Overdrive sprint poses
  const rmWatchPoses: PaoRigPose[] = [0, 1, 3, 4].map((idx) => ({
    ...PAO_RUN_POSES[idx],
    torsoTiltDeg: 8,
    leftArmDeg: -28,
    rmWatchOverdrive: true,
    hypeMouth: true,
  }));

  const costumes: Record<PaoCostume, PaoSpriteSet> = {
    yacht_black_vip: buildPaoSpriteSetForCostume('yacht_black_vip', rmWatchPoses),
    classic_white: buildPaoSpriteSetForCostume('classic_white', rmWatchPoses),
    monaco_gold: buildPaoSpriteSetForCostume('monaco_gold', rmWatchPoses),
  };

  const [bossS0] = createCanvas(64, 74);
  const [bossS1] = createCanvas(64, 74);
  const [bossV0] = createCanvas(64, 74);
  const [bossV1] = createCanvas(64, 74);
  const [bossCharge] = createCanvas(64, 74);

  cachedBank = {
    pao: costumes.yacht_black_vip,
    costumes,
    marco: marcoBank,
    boss: {
      shielded: [bossS0, bossS1],
      vulnerable: [bossV0, bossV1],
      charging: bossCharge,
    },
    props: {
      crate: renderWoodenCrate(),
      mysteryBlock: renderMysteryBlockFrames(),
      anvilCrate: renderAnvilCrate(),
      scooterPickup: renderBlueRichardMilleWatchFrames(),
      springAwning: renderSpringAwningFrames(),
      barrelPlant: renderBarrelPlant(),
      chain: renderChainFrames(),
      espresso: renderEspresso(),
      wineBottle: renderWineBottle8000(),
      invoice: renderInvoiceProjectile(),
      superYacht: renderSuperYacht(),
      vipWomen: renderVipWomenFrames(),
      goldenLambo: renderGoldenLamboFrames(),
      stoneTileTop: renderStoneTileTop(),
      stoneTileBody: renderStoneTileBody(),
      ivyOverlay: renderIvyOverlay(),
    },
  };

  if(import.meta.env.DEV && new URLSearchParams(window.location.search).get('sourceArt')==='1'){
    installPolishedSprites(cachedBank);
    installPolishedYacht(cachedBank);
  }else installPackedSprites(cachedBank);

  return cachedBank;
}
