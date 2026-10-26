import React, { useEffect, useRef } from 'react';
import {
  aabbOverlap,
  getOpenWaterZoneAt,
  calculateStompScore,
  clampDt,
  PHYSICS,
  resolvePlayerBossInteraction,
  resolvePlayerEnemyInteraction,
  resolvePlayerHorizontalPlatformWall,
  resolvePlayerPlatformAABB,
  selectPlayerAnimState,
  stepBossAI,
  stepEnemyPlatformGravity,
  stepJumpMechanics,
  stepMarcoAI,
  stepSwimmingPhysics,
  type CustomLevelItem,
  type CustomLevelPayload,
  type GameState,
  type PaoCostume,
  type WeatherMode,
} from '../game/rules';
import {
  buildLevelFromCustomPayload,
  buildMediterraneanLevel,
  createInitialPlayer,
  type LevelData,
  STORY_LEAD_IN,
} from '../game/level';
import { getSpriteBank, type SpriteBank } from '../game/sprites';
import { soundFX } from '../game/audio';

export interface HudSnapshot {
  checkpoint?: boolean;
  hint?: string;
  zone?: string;
  bottleRecovered?: boolean;
  calloutActive?: boolean;
  score: number;
  highScore: number;
  chains: number;
  combo: number;
  maxCombo: number;
  hp: number;
  maxHp: number;
  scooterSec: number; // Represents Electric-Blue Richard Mille Watch Overdrive seconds
  marcosStomped: number;
  totalMarcos: number;
  progressPct: number;
  victory: boolean;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: number;
  bossState: string;
}

export interface TouchInputRef {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpJustPressed: boolean;
  down?: boolean;
  downJustPressed?: boolean;
}

interface GameCanvasProps {
  gameState: GameState;
  resetSignal: number;
  retrySignal?: number;
  weatherMode: WeatherMode;
  costume: PaoCostume;
  customLevel: CustomLevelPayload | null;
  spawnAtBoss: boolean;
  editorTool: CustomLevelItem['kind'] | 'erase';
  editorCamX: number;
  onEditorCanvasClick?: (worldX: number, worldY: number) => void;
  touchInputRef: React.MutableRefObject<TouchInputRef>;
  onHudUpdate: (hud: HudSnapshot) => void;
  onGameOver: (finalStats: HudSnapshot) => void;
  onTogglePause: () => void;
}

interface PooledParticle {
  active: boolean;
  kind: 'dust' | 'splinter' | 'sparkle' | 'exhaust' | 'impact_line' | 'wine_bottle';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  angle: number;
}

interface FloatingPopup {
  active: boolean;
  text: string;
  subText: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface AfterimageGhost {
  active: boolean;
  x: number;
  y: number;
  facing: 1 | -1;
  life: number;
  maxLife: number;
}

const PARTICLE_POOL_SIZE = 190;
const POPUP_POOL_SIZE = 28;
const GHOST_POOL_SIZE = 10;
const VIEW_W = 480;
const VIEW_H = 320;
const RENDER_SCALE = 3;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  resetSignal,
  retrySignal = 0,
  weatherMode,
  costume,
  customLevel,
  spawnAtBoss,
  editorTool,
  editorCamX,
  onEditorCanvasClick,
  touchInputRef,
  onHudUpdate,
  onGameOver,
  onTogglePause,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const weatherModeRef = useRef<WeatherMode>(weatherMode);
  const costumeRef = useRef<PaoCostume>(costume);
  const customLevelRef = useRef<CustomLevelPayload | null>(customLevel);
  const spawnAtBossRef = useRef<boolean>(spawnAtBoss);
  const editorToolRef = useRef<CustomLevelItem['kind'] | 'erase'>(editorTool);
  const editorCamXRef = useRef<number>(editorCamX);
  const onEditorCanvasClickRef = useRef(onEditorCanvasClick);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onGameOverRef = useRef(onGameOver);
  const onTogglePauseRef = useRef(onTogglePause);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    weatherModeRef.current = weatherMode;
  }, [weatherMode]);

  useEffect(() => {
    costumeRef.current = costume;
  }, [costume]);

  useEffect(() => {
    customLevelRef.current = customLevel;
  }, [customLevel]);

  useEffect(() => {
    spawnAtBossRef.current = spawnAtBoss;
  }, [spawnAtBoss]);

  useEffect(() => {
    editorToolRef.current = editorTool;
  }, [editorTool]);

  useEffect(() => {
    editorCamXRef.current = editorCamX;
  }, [editorCamX]);

  useEffect(() => {
    onEditorCanvasClickRef.current = onEditorCanvasClick;
    onHudUpdateRef.current = onHudUpdate;
    onGameOverRef.current = onGameOver;
    onTogglePauseRef.current = onTogglePause;
  }, [onEditorCanvasClick, onHudUpdate, onGameOver, onTogglePause]);

  const simRef = useRef<{
    reset: () => void;
    retryCheckpoint: () => void;
    rebuildEditorPreview: () => void;
    getCamX: () => number;
  } | null>(null);

  useEffect(() => {
    if (resetSignal > 0 && simRef.current) {
      simRef.current.reset();
    }
  }, [resetSignal]);

  useEffect(() => {
    if (retrySignal > 0) simRef.current?.retryCheckpoint();
  }, [retrySignal]);

  useEffect(() => {
    if (gameState === 'editor' && simRef.current) {
      simRef.current.rebuildEditorPreview();
    }
  }, [customLevel, gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let VIEW_W = 480;
    const resizeGame = () => {
      VIEW_W = Math.round(Math.max(320, Math.min(900, VIEW_H * window.innerWidth / window.innerHeight)));
      canvas.width = VIEW_W * RENDER_SCALE;
      canvas.height = VIEW_H * RENDER_SCALE;
      ctx.imageSmoothingEnabled = false;
    };
    resizeGame();
    window.addEventListener('resize', resizeGame);
    const sprites: SpriteBank = getSpriteBank();

    let highScore = 0;
    try {
      const saved = localStorage.getItem('mcpao_highscore');
      if (saved) highScore = parseInt(saved, 10) || 0;
    } catch {
      // Ignore storage errors
    }

    const createActiveLevel = (): LevelData => {
      if (customLevelRef.current) {
        return buildLevelFromCustomPayload(customLevelRef.current);
      }
      return buildMediterraneanLevel();
    };

    let level: LevelData = createActiveLevel();
    let player = createInitialPlayer(84, 182, costumeRef.current);
    let camX = 0;
    let trauma = 0;
    let hitstopTimer = 0;
    let worldTime = 0;
    let defeatDelayTimer = 0;
    let lamboGetawayTimer = 0;
    let lamboDriveX = 3294;
    let ghostSpawnTimer = 0;
    let lastReportedKey = '';
    let lastQuoteAt = -10;
    let downWasHeld = false;
    let stompPoseTimer = 0;
    let checkpointData: { level: LevelData; x: number; y: number; score: number; chains: number; marcosStomped: number; maxCombo: number } | null = null;

    // Pre-allocate Zero-GC Particle Pool
    const particles: PooledParticle[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      kind: 'dust',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.4,
      color: '#ffffff',
      size: 3,
      angle: 0,
    }));
    let particleCursor = 0;

    const spawnParticle = (
      kind: PooledParticle['kind'],
      x: number,
      y: number,
      vx: number,
      vy: number,
      life: number,
      color: string,
      size: number = 3,
      angle: number = 0
    ) => {
      const p = particles[particleCursor];
      particleCursor = (particleCursor + 1) % PARTICLE_POOL_SIZE;
      p.active = true;
      p.kind = kind;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.color = color;
      p.size = size;
      p.angle = angle;
    };

    // Pre-allocate Sapphire Speed Afterimage Ghosts (for Richard Mille Watch Overdrive & Chain Slam)
    const ghosts: AfterimageGhost[] = Array.from({ length: GHOST_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      facing: 1,
      life: 0,
      maxLife: 0.22,
    }));
    let ghostCursor = 0;

    const spawnGhost = (x: number, y: number, facing: 1 | -1) => {
      const g = ghosts[ghostCursor];
      ghostCursor = (ghostCursor + 1) % GHOST_POOL_SIZE;
      g.active = true;
      g.x = x;
      g.y = y;
      g.facing = facing;
      g.life = 0.2;
      g.maxLife = 0.2;
    };

    // Pre-allocate Floating Comic Text Popups
    const popups: FloatingPopup[] = Array.from({ length: POPUP_POOL_SIZE }, () => ({
      active: false,
      text: '',
      subText: '',
      x: 0,
      y: 0,
      vy: -40,
      life: 0,
      maxLife: 0.9,
      color: '#fef08a',
    }));
    let popupCursor = 0;

    const spawnPopup = (
      text: string,
      subText: string,
      x: number,
      y: number,
      color: string = '#fef08a'
    ) => {
      if (text === 'CAISSE DE BILLETS !') { text = '+200 €'; subText = ''; }
      if (text === 'ESPRESSO CORSE !') { text = '+1 ♥'; subText = ''; }
      if (/^\+\d+ €$/.test(text)) {
        const existing = popups.find(p => p.active && /^\+\d+ €$/.test(p.text) && Math.abs(p.x - x) < 120);
        if (existing) { existing.text = `+${parseInt(existing.text.slice(1)) + parseInt(text.slice(1))} €`; existing.life = .8; existing.x = x; existing.y = y - 15; return; }
      }
      if (text.length > 18) {
        const important = /SONNÉ|BATS DON|SAUVÉE|POINT VIP|BOUCLIER/.test(text);
        if (!important && worldTime - lastQuoteAt < 1.8) return;
        for (const p of popups) if (p.text.length > 18) p.active = false;
        lastQuoteAt = worldTime;
      }
      const pop = popups[popupCursor];
      popupCursor = (popupCursor + 1) % POPUP_POOL_SIZE;
      pop.active = true;
      pop.text = text;
      pop.subText = subText;
      pop.x = x;
      pop.y = y;
      pop.vy = -52;
      pop.life = text.length > 18 ? 1.8 : .8;
      pop.maxLife = pop.life;
      pop.color = color;
    };

    const spawnRadialComicImpact = (centerX: number, centerY: number) => {
      const angles = [
        -Math.PI * 0.88,
        -Math.PI * 0.98,
        Math.PI * 0.92,
        -Math.PI * 0.12,
        -0.02,
        0.12,
      ];
      for (const ang of angles) {
        spawnParticle('impact_line', centerX, centerY, 0, 0, 0.22, '#ffffff', 12, ang);
      }
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 45 + Math.random() * 85;
        spawnParticle(
          'dust',
          centerX,
          centerY,
          Math.cos(a) * spd,
          Math.sin(a) * spd - 20,
          0.28 + Math.random() * 0.15,
          i % 2 === 0 ? '#ffffff' : '#fef08a',
          3
        );
      }
    };

    const isBossEngaged = () =>
      level.boss.active &&
      !level.boss.defeated &&
      Math.abs(player.x - level.boss.x) < 520;

    const syncHud = (force: boolean = false, victory: boolean = false) => {
      if (player.score > highScore) {
        highScore = player.score;
        try {
          localStorage.setItem('mcpao_highscore', String(highScore));
        } catch {
          // ignore
        }
      }
      const scooterSec = Math.ceil(Math.max(0, player.scooterTimer));
      const progressPct = Math.min(
        100,
        Math.max(0, Math.round((player.x / level.goalX) * 100))
      );
      const bossActive = isBossEngaged();
      const x = player.x - (customLevelRef.current ? 0 : STORY_LEAD_IN);
      const hint = customLevelRef.current ? 'Ton niveau, tes règles.'
        : level.boss.defeated ? 'Bouteille sauvée ! Rejoins la Lambo dorée.'
        : bossActive ? (level.boss.state === 'vulnerable' ? 'Maintenant ! Saute sur sa tête.' : 'Esquive son attaque. Attends qu’il soit sonné.')
        : x < 70 ? (window.matchMedia('(pointer: coarse)').matches ? 'Maintiens → pour avancer · SAUT pour sauter' : '← → pour avancer · Espace pour sauter')
        : x < 280 && player.marcosStomped === 0 ? 'Saute sur la tête de Marco !'
        : x < 540 ? 'La montre bleue te rend invincible pendant 8 secondes.'
        : x < 1052 ? 'Deux sauts pour le yacht. Dans l’eau, saute pour ressortir !'
        : x < 2048 ? 'Enchaîne les Marcos pour multiplier ton score.'
        : x < 2816 ? 'Don Marco t’attend. Le point VIP sauvegarde ton parcours.' : '';
      const zone = x < 540 ? '01 / LA PROMENADE' : x < 1412 ? '02 / LE PORT' : x < 2536 ? '03 / RIVIERA TURBO' : '04 / LE DERNIER MARCO';
      const calloutActive=popups.some(p=>p.active&&p.text.length>18);
      const key = `${calloutActive}:${player.score}:${player.chains}:${player.combo}:${player.hp}:${scooterSec}:${player.marcosStomped}:${progressPct}:${victory}:${bossActive}:${level.boss.hp}:${level.boss.phase}:${level.boss.state}:${!!checkpointData}:${hint}`;
      if (force || key !== lastReportedKey) {
        lastReportedKey = key;
        onHudUpdateRef.current({
          checkpoint: !!checkpointData, hint, zone, bottleRecovered: level.boss.defeated, calloutActive,
          score: Math.round(player.score),
          highScore: Math.round(highScore),
          chains: player.chains,
          combo: player.combo,
          maxCombo: player.maxCombo,
          hp: player.hp,
          maxHp: player.maxHp,
          scooterSec,
          marcosStomped: player.marcosStomped,
          totalMarcos: level.enemies.length,
          progressPct,
          victory,
          bossActive,
          bossHp: level.boss.hp,
          bossMaxHp: level.boss.maxHp,
          bossPhase: level.boss.phase,
          bossState: level.boss.state,
        });
      }
    };

    const startLamboGetaway = () => {
      if (lamboGetawayTimer > 0 || player.inGoldenLambo) return;
      const lamboDeco = level.decos.find((d) => d.type === 'golden_lambo');
      lamboDriveX = lamboDeco ? lamboDeco.x : level.goalX - 36;
      player.inGoldenLambo = true;
      player.swimming = false;
      player.animState = 'lambo';
      player.x = lamboDriveX;
      player.y = 246 - player.h;
      player.vx = 0;
      player.vy = 0;
      lamboGetawayTimer = 2.6;
      trauma = 0.45;
      player.score += 10000;
      soundFX.playLamboGetaway();
      soundFX.speakFrenchCallout('En route dans la Lamborghini en or vingt-quatre carats !');
      spawnPopup(
        'LAMBORGHINI EN OR 24K !',
        '+10 000 € · V12 DIRECTION MONACO !',
        lamboDriveX + 55,
        165,
        '#facc15'
      );
    };

    const resetGame = () => {
      checkpointData = null; lastQuoteAt = -10; downWasHeld = false; stompPoseTimer = 0;
      level = createActiveLevel();
      const params =
        typeof window !== 'undefined'
          ? new URLSearchParams(import.meta.env.DEV ? window.location.search : '')
          : null;
      const urlYacht = params?.get('yacht') === '1';
      const urlSwim = params?.get('swim') === '1';
      const urlLambo = params?.get('lambo') === '1';

      lamboGetawayTimer = 0;
      const lamboDeco = level.decos.find((d) => d.type === 'golden_lambo');
      lamboDriveX = lamboDeco ? lamboDeco.x : level.goalX - 36;

      if (urlLambo) {
        level.boss.defeated = true;
        level.boss.state = 'defeated';
        const spawnX = lamboDriveX;
        player = createInitialPlayer(spawnX, 246 - 58, costumeRef.current);
        camX = Math.max(0, Math.min(level.width - VIEW_W, spawnX - 180));
        startLamboGetaway();
      } else if (urlYacht && level.yachts.length > 0) {
        const y0 = level.yachts[0];
        const spawnX = y0.x + 82;
        player = createInitialPlayer(spawnX, y0.deckY - 62, costumeRef.current);
        player.vipPoseTimer = 4.5;
        player.animState = 'vip_pose';
        y0.visited = true;
        y0.cheerTimer = 4.5;
        player.score = 2000;
        player.chains = 2;
        camX = Math.max(0, Math.min(level.width - VIEW_W, y0.x - 45));
        for (const e of level.enemies) {
          if (Math.abs(e.x - spawnX) < 350) {
            e.attackCooldown = 8.0;
          }
        }
      } else if (urlSwim) {
        const spawnX = level.yachts[0].x - 132;
        player = createInitialPlayer(spawnX, PHYSICS.WATER_SURFACE_Y - 44, costumeRef.current);
        player.swimming = true;
        player.grounded = false;
        player.animState = 'swim';
        player.score = 1000;
        player.chains = 2;
        camX = Math.max(0, Math.min(level.width - VIEW_W, spawnX - 135));
        for (const e of level.enemies) {
          if (Math.abs(e.x - spawnX) < 350) {
            e.attackCooldown = 8.0;
          }
        }
      } else if (spawnAtBossRef.current && level.boss.active) {
        const spawnX = Math.max(84, level.boss.minX - 20);
        const spawnY = level.boss.groundY - 64;
        player = createInitialPlayer(spawnX, spawnY, costumeRef.current);
        camX = Math.max(0, Math.min(level.width - VIEW_W, spawnX - 100));
      } else {
        player = createInitialPlayer(84, 184, costumeRef.current);
        camX = 0;
      }
      trauma = 0;
      hitstopTimer = 0;
      defeatDelayTimer = 0;
      for (const p of particles) p.active = false;
      for (const pop of popups) pop.active = false;
      for (const g of ghosts) g.active = false;
      keysPressed.clear();
      justPressed.clear();
      syncHud(true, false);
    };

    const retryCheckpoint = () => {
      if (!checkpointData) { resetGame(); return; }
      const saved = checkpointData;
      level = structuredClone(saved.level);
      level.projectiles = [];
      level.boss.y = level.boss.groundY - level.boss.h;
      level.boss.state = 'patrol_shielded'; level.boss.stateTimer = 1.7; level.boss.vx = 0; level.boss.vy = 0;
      player = createInitialPlayer(saved.x, saved.y, costumeRef.current);
      Object.assign(player, { score: saved.score, chains: saved.chains, marcosStomped: saved.marcosStomped, maxCombo: saved.maxCombo, invulnTimer: 1.5 });
      camX = Math.max(0, player.x - VIEW_W * .3);
      defeatDelayTimer = 0; hitstopTimer = 0; lamboGetawayTimer = 0; trauma = 0;
      keysPressed.clear(); justPressed.clear(); downWasHeld = false;
      for (const p of particles) p.active = false;
      for (const p of popups) p.active = false;
      spawnPopup('POINT VIP', 'Le combat reprend ici.', player.x, player.y - 12, '#f4ce80');
      syncHud(true);
    };

    const rebuildEditorPreview = () => {
      level = createActiveLevel();
      player = createInitialPlayer(84, 188, costumeRef.current);
    };

    // Unified Keyboard Input Hub
    const keysPressed = new Set<string>();
    const justPressed = new Set<string>();

    resetGame();

    simRef.current = {
      reset: resetGame,
      retryCheckpoint,
      rebuildEditorPreview,
      getCamX: () => camX,
    };
    syncHud(true, false);

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'Space'
      ) {
        if (gameStateRef.current === 'playing') {
          e.preventDefault();
        }
      }
      if (!keysPressed.has(code)) {
        justPressed.add(code);
      }
      keysPressed.add(code);

      if (
        (code === 'Escape' || code === 'KeyP') &&
        (gameStateRef.current === 'playing' || gameStateRef.current === 'paused')
      ) {
        onTogglePauseRef.current();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    const clearInputs = () => {
      keysPressed.clear();
      justPressed.clear();
      touchInputRef.current.left = false;
      touchInputRef.current.right = false;
      touchInputRef.current.jump = false;
      touchInputRef.current.jumpJustPressed = false;
      touchInputRef.current.downJustPressed = false;
      touchInputRef.current.down = false;
      downWasHeld = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);
    const handleVisChange = () => {
      if (document.hidden) clearInputs();
    };
    document.addEventListener('visibilitychange', handleVisChange);

    // --- SIMULATION STEP ---
    const stepSimulation = (rawDt: number) => {
      if (gameStateRef.current === 'paused' || gameStateRef.current === 'gameover') { justPressed.clear(); return; }
      const dt = clampDt(rawDt);
      worldTime += dt;
      stompPoseTimer = Math.max(0, stompPoseTimer - dt);

      for (const p of particles) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'splinter' || p.kind === 'wine_bottle') {
          p.vy += 650 * dt;
          p.angle += 7.5 * dt;
        }
      }

      for (const g of ghosts) {
        if (!g.active) continue;
        g.life -= dt;
        if (g.life <= 0) g.active = false;
      }

      for (const pop of popups) {
        if (!pop.active) continue;
        pop.life -= dt;
        if (pop.life <= 0) {
          pop.active = false;
          continue;
        }
        pop.y += pop.vy * dt;
        pop.vy *= 0.94;
      }

      for (const sp of level.springs) {
        if (sp.bounceTimer > 0) {
          sp.bounceTimer = Math.max(0, sp.bounceTimer - dt);
        }
      }

      trauma = Math.max(0, trauma - dt * 2.2);

      // Update Moving Harbor Gondola Platforms & Synchronize Player, Enemies, and Pickups!
      for (const plat of level.platforms) {
        if (plat.moveAxis === 'y' && plat.baseY !== undefined && plat.moveAmp && plat.moveSpeed) {
          const prevPlatY = plat.y;
          plat.y = Math.round(plat.baseY + Math.sin(worldTime * plat.moveSpeed) * plat.moveAmp);
          const dy = plat.y - prevPlatY;
          if (dy !== 0) {
            // 1. Carry player smoothly if standing on this moving platform
            if (
              player.grounded &&
              Math.abs(player.y + player.h - prevPlatY) <= 8 &&
              player.x + player.w > plat.x &&
              player.x < plat.x + plat.w
            ) {
              player.y = plat.y - player.h;
            }
            // 2. Carry any enemy standing on this moving platform so Marco never floats!
            for (const enemy of level.enemies) {
              const eCenterX = enemy.x + enemy.w * 0.5;
              if (
                eCenterX >= plat.x &&
                eCenterX <= plat.x + plat.w &&
                Math.abs(enemy.y + enemy.h - prevPlatY) <= 18
              ) {
                enemy.y = plat.y - enemy.h;
                enemy.vy = 0;
              }
            }
            // 3. Carry pickups floating above this moving platform
            for (const item of level.pickups) {
              if (item.collected) continue;
              const iCenterX = item.x + item.w * 0.5;
              if (
                iCenterX >= plat.x &&
                iCenterX <= plat.x + plat.w &&
                item.y <= prevPlatY &&
                item.y >= prevPlatY - 72
              ) {
                item.y += dy;
              }
            }
          }
        }
      }

      // Level Editor mode camera pan
      if (gameStateRef.current === 'editor') {
        camX += (editorCamXRef.current - camX) * Math.min(1, dt * 12);
        player.x = 84;
        player.y = 246 - player.h;
        player.facing = 1;
        player.animState = 'idle';
        return;
      }

      // Title Screen live animated preview: MC Pao stomping Mini Marco Mouly with articulated limbs!
      if (gameStateRef.current === 'title') {
        camX = 0;
        const previewMarco = level.enemies[0];
        if (previewMarco) {
          previewMarco.x = 186;
          previewMarco.y = 246 - previewMarco.h;
          previewMarco.facing = 1;
          previewMarco.walkDist += dt * 110;
          const cycle = (worldTime * 1.65) % 1;
          const bounceArc = Math.abs(Math.sin(cycle * Math.PI));
          player.x = 180;
          player.y = previewMarco.y - player.h + 4 - bounceArc * 16;
          player.facing = 1;
          player.walkDist += dt * 140;
          player.animState = cycle < 0.35 ? 'stomp' : 'jump';
          player.scaleX = cycle < 0.16 ? 1.2 : 0.94;
          player.scaleY = cycle < 0.16 ? 0.82 : 1.06;
          if (cycle < 0.14) {
            spawnRadialComicImpact(202, previewMarco.y + 4);
          }
        }
        return;
      }

      if (gameStateRef.current !== 'playing') {
        justPressed.clear();
        touchInputRef.current.jumpJustPressed = false;
        touchInputRef.current.downJustPressed = false;
        return;
      }

      if (hitstopTimer > 0) {
        hitstopTimer = Math.max(0, hitstopTimer - dt);
        return;
      }

      player.costume = costumeRef.current;

      if (lamboGetawayTimer > 0) {
        lamboGetawayTimer -= dt;
        player.inGoldenLambo = true;
        player.animState = 'lambo';
        // First 0.85s: rev V12 engine in place with twin exhaust flames; then launch forward!
        if (lamboGetawayTimer < 1.75) {
          lamboDriveX += 165 * dt;
        }
        player.x = lamboDriveX;
        const targetCam = Math.max(
          0,
          Math.min(level.width - VIEW_W, lamboDriveX - VIEW_W * 0.38)
        );
        camX += (targetCam - camX) * Math.min(1, dt * 8);

        if (Math.random() < 0.8) {
          spawnParticle(
            'sparkle',
            lamboDriveX - 6,
            234 + (Math.random() - 0.5) * 10,
            -120 - Math.random() * 90,
            -15 + (Math.random() - 0.5) * 30,
            0.28,
            Math.random() < 0.5 ? '#38bdf8' : '#facc15',
            4
          );
        }

        if (lamboGetawayTimer <= 0) {
          soundFX.playVictoryFanfare();
          syncHud(true, true);
          gameStateRef.current = 'gameover';
          onGameOverRef.current({
            score: Math.round(player.score),
            highScore: Math.round(Math.max(highScore, player.score)),
            chains: player.chains,
            combo: player.combo,
            maxCombo: player.maxCombo,
            hp: player.hp,
            maxHp: player.maxHp,
            scooterSec: 0,
            marcosStomped: player.marcosStomped,
            totalMarcos: level.enemies.length,
            progressPct: 100,
            victory: true,
            bossActive: false,
            bossHp: level.boss.hp,
            bossMaxHp: level.boss.maxHp,
            bossPhase: level.boss.phase,
            bossState: level.boss.state,
          });
        }
        return;
      }

      if (defeatDelayTimer > 0) {
        defeatDelayTimer -= dt;
        if (defeatDelayTimer <= 0) {
          syncHud(true, false);
          gameStateRef.current = 'gameover';
          onGameOverRef.current({
            score: Math.round(player.score),
            highScore: Math.round(highScore),
            chains: player.chains,
            combo: player.combo,
            maxCombo: player.maxCombo,
            hp: 0,
            maxHp: player.maxHp,
            scooterSec: 0,
            marcosStomped: player.marcosStomped,
            totalMarcos: level.enemies.length,
            progressPct: Math.min(100, Math.round((player.x / level.goalX) * 100)),
            victory: false,
            bossActive: isBossEngaged(),
            bossHp: level.boss.hp,
            bossMaxHp: level.boss.maxHp,
            bossPhase: level.boss.phase,
            bossState: level.boss.state,
          });
        }
        return;
      }

      // Read unified inputs (Keyboard + Touch)
      const moveLeft =
        keysPressed.has('ArrowLeft') ||
        keysPressed.has('KeyA') ||
        touchInputRef.current.left;
      const moveRight =
        keysPressed.has('ArrowRight') ||
        keysPressed.has('KeyD') ||
        touchInputRef.current.right;
      const jumpHeld =
        keysPressed.has('Space') ||
        keysPressed.has('ArrowUp') ||
        keysPressed.has('KeyW') ||
        touchInputRef.current.jump;
      const jumpJustPressed =
        justPressed.has('Space') ||
        justPressed.has('ArrowUp') ||
        justPressed.has('KeyW') ||
        touchInputRef.current.jumpJustPressed;
      const downJustPressed =
        justPressed.has('ArrowDown') ||
        justPressed.has('KeyS') ||
        touchInputRef.current.downJustPressed ||
        (Boolean(touchInputRef.current.down) && !downWasHeld);
      downWasHeld = Boolean(touchInputRef.current.down);

      justPressed.clear();
      touchInputRef.current.jumpJustPressed = false;
      touchInputRef.current.downJustPressed = false;

      // Update Electric-Blue Richard Mille Watch Overdrive timer & sapphire particles
      player.invulnTimer = Math.max(0, player.invulnTimer - dt);
      player.landTimer = Math.max(0, player.landTimer - dt);
      player.vipPoseTimer = Math.max(0, (player.vipPoseTimer ?? 0) - dt);
      if (player.scooterTimer > 0) {
        player.scooterTimer = Math.max(0, player.scooterTimer - dt);
        if (!player.swimming && Math.random() < 0.5) {
          spawnParticle(
            'sparkle',
            player.x + player.w * 0.5 + (Math.random() - 0.5) * 28,
            player.y + player.h * 0.45 + (Math.random() - 0.5) * 32,
            -player.facing * (30 + Math.random() * 45),
            -18 - Math.random() * 24,
            0.32,
            Math.random() < 0.65 ? '#38bdf8' : '#fef08a',
            3
          );
        }
      }

      // Spawn Sapphire Motion Afterimage Ghosts ONLY when not swimming!
      if (
        !player.swimming &&
        (player.scooterTimer > 0 || player.groundPounding || player.combo >= 2)
      ) {
        ghostSpawnTimer -= dt;
        if (ghostSpawnTimer <= 0) {
          ghostSpawnTimer = 0.045;
          spawnGhost(player.x, player.y, player.facing);
        }
      }

      player.scaleX += (1 - player.scaleX) * Math.min(1, dt * 14);
      player.scaleY += (1 - player.scaleY) * Math.min(1, dt * 14);

      const topSpeed =
        player.scooterTimer > 0
          ? PHYSICS.SCOOTER_SPEED
          : player.swimming
          ? PHYSICS.SWIM_SPEED
          : PHYSICS.MAX_RUN_SPEED;
      const inputDir = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);

      if (inputDir !== 0) {
        // Spawn turnaround skid dust puff when reversing direction at speed!
        if (player.grounded && Math.abs(player.vx) > 120 && Math.sign(player.vx) !== inputDir) {
          for (let i = 0; i < 4; i++) {
            spawnParticle(
              'dust',
              player.x + player.w * 0.5,
              player.y + player.h - 2,
              player.facing * (25 + i * 12),
              -10 - Math.random() * 15,
              0.24,
              '#fae3cb',
              3
            );
          }
        }
        player.facing = inputDir as 1 | -1;
        player.vx += inputDir * PHYSICS.MOVE_ACCEL * dt;
        if (Math.abs(player.vx) > topSpeed) {
          player.vx = inputDir * topSpeed;
        }
      } else {
        const decel =
          (player.scooterTimer > 0 ? PHYSICS.MOVE_FRICTION * 0.75 : PHYSICS.MOVE_FRICTION) *
          dt;
        if (Math.abs(player.vx) <= decel) player.vx = 0;
        else player.vx -= Math.sign(player.vx) * decel;
      }

      if (!player.swimming) {
        // Jump & Air-Flex Double Jump Mechanics
        const { didJump, didDoubleJump } = stepJumpMechanics(
          player,
          jumpJustPressed,
          jumpHeld,
          dt
        );
        if (didJump) {
          soundFX.playJump();
          if (didDoubleJump) {
            spawnPopup('DOUBLE SAUT !', '', player.x + 20, player.y, '#38bdf8');
            for (let i = 0; i < 10; i++) {
              const ang = (i / 10) * Math.PI * 2;
              spawnParticle(
                'sparkle',
                player.x + player.w * 0.5,
                player.y + player.h - 6,
                Math.cos(ang) * 75,
                Math.sin(ang) * 35,
                0.28,
                i % 2 === 0 ? '#38bdf8' : '#ffffff',
                3
              );
            }
          } else {
            for (let i = 0; i < 5; i++) {
              spawnParticle(
                'dust',
                player.x + player.w * 0.5 + (Math.random() - 0.5) * 14,
                player.y + player.h,
                (Math.random() - 0.5) * 50,
                -10 - Math.random() * 25,
                0.25,
                '#fae3cb',
                3
              );
            }
          }
        }

        // Heavy Cuban Chain Ground-Pound Dive (Press Down / S in mid-air!)
        if (downJustPressed && !player.grounded && !player.groundPounding && player.vy > -220) {
          player.groundPounding = true;
          player.vy = PHYSICS.GROUND_POUND_VELOCITY;
          player.vx *= 0.25;
          player.scaleX = 0.78;
          player.scaleY = 1.28;
          soundFX.playJump();
          spawnPopup('COUP DE CHAÎNE !', '', player.x + 20, player.y, '#38bdf8');
        } else if (downJustPressed && player.grounded) {
          // Pressing Down / Pose while grounded triggers MC Pao's Camera Look & Sunglasses Wink Flex!
          player.vipPoseTimer = 1.6;
          player.animState = 'vip_pose';
          player.scaleX = 1.12;
          player.scaleY = 0.92;
          spawnPopup('📸 VIP FLEX !', 'CIAO BELLA !', player.x + 20, player.y - 8, '#facc15');
        }

        const gravMult = player.vy > 0 ? PHYSICS.FALL_GRAVITY_MULT : 1.0;
        player.vy = Math.min(680, player.vy + PHYSICS.GRAVITY * gravMult * dt);
      }

      const prevX = player.x;
      player.x = Math.max(4, player.x + player.vx * dt);
      if (player.grounded) {
        player.walkDist += Math.abs(player.x - prevX);
        if (Math.abs(player.vx) > 85 && Math.random() < 0.25) {
          spawnParticle(
            'dust',
            player.x + player.w * 0.5,
            player.y + player.h - 2,
            -player.facing * 25,
            -8,
            0.22,
            '#ebbf94',
            2
          );
        }
      } else {
        // Keep limbs subtly cycling in air
        player.walkDist += Math.abs(player.vx * dt) * 0.35;
      }

      // Horizontal crate collisions
      for (const crate of level.crates) {
        if (crate.broken) continue;
        if (aabbOverlap(player, crate)) {
          if (player.scooterTimer > 0) {
            smashCrate(crate);
          } else if (player.vx > 0 && prevX + player.w <= crate.x + 4) {
            player.x = crate.x - player.w;
            player.vx = 0;
          } else if (player.vx < 0 && prevX >= crate.x + crate.w - 4) {
            player.x = crate.x + crate.w;
            player.vx = 0;
          }
        }
      }

      // Horizontal stone pier wall collisions (prevents walking or swimming into solid floor/pier walls!)
      resolvePlayerHorizontalPlatformWall(player, prevX, level.platforms);

      const prevBottom = player.y + player.h;
      const prevTop = player.y;
      const wasGrounded = player.grounded;
      const wasGroundPounding = player.groundPounding;
      player.y += player.vy * dt;
      player.grounded = false;

      // Bouncy Riviera Café Awnings (SpringPads)
      if (player.vy >= 0) {
        for (const sp of level.springs) {
          if (
            player.x + player.w - 4 > sp.x &&
            player.x + 4 < sp.x + sp.w &&
            prevBottom <= sp.y + 16 &&
            player.y + player.h >= sp.y
          ) {
            player.y = sp.y - player.h;
            player.vy = PHYSICS.SPRING_BOUNCE_VELOCITY;
            player.grounded = false;
            player.airJumpsLeft = 1;
            player.groundPounding = false;
            player.scaleX = 0.78;
            player.scaleY = 1.28;
            sp.bounceTimer = 0.28;
            soundFX.playJump();
            spawnRadialComicImpact(sp.x + sp.w * 0.5, sp.y + 4);
            spawnPopup('BOING !', '', sp.x + 24, sp.y - 10, '#fde047');
            break;
          }
        }
      }

      // Swept & Discrete AABB Platform Grounding + Landing State Detection
      const landRes = resolvePlayerPlatformAABB(
        player,
        prevBottom,
        wasGrounded,
        level.platforms
      );
      if (landRes.justLanded && landRes.landedPlatform) {
        const plat = landRes.landedPlatform;
        if (wasGroundPounding) {
          // Ground-Pound Shockwave AoE: Squish nearby Marcos & smash adjacent crates!
          trauma = Math.min(1, trauma + 0.52);
          soundFX.playCrateBreak();
          spawnRadialComicImpact(player.x + player.w * 0.5, plat.y);
          for (const enemy of level.enemies) {
            if (
              enemy.state !== 'squished' &&
              Math.abs(enemy.x + enemy.w * 0.5 - (player.x + player.w * 0.5)) < 115 &&
              Math.abs(enemy.y + enemy.h - plat.y) < 36
            ) {
              enemy.state = 'squished';
              enemy.stateTimer = 0.65;
              player.marcosStomped += 1;
              player.score += 600;
              spawnPopup('+600 €', '', enemy.x + 12, enemy.y - 10, '#38bdf8');
            }
          }
        } else {
          soundFX.playLand(landRes.landingImpactVy);
          for (let i = 0; i < 7; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            spawnParticle(
              'dust',
              player.x + player.w * 0.5 + side * (6 + Math.random() * 8),
              plat.y,
              side * (28 + Math.random() * 42),
              -12 - Math.random() * 20,
              0.26,
              '#fae3cb',
              3
            );
          }
        }
      }

      // Crate vertical AABB collision & grounding
      const preCrateVy = player.vy;
      for (const crate of level.crates) {
        if (crate.broken) continue;
        if (!aabbOverlap(player, crate)) continue;

        if (player.vy >= 0 && prevBottom <= crate.y + 16) {
          if (
            player.vy > 180 ||
            wasGroundPounding ||
            player.scooterTimer > 0 ||
            crate.loot === 'boss_anvil'
          ) {
            smashCrate(crate);
            player.vy = PHYSICS.STOMP_BOUNCE_VELOCITY * 0.84;
            player.airJumpsLeft = 1;
            player.groundPounding = false;
            player.landTimer = 0;
            player.scaleX = 1.22;
            player.scaleY = 0.8;
            hitstopTimer = PHYSICS.HITSTOP_CRATE;
          } else {
            player.y = crate.y - player.h;
            player.vy = 0;
            player.grounded = true;
            player.airJumpsLeft = 1;
            player.groundPounding = false;
            if (!wasGrounded && preCrateVy >= 40) {
              player.landTimer = PHYSICS.LAND_ANIM_DURATION;
              player.landingImpactVy = preCrateVy;
              player.animState = 'land';
              player.scaleX = 1.22;
              player.scaleY = 0.78;
              soundFX.playLand(preCrateVy);
            }
          }
        } else if (player.vy < 0 && prevTop >= crate.y + crate.h - 14) {
          smashCrate(crate);
          player.vy = 60;
          hitstopTimer = PHYSICS.HITSTOP_CRATE;
        }
      }

      // --- MEDITERRANEAN FREESTYLE SWIMMING & SUPER-YACHT BOARDING ---
      const swimRes = stepSwimmingPhysics(
        player,
        jumpJustPressed,
        worldTime,
        dt,
        level.platforms
      );
      if (swimRes.enteredWater) {
        // Clear any standing afterimage ghosts immediately upon entering water!
        for (const g of ghosts) g.active = false;
        soundFX.playWaterSplash();
        spawnPopup(
          'PLOUF ! NAGE LIBRE VIP !',
          'SAUTE SUR LE SUPER-YACHT !',
          player.x + 20,
          player.y - 8,
          '#38bdf8'
        );
        for (let i = 0; i < 12; i++) {
          spawnParticle(
            'dust',
            player.x + player.w * 0.5 + (Math.random() - 0.5) * 28,
            PHYSICS.WATER_SURFACE_Y - 4,
            (Math.random() - 0.5) * 90,
            -40 - Math.random() * 65,
            0.35,
            i % 2 === 0 ? '#ffffff' : '#7dd3fc',
            3
          );
        }
      } else if (swimRes.exitedWaterWithJump) {
        soundFX.playJump();
        soundFX.playWaterSplash();
        spawnPopup(
          'SAUT DAUPHIN !',
          'DIRECTION LE YACHT VIP !',
          player.x + 20,
          player.y - 10,
          '#fef08a'
        );
        for (let i = 0; i < 10; i++) {
          spawnParticle(
            'sparkle',
            player.x + player.w * 0.5 + (Math.random() - 0.5) * 24,
            PHYSICS.WATER_SURFACE_Y - 4,
            (Math.random() - 0.5) * 80,
            -35 - Math.random() * 55,
            0.32,
            i % 2 === 0 ? '#ffffff' : '#38bdf8',
            3
          );
        }
      }

      if (player.swimming && Math.abs(player.vx) > 20 && Math.random() < 0.45) {
        spawnParticle(
          'dust',
          player.x + (player.facing === 1 ? 6 : player.w - 6),
          player.y + player.h - 10,
          -player.facing * (30 + Math.random() * 35),
          -12 - Math.random() * 18,
          0.28,
          Math.random() < 0.6 ? '#ffffff' : '#bae6fd',
          3
        );
      }

      // Check Super-Yacht Deck Boarding & Glamorous VIP Women Camera-Look Celebration!
      for (const yacht of level.yachts) {
        if (yacht.cheerTimer > 0) {
          yacht.cheerTimer = Math.max(0, yacht.cheerTimer - dt);
        }
        const onThisYacht =
          player.grounded &&
          player.x + player.w > yacht.x + 12 &&
          player.x < yacht.x + yacht.w - 12 &&
          Math.abs(player.y + player.h - yacht.deckY) <= 18;
        if (onThisYacht) {
          yacht.cheerTimer = Math.max(yacht.cheerTimer, 1.2);
          // When MC Pao meets the Glamorous Blonde & Brunette Women on the yacht deck,
          // he automatically turns toward the camera, winks through his blue shades & toasts!
          if (
            Math.abs(player.x - (yacht.x + 84)) < 75 &&
            Math.abs(player.vx) < 42
          ) {
            player.vipPoseTimer = Math.max(player.vipPoseTimer ?? 0, 0.45);
          }
          if (!yacht.visited) {
            yacht.visited = true;
            yacht.cheerTimer = 2.6;
            player.vipPoseTimer = 2.2;
            player.animState = 'vip_pose';
            player.score += 1500;
            player.chains += 1;
            soundFX.playYachtVipCheer();
            soundFX.speakFrenchCallout('La belle vie sur le yacht à Saint-Tropez !');
            spawnPopup(
              `📸 YACHT "${yacht.name}" · CIAO BELLA !`,
              '+1 500 € · VIP CAMERA FLEX !',
              yacht.x + 135,
              yacht.y + 8,
              '#f472b6'
            );
            for (let i = 0; i < 18; i++) {
              const ang = (i / 18) * Math.PI * 2;
              spawnParticle(
                'sparkle',
                yacht.x + 135 + (Math.random() - 0.5) * 38,
                yacht.deckY - 38,
                Math.cos(ang) * 75,
                Math.sin(ang) * 55 - 22,
                0.52,
                i % 2 === 0 ? '#f472b6' : '#fef08a',
                4
              );
            }
          }
        }
      }

      // --- PICKUPS (SILVER CUBAN CHAINS, ESPRESSO CUPS, ELECTRIC-BLUE RICHARD MILLE WATCH) ---
      for (const item of level.pickups) {
        if (item.collected) continue;
        if (aabbOverlap(player, item)) {
          item.collected = true;
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            spawnParticle(
              'sparkle',
              item.x + item.w * 0.5,
              item.y + item.h * 0.5,
              Math.cos(ang) * 75,
              Math.sin(ang) * 75,
              0.38,
              item.type === 'scooter' ? '#38bdf8' : '#fef08a',
              3
            );
          }

          if (item.type === 'chain') {
            player.chains += 1;
            player.score += 500;
            soundFX.playChainPickup();
            spawnPopup('+500 €', '', item.x, item.y - 6, '#facc15');
          } else if (item.type === 'cuvee') {
            player.score += 3600;
            soundFX.playChainPickup();
            spawnPopup('CUVÉE 36K DÉBLOQUÉE !', '+3 600 € · BONUS SECRET', item.x, item.y - 12, '#f8d279');
          } else if (item.type === 'espresso') {
            player.hp = Math.min(player.maxHp, player.hp + 1);
            player.score += 350;
            soundFX.playChainPickup();
            spawnPopup('ESPRESSO CORSE !', '+350 € · VITALITÉ +1', item.x, item.y - 8, '#fde047');
          } else if (item.type === 'scooter') {
            player.scooterTimer = 8.5;
            player.score += 1000;
            soundFX.playScooterPickup();
            soundFX.speakFrenchCallout('La Richard Mille bleue mon gars !');
            spawnPopup(
              'LA RICHARD MILLE BLEUE !',
              '8 SECONDES DE TURBO',
              item.x,
              item.y - 12,
              '#29b6f6'
            );
          }
        }
      }

      // --- ENEMIES (MINI MARCO MOULY AI, PLATFORM GRAVITY & STOMP) ---
      let activeCrowdAttackers = 0;
      for (const e of level.enemies) {
        if (e.state === 'windup' || e.state === 'attack') activeCrowdAttackers++;
      }

      for (const enemy of level.enemies) {
        if (enemy.state === 'squished') {
          if (enemy.stateTimer > 0) {
            enemy.stateTimer -= dt;
          }
          continue;
        }

        // Keep every Marco physically grounded & synchronized with moving platforms!
        stepEnemyPlatformGravity(enemy, level.platforms, dt);

        if (Math.abs(enemy.x - player.x) < 520) {
          const canStartAttack = activeCrowdAttackers < 2;
          const aiRes = stepMarcoAI(enemy, player, dt, canStartAttack);
          if (aiRes.telegraphStarted) {
            activeCrowdAttackers++;
            soundFX.playTelegraph();
          }
          if (aiRes.spawnProjectile) {
            level.projectiles.push({
              id: Date.now() + Math.random(),
              x: enemy.x + (enemy.facing === 1 ? enemy.w : -10),
              y: enemy.y + 8,
              vx: enemy.facing * 155,
              vy: -195,
              w: 14,
              h: 14,
              active: true,
              rotation: 0,
              kind: 'invoice',
            });
          }
        }

        const outcome = resolvePlayerEnemyInteraction(player, enemy);
        if (outcome === 'stomp' || outcome === 'scooter_plow') {
          enemy.state = 'squished';
          enemy.stateTimer = 0.65;
          enemy.hitFlashTimer = 0.08;

          player.combo += 1;
          player.maxCombo = Math.max(player.maxCombo, player.combo);
          player.marcosStomped += 1;
          player.airJumpsLeft = 1;
          player.groundPounding = false;

          const { points, multiplier, callout } = calculateStompScore(player.combo);
          player.score += points;

          if (outcome === 'stomp') {
            stompPoseTimer = .14;
            player.vy = jumpHeld
              ? PHYSICS.HIGH_STOMP_BOUNCE_VELOCITY
              : PHYSICS.STOMP_BOUNCE_VELOCITY;
            player.grounded = false;
            player.scaleX = 1.28;
            player.scaleY = 0.74;
            player.animState = 'stomp';
          }

          hitstopTimer = PHYSICS.HITSTOP_STOMP;
          trauma = Math.min(1, trauma + 0.42);
          soundFX.playStomp(player.combo);
          soundFX.speakFrenchCallout(callout);

          spawnRadialComicImpact(enemy.x + enemy.w * 0.5, enemy.y + 4);

          // Launch the iconic 8 000 € Pétrus Wine Bottle flying out of Marco's pocket!
          spawnParticle(
            'wine_bottle',
            enemy.x + enemy.w * 0.5,
            enemy.y + 8,
            (player.facing || 1) * (55 + Math.random() * 45),
            -210 - Math.random() * 40,
            0.85,
            '#14532d',
            18,
            0
          );

          const subLabel =
            multiplier > 1
              ? `+${points} € · COMBO x${multiplier} !`
              : `+${points} € ENCAISSÉS !`;
          spawnPopup(
            outcome === 'scooter_plow' ? 'LA RICHARD MILLE BLEUE !' : callout,
            subLabel,
            enemy.x + 16,
            enemy.y - 14,
            outcome === 'scooter_plow' ? '#29b6f6' : '#fef08a'
          );
        } else if (outcome === 'hurt') {
          hurtPlayer(enemy.x + enemy.w * 0.5);
        }
      }

      // --- MULTI-PHASE BOSS BATTLE: DON MARCO ---
      if (level.boss.active && !level.boss.defeated && Math.abs(player.x - level.boss.x) < 560) {
        const boss = level.boss;
        const bossRes = stepBossAI(boss, player, dt);

        if (bossRes.telegraphStarted) {
          soundFX.playTelegraph();
          spawnPopup(
            boss.state === 'windup_charge' ? 'CHARGE FISCALE !' : 'SAUT DE 8 000 € !',
            `PHASE ${boss.phase} · ATTENTION !`,
            boss.x + boss.w * 0.5,
            boss.y - 14,
            '#fca5a5'
          );
        }

        if (bossRes.spawnShockwaves) {
          soundFX.playCrateBreak();
          trauma = Math.min(1, trauma + 0.58);
          for (const dir of [-1, 1]) {
            level.projectiles.push({
              id: Date.now() + Math.random() + dir,
              x: boss.x + boss.w * 0.5 - 8,
              y: boss.groundY - 16,
              vx: dir * (boss.phase === 3 ? 215 : 175),
              vy: 0,
              w: 16,
              h: 16,
              active: true,
              rotation: 0,
              kind: 'shockwave',
            });
          }
          spawnPopup(
            'IL EST SONNÉ ! ÉCRASE-LE !',
            'BOUCLIER BAISSÉ !',
            boss.x + boss.w * 0.5,
            boss.y - 16,
            '#4ade80'
          );
        }

        if (bossRes.spawnInvoiceBurst) {
          soundFX.playTelegraph();
          const baseDir = player.x < boss.x ? -1 : 1;
          const speeds = [
            { vx: baseDir * 130, vy: -220 },
            { vx: baseDir * 175, vy: -180 },
            { vx: baseDir * 215, vy: -140 },
          ];
          for (const sp of speeds) {
            level.projectiles.push({
              id: Date.now() + Math.random(),
              x: boss.x + boss.w * 0.5,
              y: boss.y + 18,
              vx: sp.vx,
              vy: sp.vy,
              w: 14,
              h: 14,
              active: true,
              rotation: 0,
              kind: 'invoice',
            });
          }
        }

        if (bossRes.spawnAnvilCrate) {
          for (const c of level.crates) {
            if (c.loot === 'boss_anvil' && c.broken) {
              c.broken = false;
              spawnPopup('CAISSE FISCALE PRÊTE !', 'CASSE-LA POUR SONNER MARCO !', c.x + 16, c.y - 8, '#fde047');
              break;
            }
          }
        }

        const bossOutcome = resolvePlayerBossInteraction(player, boss);
        if (bossOutcome === 'shield_bounce') {
          player.vy = PHYSICS.STOMP_BOUNCE_VELOCITY * 0.88;
          player.grounded = false;
          player.airJumpsLeft = 1;
          player.groundPounding = false;
          player.scaleX = 1.22;
          player.scaleY = 0.78;
          soundFX.playJump();
          spawnRadialComicImpact(boss.x + boss.w * 0.5, boss.y + 6);
          spawnPopup(
            'MALLETTE BLINDÉE !',
            'ATTENDS QU’IL SOIT SONNÉ OU CASSE LA CAISSE !',
            boss.x + boss.w * 0.5,
            boss.y - 14,
            '#93c5fd'
          );
        } else if (bossOutcome === 'boss_stomp') {
          stompPoseTimer = .14;
          damageBoss(1, 'OH LA BOUTEILLE DE VIN À 8 000 € !');
          player.vy = PHYSICS.HIGH_STOMP_BOUNCE_VELOCITY;
          player.grounded = false;
          player.airJumpsLeft = 1;
          player.groundPounding = false;
          player.scaleX = 1.32;
          player.scaleY = 0.72;
          player.animState = 'stomp';
        } else if (bossOutcome === 'hurt') {
          hurtPlayer(boss.x + boss.w * 0.5);
        }
      }

      // --- PROJECTILES ---
      for (const proj of level.projectiles) {
        if (!proj.active) continue;
        proj.x += proj.vx * dt;
        if (proj.kind === 'shockwave') {
          if (Math.abs(proj.x - level.boss.x) > 520) {
            proj.active = false;
            continue;
          }
        } else {
          proj.vy += 460 * dt;
          proj.y += proj.vy * dt;
          proj.rotation += 9 * dt;
          if (proj.y > VIEW_H + 20) {
            proj.active = false;
            continue;
          }
        }

        if (aabbOverlap(player, proj)) {
          proj.active = false;
          if (player.scooterTimer > 0) {
            spawnPopup('FACTURE DÉCHIRÉE !', '+200 €', proj.x, proj.y, '#29b6f6');
            player.score += 200;
          } else if (player.invulnTimer <= 0) {
            hurtPlayer(proj.x);
          }
        }
      }

      // Update Player Animation State (includes 'land' crouch on platform impact!)
      player.animState = selectPlayerAnimState(player);

      // Smooth Camera Follow with Balanced Mobile & Desktop Centering
      const lookAhead = player.facing * (player.scooterTimer > 0 ? 76 : 44);
      const targetCamX = Math.max(
        0,
        Math.min(level.width - VIEW_W, player.x - VIEW_W * 0.42 + lookAhead)
      );
      camX += (targetCamX - camX) * Math.min(1, dt * 8.5);

      if (
        level.boss.active &&
        !level.boss.defeated &&
        player.x > level.boss.maxX - 24
      ) {
        player.x = level.boss.maxX - 24;
        player.vx = 0;
        spawnPopup('BATS DON MARCO !', 'RENDS L’ARGENT EN EUROS !', player.x, player.y - 12, '#fca5a5');
      }

      if (!checkpointData && !customLevelRef.current && !spawnAtBossRef.current && !level.boss.defeated && player.x >= level.boss.minX - 150) {
        const x = level.boss.minX - 128;
        const ground = level.platforms.find(p => !p.isYachtDeck && x >= p.x && x + player.w <= p.x + p.w);
        checkpointData = { level: structuredClone(level), x, y: (ground?.y ?? 246) - player.h, score: player.score, chains: player.chains,
          marcosStomped: player.marcosStomped, maxCombo: player.maxCombo };
        spawnPopup('POINT VIP ACTIVÉ', 'Ton parcours est sauvegardé.', x, 130, '#f4ce80');
      }
      if (player.x >= level.goalX - 52 && level.boss.defeated) {
        startLamboGetaway();
        return;
      }

      syncHud(false, false);
    };

    function damageBoss(amount: number, calloutText: string) {
      const boss = level.boss;
      if (!boss.active || boss.defeated) return;
      boss.hp = Math.max(0, boss.hp - amount);
      boss.hitFlashTimer = 0.28;
      player.combo += 1;
      player.maxCombo = Math.max(player.maxCombo, player.combo);
      player.score += 1500;
      hitstopTimer = PHYSICS.HITSTOP_STOMP * 1.3;
      trauma = Math.min(1, trauma + 0.65);
      soundFX.playStomp(player.combo + 2);
      soundFX.speakFrenchCallout(calloutText);
      spawnRadialComicImpact(boss.x + boss.w * 0.5, boss.y + 10);

      if (boss.hp <= 0) {
        boss.defeated = true;
        boss.state = 'defeated';
        player.score += 8000;
        player.marcosStomped += 1;
        for (let i = 0; i < 24; i++) {
          const ang = (i / 24) * Math.PI * 2;
          const spd = 70 + Math.random() * 120;
          spawnParticle(
            'sparkle',
            boss.x + boss.w * 0.5,
            boss.y + boss.h * 0.5,
            Math.cos(ang) * spd,
            Math.sin(ang) * spd - 30,
            0.65,
            i % 2 === 0 ? '#fef08a' : '#29b6f6',
            4
          );
        }
        spawnPopup('LA BOUTEILLE EST SAUVÉE !', '+8 000 € · DIRECTION LA LAMBO', boss.x, boss.y - 20, '#f4ce80');
        soundFX.playVictoryFanfare();
      } else {
        boss.state = 'hurt';
        boss.stateTimer = 0.7;
        const nextPhase = boss.hp >= 5 ? 1 : boss.hp >= 3 ? 2 : 3;
        boss.phase = nextPhase;
        spawnPopup(
          calloutText,
          `+1 500 € · BOSS HP ${boss.hp}/${boss.maxHp}`,
          boss.x + boss.w * 0.5,
          boss.y - 16,
          '#fef08a'
        );
      }
      syncHud(true, false);
    }

    function smashCrate(crate: LevelData['crates'][0]) {
      crate.broken = true;
      soundFX.playCrateBreak();
      trauma = Math.min(1, trauma + 0.28);
      player.score += 200;

      const colors = ['#e88334', '#c86018', '#8f3d08', '#f7a85e'];
      for (let i = 0; i < 14; i++) {
        const ang = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
        const spd = 80 + Math.random() * 140;
        spawnParticle(
          'splinter',
          crate.x + 16 + (Math.random() - 0.5) * 16,
          crate.y + 16 + (Math.random() - 0.5) * 16,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd - 40,
          0.45 + Math.random() * 0.2,
          colors[i % colors.length],
          4
        );
      }

      if (crate.loot === 'boss_anvil') {
        if (level.boss.active && !level.boss.defeated) {
          level.boss.state = 'vulnerable';
          level.boss.stateTimer = 3.6;
          damageBoss(1, 'RENDS L’ARGENT MARCO !');
        } else {
          spawnPopup('CAISSE FISCALE !', '+500 €', crate.x + 16, crate.y, '#fde047');
        }
        return;
      }

      if (crate.loot === 'espresso') {
        level.pickups.push({
          id: Date.now() + Math.random(),
          type: 'espresso',
          x: crate.x + 6,
          y: crate.y + 4,
          vx: 0,
          vy: -120,
          w: 20,
          h: 20,
          collected: false,
          bobOffset: 0,
        });
      } else {
        const count = crate.loot === 'multi_chain' ? 3 : 1;
        for (let i = 0; i < count; i++) {
          level.pickups.push({
            id: Date.now() + Math.random() + i,
            type: 'chain',
            x: crate.x + 6 + (i - Math.floor(count / 2)) * 14,
            y: crate.y + 4,
            vx: 0,
            vy: -120,
            w: 20,
            h: 20,
            collected: false,
            bobOffset: i,
          });
        }
      }
      spawnPopup('CAISSE DE BILLETS !', '+200 €', crate.x + 16, crate.y, '#fdba74');
    }

    function hurtPlayer(hazardCenterX: number) {
      stompPoseTimer = 0;
      player.hp = Math.max(0, player.hp - 1);
      player.invulnTimer = 1.5;
      player.combo = 0;
      player.groundPounding = false;
      const knockDir = player.x + player.w * 0.5 >= hazardCenterX ? 1 : -1;
      player.vx = knockDir * 170;
      player.vy = -290;
      player.scaleX = 0.8;
      player.scaleY = 1.22;
      hitstopTimer = PHYSICS.HITSTOP_HURT;
      trauma = 0.72;
      soundFX.playHurt();
      spawnPopup('AÏE!', "MARCO T'A EU!", player.x + 18, player.y - 8, '#fca5a5');

      if (player.hp <= 0) {
        defeatDelayTimer = 0.45;
      }
      syncHud(true, false);
    }

    // --- 4-LAYER PARALLAX MEDITERRANEAN COASTAL RENDERER + PROCEDURAL WEATHER ---
    const renderScene = () => {
      ctx.save();
      ctx.scale(RENDER_SCALE, RENDER_SCALE);
      ctx.imageSmoothingEnabled = false;

      if (trauma > 0) {
        const shake = trauma * trauma * 6;
        const sx = (Math.random() * 2 - 1) * shake;
        const sy = (Math.random() * 2 - 1) * shake;
        ctx.translate(Math.round(sx), Math.round(sy));
      }

      const activeWeather = weatherModeRef.current;

      // ======================================================================
      // LAYER 1: AZURE MEDITERRANEAN SKY, SOLAR CORONA & DRIFTING CLOUDS
      // ======================================================================
      const skyBands =
        activeWeather === 'golden_breeze'
          ? [
              { y: 0, h: 48, color: '#79b7c5' },
              { y: 48, h: 52, color: '#a0ccd1' },
              { y: 100, h: 56, color: '#c7ded5' },
              { y: 156, h: 64, color: '#e0e4ca' },
              { y: 220, h: 100, color: '#f1dfbb' },
            ]
          : [
              { y: 0, h: 48, color: '#4f9fbe' },
              { y: 48, h: 52, color: '#70b4cb' },
              { y: 100, h: 56, color: '#97ced6' },
              { y: 156, h: 64, color: '#b8e0dc' },
              { y: 220, h: 100, color: '#d4e9d9' },
            ];
      for (const b of skyBands) {
        ctx.fillStyle = b.color;
        ctx.fillRect(0, b.y, VIEW_W, b.h);
      }

      const sunX = VIEW_W - 86;
      ctx.fillStyle = 'rgba(255, 225, 155, .12)'; ctx.fillRect(sunX-10,8,48,48);
      ctx.fillStyle = '#f7d78e';ctx.fillRect(sunX+4,16,20,28);ctx.fillRect(sunX,20,28,20);
      ctx.fillStyle = '#ffe9b7';ctx.fillRect(sunX+5,19,14,4);

      const drawPixelCloud = (cx: number, cy: number, scale: number = 1) => {
        const x = Math.round(cx);
        const y = Math.round(cy);
        const s = Math.round(scale);
        ctx.fillStyle = '#bfd7d9';
        ctx.fillRect(x + 4 * s, y + 18 * s, 68 * s, 10 * s);
        ctx.fillStyle = '#edf0df';
        ctx.fillRect(x, y + 10 * s, 76 * s, 12 * s);
        ctx.fillRect(x + 12 * s, y + 4 * s, 52 * s, 10 * s);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 6 * s, y + 8 * s, 60 * s, 10 * s);
        ctx.fillRect(x + 16 * s, y + 2 * s, 24 * s, 10 * s);
        ctx.fillRect(x + 36 * s, y, 22 * s, 12 * s);
      };

      const cloudSpeed = activeWeather === 'mistral_gulls' ? 11 : 4.5;
      const cloudScroll = (camX * 0.08 + worldTime * cloudSpeed) % 520;
      drawPixelCloud(340 - cloudScroll, 14, 1);
      drawPixelCloud(400 - cloudScroll + 26, 78, 1);
      drawPixelCloud(340 - cloudScroll + 520, 14, 1);
      drawPixelCloud(180 - cloudScroll * 0.7, 36, 1);

      // ======================================================================
      // PROCEDURAL WEATHER LAYER 1B: FLOATING ANIMATED PIXEL SEAGULLS
      // ======================================================================
      const drawPixelSeagull = (gx: number, gy: number, wingPhase: number, scale: number = 1) => {
        const x = Math.round(gx);
        const y = Math.round(gy);
        const wingUp = Math.sin(wingPhase) > 0;
        ctx.save();
        ctx.translate(x, y);
        if (scale !== 1) ctx.scale(scale, scale);

        ctx.fillStyle = '#182232';
        ctx.fillRect(-2, 0, 5, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, 0, 3, 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-3, 1, 2, 1);

        if (wingUp) {
          ctx.fillStyle = '#182232';
          ctx.fillRect(-6, -3, 4, 2);
          ctx.fillRect(2, -3, 4, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-5, -2, 3, 2);
          ctx.fillRect(2, -2, 3, 2);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-6, -3, 2, 1);
          ctx.fillRect(4, -3, 2, 1);
        } else {
          ctx.fillStyle = '#182232';
          ctx.fillRect(-6, 1, 4, 2);
          ctx.fillRect(2, 1, 4, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-5, 0, 3, 2);
          ctx.fillRect(2, 0, 3, 2);
        }
        ctx.restore();
      };

      const gullCount = activeWeather === 'mistral_gulls' ? 9 : 6;
      for (let i = 0; i < gullCount; i++) {
        const speed = 16 + (i % 3) * 7 + (activeWeather === 'mistral_gulls' ? 10 : 0);
        const rawX = 520 - ((worldTime * speed + i * 87 + camX * 0.14) % 540);
        const baseY = 26 + ((i * 19) % 112);
        const bobY = Math.sin(worldTime * 2.4 + i * 1.3) * 5;
        const wingPhase = worldTime * (6.5 + (i % 3)) + i * 2.1;
        drawPixelSeagull(rawX, baseY + bobY, wingPhase, 1);
      }

      // ======================================================================
      // LAYER 2: DISTANT COASTAL MOUNTAINS & ITALIAN CYPRESS TREES
      // ======================================================================
      const mtnOffset = Math.round(-(camX * 0.16) % 480);
      const drawMountainRange = (baseX: number) => {
        ctx.fillStyle = '#7fa7aa';
        ctx.beginPath();
        ctx.moveTo(baseX, 210);
        ctx.lineTo(baseX + 95, 92);
        ctx.lineTo(baseX + 210, 134);
        ctx.lineTo(baseX + 340, 105);
        ctx.lineTo(baseX + 480, 165);
        ctx.lineTo(baseX + 480, 210);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#58897b';
        ctx.beginPath();
        ctx.moveTo(baseX, 210);
        ctx.lineTo(baseX + 80, 86);
        ctx.lineTo(baseX + 240, 148);
        ctx.lineTo(baseX + 390, 126);
        ctx.lineTo(baseX + 480, 178);
        ctx.lineTo(baseX + 480, 210);
        ctx.closePath();
        ctx.fill();

        const cypresses = [118, 136, 152, 178, 345, 428, 444];
        for (const cx of cypresses) {
          const tx = baseX + cx;
          ctx.fillStyle = '#355e53';
          ctx.fillRect(tx, 110, 8, 52);
          ctx.fillRect(tx + 2, 98, 4, 14);
          ctx.fillStyle = '#487862';
          ctx.fillRect(tx + 1, 112, 3, 44);
        }
      };
      for (let x = mtnOffset; x < VIEW_W; x += 480) drawMountainRange(x);

      // ======================================================================
      // LAYER 3: HILLSIDE MEDITERRANEAN VILLAGE, BELL TOWER & SPARKLING SEA
      // ======================================================================
      ctx.fillStyle = '#176a83';
      ctx.fillRect(0, 196, VIEW_W, 124);
      ctx.fillStyle = '#2387a0';
      ctx.fillRect(0, 206, VIEW_W, 50);
      ctx.fillStyle = '#319eb1';
      ctx.fillRect(0, 224, VIEW_W, 96);

      const hazeIntensity = activeWeather === 'heat_haze' ? 1.0 : 0.55;
      for (let hy = 176; hy <= 216; hy += 4) {
        const waveX = Math.round(Math.sin(worldTime * 4.5 + hy * 0.35) * 8 * hazeIntensity);
        ctx.fillStyle =
          hy < 196
            ? `rgba(254, 240, 138, ${0.18 * hazeIntensity})`
            : `rgba(147, 213, 255, ${0.26 * hazeIntensity})`;
        ctx.fillRect(waveX, hy, VIEW_W, 2);
      }

      for (let s = 0; s < 18; s++) {
        const glintX = Math.round((s * 37 + worldTime * 14 - camX * 0.25) % VIEW_W);
        const glintY = 200 + ((s * 17) % 52);
        const twinkle = Math.sin(worldTime * 6 + s * 1.9);
        if (twinkle > 0.1) {
          ctx.fillStyle = twinkle > 0.65 ? '#fef08a' : '#ffffff';
          ctx.fillRect(glintX < 0 ? glintX + VIEW_W : glintX, glintY, 6, 2);
        }
      }

      const townOffset = Math.round(-(camX * 0.32) % 560);
      const drawCoastalTownAndCliffs = (baseX: number) => {
        const townShimmer =
          activeWeather === 'heat_haze'
            ? Math.round(Math.sin(worldTime * 5.2 + baseX * 0.02) * 1.4)
            : 0;
        const bx0 = baseX + townShimmer;

        ctx.fillStyle = '#685956';
        ctx.fillRect(bx0 + 210, 184, 310, 24);
        ctx.fillStyle = '#8c7972';
        ctx.fillRect(bx0 + 216, 184, 290, 10);

        const waveShift = Math.round(Math.sin(worldTime * 3) * 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx0 + 215 + waveShift, 206, 295, 3);
        ctx.fillRect(bx0 + 250 - waveShift, 218, 95, 2);
        ctx.fillRect(bx0 + 370 + waveShift, 232, 80, 2);
        ctx.fillStyle = '#93d5ff';
        ctx.fillRect(bx0 + 215, 209, 295, 3);

        const bx = bx0 + 374;
        ctx.fillStyle = '#d48c6a';
        ctx.fillRect(bx + 8, 104, 4, 8);
        ctx.fillRect(bx + 5, 112, 10, 8);
        ctx.fillRect(bx + 2, 120, 16, 6);
        ctx.fillStyle = '#f5c794';
        ctx.fillRect(bx + 2, 126, 16, 44);
        ctx.fillStyle = '#d99b66';
        ctx.fillRect(bx + 13, 126, 5, 44);
        ctx.fillStyle = '#3b2316';
        ctx.fillRect(bx + 7, 133, 5, 10);

        const houses = [
          { x: 295, y: 152, w: 34, h: 28, wall: '#f4a27e', shade: '#cc7452' },
          { x: 325, y: 144, w: 38, h: 32, wall: '#f7cf94', shade: '#d4a05e' },
          { x: 356, y: 150, w: 36, h: 30, wall: '#f29572', shade: '#c96846' },
          { x: 388, y: 148, w: 40, h: 32, wall: '#f5b882', shade: '#cf8950' },
          { x: 422, y: 158, w: 34, h: 26, wall: '#f49c78', shade: '#c76c4a' },
          { x: 310, y: 166, w: 42, h: 24, wall: '#fae0b4', shade: '#d6b07c' },
          { x: 348, y: 164, w: 46, h: 26, wall: '#f28b6b', shade: '#c45e40' },
          { x: 392, y: 166, w: 40, h: 24, wall: '#f7c68a', shade: '#cf9658' },
          { x: 430, y: 168, w: 36, h: 22, wall: '#f4a482', shade: '#c97452' },
        ];

        for (const h of houses) {
          const hx = bx0 + h.x;
          ctx.fillStyle = '#b83b14';
          ctx.fillRect(hx - 2, h.y - 5, h.w + 4, 5);
          ctx.fillStyle = '#e05a2b';
          ctx.fillRect(hx, h.y - 7, h.w, 3);
          ctx.fillStyle = h.wall;
          ctx.fillRect(hx, h.y, h.w, h.h);
          ctx.fillStyle = h.shade;
          ctx.fillRect(hx + Math.floor(h.w * 0.68), h.y, Math.ceil(h.w * 0.32), h.h);
          ctx.fillStyle = '#3d2217';
          ctx.fillRect(hx + 6, h.y + 6, 4, 6);
          ctx.fillRect(hx + 16, h.y + 6, 4, 6);
        }
      };

      drawCoastalTownAndCliffs(townOffset);
      drawCoastalTownAndCliffs(townOffset + 560);

      const moteCount = activeWeather === 'golden_breeze' ? 18 : 10;
      for (let m = 0; m < moteCount; m++) {
        const mx = Math.round(
          VIEW_W - ((worldTime * (22 + (m % 4) * 8) + m * 47 + camX * 0.4) % (VIEW_W + 40))
        );
        const my = Math.round(40 + ((m * 29) % 190) + Math.sin(worldTime * 3 + m) * 6);
        ctx.fillStyle =
          activeWeather === 'mistral_gulls'
            ? 'rgba(224, 242, 254, 0.65)'
            : 'rgba(254, 240, 138, 0.65)';
        ctx.fillRect(mx, my, activeWeather === 'mistral_gulls' ? 5 : 2, 2);
      }

      // ======================================================================
      // LAYER 4: WORLD SPACE — FOREGROUND STONE VILLA, PLATFORMS, PROPS, ACTORS
      // ======================================================================
      ctx.save();
      ctx.translate(-Math.round(camX), 0);

      const drawForegroundVilla = (vx: number, groundY: number) => {
        const vw = 114;
        const vh = groundY;
        ctx.fillStyle = '#1f1109';
        ctx.fillRect(vx, 0, vw + 2, vh);
        ctx.fillStyle = '#f5b368';
        ctx.fillRect(vx, 0, vw, vh);
        ctx.fillStyle = '#e09246';
        ctx.fillRect(vx, 0, 38, vh);
        ctx.fillRect(vx + 86, 60, 28, vh - 60);
        for (let qy = 68; qy < vh - 12; qy += 18) {
          ctx.fillStyle = '#f7ca8f';
          ctx.fillRect(vx + vw - 14, qy, 14, 12);
          ctx.fillStyle = '#b86828';
          ctx.fillRect(vx + vw - 14, qy + 12, 14, 2);
        }

        ctx.fillStyle = '#8c481e';
        ctx.fillRect(vx, groundY - 148, 34, 148);
        ctx.fillStyle = '#d48348';
        ctx.fillRect(vx, groundY - 142, 28, 142);
        ctx.fillStyle = '#1f1008';
        ctx.fillRect(vx, groundY - 120, 14, 120);

        const balY = 58;
        ctx.fillStyle = '#9e582f';
        ctx.fillRect(vx + 16, balY + 14, 34, 12);
        ctx.fillRect(vx + 16, balY + 26, 20, 10);
        ctx.fillStyle = '#29150b';
        ctx.fillRect(vx, balY - 2, 98, 18);
        ctx.fillStyle = '#f2be8d';
        ctx.fillRect(vx, balY, 96, 10);
        ctx.fillStyle = '#ba7646';
        ctx.fillRect(vx, balY + 10, 96, 5);

        ctx.fillStyle = '#c44d20';
        ctx.fillRect(vx + 52, balY - 16, 22, 16);
        ctx.fillStyle = '#e06838';
        ctx.fillRect(vx + 50, balY - 18, 26, 5);

        ctx.fillStyle = '#18191f';
        ctx.fillRect(vx, 8, 92, 3);
        ctx.fillRect(vx, balY - 4, 92, 2);
        for (let rx = vx + 6; rx < vx + 92; rx += 10) {
          ctx.fillRect(rx, 10, 2, balY - 12);
          ctx.fillRect(rx + 2, balY - 12, 5, 6);
          ctx.fillStyle = '#d48348';
          ctx.fillRect(rx + 3, balY - 11, 3, 4);
          ctx.fillStyle = '#18191f';
        }

        const ix = vx + 84;
        const iy = balY - 10;
        const ivyClusters = [
          { x: ix, y: iy + 12, w: 28, h: 36, c: '#174219' },
          { x: ix + 4, y: iy + 40, w: 18, h: 28, c: '#174219' },
          { x: ix + 8, y: iy + 62, w: 10, h: 20, c: '#174219' },
          { x: ix + 2, y: iy + 14, w: 22, h: 30, c: '#2d752b' },
          { x: ix + 6, y: iy + 42, w: 14, h: 22, c: '#2d752b' },
          { x: ix + 4, y: iy + 16, w: 16, h: 20, c: '#5eb83d' },
          { x: ix + 8, y: iy + 44, w: 8, h: 14, c: '#5eb83d' },
        ];
        for (const ic of ivyClusters) {
          ctx.fillStyle = ic.c;
          ctx.fillRect(ic.x, ic.y, ic.w, ic.h);
        }
        const pinks = [
          { x: ix + 4, y: iy - 2, w: 22, h: 14, c: '#be185d' },
          { x: ix + 6, y: iy, w: 18, h: 10, c: '#ec4899' },
          { x: ix + 10, y: iy + 2, w: 10, h: 5, c: '#fbcfe8' },
          { x: ix + 16, y: iy + 8, w: 16, h: 12, c: '#db2777' },
          { x: ix + 18, y: iy + 10, w: 12, h: 8, c: '#f472b6' },
          { x: ix + 20, y: iy + 12, w: 6, h: 4, c: '#fce7f3' },
        ];
        for (const pk of pinks) {
          ctx.fillStyle = pk.c;
          ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
        }
      };

      // 4A-YACHT. Render Mediterranean Luxury Super-Yachts & Glamorous VIP Women on Deck
      for (const yacht of level.yachts) {
        if (yacht.x + yacht.w < camX - 40 || yacht.x > camX + VIEW_W + 40) continue;
        const yachtBob = Math.round(Math.sin(worldTime * 2.2 + yacht.id) * 1.5);
        // `sprites.props.superYacht` is stamped at 3x from `/assets/sprites/yacht_clean.png` (Screenshot 2),
        // which already includes the gleaming white Super-Yacht, continuous bow railings, cabin windows,
        // and the Glamorous Blonde (Crimson Gown) & Brunette (Black Gown) women standing on the deck!
        ctx.drawImage(
          sprites.props.superYacht,
          Math.round(yacht.x),
          Math.round(yacht.y + yachtBob),
          yacht.w,
          yacht.h
        );
        // Animated floating glamour heart above the VIP women on deck!
        const heartBob = Math.round(Math.sin(worldTime * 5 + yacht.id) * 2.5);
        const hx = Math.round(yacht.x + 168);
        const hy = Math.round(yacht.deckY - 68 + yachtBob + heartBob);
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(hx, hy, 2, 2);
        ctx.fillRect(hx + 3, hy, 2, 2);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(hx - 1, hy + 1, 7, 2);
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(hx, hy + 3, 5, 2);
        ctx.fillRect(hx + 2, hy + 5, 1, 1);
      }

      // 4B. Render Platforms
      for (const plat of level.platforms) {
        if (plat.x + plat.w < camX - 60 || plat.x > camX + VIEW_W + 60) continue;
        // Skip stone tile rendering for invisible Super-Yacht deck collision surfaces
        if (plat.isYachtDeck) continue;

        if (plat.hasVillaLeft) {
          drawForegroundVilla(plat.x, plat.y);
        }

        if (plat.hasRailing && plat.railingStartX !== undefined && plat.railingEndX !== undefined) {
          const rx0 = plat.railingStartX;
          const rx1 = plat.railingEndX;
          const ry = plat.y - 26;
          ctx.fillStyle = '#181c26';
          ctx.fillRect(rx0, ry, rx1 - rx0, 3);
          ctx.fillRect(rx0, plat.y - 4, rx1 - rx0, 2);
          for (let x = rx0; x <= rx1; x += 11) {
            ctx.fillRect(x, ry, 2, 26);
          }
          ctx.fillRect(rx1 - 2, ry - 4, 5, 5);
        }

        const cols = Math.ceil(plat.w / 32);
        const rows = Math.ceil(plat.h / 32);
        for (let c = 0; c < cols; c++) {
          const tx = plat.x + c * 32;
          ctx.drawImage(sprites.props.stoneTileTop, tx, plat.y);
          for (let r = 1; r < rows; r++) {
            ctx.drawImage(sprites.props.stoneTileBody, tx, plat.y + r * 32);
          }
          if (plat.hasIvy && c % 2 === 0) {
            ctx.drawImage(sprites.props.ivyOverlay, tx, plat.y + 12);
          }
        }
      }

      // 4B-2. Render Bouncy Riviera Café Awnings (SpringPads)
      for (const sp of level.springs) {
        if (sp.x + sp.w < camX || sp.x > camX + VIEW_W) continue;
        const frameIdx = sp.bounceTimer > 0 ? 1 : 0;
        ctx.drawImage(sprites.props.springAwning[frameIdx], Math.round(sp.x), Math.round(sp.y));
      }

      if (!customLevelRef.current) {
        const flagX = level.boss.minX - 128;
        ctx.fillStyle = '#173746'; ctx.fillRect(flagX, 161, 3, 51);
        ctx.fillStyle = checkpointData ? '#f4ce80' : '#fff0d2'; ctx.fillRect(flagX + 3, 163, 29, 16);
        ctx.fillStyle = '#173746'; ctx.font = 'bold 6px monospace';ctx.textAlign = 'center';ctx.fillText('VIP',flagX+17,174);
      }

      // 4C. Render Decorative Props (Barrel + Plant, Luxury RM Watch Pedestal, Goal Arch, 24K Golden Lamborghini)
      const watchFrameIdx = Math.floor(worldTime * 6) % 2;
      for (const deco of level.decos) {
        const drawDecoX =
          deco.type === 'golden_lambo' && player.inGoldenLambo ? lamboDriveX : deco.x;
        if (drawDecoX + 150 < camX || drawDecoX - 80 > camX + VIEW_W) continue;
        if (deco.type === 'barrel_plant') {
          ctx.drawImage(sprites.props.barrelPlant, deco.x, deco.y);
        } else if (deco.type === 'rm_watch_pedestal') {
          // Luxury Marble & Gold Showcase Pedestal displaying the Blue Richard Mille Watch
          const px0 = deco.x;
          const py0 = deco.y;
          ctx.fillStyle = '#120b07';
          ctx.fillRect(px0 + 4, py0 + 26, 30, 16);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(px0 + 6, py0 + 28, 26, 12);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(px0 + 4, py0 + 26, 30, 3);
          const bob = Math.round(Math.sin(worldTime * 4) * 2);
          ctx.drawImage(sprites.props.scooterPickup[watchFrameIdx], px0, py0 - 8 + bob);
        } else if (deco.type === 'golden_lambo') {
          const lamboFrame = player.inGoldenLambo ? 1 : 0;
          ctx.drawImage(
            sprites.props.goldenLambo[lamboFrame],
            Math.round(drawDecoX),
            Math.round(deco.y + 54 - 96),
            176,
            96
          );
          if (!player.inGoldenLambo) {
            const bob = Math.round(Math.sin(worldTime * 5) * 2);
            ctx.fillStyle = '#120b07';
            ctx.fillRect(Math.round(deco.x + 24), Math.round(deco.y - 48 + bob), 128, 12);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(Math.round(deco.x + 25), Math.round(deco.y - 47 + bob), 126, 10);
            ctx.font = 'bold 6px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#120b07';
            ctx.fillText('AVENTADOR SVJ · 24K', Math.round(deco.x + 88), Math.round(deco.y - 40 + bob));
          }
        } else if (deco.type === 'goal_arch') {
          const gx = deco.x;
          const gy = deco.y;
          ctx.fillStyle = '#1f120b';
          ctx.fillRect(gx - 2, gy, 16, 120);
          ctx.fillRect(gx + 54, gy, 16, 120);
          ctx.fillRect(gx - 8, gy - 16, 84, 22);
          ctx.fillStyle = '#fae3cb';
          ctx.fillRect(gx, gy, 12, 120);
          ctx.fillRect(gx + 56, gy, 12, 120);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(gx - 6, gy - 14, 80, 18);
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#111827' : '#ffffff';
            ctx.fillRect(gx + 12 + i * 7, gy + 6, 7, 7);
            ctx.fillStyle = i % 2 === 1 ? '#111827' : '#ffffff';
            ctx.fillRect(gx + 12 + i * 7, gy + 13, 7, 7);
          }
        }
      }

      // 4D. Render Breakable Wooden Crates, Golden '?' Mystery Blocks & Boss Anvil Crates
      const mysteryIdx = Math.floor(worldTime * 5) % sprites.props.mysteryBlock.length;
      for (const crate of level.crates) {
        if (crate.broken) continue;
        if (crate.x + crate.w < camX || crate.x > camX + VIEW_W) continue;
        if (crate.loot === 'boss_anvil') {
          ctx.drawImage(sprites.props.anvilCrate, Math.round(crate.x), Math.round(crate.y));
        } else if (crate.isMysteryBlock) {
          ctx.drawImage(
            sprites.props.mysteryBlock[mysteryIdx],
            Math.round(crate.x),
            Math.round(crate.y)
          );
        } else {
          ctx.drawImage(sprites.props.crate, Math.round(crate.x), Math.round(crate.y));
        }
      }

      // 4E. Render Collectibles (Cuban Chains, Espresso Cups, Electric-Blue Richard Mille Watch)
      const chainFrameIdx = Math.floor(worldTime * 6) % 2;
      for (const item of level.pickups) {
        if (item.collected) continue;
        if (item.x + item.w < camX || item.x > camX + VIEW_W) continue;
        const bobY = Math.round(Math.sin(worldTime * 5 + item.bobOffset) * 3);
        if (item.type === 'chain') {
          ctx.drawImage(sprites.props.chain[chainFrameIdx], Math.round(item.x), Math.round(item.y + bobY));
        } else if (item.type === 'cuvee') {
          ctx.drawImage(sprites.props.wineBottle,Math.round(item.x-2),Math.round(item.y+bobY),24,38);
          ctx.font='bold 6px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillStyle='#ffe5a0';ctx.fillText('36K',item.x+10,item.y+bobY-4);
        } else if (item.type === 'espresso') {
          ctx.drawImage(sprites.props.espresso, Math.round(item.x), Math.round(item.y + bobY));
        } else if (item.type === 'scooter') {
          // Glowing Sapphire-Blue Luxury Aura under the Electric-Blue Richard Mille Watch!
          ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
          ctx.fillRect(Math.round(item.x + 3), Math.round(item.y + 32), 32, 6);
          ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
          ctx.fillRect(Math.round(item.x + 9), Math.round(item.y + 33), 20, 3);
          ctx.drawImage(
            sprites.props.scooterPickup[watchFrameIdx],
            Math.round(item.x),
            Math.round(item.y + bobY)
          );
        }
      }

      // 4F. Render Mini Marco Mouly Enemies (4-Frame Articulated Waddle + Expressive Tilt!)
      for (const enemy of level.enemies) {
        if (enemy.state === 'squished' && enemy.stateTimer <= 0) continue;
        if (enemy.x + enemy.w < camX - 20 || enemy.x > camX + VIEW_W + 20) continue;

        const archBank = sprites.marco[enemy.archetype];
        let sprite: HTMLCanvasElement;
        let drawY = enemy.y;
        let waddleTilt = 0;

        if (enemy.state === 'squished') {
          sprite = archBank.squished;
          drawY = enemy.y + enemy.h - 22;
        } else if (enemy.state === 'windup') {
          sprite = archBank.windup;
        } else {
          const walkIdx = Math.floor(enemy.walkDist * 0.14) % archBank.walk.length;
          sprite = archBank.walk[walkIdx];
          waddleTilt = Math.sin(enemy.walkDist * 0.22) * 0.055;
        }

        if (enemy.state === 'windup') {
          ctx.fillStyle = '#120b07';
          ctx.fillRect(Math.round(enemy.x + 12), Math.round(enemy.y - 16), 10, 13);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(Math.round(enemy.x + 14), Math.round(enemy.y - 14), 6, 6);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(Math.round(enemy.x + 14), Math.round(enemy.y - 6), 6, 2);
        }

        // Grounded contact shadow under Marco's feet
        ctx.fillStyle = 'rgba(18, 11, 7, 0.28)';
        ctx.fillRect(
          Math.round(enemy.x + 6),
          Math.round(enemy.y + enemy.h - 2),
          enemy.w - 12,
          3
        );

        ctx.save();
        // Anchor Marco's shoes flush onto the platform surface (enemy.y + enemy.h + 1)
        const marcoFootX = Math.round(enemy.x + enemy.w * 0.5);
        const marcoFootY = Math.round(
          enemy.state === 'squished' ? drawY + sprite.height : enemy.y + enemy.h + 1
        );
        ctx.translate(marcoFootX, marcoFootY);
        const enemyLandSquashX = enemy.landTimer && enemy.landTimer > 0 ? 1.18 : 1;
        const enemyLandSquashY = enemy.landTimer && enemy.landTimer > 0 ? 0.84 : 1;
        const flipX = enemy.facing === -1 && enemy.state !== 'squished' ? -1 : 1;
        ctx.scale(flipX * enemyLandSquashX, enemyLandSquashY);
        if (waddleTilt !== 0) {
          ctx.rotate(waddleTilt);
        }
        ctx.drawImage(
          sprite,
          -Math.round(sprite.width * 0.5),
          -sprite.height
        );
        ctx.restore();
      }

      // 4F-BOSS. Render Multi-Phase Boss "Don Marco"
      if (level.boss.active && !level.boss.defeated) {
        const boss = level.boss;
        if (boss.x + boss.w >= camX - 40 && boss.x <= camX + VIEW_W + 40) {
          let bossSprite: HTMLCanvasElement;
          const animIdx = Math.floor(worldTime * 6) % 2;
          if (boss.state === 'vulnerable' || boss.state === 'hurt') {
            bossSprite = sprites.boss.vulnerable[animIdx];
          } else if (
            boss.state === 'windup_leap' ||
            boss.state === 'windup_charge' ||
            boss.state === 'charging' ||
            boss.state === 'leaping'
          ) {
            bossSprite = sprites.boss.charging;
          } else {
            const idx = Math.floor(boss.walkDist * 0.1) % 2;
            bossSprite = sprites.boss.shielded[idx];
          }

          if (boss.state === 'vulnerable') {
            ctx.fillStyle = 'rgba(74, 222, 128, 0.35)';
            ctx.fillRect(Math.round(boss.x - 4), Math.round(boss.y + boss.h - 8), boss.w + 8, 8);
            const arrowBob = Math.round(Math.sin(worldTime * 10) * 3);
            ctx.fillStyle = '#120b07';
            ctx.fillRect(Math.round(boss.x + 22), Math.round(boss.y - 20 + arrowBob), 16, 12);
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(Math.round(boss.x + 24), Math.round(boss.y - 18 + arrowBob), 12, 8);
            ctx.fillStyle = '#173746';
            ctx.fillRect(Math.round(boss.x+29),Math.round(boss.y-17+arrowBob),2,6);
            ctx.fillRect(Math.round(boss.x+27),Math.round(boss.y-14+arrowBob),6,2);
          } else {
            ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
            ctx.fillRect(Math.round(boss.x - 4), Math.round(boss.y + boss.h - 6), boss.w + 8, 6);
          }

          const flashHide = boss.hitFlashTimer > 0 && Math.floor(worldTime * 24) % 2 === 0;
          if (!flashHide && bossSprite) {
            ctx.save();
            ctx.translate(
              Math.round(boss.x + boss.w * 0.5),
              Math.round(boss.y + boss.h + 1)
            );
            if (boss.facing === -1) {
              ctx.scale(-1, 1);
            }
            ctx.drawImage(
              bossSprite,
              -Math.round(bossSprite.width * 0.5),
              -bossSprite.height
            );
            if (boss.state !== 'vulnerable' && boss.state !== 'hurt') {
              ctx.fillStyle = '#173746'; ctx.fillRect(13,-40,25,20);
              ctx.fillRect(20,-44,11,5);
              ctx.fillStyle = '#f1c96e'; ctx.fillRect(15,-38,21,16);
              ctx.fillStyle = '#a17737';ctx.fillRect(24,-38,3,16);
              ctx.fillStyle = '#fff1c8';ctx.fillRect(22,-33,7,3);
            }
            ctx.restore();
          }
        }
      }

      // 4G. Render Projectiles
      for (const proj of level.projectiles) {
        if (!proj.active) continue;
        if (proj.kind === 'shockwave') {
          const sx = Math.round(proj.x);
          const sy = Math.round(proj.y);
          ctx.fillStyle = '#120b07';
          ctx.fillRect(sx - 1, sy - 1, 18, 18);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(sx + 1, sy + 2, 14, 14);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(sx + 4, sy + 5, 8, 8);
        } else {
          ctx.save();
          ctx.translate(Math.round(proj.x + 8), Math.round(proj.y + 8));
          ctx.rotate(proj.rotation);
          ctx.drawImage(sprites.props.invoice, -8, -8);
          ctx.restore();
        }
      }

      // 4H-0. Render Sapphire Speed Afterimage Ghosts (only when not swimming or in Lambo!)
      const activePaoBank = sprites.costumes[player.costume] || sprites.pao;
      if (!player.swimming) {
        for (const g of ghosts) {
          if (!g.active || player.inGoldenLambo) continue;
          const alpha = (g.life / g.maxLife) * 0.42;
          ctx.save();
          ctx.globalAlpha = alpha;
          const gx = Math.round(g.x + player.w * 0.5);
          const gy = Math.round(g.y + player.h + 1);
          ctx.translate(gx, gy);
          ctx.scale(g.facing, 1);
          const ghostSprite = activePaoBank.scooter[0];
          ctx.drawImage(ghostSprite, activePaoBank.polished ? -40 : -29, activePaoBank.polished ? -80 : -70, activePaoBank.polished ? 80 : 58, activePaoBank.polished ? 80 : 70);
          ctx.restore();
        }
      }

      // 4H. Render MC Pao (Costume-Aware Articulated Rig, Freestyle Swimming, VIP Camera Pose, or Inside Golden Lambo!)
      const blinkHide =
        player.invulnTimer > 0 && Math.floor(worldTime * 18) % 2 === 0;
      if (!blinkHide && !player.inGoldenLambo) {
        if (player.swimming || player.animState === 'swim') {
          const speed = Math.abs(player.vx);
          const stroke = worldTime * (speed > 35 ? 7 : 3);
          const swimSprite = activePaoBank.swim[Math.floor(stroke) % activePaoBank.swim.length];
          const centerX = Math.round(player.x + player.w * .5);
          const waterY = PHYSICS.WATER_SURFACE_Y;
          const bob = Math.sin(stroke * Math.PI / 2) * 1.2;
          const drawSwimmer = () => {
            ctx.save();ctx.translate(centerX,waterY-47+bob);ctx.scale(player.facing,1);
            ctx.drawImage(swimSprite,-54,0,108,72);ctx.restore();
          };
          // The submerged torso and flutter kick show through the sea, while
          // the head and recovery arm remain opaque above the waterline.
          const water=getOpenWaterZoneAt(centerX,level.platforms);
          ctx.save();ctx.beginPath();ctx.rect(Math.max(centerX-65,water?.minX??centerX-65),waterY,Math.min(centerX+65,water?.maxX??centerX+65)-Math.max(centerX-65,water?.minX??centerX-65),70);ctx.clip();ctx.globalAlpha=.32;drawSwimmer();ctx.restore();
          ctx.save();ctx.beginPath();ctx.rect(centerX-65,waterY-80,130,80);ctx.clip();drawSwimmer();ctx.restore();
          ctx.fillStyle='#a5e7ed';
          ctx.fillRect(centerX-37,waterY,64,1);
          ctx.fillStyle='#e9ffff';
          ctx.fillRect(centerX+player.facing*24-8,waterY-1,18,2);
          if(speed>35){
            for(let i=0;i<4;i++){
              const phase=(worldTime*2+i*.25)%1;
              ctx.fillStyle=`rgba(217,252,255,${(1-phase)*.75})`;
              const wakeX=centerX-player.facing*(25+phase*50);
              ctx.fillRect(Math.round(wakeX),waterY+2+Math.round(Math.sin(i+worldTime*5)*3),12+Math.round(phase*10),1);
            }
            const splash=Math.sin(stroke*Math.PI);
            ctx.fillStyle='#ddfaff';
            ctx.fillRect(centerX+player.facing*32,waterY-3-Math.round(Math.abs(splash)*7),2,3);
            ctx.fillRect(centerX+player.facing*39,waterY-2-Math.round(Math.abs(splash)*4),2,2);
          }
        } else {
          let paoSprite: HTMLCanvasElement;
          let leanRad = 0;
          const isVipCameraPose = player.animState === 'vip_pose';

          if (player.groundPounding) {
            paoSprite = activePaoBank.groundPound;
          } else if (stompPoseTimer > 0) {
            paoSprite = activePaoBank.stomp;
          } else if (player.animState === 'scooter') {
            const idx = Math.floor(worldTime * 14) % activePaoBank.scooter.length;
            paoSprite = activePaoBank.scooter[idx];
            leanRad = 0.05;
          } else if (player.animState === 'hurt') {
            paoSprite = activePaoBank.hurt;
          } else if (player.animState === 'jump') {
            paoSprite =
              player.airJumpsLeft === 0 ? activePaoBank.doubleJump : Math.abs(player.vy) < 85 ? (activePaoBank.apex ?? activePaoBank.jump) : activePaoBank.jump;
            leanRad = Math.max(-0.08, Math.min(0.08, player.vx * 0.0003));
          } else if (player.animState === 'stomp') {
            paoSprite = activePaoBank.fall ?? activePaoBank.stomp;
          } else if (player.animState === 'land') {
            const landIdx = player.landTimer > 0.09 ? 0 : 1;
            paoSprite = activePaoBank.land[landIdx] || activePaoBank.idle[0];
          } else if (isVipCameraPose) {
            const vipIdx = Math.min(activePaoBank.vipPose.length - 1, Math.floor((1.6 - Math.min(1.6, player.vipPoseTimer ?? 0)) * 6));
            paoSprite = activePaoBank.vipPose[vipIdx] || activePaoBank.idle[0];
          } else if (player.animState === 'run') {
            const runIdx = Math.floor(player.walkDist * 0.07) % activePaoBank.run.length;
            paoSprite = activePaoBank.run[runIdx];
            leanRad = Math.min(0.05, Math.abs(player.vx) * 0.00022);
          } else {
            const idleIdx = Math.floor(worldTime * 3.2) % activePaoBank.idle.length;
            paoSprite = activePaoBank.idle[idleIdx];
          }

          // Subtle grounded contact shadow & Richard Mille Sky-Blue Overdrive Halo under MC Pao's sneakers!
          if (player.grounded) {
            ctx.fillStyle = isVipCameraPose
              ? 'rgba(250, 204, 21, 0.42)'
              : player.scooterTimer > 0
              ? 'rgba(41, 182, 246, 0.38)'
              : 'rgba(18, 11, 7, 0.32)';
            ctx.fillRect(
              Math.round(player.x + 5),
              Math.round(player.y + player.h - 2),
              player.w - 10,
              4
            );
          } else if (player.scooterTimer > 0) {
            ctx.fillStyle = 'rgba(41, 182, 246, 0.28)';
            ctx.fillRect(
              Math.round(player.x - 4),
              Math.round(player.y + player.h - 7),
              player.w + 8,
              7
            );
          }

          ctx.save();
          const footX = Math.round(player.x + player.w * 0.5);
          // Explicitly snap MC Pao's sneakers flush onto the platform tile boundary when grounded
          const footY = Math.round(player.y + player.h + (player.grounded ? 1 : 0));
          ctx.translate(footX, footY);
          // When in `vip_pose`, face the camera (1) so his sunglasses star-wink & champagne glass face the viewer!
          const renderFacing = isVipCameraPose ? 1 : player.facing;
          ctx.scale(renderFacing * player.scaleX, player.scaleY);
          if (leanRad !== 0) {
            ctx.rotate(leanRad);
          }
          ctx.drawImage(paoSprite, activePaoBank.polished ? -40 : -29, activePaoBank.polished ? -80 : -70, activePaoBank.polished ? 80 : 58, activePaoBank.polished ? 80 : 70);
          ctx.restore();


        }
      }

      // On Title Screen, render the iconic 6 white comic impact lines between Pao's sneakers and Marco's head!
      if (gameStateRef.current === 'title') {
        const cx = 200;
        const cy = 206;
        const rays = [
          -Math.PI * 0.86,
          -Math.PI * 0.98,
          Math.PI * 0.91,
          -Math.PI * 0.14,
          -0.02,
          0.11,
        ];
        for (const ang of rays) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(ang);
          ctx.fillStyle = '#120b07';
          ctx.fillRect(15, -2, 13, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(16, -1, 11, 2);
          ctx.restore();
        }
      }

      // 4I. Level Editor Grid & Custom Item Outlines
      if (gameStateRef.current === 'editor') {
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.16)';
        ctx.lineWidth = 1;
        const startGridX = Math.floor(camX / 32) * 32;
        for (let gx = startGridX; gx < camX + VIEW_W; gx += 32) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, VIEW_H);
          ctx.stroke();
        }
        for (let gy = 0; gy < VIEW_H; gy += 32) {
          ctx.beginPath();
          ctx.moveTo(camX, gy);
          ctx.lineTo(camX + VIEW_W, gy);
          ctx.stroke();
        }

        if (customLevelRef.current) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          for (const it of customLevelRef.current.items) {
            const iw = it.w || (it.kind === 'boss_don_marco' ? 60 : 36);
            const ih = it.h || (it.kind === 'boss_don_marco' ? 72 : 36);
            ctx.strokeRect(it.x, it.y, iw, ih);
          }
        }
      }

      // 4J. Render Pooled Particles, 8 000 € Wine Bottles & Radial White Comic Impact Lines
      for (const p of particles) {
        if (!p.active) continue;
        if (p.kind === 'impact_line') {
          ctx.save();
          ctx.translate(Math.round(p.x), Math.round(p.y));
          ctx.rotate(p.angle);
          ctx.fillStyle = '#120b07';
          ctx.fillRect(14, -2, p.size + 2, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(15, -1, p.size, 2);
          ctx.restore();
        } else if (p.kind === 'wine_bottle') {
          ctx.save();
          ctx.translate(Math.round(p.x), Math.round(p.y));
          ctx.rotate(p.angle);
          ctx.drawImage(sprites.props.wineBottle, -9, -13);
          ctx.restore();
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(
            Math.round(p.x - p.size * 0.5),
            Math.round(p.y - p.size * 0.5),
            p.size,
            p.size
          );
        }
      }

      // Keep reward feedback legible and reserve one place for each punchline.
      ctx.textAlign = 'center';
      const quote = popups.filter(p => p.active && p.text.length > 18).at(-1);
      for (const pop of popups) {
        if (quote || !pop.active || pop.text.length > 18) continue;
        const x = Math.round(Math.max(camX + 55, Math.min(camX + VIEW_W - 55, pop.x)));
        const y = Math.round(Math.max(95, pop.y - 12));
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        ctx.fillStyle = '#173548'; ctx.fillText(pop.text, x + 1, y + 1);
        ctx.fillStyle = pop.color; ctx.fillText(pop.text, x, y);
      }
      if (quote) {
        ctx.font = 'bold 6px "Press Start 2P", monospace';
        const textWidth = ctx.measureText(quote.text).width;
        const w = Math.min(VIEW_W - 32, Math.max(140, textWidth + 20));
        const x = Math.round(camX + (VIEW_W - w) / 2);
        ctx.fillStyle = '#173548'; ctx.fillRect(x, 62, w, 29);
        ctx.fillStyle = '#f4ce80'; ctx.fillRect(x, 62, 3, 29);
        ctx.fillStyle = '#fff4dd'; ctx.fillText(quote.text, camX + VIEW_W / 2, 74, w - 16);
        ctx.font = 'bold 6px monospace'; ctx.fillStyle = '#9fdce5';
        ctx.fillText(quote.subText, camX + VIEW_W / 2, 84, w - 16);
      }

      ctx.restore();
      ctx.restore();
    };

    let rafId = 0;
    let lastTime = performance.now();
    let manualTime = false;
    let accumulator = 0;

    // Local playtest hooks. Normal gameplay keeps using requestAnimationFrame.
    const debugWindow = window as Window & {
      render_game_to_text?: () => string;
      advanceTime?: (ms: number) => void;
    };
    const previousAdvanceTime = debugWindow.advanceTime;
    if (import.meta.env.DEV) {
      const rounded = (n: number) => Math.round(n * 10) / 10;
      const visible = (item: { x: number; w: number }) =>
        item.x + item.w >= camX && item.x <= camX + VIEW_W;
      debugWindow.render_game_to_text = () => JSON.stringify({
        coordinates: 'World pixels; origin top-left; x right, y down',
        mode: gameStateRef.current,
        inputs: {touch:{...touchInputRef.current},keys:[...keysPressed]},
        viewport: { width: VIEW_W, height: VIEW_H }, checkpoint: !!checkpointData,
        cameraX: rounded(camX),
        goalX: level.goalX,
        player: {
          x: rounded(player.x), y: rounded(player.y),
          vx: rounded(player.vx), vy: rounded(player.vy),
          hp: player.hp, grounded: player.grounded, swimming: player.swimming,
          animation: player.animState, costume: player.costume,
          airJumpsLeft: player.airJumpsLeft, groundPounding: player.groundPounding, poseSeconds: rounded(player.vipPoseTimer ?? 0),
          overdriveSeconds: rounded(player.scooterTimer),
          inGoldenLambo: player.inGoldenLambo,
        },
        score: player.score, chains: player.chains,
        secretBottles: level.pickups.filter(p=>p.type==='cuvee'&&p.collected).length,
        marcosStomped: player.marcosStomped, combo: player.combo,
        platforms: level.platforms.filter(visible).map(({ x, y, w, h }) => ({ x, y, w, h })),
        enemies: level.enemies.filter(visible).map(({ id, x, y, state, archetype }) => ({ id, x: rounded(x), y: rounded(y), state, archetype })),
        pickups: level.pickups.filter((p) => !p.collected && visible(p)).map(({ type, x, y }) => ({ type, x, y })),
        boss: { x: level.boss.x, y: level.boss.y, w: level.boss.w, h: level.boss.h, hp: level.boss.hp, state: level.boss.state, defeated: level.boss.defeated },
        crates: level.crates.filter(p => !p.broken && visible(p)).map(({ x,y,w,h,loot }) => ({ x,y,w,h,loot })),
        projectiles: level.projectiles.filter(p => p.active && visible(p)).map(({ x,y,vx,vy,kind }) => ({ x,y,vx,vy,kind })),
      });
      debugWindow.advanceTime = (ms: number) => {
        manualTime = true;
        const frames = Math.max(0, Math.round(ms / (1000 / 60)));
        for (let i = 0; i < frames; i++) stepSimulation(1 / 60);
        renderScene();
      };
    }

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      if (!manualTime) {
        accumulator += Math.min(.1, Math.max(0, rawDt));
        while (accumulator >= 1 / 60) { stepSimulation(1 / 60); accumulator -= 1 / 60; }
      }
      renderScene();

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      if (import.meta.env.DEV) {
        delete debugWindow.render_game_to_text;
        debugWindow.advanceTime = previousAdvanceTime;
      }
      window.removeEventListener('resize', resizeGame);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', handleVisChange);
    };
  }, [touchInputRef]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'editor' || !onEditorCanvasClickRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const offsetX = (rect.width - canvas.width * scale) / 2;
    const offsetY = (rect.height - canvas.height * scale) / 2;
    const localX = (e.clientX - rect.left - offsetX) / scale / RENDER_SCALE;
    const localY = (e.clientY - rect.top - offsetY) / scale / RENDER_SCALE;
    const currentCamX = simRef.current ? simRef.current.getCamX() : editorCamX;

    const worldX = Math.max(16, Math.round((localX + currentCamX) / 8) * 8);
    const worldY = Math.max(24, Math.min(280, Math.round(localY / 8) * 8));
    onEditorCanvasClickRef.current(worldX, worldY);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center world-stage overflow-hidden">
      <canvas
        ref={canvasRef}
        width={VIEW_W * RENDER_SCALE}
        height={VIEW_H * RENDER_SCALE}
        data-testid="game-canvas"
        tabIndex={0}
        onPointerDown={handleCanvasPointerDown}
        aria-label="MC Pao 16-Bit Mediterranean Platformer Canvas"
        className={`w-full h-full object-contain object-center pixelated focus:outline-none ${
          gameState === 'editor' ? 'cursor-crosshair' : ''
        }`}
      />
    </div>
  );
};
