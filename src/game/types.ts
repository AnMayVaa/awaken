export type StatKey = 'STR' | 'AGI' | 'VIT' | 'INT' | 'SEN';
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Tone = 'info' | 'reward' | 'levelup' | 'rankup' | 'warning' | 'penalty' | 'boss' | 'achievement';

export interface Player {
  name: string;
  level: number;
  /** XP inside the current level */
  xp: number;
  totalXp: number;
  gold: number;
  hp: number;
  stats: Record<StatKey, number>;
  statXp: Record<StatKey, number>;
  freePoints: number;
  titleId: string | null;
  createdAt: string;
}

export interface QuestTask {
  id: string;
  exerciseId: string;
  label: string;
  unit: string;
  target: number;
  progress: number;
}

export interface DailyQuest {
  date: string;
  tasks: QuestTask[];
  completed: boolean;
}

export interface PenaltyQuest {
  date: string;
  reason: string;
  tasks: QuestTask[];
}

export interface CustomQuest {
  id: string;
  title: string;
  note?: string;
  difficulty: Rank;
  stat: StatKey;
  repeat: 'daily' | 'once';
  /** date (YYYY-MM-DD) it was last completed */
  doneDate?: string;
  completedCount: number;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  stat: StatKey;
  kind: 'build' | 'quit';
  /** start date of the current 66-day run */
  startDate: string;
  /** dates checked in this run */
  checks: string[];
  /** dates protected by a Streak Shield in this run */
  shielded: string[];
  bestStreak: number;
  attempts: number;
  forgedCount: number;
  status: 'active' | 'forged';
  createdAt: string;
}

export interface WorkoutLog {
  id: string;
  ts: number;
  date: string;
  exerciseId: string;
  amount: number;
  xp: number;
}

export interface DungeonRun {
  rank: Rank;
  label: string;
  startedAt: number;
  endsAt: number;
  backgroundedAt: number | null;
}

export interface DungeonRecord {
  ts: number;
  rank: Rank;
  label: string;
  minutes: number;
  result: 'clear' | 'fail';
}

export interface BossState {
  weekId: string;
  bossId: string;
  maxHp: number;
  hp: number;
  defeated: boolean;
}

export interface CustomReward {
  id: string;
  name: string;
  cost: number;
  icon: string;
}

export interface Purchase {
  id: string;
  ts: number;
  name: string;
  cost: number;
}

export type ItemId = 'hp_potion' | 'streak_shield' | 'penalty_pass' | 'xp_elixir';

export interface Bot {
  id: string;
  name: string;
  archetype: 'rookie' | 'steady' | 'grinder' | 'elite';
  seed: number;
  joinedAt: string;
  baseLevel: number;
  avatar: string;
}

export interface SystemLog {
  id: string;
  ts: number;
  text: string;
  tone: Tone;
}

export interface Settings {
  difficulty: Difficulty;
  dailyExercises: string[];
  notifications: boolean;
  reminderHour: number;
  reminderMinute: number;
  warningHour: number;
  strictDungeon: boolean;
  haptics: boolean;
}

export interface Counters {
  questsCompleted: number;
  dailyCompleted: number;
  dailyStreak: number;
  bestDailyStreak: number;
  penaltiesTaken: number;
  penaltiesCleared: number;
  bossesDefeated: number;
  goldEarned: number;
  goldSpent: number;
  dungeonsCleared: number;
  dungeonsFailed: number;
  sRankClears: number;
  focusMinutes: number;
  habitsForged: number;
  bestHabitStreak: number;
  purchases: number;
  totals: Record<string, number>;
}

export interface GameState {
  version: number;
  onboarded: boolean;
  player: Player;
  daily: DailyQuest;
  penalty: PenaltyQuest | null;
  customQuests: CustomQuest[];
  habits: Habit[];
  workouts: WorkoutLog[];
  dungeon: DungeonRun | null;
  dungeonHistory: DungeonRecord[];
  boss: BossState;
  inventory: Record<ItemId, number>;
  rewards: CustomReward[];
  purchases: Purchase[];
  bots: Bot[];
  achievements: Record<string, number>;
  logs: SystemLog[];
  settings: Settings;
  counters: Counters;
  xpBoostUntil: number;
  /** last local date the daily rollover ran for */
  lastDate: string;
  /** ms timestamp of last local change (for sync) */
  updatedAt: number;
  /** supabase user id this save last synced with */
  syncedUserId: string | null;
}

export interface GameEvent {
  tone: Tone;
  title: string;
  lines: string[];
  /** minor events show as a toast instead of a full System window */
  minor?: boolean;
}
