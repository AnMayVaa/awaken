import type { StatKey } from './types';

export type AreaId = 'fitness' | 'health' | 'mind' | 'learning' | 'career' | 'money' | 'relationships' | 'purpose' | 'home' | 'digital';

export interface AreaMeta {
  id: AreaId;
  name: string;
  short: string;
  icon: string;
  color: string;
  stat: StatKey;
  /** question used for the Life Wheel self-rating */
  rate: string;
}

export const AREAS: AreaMeta[] = [
  { id: 'fitness', name: 'Fitness', short: 'FIT', icon: 'dumbbell', color: '#FF6B6B', stat: 'STR', rate: 'How fit and strong do you feel?' },
  { id: 'health', name: 'Health & Sleep', short: 'HLTH', icon: 'heart-pulse', color: '#7CFF6B', stat: 'VIT', rate: 'How well are you sleeping and eating?' },
  { id: 'mind', name: 'Mind & Emotions', short: 'MIND', icon: 'meditation', color: '#FFD166', stat: 'SEN', rate: 'How calm and emotionally balanced are you?' },
  { id: 'learning', name: 'Learning', short: 'LRN', icon: 'school', color: '#B58CFF', stat: 'INT', rate: 'How much are you learning and growing your skills?' },
  { id: 'career', name: 'Career & Study', short: 'CAR', icon: 'briefcase', color: '#4FA8FF', stat: 'INT', rate: 'How satisfied are you with your work or studies?' },
  { id: 'money', name: 'Money', short: 'MNY', icon: 'cash-multiple', color: '#45F0A0', stat: 'WIL', rate: 'How in control of your money do you feel?' },
  { id: 'relationships', name: 'Relationships', short: 'REL', icon: 'account-heart', color: '#FF7EB6', stat: 'CHA', rate: 'How connected are you to family, friends and partner?' },
  { id: 'purpose', name: 'Purpose', short: 'PUR', icon: 'compass', color: '#FFB86B', stat: 'SEN', rate: 'How meaningful and aligned with your values is your life?' },
  { id: 'home', name: 'Home & Life', short: 'HOME', icon: 'home-heart', color: '#4FE3C1', stat: 'WIL', rate: 'How organised and pleasant is your home and life admin?' },
  { id: 'digital', name: 'Digital Balance', short: 'DIG', icon: 'cellphone-check', color: '#7C8CFF', stat: 'WIL', rate: 'How in control are you of your phone, games and screens?' },
];

export const AREA_MAP: Record<AreaId, AreaMeta> = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, AreaMeta>;
export const AREA_IDS = AREAS.map((a) => a.id);
