/**
 * Campaigns: ready-made Main Quests (multi-week programs) with clear milestones.
 * Each milestone has an objective "done when" so progress reflects real change.
 */
import type { AreaId } from './areas';

export interface Campaign {
  id: string;
  area: AreaId;
  title: string;
  weeks: number;
  why: string;
  metric?: { unit: string; start: number; target: number };
  milestones: [string, string][]; // [title, criteria]
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'c25k',
    area: 'fitness',
    title: 'Couch to 5K',
    weeks: 8,
    why: 'Build the aerobic base to run 5 km without stopping.',
    metric: { unit: 'km non-stop', start: 0, target: 5 },
    milestones: [
      ['Week of walk-runs', '3 sessions in one week of 20 min alternating 1 min run / 1.5 min walk'],
      ['Run 1 km', 'Run 1 km without stopping'],
      ['Run 2 km', 'Run 2 km without stopping'],
      ['Run 3 km', 'Run 3 km without stopping'],
      ['Run 4 km', 'Run 4 km without stopping'],
      ['5K!', 'Run 5 km without stopping'],
    ],
  },
  {
    id: 'strength',
    area: 'fitness',
    title: 'Strength Foundation',
    weeks: 6,
    why: 'Two strength sessions a week, as WHO recommends, until it sticks.',
    metric: { unit: 'push-ups in a row', start: 0, target: 30 },
    milestones: [
      ['First 4 sessions', 'Complete 4 full-body strength sessions (2 weeks)'],
      ['15 in a row', 'Do 15 push-ups in one set with good form'],
      ['Plank 1 minute', 'Hold a plank for 60 seconds'],
      ['12 sessions', 'Complete 12 strength sessions in total'],
      ['30 in a row', 'Do 30 push-ups in one set'],
    ],
  },
  {
    id: 'sleep',
    area: 'health',
    title: 'Sleep Reset',
    weeks: 2,
    why: 'Get 7+ hours consistently — the base of energy, mood and willpower.',
    milestones: [
      ['Fixed wake time', 'Choose one wake time and keep it for 5 days in a row'],
      ['Phone out', 'Charge the phone outside the bedroom for 7 nights'],
      ['7 good nights', 'Log 7 nights of 7+ hours in check-ins'],
      ['14 good nights', 'Log 14 nights of 7+ hours'],
    ],
  },
  {
    id: 'mind',
    area: 'mind',
    title: 'Mind Garden',
    weeks: 3,
    why: 'Build a calm, resilient mind with short daily practices.',
    milestones: [
      ['7 days of meditation', 'Meditate at least 5 minutes on 7 different days'],
      ['Gratitude week', 'Write three good things for 7 nights'],
      ['14 journal entries', 'Journal on 14 different days'],
      ['Wellbeing up', 'Take the WHO-5 again and score higher than when you started'],
    ],
  },
  {
    id: 'books',
    area: 'learning',
    title: 'Read 4 Books',
    weeks: 8,
    why: 'Turn reading into a default habit — one book every two weeks.',
    metric: { unit: 'books', start: 0, target: 4 },
    milestones: [
      ['Pick 4 books', 'Write down the 4 books you will read'],
      ['Book 1', 'Finish book 1 and write 3 takeaways'],
      ['Book 2', 'Finish book 2 and write 3 takeaways'],
      ['Book 3', 'Finish book 3 and write 3 takeaways'],
      ['Book 4', 'Finish book 4 and share your favourite idea with someone'],
    ],
  },
  {
    id: 'skill20',
    area: 'learning',
    title: 'New Skill in 20 Hours',
    weeks: 6,
    why: 'Get from zero to “decent” in any skill with 20 focused hours.',
    metric: { unit: 'hours', start: 0, target: 20 },
    milestones: [
      ['Deconstruct', 'Choose the skill and list its 3–5 most important sub-skills'],
      ['5 hours', 'Log 5 hours of focused practice (Dungeons count)'],
      ['10 hours', 'Log 10 hours of practice'],
      ['15 hours', 'Log 15 hours of practice'],
      ['20 hours + demo', 'Reach 20 hours and show someone what you can do'],
    ],
  },
  {
    id: 'career',
    area: 'career',
    title: 'Career Launch',
    weeks: 8,
    why: 'Make yourself visible and land your next opportunity.',
    milestones: [
      ['CV refresh', 'Update your CV and LinkedIn with your latest projects'],
      ['2 portfolio pieces', 'Publish 2 portfolio items'],
      ['5 conversations', 'Have 5 conversations with weak ties or people in roles you want'],
      ['5 applications', 'Send 5 tailored applications or pitches'],
      ['Interview', 'Get at least one interview or meeting'],
    ],
  },
  {
    id: 'efund',
    area: 'money',
    title: 'Emergency Fund Starter',
    weeks: 12,
    why: 'A cash buffer turns emergencies into inconveniences.',
    metric: { unit: 'months of expenses', start: 0, target: 1 },
    milestones: [
      ['Know your number', 'Calculate your essential monthly expenses'],
      ['Budget', 'Create a simple monthly budget'],
      ['Automate', 'Set up an automatic transfer to savings'],
      ['First week covered', 'Save 1 week of essential expenses'],
      ['One month covered', 'Save 1 month of essential expenses'],
    ],
  },
  {
    id: 'reconnect',
    area: 'relationships',
    title: 'Reconnect 30',
    weeks: 4,
    why: 'Stronger social ties are linked to a ~50% higher likelihood of survival (Holt-Lunstad 2010).',
    milestones: [
      ['Your people', 'List 10 people you want to be closer to'],
      ['5 messages', 'Reach out to 5 of them'],
      ['2 meet-ups', 'Meet 2 of them in person'],
      ['Gratitude letter', 'Write and deliver one gratitude letter'],
      ['Host', 'Host or organise one get-together'],
    ],
  },
  {
    id: 'detox',
    area: 'digital',
    title: 'Digital Detox 30',
    weeks: 4,
    why: 'Take back hours every day from the feed.',
    metric: { unit: 'avg hours/day', start: 0, target: 2 },
    milestones: [
      ['Baseline', 'Write your current daily screen time average'],
      ['Set up friction', 'Grayscale on, social apps off the home screen, app limits set'],
      ['7 days under target', 'Stay under your screen-time target 7 days in a row'],
      ['Phone-free bedroom', 'Charge the phone outside the bedroom for 14 nights'],
      ['30 days', 'Average screen time is 25% lower than your baseline'],
    ],
  },
  {
    id: 'home',
    area: 'home',
    title: 'Fresh Home',
    weeks: 4,
    why: 'A calm space makes every other habit easier.',
    milestones: [
      ['Wardrobe', 'Declutter your wardrobe'],
      ['Desk & digital', 'Clear your desk and organise your files'],
      ['Kitchen', 'Clean and declutter the kitchen'],
      ['Bedroom', 'Make the bedroom a calm sleep space'],
      ['Maintenance', 'Keep a 10-minute daily tidy for 14 days'],
    ],
  },
  {
    id: 'purpose',
    area: 'purpose',
    title: 'Purpose Map',
    weeks: 3,
    why: 'Know what matters to you and point your days at it.',
    milestones: [
      ['Values', 'Write your top 5 values and rank them'],
      ['Ideal day', 'Describe your ideal ordinary day 5 years from now'],
      ['3 big goals', 'Set 3 goals for this year using WOOP'],
      ['First step', 'Complete the first action toward each goal'],
    ],
  },
];

export const CAMPAIGN_MAP: Record<string, Campaign> = Object.fromEntries(CAMPAIGNS.map((c) => [c.id, c]));
