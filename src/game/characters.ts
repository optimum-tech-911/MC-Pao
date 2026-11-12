import type { PaoCostume } from './rules';

export type CharacterId = 'pao' | 'marco';

export const CHARACTERS = {
  pao: {
    id: 'pao', name: 'MC Pao', shortName: 'MC PAO',
    subtitle: 'Le style Riviera', signature: 'Lunettes, chaîne et attitude VIP.',
    outfit: 'BLACK VIP', rivalName: 'Marco Mouly', rivalPlural: 'MARCOS', bossName: 'DON MARCO',
    title: 'CIAO MARCO !', accent: '#87d6df',
  },
  marco: {
    id: 'marco', name: 'Marco Mouly', shortName: 'MARCO MOULY',
    subtitle: 'Le grand cru', signature: 'Robe de soie, broderies or et grand cru.',
    outfit: 'GRAND CRU', rivalName: 'MC Pao', rivalPlural: 'PAOS', bossName: 'MC PAO VIP',
    title: 'CIAO PAO !', accent: '#edc675',
  },
} as const;

export function characterMeta(character: CharacterId) { return CHARACTERS[character]; }
export function rivalCharacter(character: CharacterId): CharacterId { return character === 'marco' ? 'pao' : 'marco'; }
export function isCharacterId(value: unknown): value is CharacterId { return value === 'pao' || value === 'marco'; }
export const MARCO_OUTFIT: PaoCostume = 'yacht_black_vip';
