import type { AreaId } from './areas';
import type { QuestMetric } from './questLibrary';

export type { AreaId };
export type StatKey = 'STR' | 'AGI' | 'VIT' | 'INT' | 'SEN' | 'CHA' | 'WIL';
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type Difficulty = 'starter' | 'easy' | 'normal' | 'hard';
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

export type ItemId = 'hp_potion' | 'streak_shield' | 'penalty_pass' | 'xp_elixir' | 'reroll_token' | 'lucky_charm';

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
  /** false = Gentle mode: a missed Daily Quest never costs HP */
  penalties: boolean;
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
  sideQuests: number;
  urgesResisted: number;
  mainQuestsDone: number;
  milestonesDone: number;
  checkins: number;
  reviews: number;
  bestRecoveryDays: number;
  crits: number;
  drops: number;
  urgentDone: number;
  weeklyDone: number;
  bestCombo: number;
}

/* ---------------- v2: life areas, adaptive quests, recovery, fulfillment ---------------- */

export interface AreaProgress {
  /** adaptive difficulty 1..5 */
  tier: number;
  done: number;
  skipped: number;
  expired: number;
  /** last 20 outcomes, 1 = done, 0 = skipped/expired */
  recent: number[];
}

export interface BoardQuest {
  id: string;
  templateId?: string;
  source: 'library' | 'ai' | 'director';
  area: AreaId;
  title: string;
  criteria: string;
  why?: string;
  tier: number;
  minutes: number;
  stat: StatKey;
  metric?: QuestMetric;
  status: 'open' | 'done' | 'skipped';
  note?: string;
  doneAt?: number;
  auto?: boolean;
}

export interface QuestBoard {
  date: string;
  quests: BoardQuest[];
  rerolls: number;
  aiAt?: number;
}

export interface QuestHistoryItem {
  ts: number;
  date: string;
  templateId?: string;
  title: string;
  area: AreaId;
  tier: number;
  status: 'done' | 'skipped' | 'expired';
  source: BoardQuest['source'];
  note?: string;
}

export interface Milestone {
  id: string;
  title: string;
  criteria: string;
  done: boolean;
  doneAt?: number;
}

export interface MainQuest {
  id: string;
  area: AreaId;
  title: string;
  why: string;
  woop?: { wish: string; outcome: string; obstacle: string; plan: string };
  metric?: { unit: string; start: number; current: number; target: number };
  deadline?: string;
  milestones: Milestone[];
  status: 'active' | 'done' | 'abandoned';
  campaignId?: string;
  createdAt: number;
  completedAt?: number;
}

export type RecoveryCategory = 'porn' | 'social' | 'gaming' | 'sugar' | 'smoking' | 'alcohol' | 'gambling' | 'procrastination' | 'custom';

export interface RecoveryEvent {
  ts: number;
  trigger?: string;
  note?: string;
}

export interface RecoveryTrack {
  id: string;
  category: RecoveryCategory;
  name: string;
  why: string;
  plan: string;
  replacements: string[];
  /** start of the current clean run (ms) */
  startedAt: number;
  /** clean ms accumulated in previous runs */
  bankedMs: number;
  bestMs: number;
  relapses: RecoveryEvent[];
  urges: (RecoveryEvent & { outcome: 'resisted' | 'lapsed' })[];
  milestonesHit: number[];
  createdAt: number;
}

export interface DailyCheckin {
  date: string;
  mood?: number; // 1..5
  energy?: number; // 1..5
  sleepHours?: number;
  screenMinutes?: number;
  steps?: number;
  stepsAuto?: boolean;
  gratitude?: string;
  note?: string;
  savedAt?: number;
}

export interface WellbeingEntry {
  date: string;
  answers: number[]; // 5 × 0..5
  score: number; // 0..100
}

export interface WheelEntry {
  date: string;
  ratings: Partial<Record<AreaId, number>>; // 1..10
}

export interface WeeklyReview {
  week: string;
  date: string;
  wins: string;
  lessons: string;
  focus: AreaId[];
  rating: number; // 1..10
}

export interface DayActivity {
  daily?: boolean;
  side?: number;
  habits?: number;
  checkin?: boolean;
  milestones?: number;
  focusMin?: number;
}

export interface LifeProfile {
  focusAreas: AreaId[];
  questLoad: number;
  dailyMinutes: number;
  aiEnabled: boolean;
  aiShareRecovery: boolean;
  /** the player finished the Plan Builder */
  planned?: boolean;
}

export interface UrgentQuest {
  id: string;
  title: string;
  criteria: string;
  area: AreaId;
  expiresAt: number;
  status: 'open' | 'done' | 'expired';
}

export interface FunState {
  crate: { lastClaim: string | null; streak: number };
  combo: { date: string; count: number };
  urgent: { date: string | null; quest: UrgentQuest | null };
  weeklyClaims: { week: string; claimed: string[] };
  companion: { name: string; species: string | null; hatchedAt?: number };
  luckyUntil: number;
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

  // v2
  profile: LifeProfile;
  areas: Record<AreaId, AreaProgress>;
  board: QuestBoard;
  questHistory: QuestHistoryItem[];
  mainQuests: MainQuest[];
  recovery: RecoveryTrack[];
  checkins: Record<string, DailyCheckin>;
  wellbeing: WellbeingEntry[];
  wheel: WheelEntry[];
  reviews: WeeklyReview[];
  activity: Record<string, DayActivity>;
  fun: FunState;
}

export interface GameEvent {
  tone: Tone;
  title: string;
  lines: string[];
  /** minor events show as a toast instead of a full System window */
  minor?: boolean;
}
