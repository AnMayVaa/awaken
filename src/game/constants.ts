import type { Difficulty, ItemId, Rank, StatKey } from './types';

export const HABIT_DAYS = 66;
export const STAT_KEYS: StatKey[] = ['STR', 'AGI', 'VIT', 'INT', 'SEN', 'CHA', 'WIL'];
export const RANKS: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export const STAT_META: Record<StatKey, { name: string; icon: string; desc: string; color: string }> = {
  STR: { name: 'Strength', icon: 'arm-flex', desc: '+0.5% workout XP per point', color: '#FF6B6B' },
  AGI: { name: 'Agility', icon: 'run-fast', desc: '+0.5% cardio XP per point', color: '#4FE3C1' },
  VIT: { name: 'Vitality', icon: 'heart-pulse', desc: '+5 max HP per point', color: '#7CFF6B' },
  INT: { name: 'Intelligence', icon: 'brain', desc: '+0.5% dungeon XP per point', color: '#B58CFF' },
  SEN: { name: 'Sense', icon: 'eye', desc: '+0.5% gold from all sources per point', color: '#FFD166' },
  CHA: { name: 'Charisma', icon: 'account-heart', desc: '+0.5% XP from social quests per point', color: '#FF7EB6' },
  WIL: { name: 'Willpower', icon: 'shield-star', desc: '+0.5% XP from discipline quests per point', color: '#FF9F43' },
};

/** Level thresholds for hunter rank */
export const RANK_LEVELS: { rank: Rank; min: number; title: string }[] = [
  { rank: 'E', min: 1, title: 'E-Rank Hunter' },
  { rank: 'D', min: 10, title: 'D-Rank Hunter' },
  { rank: 'C', min: 20, title: 'C-Rank Hunter' },
  { rank: 'B', min: 35, title: 'B-Rank Hunter' },
  { rank: 'A', min: 50, title: 'A-Rank Hunter' },
  { rank: 'S', min: 70, title: 'S-Rank Hunter' },
];

export const RANK_COLORS: Record<Rank, string> = {
  E: '#9AA7B8',
  D: '#5DD39E',
  C: '#4FA8FF',
  B: '#B58CFF',
  A: '#FF8A3D',
  S: '#FF3D6E',
};

/** Rewards for custom quests by difficulty */
export const QUEST_REWARDS: Record<Rank, { xp: number; gold: number; label: string }> = {
  E: { xp: 10, gold: 5, label: 'Trivial' },
  D: { xp: 20, gold: 10, label: 'Easy' },
  C: { xp: 35, gold: 18, label: 'Moderate' },
  B: { xp: 55, gold: 28, label: 'Hard' },
  A: { xp: 85, gold: 45, label: 'Very hard' },
  S: { xp: 130, gold: 70, label: 'Legendary' },
};

export type ExerciseCategory = 'strength' | 'cardio' | 'core' | 'mind';

export interface Exercise {
  id: string;
  name: string;
  unit: string;
  unitShort: string;
  stat: StatKey;
  xpPer: number;
  icon: string;
  category: ExerciseCategory;
  steps: number[];
  /** daily quest base targets per difficulty (only for daily-eligible) */
  daily?: Record<Difficulty, number>;
}

export const EXERCISES: Exercise[] = [
  { id: 'pushups', name: 'Push-ups', unit: 'reps', unitShort: '', stat: 'STR', xpPer: 0.6, icon: 'arm-flex', category: 'strength', steps: [5, 10, 20], daily: { easy: 20, normal: 40, hard: 100 } },
  { id: 'situps', name: 'Sit-ups', unit: 'reps', unitShort: '', stat: 'VIT', xpPer: 0.5, icon: 'human-handsup', category: 'core', steps: [5, 10, 20], daily: { easy: 20, normal: 40, hard: 100 } },
  { id: 'squats', name: 'Squats', unit: 'reps', unitShort: '', stat: 'STR', xpPer: 0.5, icon: 'weight-lifter', category: 'strength', steps: [5, 10, 20], daily: { easy: 20, normal: 40, hard: 100 } },
  { id: 'run', name: 'Running', unit: 'km', unitShort: 'km', stat: 'AGI', xpPer: 25, icon: 'run-fast', category: 'cardio', steps: [0.5, 1, 2], daily: { easy: 1, normal: 2, hard: 10 } },
  { id: 'pullups', name: 'Pull-ups', unit: 'reps', unitShort: '', stat: 'STR', xpPer: 2, icon: 'weight-lifter', category: 'strength', steps: [1, 3, 5], daily: { easy: 5, normal: 10, hard: 30 } },
  { id: 'plank', name: 'Plank', unit: 'sec', unitShort: 's', stat: 'VIT', xpPer: 0.3, icon: 'human-male', category: 'core', steps: [15, 30, 60], daily: { easy: 60, normal: 120, hard: 300 } },
  { id: 'burpees', name: 'Burpees', unit: 'reps', unitShort: '', stat: 'AGI', xpPer: 1.2, icon: 'karate', category: 'cardio', steps: [5, 10, 20], daily: { easy: 10, normal: 25, hard: 60 } },
  { id: 'jumprope', name: 'Jump rope', unit: 'min', unitShort: 'm', stat: 'AGI', xpPer: 6, icon: 'jump-rope', category: 'cardio', steps: [1, 5, 10], daily: { easy: 3, normal: 5, hard: 15 } },
  { id: 'walk', name: 'Walking', unit: 'km', unitShort: 'km', stat: 'AGI', xpPer: 10, icon: 'walk', category: 'cardio', steps: [0.5, 1, 3], daily: { easy: 2, normal: 4, hard: 8 } },
  { id: 'cycling', name: 'Cycling', unit: 'km', unitShort: 'km', stat: 'AGI', xpPer: 8, icon: 'bike', category: 'cardio', steps: [1, 5, 10], daily: { easy: 5, normal: 10, hard: 25 } },
  { id: 'swim', name: 'Swimming', unit: 'min', unitShort: 'm', stat: 'VIT', xpPer: 6, icon: 'swim', category: 'cardio', steps: [5, 10, 20] },
  { id: 'stretch', name: 'Stretching', unit: 'min', unitShort: 'm', stat: 'SEN', xpPer: 4, icon: 'yoga', category: 'mind', steps: [5, 10, 15], daily: { easy: 5, normal: 10, hard: 20 } },
  { id: 'meditate', name: 'Meditation', unit: 'min', unitShort: 'm', stat: 'SEN', xpPer: 5, icon: 'meditation', category: 'mind', steps: [5, 10, 20], daily: { easy: 5, normal: 10, hard: 20 } },
  { id: 'read', name: 'Reading', unit: 'min', unitShort: 'm', stat: 'INT', xpPer: 3, icon: 'book-open-page-variant', category: 'mind', steps: [10, 20, 30], daily: { easy: 10, normal: 20, hard: 45 } },
];

export const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
export const DAILY_ELIGIBLE = EXERCISES.filter((e) => e.daily);
export const DEFAULT_DAILY = ['pushups', 'situps', 'squats', 'run'];

export const DIFFICULTY_META: Record<Difficulty, { label: string; desc: string; hpLoss: number }> = {
  easy: { label: 'Casual', desc: 'Gentle targets. Light penalties.', hpLoss: 0.15 },
  normal: { label: 'Hunter', desc: 'Balanced targets for steady growth.', hpLoss: 0.25 },
  hard: { label: 'Nightmare', desc: '100 push-ups. 10 km. Every day.', hpLoss: 0.35 },
};

export const PENALTY_TASKS: Record<Difficulty, { exerciseId: string; target: number }[]> = {
  easy: [
    { exerciseId: 'burpees', target: 10 },
    { exerciseId: 'plank', target: 60 },
  ],
  normal: [
    { exerciseId: 'burpees', target: 25 },
    { exerciseId: 'plank', target: 120 },
    { exerciseId: 'run', target: 1 },
  ],
  hard: [
    { exerciseId: 'burpees', target: 60 },
    { exerciseId: 'plank', target: 300 },
    { exerciseId: 'run', target: 3 },
  ],
};

export interface DungeonTier {
  rank: Rank;
  minutes: number;
  xp: number;
  gold: number;
  name: string;
}

export const DUNGEONS: DungeonTier[] = [
  { rank: 'E', minutes: 15, xp: 30, gold: 20, name: 'Goblin Cellar' },
  { rank: 'D', minutes: 25, xp: 55, gold: 35, name: 'Flooded Archive' },
  { rank: 'C', minutes: 45, xp: 110, gold: 70, name: 'Crystal Mines' },
  { rank: 'B', minutes: 60, xp: 160, gold: 100, name: 'Frost Citadel' },
  { rank: 'A', minutes: 90, xp: 260, gold: 160, name: 'Ember Spire' },
  { rank: 'S', minutes: 120, xp: 380, gold: 240, name: 'Abyssal Gate' },
];
export const DUNGEON_MAP: Record<Rank, DungeonTier> = Object.fromEntries(DUNGEONS.map((d) => [d.rank, d])) as Record<Rank, DungeonTier>;
/** seconds the app may be in background before a strict dungeon collapses */
export const DUNGEON_GRACE_SEC = 15;

export interface BossDef {
  id: string;
  name: string;
  epithet: string;
  icon: string;
  color: string;
}

export const BOSSES: BossDef[] = [
  { id: 'sloth', name: 'Gorvak', epithet: 'Wraith of Sloth', icon: 'ghost', color: '#7C8CFF' },
  { id: 'hydra', name: 'Scrollmaw', epithet: 'Hydra of Endless Feeds', icon: 'snake', color: '#4FE3C1' },
  { id: 'golem', name: 'Mañana', epithet: 'Golem of Procrastination', icon: 'robot-angry', color: '#FF8A3D' },
  { id: 'lich', name: 'Nocturne', epithet: 'Lich of Insomnia', icon: 'skull', color: '#B58CFF' },
  { id: 'fiend', name: 'Glutton', epithet: 'Sugar Fiend', icon: 'candy', color: '#FF6BB5' },
  { id: 'wyrm', name: 'Excusa', epithet: 'Weaver of Excuses', icon: 'spider', color: '#FF3D6E' },
];
export const BOSS_MAP: Record<string, BossDef> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

export interface ItemDef {
  id: ItemId;
  name: string;
  desc: string;
  cost: number;
  icon: string;
  color: string;
}

export const ITEMS: ItemDef[] = [
  { id: 'hp_potion', name: 'HP Potion', desc: 'Restores 50% of max HP.', cost: 120, icon: 'bottle-tonic-plus', color: '#FF6B6B' },
  { id: 'streak_shield', name: 'Streak Shield', desc: 'Automatically protects one habit streak from a missed day.', cost: 450, icon: 'shield-half-full', color: '#4FA8FF' },
  { id: 'penalty_pass', name: 'Penalty Pass', desc: 'Instantly clears an active penalty quest.', cost: 600, icon: 'ticket-confirmation', color: '#FFD166' },
  { id: 'xp_elixir', name: 'XP Elixir', desc: 'Double XP for 60 minutes.', cost: 350, icon: 'flask', color: '#B58CFF' },
  { id: 'reroll_token', name: 'Reroll Token', desc: 'One extra Side Quest reroll today.', cost: 80, icon: 'dice-multiple', color: '#4FE3C1' },
  { id: 'lucky_charm', name: 'Lucky Charm', desc: '24 h of boosted critical hits and loot drops.', cost: 250, icon: 'clover', color: '#45F0A0' },
];
export const ITEM_MAP: Record<ItemId, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<ItemId, ItemDef>;

export const HABIT_ICONS = [
  'water', 'sleep', 'food-apple', 'cellphone-off', 'smoking-off', 'book-open-page-variant', 'meditation', 'dumbbell',
  'run', 'pencil', 'weather-sunset-up', 'shower-head', 'glass-cocktail-off', 'currency-usd', 'code-tags', 'translate',
  'broom', 'notebook', 'leaf', 'music',
];

export const HABIT_PRESETS: { name: string; icon: string; stat: StatKey; kind: 'build' | 'quit' }[] = [
  { name: 'Drink 2L of water', icon: 'water', stat: 'VIT', kind: 'build' },
  { name: 'Sleep before midnight', icon: 'sleep', stat: 'VIT', kind: 'build' },
  { name: 'Wake up at 6:00', icon: 'weather-sunset-up', stat: 'SEN', kind: 'build' },
  { name: 'Read 10 pages', icon: 'book-open-page-variant', stat: 'INT', kind: 'build' },
  { name: 'Cold shower', icon: 'shower-head', stat: 'VIT', kind: 'build' },
  { name: 'No social media scrolling', icon: 'cellphone-off', stat: 'SEN', kind: 'quit' },
  { name: 'No sugar', icon: 'food-apple', stat: 'VIT', kind: 'quit' },
  { name: 'No alcohol', icon: 'glass-cocktail-off', stat: 'VIT', kind: 'quit' },
  { name: 'Code for 1 hour', icon: 'code-tags', stat: 'INT', kind: 'build' },
  { name: 'Journal', icon: 'notebook', stat: 'SEN', kind: 'build' },
];

export const REWARD_ICONS = ['gamepad-variant', 'food', 'coffee', 'movie-open', 'cart', 'sleep', 'beach', 'music', 'pizza', 'ice-cream', 'television-classic', 'gift'];

export const BOT_NAMES = [
  'Kai Ren', 'Mira Vale', 'Darius Kroft', 'Nova Lin', 'Haru Sato', 'Zane Archer', 'Lyra Moon', 'Rook Ironside',
  'Sena Park', 'Tavi Okoro', 'Ines Duval', 'Boran Tek', 'Yuki Mori', 'Pim Chaiyo', 'Arun Dee', 'Mint Sora',
  'Ton Kasem', 'Beam Rattana', 'Elio Faust', 'Rhea Stone', 'Jin Hale', 'Oskar Wren', 'Talia Fen', 'Nok Prasert',
];
export const BOT_AVATARS = ['sword', 'shield-sword', 'bow-arrow', 'axe-battle', 'magic-staff', 'knife-military', 'fencing', 'pickaxe', 'spear', 'pistol'];

export const BOT_ARCHETYPES: Record<'rookie' | 'steady' | 'grinder' | 'elite', { label: string; rate: number; desc: string; miss: number }> = {
  rookie: { label: 'Rookie', rate: 0.35, desc: 'Just awakened. Inconsistent.', miss: 0.3 },
  steady: { label: 'Steady', rate: 0.55, desc: 'Shows up most days.', miss: 0.15 },
  grinder: { label: 'Grinder', rate: 0.8, desc: 'Never skips a daily.', miss: 0.06 },
  elite: { label: 'Elite', rate: 1.05, desc: 'Top-ranked. Hard to catch.', miss: 0.04 },
};
