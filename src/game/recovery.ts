/**
 * Break Free — recovery mode for quitting compulsive habits.
 * Built on relapse-prevention research (Marlatt): high-risk situations, urge surfing,
 * and treating a lapse as information rather than failure (avoids the "abstinence violation effect").
 */
import type { RecoveryCategory, RecoveryTrack } from './types';

export const DAY_MS = 86400000;

export interface RecoveryCategoryMeta {
  id: RecoveryCategory;
  name: string;
  icon: string;
  color: string;
  /** replacement actions suggested when an urge hits */
  replacements: string[];
  /** default if-then plan */
  plan: string;
  /** practical, evidence-informed tips */
  tips: string[];
}

export const RECOVERY_CATEGORIES: RecoveryCategoryMeta[] = [
  {
    id: 'porn',
    name: 'Porn',
    icon: 'eye-off',
    color: '#FF6B9A',
    replacements: ['Leave the room / change location', 'Cold water on your face', '20 push-ups', 'Text or call a friend', 'Go for a 10-minute walk', 'Shower'],
    plan: 'If I feel the urge when I’m alone with my phone at night, then I will put the phone in another room and do 20 push-ups.',
    tips: [
      'Keep devices out of the bedroom at night — late-night + alone is a classic high-risk situation.',
      'Install a content blocker and give the password to someone else.',
      'Urges rise, peak and fade. You don’t have to obey one to make it pass.',
      'In a small trial (28 men), 12 sessions of Acceptance & Commitment Therapy cut viewing by ~92% — learning to accept urges without acting on them was key.',
    ],
  },
  {
    id: 'social',
    name: 'Doom-scrolling',
    icon: 'cellphone-off',
    color: '#7C8CFF',
    replacements: ['Read one page of a book', 'Stand up and stretch', 'Message a real person', 'Step outside for 2 minutes', 'Drink a glass of water'],
    plan: 'If I reach for my phone without a reason, then I will put it face-down and take 3 slow breaths first.',
    tips: [
      'Turn on grayscale — one study cut screen time by ~39 minutes a day.',
      'Limiting social media to ~30 min/day reduced loneliness and depression in 3 weeks (Hunt 2018).',
      'Move social apps off the home screen; friction works.',
      'Batch notifications to ~3 times a day instead of turning them all off.',
    ],
  },
  {
    id: 'gaming',
    name: 'Video games',
    icon: 'controller-off',
    color: '#45F0A0',
    replacements: ['Play a physical sport', 'Call a friend', 'Learn a skill for 15 min', 'Go outside', 'Clear a short Dungeon'],
    plan: 'If I feel like “one more match”, then I will stop, stand up and start a 15-minute Dungeon instead.',
    tips: [
      'Decide your limit before you start and set a timer.',
      'Uninstall the one game that pulls you in the most; keep it out of reach on weeknights.',
      'Gaming disorder (WHO ICD-11) is about losing control and continuing despite harm — notice those signs.',
    ],
  },
  {
    id: 'sugar',
    name: 'Junk food & sugar',
    icon: 'food-off',
    color: '#FFB86B',
    replacements: ['Drink a glass of water', 'Eat fruit or nuts', 'Brush your teeth', 'Walk for 5 minutes'],
    plan: 'If I crave something sweet in the afternoon, then I will drink water and eat a piece of fruit first.',
    tips: ['Don’t keep it at home — make the easy choice the healthy one.', 'Hunger and tiredness amplify cravings: eat protein and sleep 7+ hours.'],
  },
  {
    id: 'smoking',
    name: 'Smoking / vaping',
    icon: 'smoking-off',
    color: '#9AA7B8',
    replacements: ['Deep breathing for 2 minutes', 'Chew gum', 'Drink cold water', 'Walk away from smokers'],
    plan: 'If I get the urge after a meal, then I will brush my teeth and chew gum.',
    tips: ['Nicotine replacement and quit lines significantly raise success — ask a pharmacist or doctor.', 'Urges come in waves — they pass if you ride them out instead of feeding them.'],
  },
  {
    id: 'alcohol',
    name: 'Alcohol',
    icon: 'glass-cocktail-off',
    color: '#B58CFF',
    replacements: ['Sparkling water with lime', 'Leave the situation', 'Call a sober friend', 'Eat a proper meal'],
    plan: 'If someone offers me a drink, then I will say “I’m good, thanks” and order a soda.',
    tips: ['Plan what you’ll say before social events.', 'If you drink heavily every day, stopping suddenly can be dangerous — talk to a doctor first.'],
  },
  {
    id: 'gambling',
    name: 'Gambling',
    icon: 'cards-playing-outline',
    color: '#FF8A3D',
    replacements: ['Move money to savings', 'Call someone you trust', 'Go for a walk', 'Write down what you could buy instead'],
    plan: 'If I feel like betting, then I will open my savings goal and transfer the amount there instead.',
    tips: ['Use self-exclusion tools and block betting sites.', 'Hand control of spare money to someone you trust for a while.'],
  },
  {
    id: 'procrastination',
    name: 'Procrastination',
    icon: 'timer-sand-paused',
    color: '#4FA8FF',
    replacements: ['Start a 15-minute Dungeon', 'Do just the first 2 minutes', 'Write the very next step', 'Put the phone in another room'],
    plan: 'If I notice myself avoiding a task, then I will do only the first 2 minutes of it.',
    tips: ['Make the first step tiny and specific.', 'Self-compassion after procrastinating predicts less procrastination next time.'],
  },
  {
    id: 'custom',
    name: 'Something else',
    icon: 'cancel',
    color: '#3CC8FF',
    replacements: ['Take 10 slow breaths', 'Go for a walk', 'Text a friend', 'Drink water'],
    plan: 'If the urge appears, then I will pause, breathe for one minute and choose a replacement action.',
    tips: ['Write down your triggers — patterns appear quickly.', 'Replace, don’t just remove: every habit meets a need.'],
  },
];

export const RECOVERY_MAP: Record<RecoveryCategory, RecoveryCategoryMeta> = Object.fromEntries(RECOVERY_CATEGORIES.map((c) => [c.id, c])) as Record<
  RecoveryCategory,
  RecoveryCategoryMeta
>;

/** HALT + common triggers */
export const TRIGGERS = ['Bored', 'Stressed', 'Lonely', 'Tired', 'Late night', 'Alone', 'Sad', 'Angry', 'Hungry', 'Anxious', 'After an argument', 'Saw a trigger online', 'Celebrating', 'Procrastinating'];

export const RECOVERY_MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];

export function cleanMs(t: RecoveryTrack, now = Date.now()) {
  return Math.max(0, now - t.startedAt);
}

export function cleanDays(t: RecoveryTrack, now = Date.now()) {
  return Math.floor(cleanMs(t, now) / DAY_MS);
}

export function totalCleanDays(t: RecoveryTrack, now = Date.now()) {
  return Math.floor((t.bankedMs + cleanMs(t, now)) / DAY_MS);
}

export function bestDays(t: RecoveryTrack, now = Date.now()) {
  return Math.floor(Math.max(t.bestMs, cleanMs(t, now)) / DAY_MS);
}

export function nextMilestone(t: RecoveryTrack, now = Date.now()) {
  const d = cleanDays(t, now);
  return RECOVERY_MILESTONES.find((m) => m > d) ?? null;
}

export function milestoneReward(days: number) {
  return { xp: 25 + Math.round(days * 4), gold: 10 + Math.round(days * 2) };
}

const BUCKETS = [
  { label: 'Morning (5–12)', from: 5, to: 12 },
  { label: 'Afternoon (12–17)', from: 12, to: 17 },
  { label: 'Evening (17–22)', from: 17, to: 22 },
  { label: 'Late night (22–5)', from: 22, to: 29 },
];

export function insights(t: RecoveryTrack) {
  const events = [...t.relapses, ...t.urges];
  const triggerCount: Record<string, number> = {};
  for (const e of events) if (e.trigger) for (const tr of e.trigger.split(', ')) triggerCount[tr] = (triggerCount[tr] ?? 0) + 1;
  const topTriggers = Object.entries(triggerCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const bucketCount = BUCKETS.map((b) => ({
    label: b.label,
    n: events.filter((e) => {
      let h = new Date(e.ts).getHours();
      if (h < 5) h += 24;
      return h >= b.from && h < b.to;
    }).length,
  }));
  const risky = bucketCount.reduce((a, b) => (b.n > a.n ? b : a), { label: '', n: 0 });
  const hours = events.map((e) => new Date(e.ts).getHours());
  const hourCount: Record<number, number> = {};
  for (const h of hours) hourCount[h] = (hourCount[h] ?? 0) + 1;
  const riskyHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0];
  const resisted = t.urges.filter((u) => u.outcome === 'resisted').length;
  const winRate = t.urges.length ? Math.round((resisted / t.urges.length) * 100) : null;
  return {
    topTriggers,
    riskyWindow: risky.n > 0 ? risky.label : null,
    riskyHour: riskyHour && events.length >= 3 ? Number(riskyHour[0]) : null,
    resisted,
    winRate,
  };
}
