/**
 * Plan Builder — the System asks a few questions and proposes a *light*, personal
 * starter plan. Principle: start smaller than you think; the Quest Director raises
 * difficulty as you succeed.
 */
import type { AreaId } from './areas';
import { CAMPAIGN_MAP } from './campaigns';
import { DIFFICULTY_META, EXERCISE_MAP } from './constants';
import { RECOVERY_MAP } from './recovery';
import type { Difficulty, Habit, RecoveryCategory, StatKey } from './types';
import { dailyTarget } from './engine';

export type GoalId = 'fit' | 'sleep' | 'calm' | 'learn' | 'career' | 'money' | 'people' | 'purpose' | 'home' | 'screen';
export type Fitness = 'sitting' | 'some' | 'regular' | 'athlete';
export type BestTime = 'morning' | 'afternoon' | 'evening';
export type Style = 'gentle' | 'balanced' | 'hardcore';

export interface Goal {
  id: GoalId;
  label: string;
  sub: string;
  icon: string;
  color: string;
  area: AreaId;
  habit?: { name: string; icon: string; stat: StatKey };
}

export const GOALS: Goal[] = [
  { id: 'fit', label: 'Get fitter', sub: 'Strength, stamina, energy', icon: 'dumbbell', color: '#FF6B6B', area: 'fitness' },
  { id: 'sleep', label: 'Sleep better', sub: 'More energy every day', icon: 'sleep', color: '#7CFF6B', area: 'health', habit: { name: 'In bed before midnight', icon: 'sleep', stat: 'VIT' } },
  { id: 'calm', label: 'Feel calmer & happier', sub: 'Less stress, better mood', icon: 'meditation', color: '#FFD166', area: 'mind', habit: { name: 'Write 3 good things', icon: 'notebook', stat: 'SEN' } },
  { id: 'learn', label: 'Study & learn better', sub: 'Focus, grades, skills', icon: 'school', color: '#B58CFF', area: 'learning', habit: { name: 'Read 10 pages', icon: 'book-open-page-variant', stat: 'INT' } },
  { id: 'career', label: 'Grow my career', sub: 'Projects, CV, network', icon: 'briefcase', color: '#4FA8FF', area: 'career', habit: { name: 'Write tomorrow’s top task', icon: 'pencil', stat: 'INT' } },
  { id: 'money', label: 'Control my money', sub: 'Spend less, save more', icon: 'cash-multiple', color: '#45F0A0', area: 'money', habit: { name: 'Track today’s spending', icon: 'currency-usd', stat: 'WIL' } },
  { id: 'people', label: 'Better relationships', sub: 'Family, friends, partner', icon: 'account-heart', color: '#FF7EB6', area: 'relationships', habit: { name: 'Message someone I care about', icon: 'message-text', stat: 'CHA' } },
  { id: 'purpose', label: 'Find my direction', sub: 'Values, meaning, goals', icon: 'compass', color: '#FFB86B', area: 'purpose', habit: { name: 'Morning intention', icon: 'weather-sunset-up', stat: 'SEN' } },
  { id: 'home', label: 'Organised life', sub: 'Tidy home, life admin', icon: 'home-heart', color: '#4FE3C1', area: 'home', habit: { name: '10-minute tidy', icon: 'broom', stat: 'WIL' } },
  { id: 'screen', label: 'Less phone time', sub: 'Scroll less, live more', icon: 'cellphone-check', color: '#7C8CFF', area: 'digital', habit: { name: 'Phone sleeps outside the bedroom', icon: 'cellphone-off', stat: 'WIL' } },
];
export const GOAL_MAP: Record<GoalId, Goal> = Object.fromEntries(GOALS.map((g) => [g.id, g])) as Record<GoalId, Goal>;

export const MINUTE_OPTIONS = [
  { value: 10, label: '10 min', sub: 'Busy days — tiny steps' },
  { value: 20, label: '20 min', sub: 'A little every day' },
  { value: 40, label: '40 min', sub: 'Steady progress' },
  { value: 60, label: '60+ min', sub: 'I’m ready to go hard' },
] as const;

export const FITNESS_OPTIONS: { value: Fitness; label: string; sub: string }[] = [
  { value: 'sitting', label: 'Mostly sitting', sub: 'Little exercise right now' },
  { value: 'some', label: 'Somewhat active', sub: 'Walk or work out sometimes' },
  { value: 'regular', label: 'Train regularly', sub: '2–4 workouts a week' },
  { value: 'athlete', label: 'Very fit', sub: 'Training is part of my life' },
];

export const TIME_OPTIONS: { value: BestTime; label: string; sub: string; hour: number; icon: string }[] = [
  { value: 'morning', label: 'Morning', sub: 'Reminder at 07:00', hour: 7, icon: 'weather-sunset-up' },
  { value: 'afternoon', label: 'Afternoon', sub: 'Reminder at 12:00', hour: 12, icon: 'white-balance-sunny' },
  { value: 'evening', label: 'Evening', sub: 'Reminder at 18:00', hour: 18, icon: 'weather-night' },
];

export const STYLE_OPTIONS: { value: Style; label: string; sub: string; icon: string }[] = [
  { value: 'gentle', label: 'Gentle', sub: 'No penalties. Misses just reset streaks.', icon: 'feather' },
  { value: 'balanced', label: 'Balanced', sub: 'Small penalties keep me honest.', icon: 'scale-balance' },
  { value: 'hardcore', label: 'Hardcore', sub: 'Penalty Zone, harder targets, more quests.', icon: 'skull' },
];

export interface PlanAnswers {
  goals: GoalId[];
  minutes: number;
  fitness: Fitness;
  bestTime: BestTime;
  style: Style;
  program: boolean;
  quit: RecoveryCategory[];
}

export interface PlanProposal {
  difficulty: Difficulty;
  dailyExercises: string[];
  penalties: boolean;
  strictDungeon: boolean;
  focusAreas: AreaId[];
  questLoad: number;
  dailyMinutes: number;
  reminderHour: number;
  warningHour: number;
  campaign?: string;
  habit?: Pick<Habit, 'name' | 'icon' | 'stat' | 'kind'>;
  recovery: RecoveryCategory[];
}

const DIFF_ORDER: Difficulty[] = ['starter', 'easy', 'normal', 'hard'];

export function defaultAnswers(): PlanAnswers {
  return { goals: [], minutes: 20, fitness: 'some', bestTime: 'morning', style: 'balanced', program: false, quit: [] };
}

export function buildPlan(a: PlanAnswers): PlanProposal {
  const base: Record<Fitness, { d: Difficulty; ex: string[] }> = {
    sitting: { d: 'starter', ex: ['squats', 'walk'] },
    some: { d: 'easy', ex: ['pushups', 'squats', 'walk'] },
    regular: { d: 'normal', ex: ['pushups', 'situps', 'squats', 'run'] },
    athlete: { d: 'hard', ex: ['pushups', 'situps', 'squats', 'run'] },
  };
  let difficulty = base[a.fitness].d;
  let ex = [...base[a.fitness].ex];
  // fewer daily tasks when time is short
  const maxTasks = a.minutes <= 10 ? 2 : a.minutes <= 20 ? 3 : 4;
  ex = ex.slice(0, maxTasks);
  if (a.style === 'hardcore') difficulty = DIFF_ORDER[Math.min(3, DIFF_ORDER.indexOf(difficulty) + 1)];
  if (a.style === 'gentle' && difficulty !== 'starter') difficulty = DIFF_ORDER[Math.max(0, DIFF_ORDER.indexOf(difficulty) - 1)];

  const load = a.minutes <= 10 ? 1 : a.minutes <= 20 ? 2 : a.minutes <= 40 ? 3 : 4;
  const minutes = a.minutes <= 10 ? 15 : a.minutes <= 20 ? 25 : a.minutes <= 40 ? 45 : 75;
  const goals = a.goals.slice(0, 3);
  const focusAreas = goals.length ? [...new Set(goals.map((g) => GOAL_MAP[g].area))] : (['fitness', 'mind', 'learning'] as AreaId[]);

  const first = goals[0];
  let campaign: string | undefined;
  if (a.program && first) {
    const map: Record<GoalId, string> = {
      fit: a.fitness === 'regular' || a.fitness === 'athlete' ? 'strength' : 'c25k',
      sleep: 'sleep',
      calm: 'mind',
      learn: 'books',
      career: 'career',
      money: 'efund',
      people: 'reconnect',
      purpose: 'purpose',
      home: 'home',
      screen: 'detox',
    };
    campaign = map[first];
  }
  const habitGoal = goals.map((g) => GOAL_MAP[g]).find((g) => g.habit);
  const habit = habitGoal?.habit ? { ...habitGoal.habit, kind: 'build' as const } : undefined;

  return {
    difficulty,
    dailyExercises: ex,
    penalties: a.style !== 'gentle',
    strictDungeon: a.style === 'hardcore',
    focusAreas,
    questLoad: Math.min(6, load + (a.style === 'hardcore' ? 1 : 0)),
    dailyMinutes: minutes,
    reminderHour: TIME_OPTIONS.find((t) => t.value === a.bestTime)?.hour ?? 7,
    warningHour: a.bestTime === 'evening' ? 22 : 21,
    campaign,
    habit,
    recovery: a.quit,
  };
}

/** Human-readable lines for the plan summary */
export function describeDaily(p: PlanProposal, level = 1) {
  return p.dailyExercises
    .map((id) => {
      const e = EXERCISE_MAP[id];
      const t = dailyTarget(id, p.difficulty, level);
      return `${t}${e.unit === 'reps' ? '' : ' ' + e.unit} ${e.name.toLowerCase()}`;
    })
    .join(' · ');
}

export function planLabels(p: PlanProposal) {
  return {
    difficulty: DIFFICULTY_META[p.difficulty].label,
    campaign: p.campaign ? CAMPAIGN_MAP[p.campaign] : undefined,
    recovery: p.recovery.map((r) => RECOVERY_MAP[r].name),
  };
}
