import {
  computeProjectedWorldwideRank,
  generateVerifiedScoreCode,
  sanitizePlayerName,
  sortAndRankLeaderboard,
  validateAndNormalizeScoreSubmission,
  type LeaderboardCountryCode,
  type LeaderboardEntry,
  type LeaderboardMode,
  type LeaderboardSubmissionInput,
} from './rules';

async function fetchScores(url:string,options:RequestInit={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
  try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}
}

export const LEADERBOARD_STORAGE_KEY = 'mcpao_world_leaderboard_v1';
export const PLAYER_PROFILE_STORAGE_KEY = 'mcpao_player_profile_v1';

export interface PlayerProfile {
  playerName: string;
  country: LeaderboardCountryCode;
}

export const COUNTRY_OPTIONS: Array<{
  code: LeaderboardCountryCode;
  flag: string;
  label: string;
}> = [
  { code: 'FR', flag: '🇫🇷', label: 'France (FR)' },
  { code: 'MC', flag: '🇲🇨', label: 'Monaco (MC)' },
  { code: 'IT', flag: '🇮🇹', label: 'Italia (IT)' },
  { code: 'CH', flag: '🇨🇭', label: 'Suisse (CH)' },
  { code: 'BE', flag: '🇧🇪', label: 'Belgique (BE)' },
  { code: 'ES', flag: '🇪🇸', label: 'España (ES)' },
  { code: 'MA', flag: '🇲🇦', label: 'Maroc (MA)' },
  { code: 'DZ', flag: '🇩🇿', label: 'Algérie (DZ)' },
  { code: 'TN', flag: '🇹🇳', label: 'Tunisie (TN)' },
  { code: 'GB', flag: '🇬🇧', label: 'UK (GB)' },
  { code: 'US', flag: '🇺🇸', label: 'USA (US)' },
  { code: 'INT', flag: '🌍', label: 'World (INT)' },
];

export function getCountryFlag(code: LeaderboardCountryCode | string): string {
  const found = COUNTRY_OPTIONS.find((c) => c.code === code);
  return found ? found.flag : '🌍';
}

// Clear benchmark targets, never presented as real players or official records.
export const DEFAULT_WORLD_LEADERBOARD: LeaderboardEntry[] = [
  ['seed_1','RIVIERA TURBO','FR',36000,20,13,8],
  ['seed_2','MONACO VIP','MC',24000,16,10,5],
  ['seed_3','LA BOUTEILLE','FR',8000,8,4,2],
].map(([id,playerName,country,score,chains,marcosStomped,maxCombo])=>({
  id,playerName,country,score,chains,marcosStomped,maxCombo,mode:'story',victory:false,
  verifiedCode:generateVerifiedScoreCode(String(playerName),Number(score),Number(marcosStomped),Number(maxCombo)),createdAt:'2026-10-26T00:00:00.000Z',
})) as LeaderboardEntry[];

export function mergeLeaderboard(entries:ReadonlyArray<LeaderboardEntry>,limit=50){
  return sortAndRankLeaderboard([...DEFAULT_WORLD_LEADERBOARD,...entries.filter(e=>e&&typeof e.id==='string'&&!e.id.startsWith('seed_'))],limit);
}

export function loadSavedPlayerProfile(): PlayerProfile {
  if (typeof window === 'undefined') {
    return { playerName: 'MC PAO 92', country: 'FR' };
  }
  try {
    const raw = localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
      return {
        playerName: sanitizePlayerName(parsed.playerName || 'MC PAO 92'),
        country: (parsed.country as LeaderboardCountryCode) || 'FR',
      };
    }
  } catch {
    // ignore
  }
  return { playerName: 'MC PAO 92', country: 'FR' };
}

export function savePlayerProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      PLAYER_PROFILE_STORAGE_KEY,
      JSON.stringify({
        playerName: sanitizePlayerName(profile.playerName),
        country: profile.country,
      })
    );
  } catch {
    // ignore
  }
}

export function loadLocalLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') {
    return DEFAULT_WORLD_LEADERBOARD;
  }
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LeaderboardEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeLeaderboard(parsed);
      }
    }
  } catch {
    // ignore
  }
  return mergeLeaderboard([]);
}

export function saveLocalLeaderboard(entries: ReadonlyArray<LeaderboardEntry>): LeaderboardEntry[] {
  const merged = mergeLeaderboard(entries);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  }
  return merged;
}

/**
 * Fetches the live Worldwide Leaderboard from `/api/leaderboard` and merges
 * with local entries so rankings work both online across all players and offline.
 */
export async function fetchWorldwideLeaderboard(
  modeFilter: 'all' | LeaderboardMode = 'all'
): Promise<LeaderboardEntry[]> {
  const local = loadLocalLeaderboard();
  try {
    const res = await fetchScores('/api/leaderboard', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = (await res.json()) as { entries?: LeaderboardEntry[] };
      if (data && Array.isArray(data.entries)) {
        const merged = saveLocalLeaderboard([...local, ...data.entries]);
        return modeFilter === 'all'
          ? merged
          : merged.filter((e) => e.mode === modeFilter);
      }
    }
  } catch {
    // Fallback to local merged leaderboard if offline
  }
  return modeFilter === 'all'
    ? local
    : local.filter((e) => e.mode === modeFilter);
}

/**
 * Submits a player's Euro score to the Worldwide Leaderboard (`/api/leaderboard` + localStorage).
 */
export async function submitWorldwideScore(
  input: LeaderboardSubmissionInput
): Promise<{
  entry: LeaderboardEntry;
  rank: number;
  entries: LeaderboardEntry[];
  syncedOnline: boolean;
} | null> {
  const validated = validateAndNormalizeScoreSubmission(input);
  if (!validated) return null;

  savePlayerProfile({
    playerName: validated.playerName,
    country: validated.country,
  });

  // Immediately persist locally so UI updates with zero latency
  let merged = saveLocalLeaderboard([...loadLocalLeaderboard(), validated]);
  let syncedOnline = false;

  try {
    const res = await fetchScores('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        entry?: LeaderboardEntry;
        entries?: LeaderboardEntry[];
      };
      if (data && Array.isArray(data.entries)) {
        merged = saveLocalLeaderboard([...merged, ...data.entries]);
        syncedOnline = true;
      }
    }
  } catch {
    // Offline fallback already saved in localStorage
  }

  const best=merged.find(e=>e.playerName===validated.playerName&&e.mode===validated.mode)||validated;
  const rank = computeProjectedWorldwideRank(best.score, merged);
  return {
    entry: best,
    rank,
    entries: merged,
    syncedOnline,
  };
}
