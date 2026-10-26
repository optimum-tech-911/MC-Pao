import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterPortrait } from './CharacterPortrait';
import { MobileControls } from './MobileControls';
import { getArtStatus } from '../game/polishedSprites';
import { getSpriteBank } from '../game/sprites';
import { GameCanvas, type HudSnapshot, type TouchInputRef } from './GameCanvas';
import {
  computeProjectedWorldwideRank,
  COSTUME_OPTIONS,
  cyclePaoCostume,
  decodeLevelShareCode,
  encodeLevelShareCode,
  type CustomLevelItem,
  type CustomLevelPayload,
  type GameState,
  type LeaderboardCountryCode,
  type LeaderboardEntry,
  type LeaderboardMode,
  type PaoCostume,
  type WeatherMode,
} from '../game/rules';
import { createStarterCustomLevel } from '../game/level';
import { soundFX } from '../game/audio';
import {
  COUNTRY_OPTIONS,
  fetchWorldwideLeaderboard,
  getCountryFlag,
  loadLocalLeaderboard,
  loadSavedPlayerProfile,
  submitWorldwideScore,
} from '../game/leaderboard';

function readPreference(key:string,fallback:string){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}}
function savePreference(key:string,value:string){try{localStorage.setItem(key,value);}catch{/* Private browsing can deny storage. */}}

const CUSTOM_LEVEL_STORAGE_KEY = 'mcpao_custom_level_v1';

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  highScore: 0,
  chains: 0,
  combo: 0,
  maxCombo: 0,
  hp: 3,
  maxHp: 3,
  scooterSec: 0,
  marcosStomped: 0,
  totalMarcos: 15,
  progressPct: 0,
  victory: false,
  bossActive: false,
  bossHp: 6,
  bossMaxHp: 6,
  bossPhase: 1,
  bossState: 'patrol_shielded',
};

const EDITOR_TOOLS: Array<{
  id: CustomLevelItem['kind'] | 'erase';
  label: string;
  badge: string;
}> = [
  { id: 'platform', label: 'Stone Ledge', badge: 'TILE' },
  { id: 'spring_awning', label: 'Café Awning', badge: 'BOUNCE' },
  { id: 'crate_chain', label: 'Caisse 500 €', badge: 'EURO' },
  { id: 'crate_espresso', label: 'HP Crate', badge: 'HP+' },
  { id: 'marco_waddler', label: 'Marco Waddler', badge: 'ENEMY' },
  { id: 'marco_caller', label: 'Marco Caller', badge: 'THROW' },
  { id: 'marco_charger', label: 'Marco Charger', badge: 'RUSH' },
  { id: 'rm_watch', label: 'Richard Mille RM', badge: 'POWER' },
  { id: 'chain', label: 'Liasse 500 €', badge: 'EURO' },
  { id: 'boss_don_marco', label: 'Boss Don Marco', badge: 'BOSS' },
  { id: 'erase', label: 'Eraser', badge: 'DEL' },
];

const WEATHER_LABELS: Record<WeatherMode, string> = {
  heat_haze: 'Soleil de midi',
  golden_breeze: 'Heure dorée',
  mistral_gulls: 'Brise du large',
};

/**
 * Custom code-authored <svg> MC Pao Vitality Head Icon with 3 readable states:
 * 'full', 'damaged', 'empty'
 */
const PaoVitalityPip: React.FC<{ state: 'full' | 'damaged' | 'empty' }> = ({ state }) => {
  if (state === 'empty') {
    return (
      <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="4"
          fill="#1a0f0a"
          stroke="#5c3a24"
          strokeWidth="2"
          strokeDasharray="3 2"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-7 h-7 shrink-0 ${state === 'damaged' ? 'opacity-45' : ''}`}
      aria-hidden="true"
    >
      <rect x="3" y="2" width="18" height="20" rx="3" fill="#120b07" />
      <path d="M5 4h14v5H5z" fill="#2c1d14" />
      <rect x="6" y="3" width="4" height="3" fill="#4a3223" />
      <rect x="11" y="3" width="5" height="3" fill="#4a3223" />
      <rect x="5" y="8" width="14" height="9" fill="#f2a679" />
      <rect x="6" y="9" width="5" height="3" fill="#e2e8f0" stroke="#475569" strokeWidth="0.8" />
      <rect x="13" y="9" width="5" height="3" fill="#e2e8f0" stroke="#475569" strokeWidth="0.8" />
      <rect x="8" y="10" width="1.8" height="1.8" fill="#120b07" />
      <rect x="15" y="10" width="1.8" height="1.8" fill="#120b07" />
      <path d="M5 14h14v5H5z" fill="#362013" />
      <rect x="9" y="15" width="6" height="2" fill="#ffffff" />
      <path d="M7 19h10v2H7z" fill="#cbd5e1" />
      {state === 'damaged' && (
        <path d="M6 4L18 20M18 4L6 20" stroke="#ef4444" strokeWidth="2.5" />
      )}
    </svg>
  );
};

/**
 * Custom code-authored <svg> 500€ Euro Banknote + Gold Euro Coin HUD Icon
 */
const ChainSvgIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    {/* 500€ Banknote Bundle */}
    <rect x="1" y="5" width="16" height="11" rx="2" fill="#9333ea" stroke="#120b07" strokeWidth="1.5" />
    <rect x="3" y="7" width="12" height="7" rx="1" fill="#d8b4fe" />
    <rect x="7" y="5" width="3" height="11" fill="#facc15" />
    {/* Gold Euro Coin Emblem */}
    <circle cx="17" cy="15" r="5.5" fill="#facc15" stroke="#120b07" strokeWidth="1.5" />
    <text
      x="17"
      y="18.2"
      textAnchor="middle"
      fontSize="9"
      fontWeight="900"
      fill="#120b07"
      fontFamily="monospace"
    >
      €
    </text>
  </svg>
);

/**
 * Custom code-authored <svg> Carbon-TPT + Sky-Blue Strap Richard Mille Tonneau Watch HUD Icon
 */
const BlueRichardMilleSvgIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    {/* Vented Sky-Blue Rubber Strap */}
    <rect x="7.5" y="0.5" width="9" height="23" rx="2" fill="#38bdf8" stroke="#090d16" strokeWidth="1.4" />
    <line x1="9" y1="2.5" x2="15" y2="2.5" stroke="#0284c7" strokeWidth="1.2" />
    <line x1="9" y1="21.5" x2="15" y2="21.5" stroke="#0284c7" strokeWidth="1.2" />
    {/* Sky-Blue Crown */}
    <rect x="19" y="9.5" width="3" height="5" rx="1" fill="#38bdf8" stroke="#090d16" strokeWidth="1" />
    {/* Curved Tonneau Carbon-TPT Dark Bezel */}
    <rect x="4" y="4" width="16" height="16" rx="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.6" />
    {/* 4 Corner Titanium Spline Screws */}
    <circle cx="6.5" cy="6.5" r="0.9" fill="#e2e8f0" />
    <circle cx="17.5" cy="6.5" r="0.9" fill="#e2e8f0" />
    <circle cx="6.5" cy="17.5" r="0.9" fill="#e2e8f0" />
    <circle cx="17.5" cy="17.5" r="0.9" fill="#e2e8f0" />
    {/* Skeleton Tourbillon Dial */}
    <rect x="7" y="7" width="10" height="10" rx="3" fill="#090d16" stroke="#38bdf8" strokeWidth="0.9" />
    <path d="M8 8L16 16M16 8L8 16" stroke="#94a3b8" strokeWidth="1.1" />
    <circle cx="12" cy="12" r="2.1" fill="#e2e8f0" />
    <path d="M12 8.5v3.5l2.5 1.5" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const GameShell: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(import.meta.env.DEV ? window.location.search : '');
      if (params.get('editor') === '1') return 'editor';
      if (
        params.get('autostart') === '1' ||
        params.get('boss') === '1' ||
        params.get('yacht') === '1' ||
        params.get('swim') === '1' ||
        params.get('lambo') === '1'
      ) {
        return 'playing';
      }
    }
    return 'title';
  });

  const [spawnAtBoss, setSpawnAtBoss] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(import.meta.env.DEV ? window.location.search : '');
      return params.get('boss') === '1';
    }
    return false;
  });

  const [costume, setCostume] = useState<PaoCostume>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(import.meta.env.DEV ? window.location.search : '');
      const c = params.get('costume');
      if (c === 'classic_white' || c === 'monaco_gold' || c === 'yacht_black_vip') {
        return c;
      }
    }
    const saved=readPreference('mcpao_costume','yacht_black_vip');
    return saved==='classic_white'||saved==='monaco_gold'?saved:'yacht_black_vip';
  });

  const [art,setArt]=useState(getArtStatus);
  useEffect(()=>{getSpriteBank();const update=()=>setArt(getArtStatus());update();window.addEventListener('mcpao-art-ready',update);return()=>window.removeEventListener('mcpao-art-ready',update);},[]);
  useEffect(()=>savePreference('mcpao_costume',costume),[costume]);

  const [weatherMode, setWeatherMode] = useState<WeatherMode>('heat_haze');
  const [playingCustomLevel, setPlayingCustomLevel] = useState<boolean>(false);
  const [editorLevel, setEditorLevel] = useState<CustomLevelPayload>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_LEVEL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CustomLevelPayload;
        if (parsed && parsed.version === 1 && Array.isArray(parsed.items)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return createStarterCustomLevel('heat_haze');
  });

  const [editorTool, setEditorTool] = useState<CustomLevelItem['kind'] | 'erase'>('rm_watch');
  const [editorCamX, setEditorCamX] = useState<number>(0);
  const [editorStatus, setEditorStatus] = useState<string>(
    'Click anywhere on the Mediterranean canvas to place or erase items!'
  );
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [shareCodeInput, setShareCodeInput] = useState<string>('');

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [finalStats, setFinalStats] = useState<HudSnapshot>(INITIAL_HUD);
  const [resetSignal, setResetSignal] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(() => readPreference('mcpao_muted','false') === 'true');
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => readPreference('mcpao_music','true') !== 'false');
  const [sfxVol, setSfxVol] = useState<number>(() => {const n=Number(readPreference('mcpao_sfx','70'));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):70;});
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => window.matchMedia('(pointer: coarse)').matches);
  const [retrySignal, setRetrySignal] = useState(0);
  const [titleExtras, setTitleExtras] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [portraitDismissed, setPortraitDismissed] = useState(false);
  const [isPortraitPhone, setIsPortraitPhone] = useState(() => window.innerHeight > window.innerWidth && window.matchMedia('(pointer: coarse)').matches);
  const [voiceEnabled, setVoiceEnabled] = useState(() => readPreference('mcpao_voice','false') === 'true');

  // Worldwide Leaderboard State
  const [leaderboardOpen, setLeaderboardOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(import.meta.env.DEV ? window.location.search : '');
      return params.get('leaderboard') === '1';
    }
    return false;
  });
  useEffect(()=>{
    if(!leaderboardOpen)return;
    const previous=document.activeElement as HTMLElement|null;
    const frame=requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('[data-testid="leaderboard-close-btn"]')?.focus());
    return()=>{cancelAnimationFrame(frame);previous?.focus();};
  },[leaderboardOpen]);
  const [leaderboardTab, setLeaderboardTab] = useState<'all' | LeaderboardMode>('all');
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>(() =>
    loadLocalLeaderboard()
  );
  const visibleLeaderboardEntries=leaderboardTab==='all'?leaderboardEntries:leaderboardEntries.filter(e=>e.mode===leaderboardTab);
  const [playerNameInput, setPlayerNameInput] = useState<string>(
    () => loadSavedPlayerProfile().playerName
  );
  const [playerCountryInput, setPlayerCountryInput] = useState<LeaderboardCountryCode>(
    () => loadSavedPlayerProfile().country
  );
  const [submittingScore, setSubmittingScore] = useState<boolean>(false);
  const [scoreSubmittedBanner, setScoreSubmittedBanner] = useState<string>('');
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);

  const touchInputRef = useRef<TouchInputRef>({
    left: false,
    right: false,
    jump: false,
    jumpJustPressed: false,
    down: false,
  });

  useEffect(() => {
    document.body.dataset.state = gameState;
    if (gameState === 'playing') {
      soundFX.startMusic();
    } else {
      soundFX.stopMusic();
    }
  }, [gameState]);

  useEffect(() => {
    const handleResize = () => {
      setIsPortraitPhone(window.innerHeight > window.innerWidth && window.matchMedia('(pointer: coarse)').matches);
      if (window.matchMedia('(pointer: coarse)').matches) {
        setShowTouchControls(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const focusCanvas = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const canvas = document.querySelector('canvas');
    if (canvas instanceof HTMLElement) {
      canvas.focus();
    }
  };

  const startStandardGame = useCallback(() => {
    if(!getArtStatus().ready)return;
    setPlayingCustomLevel(false);
    setSpawnAtBoss(false);
    document.body.dataset.state = 'playing';
    setResetSignal((n) => n + 1);
    setGameState('playing');
    focusCanvas();
  }, []);

  const startBossArena = useCallback(() => {
    if(!getArtStatus().ready)return;
    setPlayingCustomLevel(false);
    setSpawnAtBoss(true);
    document.body.dataset.state = 'playing';
    setResetSignal((n) => n + 1);
    setGameState('playing');
    focusCanvas();
  }, []);

  const startCustomLevelPlay = useCallback(() => {
    setPlayingCustomLevel(true);
    setSpawnAtBoss(false);
    setWeatherMode(editorLevel.weather);
    document.body.dataset.state = 'playing';
    setResetSignal((n) => n + 1);
    setGameState('playing');
    focusCanvas();
  }, [editorLevel.weather]);

  const openLevelEditor = useCallback(() => {
    setShareModalOpen(false);
    document.body.dataset.state = 'editor';
    setGameState('editor');
  }, []);

  const resumeGame = useCallback(() => {
    focusCanvas();
    document.body.dataset.state = 'playing';
    setGameState('playing');
  }, []);

  const togglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'playing') return 'paused';
      if (prev === 'paused') return 'playing';
      return prev;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundFX.setMuted(next);
      if (!next && gameState === 'playing') {
        soundFX.startMusic();
      }
      return next;
    });
  }, [gameState]);

  const cycleWeather = useCallback(() => {
    setWeatherMode((prev) => {
      const next: WeatherMode =
        prev === 'heat_haze'
          ? 'golden_breeze'
          : prev === 'golden_breeze'
          ? 'mistral_gulls'
          : 'heat_haze';
      setEditorLevel((lvl) => ({ ...lvl, weather: next }));
      return next;
    });
  }, []);

  const handleCycleCostume = useCallback(() => {
    setCostume((prev) => cyclePaoCostume(prev));
    soundFX.playChainPickup();
  }, []);

  const activeCostumeMeta =
    COSTUME_OPTIONS.find((c) => c.id === costume) || COSTUME_OPTIONS[0];

  const handleGameOver = useCallback((stats: HudSnapshot) => {
    setFinalStats({ ...stats });
    setScoreSubmittedBanner('');
    setGameState('gameover');
    fetchWorldwideLeaderboard('all')
      .then((entries) => setLeaderboardEntries(entries))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    fetchWorldwideLeaderboard('all')
      .then((entries) => {
        if (active) setLeaderboardEntries(entries);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [leaderboardTab, leaderboardOpen]);

  const handlePublishWorldwideScore = async (customScore?: number) => {
    if (submittingScore) return;
    setSubmittingScore(true);
    const activeMode: LeaderboardMode = playingCustomLevel
      ? 'custom'
      : spawnAtBoss
      ? 'boss'
      : 'story';
    const scoreToSubmit =
      customScore !== undefined
        ? customScore
        : gameState === 'gameover'
        ? Math.max(finalStats.score, hud.score)
        : Math.max(hud.score, hud.highScore);

    const res = await submitWorldwideScore({
      playerName: playerNameInput,
      country: playerCountryInput,
      score: scoreToSubmit,
      chains: gameState === 'gameover' ? finalStats.chains : hud.chains,
      marcosStomped:
        gameState === 'gameover' ? finalStats.marcosStomped : hud.marcosStomped,
      maxCombo:
        gameState === 'gameover'
          ? Math.max(1, finalStats.maxCombo)
          : Math.max(1, hud.maxCombo),
      mode: activeMode,
      victory: gameState === 'gameover' ? finalStats.victory : hud.victory,
    });

    setSubmittingScore(false);
    if (res) {
      setLeaderboardEntries(res.entries);
      setLastSubmittedId(res.entry.id);
      setScoreSubmittedBanner(
        res.syncedOnline ? `Record publié · #${res.rank} · ${res.entry.score.toLocaleString('fr-FR')} €` : `Record sauvegardé sur cet appareil · Connexion au classement indisponible`
      );
      setLeaderboardTab('all');
      setLeaderboardOpen(true);
    }
  };

  const handleEditorCanvasClick = useCallback(
    (worldX: number, worldY: number) => {
      setEditorLevel((prev) => {
        if (editorTool === 'erase') {
          const filtered = prev.items.filter((it) => {
            const iw = it.w || (it.kind === 'boss_don_marco' ? 60 : 38);
            const ih = it.h || (it.kind === 'boss_don_marco' ? 72 : 44);
            const hit =
              worldX >= it.x - 12 &&
              worldX <= it.x + iw + 12 &&
              worldY >= it.y - 12 &&
              worldY <= it.y + ih + 12;
            return !hit;
          });
          setEditorStatus(
            filtered.length < prev.items.length
              ? `Erased object at (${worldX}, ${worldY})`
              : `No object found at (${worldX}, ${worldY})`
          );
          return { ...prev, items: filtered };
        }

        const newItem: CustomLevelItem =
          editorTool === 'platform'
            ? { kind: 'platform', x: worldX, y: worldY, w: 128, h: 64 }
            : { kind: editorTool, x: worldX, y: worldY };

        const baseItems =
          editorTool === 'boss_don_marco'
            ? prev.items.filter((i) => i.kind !== 'boss_don_marco')
            : prev.items;

        const readableName =
          editorTool === 'rm_watch'
            ? 'Blue Richard Mille Watch'
            : editorTool.replace(/_/g, ' ');
        setEditorStatus(`Placed ${readableName} at (${worldX}, ${worldY})`);
        return {
          ...prev,
          items: [...baseItems, newItem],
        };
      });
    },
    [editorTool]
  );

  const handleSaveCustomLevel = () => {
    try {
      localStorage.setItem(CUSTOM_LEVEL_STORAGE_KEY, JSON.stringify(editorLevel));
      setEditorStatus(`Saved "${editorLevel.name}" (${editorLevel.items.length} items) to browser storage!`);
    } catch {
      setEditorStatus('Could not save to browser storage.');
    }
  };

  const handleLoadCustomLevel = () => {
    try {
      const raw = localStorage.getItem(CUSTOM_LEVEL_STORAGE_KEY);
      if (!raw) {
        setEditorStatus('No saved custom level found in storage yet.');
        return;
      }
      const parsed = JSON.parse(raw) as CustomLevelPayload;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.items)) {
        setEditorLevel(parsed);
        setWeatherMode(parsed.weather || 'heat_haze');
        setEditorStatus(`Loaded "${parsed.name}" (${parsed.items.length} items)!`);
      }
    } catch {
      setEditorStatus('Failed to load saved level.');
    }
  };

  const handleImportShareCode = () => {
    const decoded = decodeLevelShareCode(shareCodeInput);
    if (!decoded) {
      setEditorStatus('Invalid Share Code! Make sure it starts with MCPAO1_');
      return;
    }
    setEditorLevel(decoded);
    setWeatherMode(decoded.weather || 'heat_haze');
    setShareModalOpen(false);
    setEditorStatus(`Imported shared level "${decoded.name}" (${decoded.items.length} items)!`);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (leaderboardOpen || shareModalOpen || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.code === 'Enter' || e.code === 'Space') && e.target instanceof HTMLElement && e.target.closest('button,a,summary')) return;
      if (gameState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        startStandardGame();
      } else if (e.code === 'KeyM' && gameState !== 'editor') {
        toggleMute();
      } else if (
        e.code === 'KeyR' &&
        (gameState === 'playing' || gameState === 'paused' || gameState === 'gameover')
      ) {
        if (gameState === 'gameover' && !finalStats.victory && hud.checkpoint && !playingCustomLevel && !spawnAtBoss) { setRetrySignal(n => n + 1); setGameState('playing'); focusCanvas(); }
        else if (playingCustomLevel) startCustomLevelPlay();
        else if (spawnAtBoss) startBossArena();
        else startStandardGame();
      } else if (e.code === 'KeyT' && gameState === 'playing') {
        setShowTouchControls((v) => !v);
      } else if (
        e.code === 'KeyC' &&
        (gameState === 'title' || gameState === 'playing' || gameState === 'paused')
      ) {
        handleCycleCostume();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameState,
    leaderboardOpen, shareModalOpen, hud.checkpoint, finalStats.victory,
    handleCycleCostume,
    playingCustomLevel,
    spawnAtBoss,
    startBossArena,
    startCustomLevelPlay,
    startStandardGame,
    toggleMute,
  ]);

  const retryRun = () => {
    if (hud.checkpoint && !finalStats.victory && !playingCustomLevel && !spawnAtBoss) {
      setRetrySignal(n => n + 1); setGameState('playing'); focusCanvas();
    } else if (playingCustomLevel) startCustomLevelPlay();
    else if (spawnAtBoss) startBossArena();
    else startStandardGame();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await document.documentElement.requestFullscreen();
        const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
        await orientation.lock?.('landscape').catch(() => {});
      }
    } catch { setPortraitDismissed(true); }
  };

  const shareResult = async () => {
    const text = `CIAO MARCO ! ${Math.round(finalStats.score).toLocaleString('fr-FR')} € · combo ×${Math.max(1, finalStats.maxCombo)} · ${finalStats.victory ? 'Bouteille sauvée, départ en Lambo !' : 'Qui fera mieux ?'} #MCPao`;
    const url = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '' : location.origin;
    try {
      if (navigator.share) await navigator.share({title:'MC Pao · Ciao Marco !',text,...(url ? {url} : {})});
      else { await navigator.clipboard.writeText(text + (url ? `\n${url}` : '')); setShareStatus('Résultat copié !'); }
    } catch (error) { if ((error as Error).name !== 'AbortError') setShareStatus('Le partage est indisponible dans ce navigateur.'); }
  };

  useEffect(() => {
    soundFX.setMuted(muted); soundFX.musicEnabled = musicEnabled; soundFX.sfxVolume = sfxVol / 100; soundFX.setVoiceEnabled(voiceEnabled);
    savePreference('mcpao_muted', String(muted)); savePreference('mcpao_music', String(musicEnabled)); savePreference('mcpao_sfx', String(sfxVol)); savePreference('mcpao_voice', String(voiceEnabled));
    if (gameState === 'playing' && !muted && musicEnabled) soundFX.startMusic(); else soundFX.stopMusic();
  }, [muted,musicEnabled,sfxVol,voiceEnabled,gameState]);

  useEffect(() => {
    const fullscreen = (e: KeyboardEvent) => { if(e.code === 'KeyF' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); void toggleFullscreen(); } };
    const hidden = () => { if(document.hidden) setGameState(s => s === 'playing' ? 'paused' : s); };
    window.addEventListener('keydown',fullscreen);document.addEventListener('visibilitychange',hidden);
    return () => { window.removeEventListener('keydown',fullscreen);document.removeEventListener('visibilitychange',hidden); };
  }, []);

  const activeCustomPayload =
    gameState === 'editor' || playingCustomLevel ? editorLevel : null;

  return (
    <main className="game-root relative w-screen h-dvh overflow-hidden select-none">
      <GameCanvas
        gameState={gameState === 'playing' && (!art.ready || (isPortraitPhone && !portraitDismissed)) ? 'paused' : gameState}
        resetSignal={resetSignal}
        retrySignal={retrySignal}
        weatherMode={weatherMode}
        costume={costume}
        customLevel={activeCustomPayload}
        spawnAtBoss={spawnAtBoss}
        editorTool={editorTool}
        editorCamX={editorCamX}
        onEditorCanvasClick={handleEditorCanvasClick}
        touchInputRef={touchInputRef}
        onHudUpdate={setHud}
        onGameOver={handleGameOver}
        onTogglePause={togglePause}
      />

      {(gameState === 'playing' || gameState === 'paused') && (
        <div className="game-ui">
          <header className="arcade-hud">
            <div className="hud-left">
              <div className="hud-hearts" aria-label={`Lives remaining: ${hud.hp} of ${hud.maxHp}`}>
                {Array.from({length:hud.maxHp},(_,i)=><span key={i} className={i<hud.hp?'':'heart-empty'}>♥</span>)}
              </div>
              <div className="hud-money"><span>LA CAISSE</span><strong data-testid="hud-score">{Math.round(hud.score).toLocaleString('fr-FR')} €</strong></div>
              {hud.combo>1 && <span className="combo-pill">×{hud.combo} COMBO</span>}
            </div>
            {hud.bossActive && <div className="boss-meter"><span>DON MARCO <b>{hud.bossState==='vulnerable'?'↓ SAUTE !':hud.bossState.includes('charge')?'→ CHARGE !':hud.bossState.includes('leap')?'↑ ATTENTION !':'◆ BOUCLIER'}</b></span><div>{Array.from({length:hud.bossMaxHp},(_,i)=><i key={i} className={i<hud.bossHp?'':'spent'}/>)}</div></div>}
            <div className="hud-right">
              {hud.scooterSec>0 && <span className="turbo-pill">RM TURBO <strong>{hud.scooterSec}s</strong></span>}
              <button className="hud-pause" aria-label="Pause Game (P)" onClick={togglePause}>Ⅱ</button>
            </div>
          </header>
          <div className="hud-route"><span>{hud.zone}</span><span>{hud.bottleRecovered?'BOUTEILLE SAUVÉE':hud.checkpoint?'⚑ POINT VIP ACTIVÉ':'OBJECTIF : LA BOUTEILLE À 8 000 €'}</span></div>
          {hud.hint && !hud.calloutActive && <div className="game-hint" data-testid="game-hint">{hud.hint}</div>}
          {showTouchControls && gameState === 'playing' && art.ready && <MobileControls input={touchInputRef}/>}
        </div>
      )}

      {/* ====================================================================
          2. LEVEL EDITOR OVERLAY (`document.body.dataset.state === 'editor'`)
          ==================================================================== */}
      {gameState === 'editor' && (
        <div
          data-testid="level-editor-panel"
          className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-2.5 sm:p-4"
        >
          {/* Top Bar */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#24130b]/95 border-2 border-[#facc15] shadow-[0_4px_0_#120b07]">
            <div className="flex items-center gap-2.5">
              <span className="font-pixel text-xs text-[#fef08a]">✎ RIVIERA LEVEL EDITOR</span>
              <input
                type="text"
                aria-label="Custom Level Name"
                value={editorLevel.name}
                onChange={(e) =>
                  setEditorLevel((prev) => ({ ...prev, name: e.target.value }))
                }
                className="px-2.5 py-1 rounded-lg bg-[#120b07] border border-[#e5b586] text-xs font-bold text-white w-44 sm:w-52"
              />
              <button
                type="button"
                onClick={cycleWeather}
                className="px-2.5 py-1.5 rounded-lg bg-[#180c06] border border-[#38bdf8] text-[#38bdf8] text-xs font-bold cursor-pointer"
              >
                ☀ {WEATHER_LABELS[weatherMode]}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                data-testid="editor-test-play"
                onClick={startCustomLevelPlay}
                className="px-3.5 py-2 rounded-lg bg-[#386641] hover:bg-[#467d50] text-white font-pixel text-[10px] border-2 border-[#a7f3d0] shadow-[0_3px_0_#120b07] cursor-pointer"
              >
                ▶ TEST PLAY
              </button>
              <button
                type="button"
                data-testid="editor-save"
                onClick={handleSaveCustomLevel}
                className="px-3 py-2 rounded-lg bg-[#d97706] hover:bg-[#f59e0b] text-white font-bold text-xs border border-[#fef08a] cursor-pointer"
              >
                SAVE
              </button>
              <button
                type="button"
                data-testid="editor-load"
                onClick={handleLoadCustomLevel}
                className="px-3 py-2 rounded-lg bg-[#180c06] hover:bg-[#2e170c] text-[#fae3cb] font-bold text-xs border border-[#e5b586] cursor-pointer"
              >
                LOAD
              </button>
              <button
                type="button"
                data-testid="editor-share"
                onClick={() => {
                  setShareCodeInput(encodeLevelShareCode(editorLevel));
                  setShareModalOpen(true);
                }}
                className="px-3 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] text-[#fef08a] font-bold text-xs border border-[#93c5fd] cursor-pointer"
              >
                SHARE CODE
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditorLevel(createStarterCustomLevel(weatherMode));
                  setEditorStatus('Reset custom stage to Riviera starter template.');
                }}
                className="px-2.5 py-2 rounded-lg bg-[#180c06] text-[#fca5a5] font-bold text-xs border border-[#7f1d1d] cursor-pointer"
              >
                RESET
              </button>
              <button
                type="button"
                onClick={() => setGameState('title')}
                className="px-2.5 py-2 rounded-lg bg-[#180c06] text-[#ebbf94] font-bold text-xs border border-[#5c3822] cursor-pointer"
              >
                EXIT
              </button>
            </div>
          </div>

          {/* Bottom Bar: Camera Scrubber & Placeable Item Palette */}
          <div className="pointer-events-auto flex flex-col gap-2 px-3 py-2.5 rounded-xl bg-[#24130b]/95 border-2 border-[#e5b586] shadow-[0_4px_0_#120b07]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditorCamX((x) => Math.max(0, x - 160))}
                  className="px-2.5 py-1 rounded bg-[#180c06] border border-[#e5b586] text-[#fef08a] font-bold cursor-pointer"
                >
                  ◀ PAN LEFT
                </button>
                <input
                  type="range"
                  aria-label="Camera X Position"
                  min={0}
                  max={1400}
                  value={editorCamX}
                  onChange={(e) => setEditorCamX(Number(e.target.value))}
                  className="w-32 sm:w-48 accent-[#facc15] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setEditorCamX((x) => Math.min(1400, x + 160))}
                  className="px-2.5 py-1 rounded bg-[#180c06] border border-[#e5b586] text-[#fef08a] font-bold cursor-pointer"
                >
                  PAN RIGHT ▶
                </button>
              </div>

              <span
                data-testid="editor-status"
                className="text-[11px] font-bold text-[#38bdf8] truncate"
              >
                {editorStatus} ({editorLevel.items.length} objects)
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {EDITOR_TOOLS.map((tool) => {
                const active = editorTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    data-testid={`tool-${tool.id}`}
                    onClick={() => setEditorTool(tool.id)}
                    className={`px-2.5 py-1.5 rounded-lg border text-left shrink-0 transition-all cursor-pointer ${
                      active
                        ? 'bg-[#0284c7] border-[#fef08a] text-white shadow-[0_2px_0_#120b07]'
                        : 'bg-[#180c06] border-[#5c3822] text-[#fae3cb] hover:bg-[#2e170c]'
                    }`}
                  >
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#fef08a]">
                      {tool.badge}
                    </div>
                    <div className="text-xs font-bold whitespace-nowrap">{tool.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {shareModalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Share or Import Custom Level Code"
              className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            >
              <div className="w-full max-w-lg rounded-2xl bg-[#24130b] border-3 border-[#facc15] shadow-[0_8px_0_#120b07] p-5 text-[#fae3cb]">
                <h3 className="font-pixel text-base text-[#fef08a]">
                  SHARE / IMPORT LEVEL CODE
                </h3>
                <p className="text-xs text-[#ebbf94] mt-1">
                  Copy this code to share your custom Mediterranean stage with friends, or paste a friend&apos;s MCPAO1_ code below to load it!
                </p>
                <textarea
                  data-testid="share-code-textarea"
                  rows={4}
                  value={shareCodeInput}
                  onChange={(e) => setShareCodeInput(e.target.value)}
                  className="w-full mt-3 p-2.5 rounded-xl bg-[#120b07] border border-[#e5b586] font-mono text-xs text-[#38bdf8]"
                />
                <div className="flex flex-wrap items-center justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(shareCodeInput).catch(() => {});
                      }
                      setEditorStatus('Copied Share Code to clipboard!');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#1e3a8a] text-white font-bold text-xs border border-[#93c5fd] cursor-pointer"
                  >
                    COPY CODE
                  </button>
                  <button
                    type="button"
                    data-testid="import-code-confirm"
                    onClick={handleImportShareCode}
                    className="px-3.5 py-2 rounded-xl bg-[#386641] text-white font-bold text-xs border border-[#a7f3d0] cursor-pointer"
                  >
                    LOAD FROM CODE
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareModalOpen(false)}
                    className="px-3 py-2 rounded-xl bg-[#180c06] text-[#ebbf94] font-bold text-xs border border-[#5c3822] cursor-pointer"
                  >
                    FERMER
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          3. TITLE SCREEN OVERLAY
          ==================================================================== */}
      {gameState === 'title' && (
        <div className="lobby">
          <header className="lobby-top"><span><i/> FAN GAME · ÉDITION RIVIERA</span><button onClick={toggleMute} aria-label={muted?'Activer le son':'Couper le son'}>{muted?'SON OFF':'SON ON'} ♫</button></header>
          <div className="lobby-grid">
            <section className="lobby-hero">
              <div className="lobby-heading"><p>SAINT-TROPEZ → MONACO</p><h1>MC PAO<span>CIAO MARCO !</span></h1><p className="lobby-tagline">Une bouteille. Tous les Marcos. Ton record.</p></div>
              <div className="lobby-scene" aria-label="MC Pao affronte Marco sur la Riviera">
                <div className="lobby-sun"/><div className="lobby-coast"/>
                <div className="mission-ticket"><small>LA MISSION</small><b>8 000 €</b><span>SAUVE LA BOUTEILLE</span></div>
                <CharacterPortrait kind="pao" costume={costume} className="lobby-pao"/><span className="lobby-vs">VS</span><CharacterPortrait kind="marco" className="lobby-marco"/>
                <div className="lobby-pier"/>
                <span className="lobby-route">STOMP. TURBO. YACHT. LAMBO.</span>
              </div>
            </section>
            <section className="lobby-panel">
              <div className="outfit-section"><div className="lobby-section-label"><span>01 / CHOISIS TON STYLE</span><span>{activeCostumeMeta.shortLabel}</span></div>
                <div className="outfit-options" role="group" aria-label="Tenue de MC Pao">
                  {COSTUME_OPTIONS.map(c=><button key={c.id} data-testid={`outfit-${c.id}`} className={costume===c.id?'selected':''} aria-pressed={costume===c.id} onClick={()=>setCostume(c.id)}><CharacterPortrait kind="pao" costume={c.id} className="outfit-avatar"/><span>{c.id==='classic_white'?'CLASSIC WHITE':c.id==='monaco_gold'?'MONACO GOLD':'BLACK VIP'}</span><i>{costume===c.id?'✓':'+'}</i></button>)}
                </div>
              </div>
              <div className="lobby-scores" data-testid="intro-leaderboard">
                <div className="lobby-section-label"><span>02 / CLASSEMENT RIVIERA</span><button data-testid="title-leaderboard-btn" onClick={()=>setLeaderboardOpen(true)}>TOUT VOIR ↗</button></div>
                <div className="lobby-records">
                  {leaderboardEntries.filter(e=>e.mode==='story').slice(0,3).map((entry,i)=><div className="lobby-record" key={entry.id}><span className="record-rank">0{i+1}</span><span className="record-player">{getCountryFlag(entry.country)} {entry.playerName.replace('OFFICIEL','DÉMO')}<small>{entry.id.startsWith('seed_')?'DÉFI DÉMO':`JOUEUR · COMBO ×${entry.maxCombo}`}</small></span><strong>{entry.score.toLocaleString('fr-FR')}<small> €</small></strong></div>)}
                </div>
                <p className="lobby-challenge">La prochaine ligne, c’est la tienne. <span>À toi de jouer.</span></p>
              </div>
              <div className="lobby-play"><button type="button" data-start="true" disabled={!art.ready} className="lobby-start" onClick={startStandardGame}><span>{art.ready?'JOUER':`CHARGEMENT ${Math.round(art.loaded/art.total*100)} %`}</span><b>→</b></button><p>{showTouchControls?'TACTILE · DOUBLE SAUT · SANS TÉLÉCHARGEMENT':'← → AVANCER · ESPACE SAUTER ×2 · ↓ SLAM'}</p></div>
              <nav className="lobby-extras"><button data-testid="title-boss-btn" disabled={!art.ready} onClick={startBossArena}>DÉFI DON MARCO</button><button onClick={()=>setTitleExtras(v=>!v)} aria-expanded={titleExtras}>EXTRAS {titleExtras?'−':'+'}</button>{titleExtras&&<div className="lobby-extra-menu"><button data-testid="title-costume-btn" onClick={handleCycleCostume}>CHANGER DE TENUE</button><button data-testid="title-editor-btn" onClick={openLevelEditor}>ATELIER DE NIVEAUX</button></div>}</nav>
            </section>
          </div>
          <footer className="lobby-footer"><span>LA GUERRE DES BOUTEILLES</span><span>Scores en euros fictifs · Fan game non officiel</span></footer>
        </div>
      )}
      {!art.ready && art.errors.length>0 && <div className="art-error" role="alert"><strong>La Riviera n’a pas fini de charger.</strong><p>Vérifie ta connexion, puis réessaie.</p><button onClick={()=>location.reload()}>RECHARGER</button></div>}

      {gameState === 'playing' && isPortraitPhone && !portraitDismissed && <div className="portrait-prompt" role="note">
        <span className="rotate-icon">↻</span><strong>LA RIVIERA EN GRAND.</strong><p>Tourne ton téléphone pour profiter de toute la côte.</p>
        <button onClick={()=>void toggleFullscreen()}>PLEIN ÉCRAN ↗</button><button className="portrait-skip" onClick={()=>setPortraitDismissed(true)}>Continuer en portrait</button>
      </div>}

      {/* ====================================================================
          4. PAUSE & SETTINGS MODAL
          ==================================================================== */}
      {gameState === 'paused' && (
        <div role="dialog" aria-modal="true" aria-labelledby="pause-modal-title" className="leaderboard-overlay pause-overlay">
          <div className="pause-card">
            <header><h2 id="pause-modal-title">PAUSE VIP</h2><button aria-label="ON Y RETOURNE" onClick={resumeGame}>ON Y RETOURNE →</button></header>
            <div className="pause-stats"><span><b>{hud.score.toLocaleString('fr-FR')} €</b> LA CAISSE</span><span><b>{hud.chains}</b> LIASSES</span><span><b>{hud.marcosStomped}</b> MARCOS</span></div>
            <div className="pause-utilities"><button onClick={toggleMute}>{muted?'ACTIVER LE SON':'COUPER LE SON'}</button><button onClick={()=>void toggleFullscreen()}>PLEIN ÉCRAN ↗</button><button onClick={()=>setLeaderboardOpen(true)}>LES SCORES</button><button onClick={startBossArena}>DÉFI DON MARCO</button></div>
            <div className="pause-settings">
              <div><label htmlFor="sfx-volume-slider">Effets sonores ({sfxVol}%)</label><input id="sfx-volume-slider" type="range" min={0} max={100} value={sfxVol} onChange={e=>setSfxVol(Number(e.target.value))}/></div>
              <div><span>Musique Riviera</span><button onClick={()=>setMusicEnabled(v=>!v)}>{musicEnabled?'OUI':'NON'}</button></div>
              <div><span>Narrateur français</span><button onClick={()=>setVoiceEnabled(v=>!v)}>{voiceEnabled?'ACTIVÉ':'DÉSACTIVÉ'}</button></div>
              <div><span>Tenue [C]</span><button onClick={handleCycleCostume}>{activeCostumeMeta.shortLabel}</button></div>
              <div><span>Lumière de la côte</span><button onClick={cycleWeather}>{WEATHER_LABELS[weatherMode]}</button></div>
              <div><span>Commandes tactiles</span><button onClick={()=>setShowTouchControls(v=>!v)}>{showTouchControls?'VISIBLES':'MASQUÉES'}</button></div>
            </div>
            <footer><button onClick={()=>{if(playingCustomLevel)startCustomLevelPlay();else if(spawnAtBoss)startBossArena();else startStandardGame();}}>RECOMMENCER LE PARCOURS</button><button onClick={openLevelEditor}>Atelier de niveaux</button><button onClick={()=>setGameState('title')}>Retour à l’accueil</button></footer>
          </div>
        </div>
      )}

      {/* ====================================================================
          5. VICTORY / GAME OVER MODAL
          ==================================================================== */}
      {gameState === 'gameover' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-modal-title"
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#24130b] border-3 border-[#facc15] shadow-[0_8px_0_#120b07] p-6 text-center text-[#fae3cb]">
            <h2
              id="gameover-modal-title"
              className={`font-pixel text-xl sm:text-2xl stroke-text-sm ${
                finalStats.victory ? 'text-[#4ade80]' : 'text-[#f87171]'
              }`}
            >
              {finalStats.victory ? 'CIAO MARCO !' : 'ON REMET ÇA ?'}
            </h2>
            <p className="text-xs text-[#ebbf94] mt-2">
              {finalStats.victory
                ? 'La bouteille est sauvée. Don Marco est au tapis. Départ en Lambo dorée !'
                : `Tu as parcouru ${finalStats.progressPct} % de la côte. ${hud.checkpoint ? "Ton point VIP t’attend avant Don Marco." : "La bouteille t’attend toujours."}`}
            </p>

            <div className="grid grid-cols-3 gap-2.5 my-4 p-3 rounded-xl bg-[#180c06] border border-[#5c3822]">
              <div>
                <div className="text-[10px] font-bold uppercase text-[#ebbf94]">
                  CAISSE / RECORD
                </div>
                <div className="font-mono-tabular text-base sm:text-lg font-extrabold text-[#fef08a] mt-0.5">
                  {finalStats.score} € / {finalStats.highScore} €
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-[#ebbf94]">
                  MARCOS ÉCRASÉS
                </div>
                <div className="font-mono-tabular text-base sm:text-lg font-extrabold text-[#38bdf8] mt-0.5">
                  {finalStats.marcosStomped} / {finalStats.totalMarcos}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-[#ebbf94]">
                  LIASSES · COMBO
                </div>
                <div className="font-mono-tabular text-base sm:text-lg font-extrabold text-white mt-0.5">
                  {finalStats.chains} · x{Math.max(1, finalStats.maxCombo)}
                </div>
              </div>
            </div>

            {/* Online Worldwide Leaderboard Score Submission Card */}
            <details
              data-testid="gameover-submit-score-card"
              className="mb-4 p-3 rounded-xl bg-[#120b07] border-2 border-[#38bdf8] text-left"
            >
              <summary className="font-bold text-xs cursor-pointer mb-2">ENREGISTRER MON SCORE</summary>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-pixel text-[10px] text-[#38bdf8]">
                  🌍 CLASSEMENT RIVIERA
                </span>
                <span
                  data-testid="projected-world-rank"
                  className="px-2 py-0.5 rounded bg-[#1e3a8a] text-[#fef08a] font-mono-tabular text-xs font-extrabold border border-[#93c5fd]"
                >
                  RANG ESTIMÉ #{computeProjectedWorldwideRank(finalStats.score, leaderboardEntries)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  data-testid="player-name-input"
                  aria-label="Your Worldwide Player Pseudo"
                  maxLength={16}
                  placeholder="MC PAO 92"
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg bg-[#24130b] border border-[#e5b586] text-xs font-extrabold text-white uppercase"
                />
                <select
                  data-testid="player-country-select"
                  aria-label="Country Flag"
                  value={playerCountryInput}
                  onChange={(e) =>
                    setPlayerCountryInput(e.target.value as LeaderboardCountryCode)
                  }
                  className="px-2 py-1.5 rounded-lg bg-[#24130b] border border-[#e5b586] text-xs font-bold text-[#fef08a] cursor-pointer"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  data-testid="submit-score-btn"
                  disabled={submittingScore}
                  onClick={() => handlePublishWorldwideScore(finalStats.score)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#386641] hover:bg-[#467d50] text-white font-pixel text-[10px] border border-[#a7f3d0] shadow-[0_2px_0_#120b07] cursor-pointer"
                >
                  {submittingScore ? 'ENVOI…' : 'PUBLIER'}
                </button>
              </div>

              {scoreSubmittedBanner && (
                <div
                  data-testid="score-submitted-banner"
                  className="mt-2 text-[11px] font-extrabold text-[#4ade80]"
                >
                  {scoreSubmittedBanner}
                </div>
              )}
            </details>

            <button className="share-result" onClick={()=>void shareResult()}>PARTAGER MON SCORE ↗</button>
            {shareStatus && <p className="share-status" role="status">{shareStatus}</p>}
            <p className="result-credit">Un fan game pour MC Pao · Édition Riviera</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                data-start="true"
                onClick={retryRun}
                className="w-full py-3.5 rounded-xl bg-[#d92323] hover:bg-[#ef4444] text-white font-pixel text-sm border-2 border-[#fef08a] shadow-[0_4px_0_#120b07] cursor-pointer"
              >
                {finalStats.victory ? 'ENCORE UN TOUR' : hud.checkpoint ? 'REPRENDRE AU POINT VIP' : 'RÉESSAYER'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLeaderboardOpen(true)}
                  className="py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-[#fef08a] font-bold text-xs border border-[#93c5fd] cursor-pointer"
                >
                  🏆 Les scores
                </button>
                <button
                  type="button"
                  onClick={openLevelEditor}
                  className="py-2.5 rounded-xl bg-[#180c06] hover:bg-[#2e170c] text-[#38bdf8] font-bold text-xs border border-[#38bdf8] cursor-pointer"
                >
                  ✎ Atelier de niveaux
                </button>
              </div>
              <button
                type="button"
                onClick={() => setGameState('title')}
                className="w-full py-2 rounded-xl bg-[#180c06] hover:bg-[#2e170c] text-[#ebbf94] font-bold text-xs border border-[#5c3822] cursor-pointer"
              >
                Retour à l’accueil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          6. WORLDWIDE RIVIERA LEADERBOARD MODAL
          ==================================================================== */}
      {leaderboardOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="world-leaderboard-title" data-testid="leaderboard-modal" className="leaderboard-overlay" onKeyDown={e=>{
          if(e.key==='Escape'){e.stopPropagation();setLeaderboardOpen(false);}
          if(e.key==='Tab'){
            const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
            const first=buttons[0],last=buttons[buttons.length-1];
            if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
            else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
          }
        }}>
          <div className="leaderboard-card">
            <header><div><p>LES RECORDS À BATTRE</p><h2 id="world-leaderboard-title">CLASSEMENT<br/>RIVIERA</h2></div><button data-testid="leaderboard-close-btn" aria-label="Fermer le classement" onClick={()=>setLeaderboardOpen(false)}>×</button></header>
            <nav aria-label="Mode de jeu">{([{id:'all',label:'TOUS'},{id:'story',label:'LA RIVIERA'},{id:'boss',label:'DON MARCO'},{id:'custom',label:'ATELIER'}] as const).map(tab=><button key={tab.id} data-testid={`leaderboard-tab-${tab.id}`} aria-pressed={leaderboardTab===tab.id} onClick={()=>setLeaderboardTab(tab.id)}>{tab.label}</button>)}</nav>
            {scoreSubmittedBanner&&<p className="leaderboard-banner" data-testid="leaderboard-submitted-alert" role="status">{scoreSubmittedBanner}</p>}
            <div className="leaderboard-list">
              {visibleLeaderboardEntries.map((entry,i)=><div className={`lobby-record ${entry.id===lastSubmittedId?'record-highlight':''}`} key={entry.id} data-testid={`leaderboard-row-${i+1}`}><span className="record-rank">{String(i+1).padStart(2,'0')}</span><span className="record-player">{getCountryFlag(entry.country)} {entry.playerName}<small>{entry.id.startsWith('seed_')?'DÉFI DÉMO':`${entry.mode==='boss'?'BOSS':entry.mode==='custom'?'ATELIER':'RIVIERA'} · ${entry.marcosStomped} MARCOS · COMBO ×${entry.maxCombo}`}</small></span><strong>{entry.score.toLocaleString('fr-FR')}<small> €</small></strong></div>)}
              {visibleLeaderboardEntries.length===0&&<p className="leaderboard-empty">Le premier record de ce mode t’attend.</p>}
            </div>
            <footer><p>Euros fictifs · Fan game non officiel<br/>Publie ton record après une partie.</p><button onClick={()=>setLeaderboardOpen(false)}>FERMER →</button></footer>
          </div>
        </div>
      )}
    </main>
  );
};
