/**
 * AWAKEN quest library.
 * Every quest has a concrete "done when" criterion so completion means something.
 * Rows use a compact format; numeric variants expand into one quest per difficulty tier.
 *
 *   [title, criteria, tier | variants[], minutes?, extra?]
 *
 * `{n}` in title/criteria is replaced by the variant value. Variant i gets tier t0 + i.
 * A metric makes the quest auto-verifiable from tracked data (steps, workouts, focus, check-in…).
 */
import type { AreaId } from './areas';
import { AREA_MAP } from './areas';
import type { StatKey } from './types';

export type MetricKey =
  | 'steps' | 'sleep' | 'screen' | 'focus' | 'checkin' | 'review' | 'milestone'
  | 'water' | 'plants' | 'protein' | 'junk' | 'meals' | 'wants' | 'nospend' | 'skill' | 'contact' | 'plan'
  | `w:${string}`;

export interface QuestMetric {
  key: MetricKey;
  op: 'gte' | 'lte';
  value: number;
}

export interface QuestTemplate {
  id: string;
  area: AreaId;
  title: string;
  criteria: string;
  tier: number; // 1..5  (E, D, C, B, A)
  minutes: number;
  stat: StatKey;
  why?: string;
  tags: string[];
  metric?: QuestMetric;
}

type V = number | string;
interface Extra {
  m?: MetricKey;
  op?: 'gte' | 'lte';
  /** multiply variant value to get metric value (e.g. hours → minutes) */
  mul?: number;
  /** metric value for non-variant rows */
  v?: number;
  stat?: StatKey;
  why?: string;
  tags?: string[];
  t0?: number;
  /** minutes per unit of n */
  mpn?: number;
}
type Row = [string, string, number | V[], number?, Extra?];

const WHY = {
  gottman: 'Couples who stayed together answered ~86% of small bids for attention; those who divorced, ~33% (Gottman).',
  weakTies: 'A 20-million-user LinkedIn experiment found moderately weak ties drive the most job mobility.',
  gratitude: 'Writing three good things daily raised happiness and lowered depressive symptoms for months (Seligman 2005).',
  grayscale: 'Switching phones to grayscale cut screen time by ~39 min/day in a university study.',
  batching: 'Getting notifications in 3 daily batches improved attention, mood and productivity (Fitz 2019).',
  social30: 'Capping social media at ~30 min/day reduced loneliness and depression within 3 weeks (Hunt 2018).',
  ifThen: 'If-then plans roughly double follow-through on goals (implementation intentions, d≈0.65).',
  steps: 'Mortality risk falls steeply up to ~6–8k steps/day (60+) and ~8–10k (<60) (Paluch 2022).',
  sleep: 'Adults need 7+ hours per night; 6 or fewer is inadequate for health (AASM).',
  strength: 'WHO recommends muscle-strengthening at least 2 days per week.',
  activeRecall: 'Testing yourself beats re-reading for long-term memory (retrieval practice).',
  friction: 'A pause before opening an app cut opening attempts substantially in the one sec field study.',
  expressive: 'Expressive writing about difficult experiences has been linked to better mood and health.',
};

const LIB: Record<AreaId, Row[]> = {
  fitness: [
    ['Walk {n} steps', 'Your step count reaches {n} today', [5000, 7000, 8000, 10000, 12000], 0, { m: 'steps', stat: 'AGI', why: WHY.steps, mpn: 0.01 }],
    ['Push-up session', 'Log {n} push-ups in Train (any number of sets)', [20, 40, 60, 100, 150], 0, { m: 'w:pushups', mpn: 0.15 }],
    ['Squat session', 'Log {n} squats in Train', [30, 50, 80, 120, 200], 0, { m: 'w:squats', mpn: 0.12 }],
    ['Run {n} km', 'Log a {n} km run in Train', [1, 2, 3, 5, 10], 0, { m: 'w:run', stat: 'AGI', mpn: 7 }],
    ['Plank challenge', 'Log {n} seconds of plank in total', [60, 120, 180, 300, 480], 0, { m: 'w:plank', stat: 'VIT', mpn: 0.03 }],
    ['Mobility flow', 'Log a {n}-minute stretching or mobility routine', [5, 10, 15, 20, 30], 0, { m: 'w:stretch', stat: 'SEN', mpn: 1 }],
    ['Pull-up practice', 'Log {n} pull-ups (assisted or negatives count)', [3, 8, 15, 25, 40], 0, { m: 'w:pullups', mpn: 0.6 }],
    ['Burpee blast', 'Log {n} burpees', [10, 20, 40, 60, 100], 0, { m: 'w:burpees', stat: 'AGI', mpn: 0.2 }],
    ['Cycle {n} km', 'Log {n} km of cycling', [3, 5, 10, 20, 40], 0, { m: 'w:cycling', stat: 'AGI', mpn: 3 }],
    ['Jump rope', 'Log {n} minutes of jump rope', [2, 5, 10, 15, 20], 0, { m: 'w:jumprope', stat: 'AGI', mpn: 1.2 }],
    ['Swim {n} minutes', 'Log {n} minutes of swimming', [10, 20, 30, 45, 60], 0, { m: 'w:swim', stat: 'VIT', t0: 2, mpn: 1.3 }],
    ['Take the stairs', 'Use the stairs instead of the lift every time today', 1, 5],
    ['Walk after a meal', 'Walk 10+ minutes within an hour after a main meal', 1, 10, { stat: 'AGI' }],
    ['Morning movement', 'Move for 5 minutes within 30 minutes of waking up', 1, 5],
    ['Strength workout', 'Finish a full-body session: 3 exercises × 3 sets', 3, 40, { why: WHY.strength }],
    ['Outdoor workout', 'Exercise outside for at least 20 minutes', 2, 25, { stat: 'AGI' }],
    ['Active commute', 'Walk or cycle one trip you would normally ride', 2, 20, { stat: 'AGI' }],
    ['Sit less', 'Stand up and move for 2 minutes in at least 6 different hours today', 2, 12],
    ['Personal record', 'Test a max (push-ups, plank or a run) and write the number in your note', 3, 20],
    ['Nature hike', 'Walk 45+ minutes in a park or in nature', 3, 60, { stat: 'AGI' }],
    ['Train with someone', 'Work out together with a friend or family member', 3, 45, { stat: 'CHA' }],
    ['Try a new sport', 'Play or try a sport or class you have never done before', 4, 60, { stat: 'AGI' }],
    ['Leg day', 'Do 4 sets each of squats, lunges and calf raises', 3, 35],
    ['Core circuit', '3 rounds: 20 sit-ups, 30 s plank, 20 leg raises', 2, 15, { stat: 'VIT' }],
    ['Intervals', 'Do 8 rounds of 30 s hard / 90 s easy (run, bike or stairs)', 4, 25, { stat: 'AGI' }],
    ['Posture reset', 'Set 3 reminders and fix your posture + stretch at each one', 1, 5],
    ['Long walk', 'One continuous walk of at least {n} minutes', [20, 30, 45, 60, 90], 0, { stat: 'AGI', mpn: 1 }],
  ],
  health: [
    ['Sleep 7+ hours', 'Your check-in shows at least 7 hours of sleep last night', 2, 0, { m: 'sleep', v: 7, why: WHY.sleep }],
    ['Sleep 8 hours', 'Your check-in shows at least 8 hours of sleep last night', 3, 0, { m: 'sleep', v: 8, why: WHY.sleep }],
    ['Lights out by {n}', 'In bed with the lights off before {n}', ['00:00', '23:30', '23:00', '22:30'], 0, { t0: 1 }],
    ['Hydration', 'Log {n} glasses of water in Fuel (about 250 ml each)', [6, 8, 10], 2, { m: 'water' }],
    ['Eat the rainbow', 'Log {n} meals with veggies or fruit in Fuel', [2, 3, 4], 10, { m: 'plants' }],
    ['No sugary drinks', 'Drink no soda, sweet tea, bubble tea or energy drinks today', 2],
    ['Home-cooked meal', 'Cook one meal at home with a protein and a vegetable', 2, 40],
    ['Protein breakfast', 'Eat a breakfast with a clear protein source', 1, 10],
    ['Caffeine curfew', 'No caffeine after 2 pm', 2],
    ['Morning sunlight', 'Get 10+ minutes of outdoor light within 2 hours of waking', 1, 10],
    ['Screen-free wind-down', 'No screens for the last {n} minutes before sleep', [15, 30, 45, 60], 0, { t0: 1 }],
    ['Floss', 'Floss every tooth tonight', 1, 3],
    ['Meal prep', 'Prepare healthy lunches for the next 3 days', 4, 90],
    ['Mindful meal', 'Eat one meal with no phone, TV or laptop', 1, 20, { stat: 'SEN' }],
    ['Kitchen closed', 'Nothing to eat in the 2 hours before bed', 2],
    ['Book a check-up', 'Book or attend a doctor, dentist or eye check you have been postponing', 3, 15],
    ['Cold finish', 'End your shower with {n} seconds of cold water', [15, 30, 60, 120], 2, { stat: 'WIL' }],
    ['Power nap', 'If tired, nap 10–20 minutes (set an alarm, no longer)', 1, 20],
    ['Consistent wake time', 'Wake up within 30 minutes of your usual time — weekends too', 2],
    ['Alcohol-free day', 'No alcohol today', 1, 0, { stat: 'WIL' }],
    ['Stretch before bed', 'Do 5 minutes of gentle stretching before sleeping', 1, 5],
    ['Plan tomorrow’s food', 'Write what you will eat tomorrow, including snacks', 1, 10],
    ['Fiber up', 'Include whole grains or beans in two meals today', 2],
    ['Fuel log', 'Log {n} meals in Fuel today — awareness first, no calorie counting', [2, 3], 3, { m: 'meals', t0: 1 }],
    ['Protein ×2', 'Log 2 meals with a clear protein source', 2, 0, { m: 'protein', v: 2, stat: 'STR' }],
    ['Fast-food free', 'Log at least 2 meals today with no fast food, fried food or sugary drinks', 2, 0, { m: 'junk', op: 'lte', v: 0, stat: 'WIL' }],
    ['Sun safety & skin', 'Wash your face and use sunscreen/moisturiser morning and night', 1, 5],
    ['Sleep sanctuary', 'Make your bedroom darker, cooler and quieter tonight', 2, 20],
  ],
  mind: [
    ['Meditate {n} minutes', 'Log {n} minutes of meditation in Train', [3, 5, 10, 15, 20], 0, { m: 'w:meditate', mpn: 1 }],
    ['Three good things', 'Write 3 things that went well today and why each happened', 1, 5, { why: WHY.gratitude }],
    ['Name the feeling', 'Three times today, pause and name your exact emotion in a note', 1, 3],
    ['Thought record', 'Write a stressful thought, evidence for and against, and a balanced version', 3, 15],
    ['Expressive writing', 'Write for 15 minutes about something that has been bothering you', 3, 15, { why: WHY.expressive }],
    ['Worry window', 'Postpone worries to one 15-minute “worry time” and only worry then', 3, 15],
    ['Green break', 'Spend 20 minutes in a green space without your phone', 2, 20],
    ['Night journal', 'Journal one page before bed', 2, 10],
    ['Self-compassion break', 'After a mistake, write what you would say to a friend in your place', 2, 5],
    ['Body scan', 'Do a 10-minute body scan meditation', 2, 10],
    ['Single-tasking hour', 'Work on one thing for 60 minutes with no task switching', 3, 60, { stat: 'INT' }],
    ['Play for fun', 'Spend 20 minutes on an offline hobby purely for enjoyment', 1, 20],
    ['Create something', 'Draw, write, play music or cook something new', 2, 30],
    ['Unplugged walk', 'Walk 15 minutes with no earbuds and no phone use', 1, 15, { stat: 'AGI' }],
    ['Savour a moment', 'Fully savour one pleasant moment for 2 minutes, then note it', 1, 3],
    ['Letter to future self', 'Write a letter to yourself one year from now', 3, 20],
    ['Brain dump', 'Write down every open loop in your head on one page', 1, 10],
    ['Laugh out loud', 'Watch or read something that genuinely makes you laugh (≤20 min)', 1, 20],
    ['Box breathing', 'Do 4 rounds of 4-4-4-4 breathing when stress shows up', 1, 3],
    ['News diet', 'Check the news at most once today', 2],
    ['Mindful chore', 'Do one chore with full attention on sounds, textures and smells', 1, 10],
    ['Talk it out', 'Tell someone you trust how you are actually feeling', 3, 15, { stat: 'CHA' }],
    ['Know your supports', 'Save one counsellor, hotline or support group you could use if needed', 2, 10],
    ['Slow breathing', 'Breathe slowly (about 6 breaths a minute) for 5 minutes', 1, 5],
    ['Reframe a setback', 'Write one setback as “What can I learn?” instead of “What’s wrong with me?”', 2, 10],
  ],
  learning: [
    ['Skill session', 'Log {n} minutes of practice on one skill in Skills', [15, 30, 45, 60, 90], 0, { m: 'skill', t0: 1, mpn: 1 }],
    ['Read {n} pages', 'Read {n} pages of a book (log Reading in Train if you like)', [5, 10, 20, 40, 60], 0, { mpn: 1.5 }],
    ['Study dungeon', 'Clear a Dungeon of at least {n} minutes on study', [15, 25, 45, 60, 90], 0, { m: 'focus', mpn: 1 }],
    ['Active recall', 'Close your notes, write all you remember on a topic, then check gaps', 2, 20, { why: WHY.activeRecall }],
    ['Flashcard review', 'Review spaced-repetition flashcards for 15 minutes', 1, 15],
    ['Teach it', 'Explain something you learned to someone, or record a 2-minute explanation', 3, 15, { stat: 'CHA' }],
    ['Practice problems', 'Solve {n} practice problems before looking at any solution', [3, 5, 10, 15, 25], 0, { mpn: 6 }],
    ['New words', 'Learn and use 5 new words in a language you are studying', 1, 15],
    ['Language practice', 'Do {n} minutes of language practice', [10, 20, 30, 45, 60], 0, { mpn: 1 }],
    ['Lecture + takeaways', 'Watch one full lecture and write 3 takeaways', 2, 60],
    ['Chapter summary', 'Write a 5-sentence summary of a chapter you read', 2, 20],
    ['Build to learn', 'Build a small project using a skill you are learning', 4, 90],
    ['Deliberate practice', 'Practise the hardest part of a skill for 30 minutes and get feedback', 3, 30],
    ['Ask an expert', 'Ask a teacher, senior or expert one specific question', 2, 10, { stat: 'CHA' }],
    ['Learn on the go', 'Listen to an educational podcast or audiobook for 30 minutes', 1, 30],
    ['Finish a module', 'Complete one full module/lesson of a course', 4, 90],
    ['Pre-read', 'Skim tomorrow’s class or work material for 10 minutes', 1, 10],
    ['Mistake log', 'Write 3 mistakes you made while learning and how to fix them', 2, 10],
    ['Write to learn', 'Write a short post or note explaining one concept clearly', 4, 60],
    ['Exam simulation', 'Do a timed past paper under real exam conditions', 5, 120],
    ['Curiosity hour', 'Spend 30 minutes researching something you are curious about', 2, 30],
    ['Interleave', 'Study 3 different topics in one session, switching every 15 minutes', 3, 45],
    ['Feynman notes', 'Explain a topic in plain words on one page and mark where you get stuck', 3, 30],
  ],
  career: [
    ['Top 3 cleared', 'Finish all 3 of today’s Top-3 tasks from your morning plan', 2, 0, { m: 'plan', v: 3 }],
    ['Deep work', 'Clear a Dungeon of at least {n} minutes on your most important work', [25, 45, 60, 90, 120], 0, { m: 'focus', mpn: 1 }],
    ['Top 3 first', 'Before starting work, write your 3 most important tasks', 1, 5],
    ['Eat the frog', 'Finish your hardest task before noon', 3],
    ['Inbox zero', 'Process email/messages to zero: reply, archive or schedule', 2, 30],
    ['Update your CV', 'Add your latest project or achievement to your CV or LinkedIn', 2, 30],
    ['Weak-tie hello', 'Message one acquaintance or ex-colleague to catch up', 2, 10, { stat: 'CHA', why: WHY.weakTies }],
    ['Portfolio piece', 'Publish or polish one portfolio item (GitHub, Behance, website)', 4, 120],
    ['Ask for feedback', 'Ask your manager, teacher or a peer for one specific piece of feedback', 3, 10, { stat: 'CHA' }],
    ['Skill the market wants', 'Spend 30 minutes on a skill that job posts in your field ask for', 2, 30],
    ['Informational interview', 'Have a 20-minute chat with someone in a role you want', 5, 30, { stat: 'CHA', why: WHY.weakTies }],
    ['Plan the week', 'Block time in your calendar for your top goals this week', 2, 20],
    ['Ship it', 'Finish and deliver one task you have been delaying', 3],
    ['Job crafting', 'Change one small thing about how you work to make it more meaningful', 2],
    ['Help a teammate', 'Help a colleague or classmate get unstuck', 2, 20, { stat: 'CHA' }],
    ['Work log', 'Write what you achieved today and the next step', 1, 5],
    ['Apply or pitch', 'Send one job application, proposal or pitch', 4, 60],
    ['Go to an event', 'Attend a meetup, webinar or career event', 4, 90, { stat: 'CHA' }],
    ['Industry pulse', 'Read 15 minutes of news in your field and note one idea', 1, 15],
    ['Automate a chore', 'Automate or template one repetitive task', 3, 45],
    ['Pomodoro ×{n}', 'Complete {n} focused 25-minute blocks (Dungeons count)', [2, 4, 6, 8], 0, { m: 'focus', mul: 25, t0: 2, mpn: 25 }],
    ['Give to the community', 'Open a PR, answer a forum question or share a useful resource', 4, 45],
    ['Career check', 'Review progress toward your career goal and choose the next step', 2, 15],
    ['Meeting prep', 'Write the goal and 3 questions before your next meeting or class', 1, 10],
  ],
  money: [
    ['Track spending', 'Write down every purchase you make today', 1, 5],
    ['No-spend day', 'Spend nothing except essentials, then mark it in Treasury', 2, 0, { m: 'nospend' }],
    ['Pay yourself first', 'Move any amount into savings today', 2, 5],
    ['Money snapshot', 'Check all balances and write down your net worth', 1, 10],
    ['Cancel a subscription', 'Cancel one subscription you barely use', 2, 10],
    ['Budget check', 'Compare this month’s spending with your budget', 2, 20],
    ['Make a budget', 'Create a monthly budget: income, fixed costs, savings, fun', 4, 60],
    ['Emergency fund step', 'Add to an emergency fund (start with a small first target)', 3, 5],
    ['Cook, don’t order', 'Skip food delivery today and cook or bring your own food', 1],
    ['24-hour rule', 'Wait 24 hours before any non-essential purchase', 1],
    ['Money lesson', 'Spend 20 minutes learning compound interest, index funds or inflation', 2, 20, { stat: 'INT' }],
    ['Sell one thing', 'List one item you no longer use for sale', 2, 20],
    ['Compare before buying', 'Compare prices from 3 places before one planned purchase', 1, 10],
    ['Debt attack', 'List debts with interest rates and pay extra on the highest rate', 4, 30],
    ['Automate savings', 'Set an automatic transfer to savings on payday', 4, 15],
    ['Bill review', 'Check one bill (phone, internet, insurance) for a cheaper plan', 2, 20],
    ['Fun-money cap', 'Use only a fixed amount for fun spending today', 2],
    ['Income ideas', 'Brainstorm 5 ways to earn more and pick one to test', 3, 30, { stat: 'INT' }],
    ['Set a money goal', 'Write one savings goal with an amount and a date', 2, 10],
    ['Wants under ฿{n}', 'Log your spending and keep non-essential spending at or under ฿{n} today', [300, 150, 50], 2, { m: 'wants', op: 'lte', t0: 1 }],
    ['Receipt review', 'Review last week’s purchases and mark which ones were worth it', 2, 15],
  ],
  relationships: [
    ['Reach out', 'Message or call someone from your People list and mark it', 1, 5, { m: 'contact', v: 1 }],
    ['Reconnect ×{n}', 'Contact {n} people from your People list today', [2, 3], 15, { m: 'contact', t0: 2, mpn: 5 }],
    ['Turn toward bids', 'Notice and warmly respond to 5 small bids for attention today', 2, 0, { why: WHY.gottman }],
    ['Quality time', 'Spend {n} phone-free minutes with someone you love', [15, 30, 60, 120], 0, { mpn: 1 }],
    ['Call family', 'Call (not text) a family member', 1, 15],
    ['Thank-you message', 'Send a specific thank-you message to someone', 1, 5],
    ['Gratitude letter', 'Write — and ideally read aloud — a letter to someone who changed your life', 4, 45, { why: WHY.gratitude }],
    ['Listen first', 'In one conversation, only ask questions and reflect back — no advice', 2],
    ['Celebrate their win', 'When someone shares good news, respond with enthusiasm and questions', 1],
    ['Reconnect', 'Message a friend you have not talked to in 3+ months', 2, 10],
    ['Plan a hangout', 'Set a specific date and time to meet a friend', 2, 10],
    ['Meet in person', 'Meet a friend in person', 3, 90],
    ['Three compliments', 'Give 3 genuine, specific compliments', 1],
    ['Repair', 'Repair a small conflict with a sincere apology or check-in', 4, 15],
    ['Unasked help', 'Do a chore or favour for someone without being asked', 1, 20],
    ['Special evening', 'Plan and enjoy a date night or family night together', 4, 120],
    ['Deep question', 'Ask someone “What has been on your mind lately?” and really listen', 2, 15],
    ['Say hello', 'Start a conversation with someone new', 3, 10],
    ['Join a group', 'Attend a club, class or community event', 4, 90],
    ['Volunteer', 'Volunteer for at least one hour', 4, 60, { stat: 'SEN' }],
    ['Kindness to a stranger', 'Do one kind act for someone you don’t know', 1],
    ['Remember what matters', 'Save birthdays and important dates for 3 close people', 2, 15],
    ['Host', 'Invite people over or organise a group activity', 5, 180],
    ['Tell them why', 'Tell someone close one thing you appreciate about them', 1, 5],
    ['Kind boundary', 'Say no to one request that does not fit your priorities, kindly and clearly', 3, 0, { stat: 'WIL' }],
    ['Shared meal', 'Eat a meal with someone, phones away', 2, 40],
  ],
  purpose: [
    ['Values in action', 'Write your top 3 values and one action today that matched each', 2, 15],
    ['Weekly review', 'Complete the Weekly Review in the Life tab', 2, 15, { m: 'review', v: 1 }],
    ['Daily check-in', 'Complete today’s Life check-in', 1, 2, { m: 'checkin', v: 1 }],
    ['Ideal ordinary day', 'Describe your ideal ordinary day 5 years from now', 3, 20],
    ['Gratitude walk', 'Walk 10 minutes noticing things you are grateful for', 1, 10],
    ['Strength, new way', 'Use one of your strengths in a new way today', 2, 0, { why: 'Using signature strengths in new ways had lasting effects on happiness (Seligman 2005).' }],
    ['Give back', 'Donate time, money or items to a cause you care about', 3, 30],
    ['Lesson of the week', 'Write the biggest lesson of the past week', 1, 10],
    ['Bucket list', 'Add 5 items to your bucket list and plan one of them', 2, 15],
    ['Mentor', 'Help someone newer with advice or a skill', 4, 30, { stat: 'CHA' }],
    ['Stillness', 'Sit 10 minutes in silence, reflection or prayer', 1, 10],
    ['How to be remembered', 'Write how you want to be remembered by the people around you', 4, 30],
    ['Family wisdom', 'Ask an elder about family history or a life lesson', 2, 30, { stat: 'CHA' }],
    ['One brave thing', 'Do one thing that scares you a little but matters to you', 4],
    ['Morning intention', 'Write one intention for the day before checking your phone', 1, 3],
    ['Wins list', 'Write down today’s win, however small', 1, 2],
    ['Advance a Main Quest', 'Complete one milestone of a Main Quest', 3, 0, { m: 'milestone', v: 1 }],
    ['Micro-adventure', 'Plan a new experience for this week: a new place, food or activity', 2, 15],
    ['WOOP a wish', 'Write a Wish, best Outcome, main Obstacle and an if-then Plan', 2, 10, { why: WHY.ifThen }],
    ['If-then plan', 'Write 3 “If X happens, then I will Y” plans for this week', 1, 10, { why: WHY.ifThen }],
  ],
  home: [
    ['Make your bed', 'Bed made within 15 minutes of getting up', 1, 2],
    ['10-minute tidy', 'Set a 10-minute timer and tidy one area until it rings', 1, 10],
    ['Declutter {n} items', 'Throw away, donate or sell {n} things you don’t need', [5, 10, 20, 30, 50], 0, { mpn: 1 }],
    ['Clear the desk', 'Clear and wipe your desk or workspace completely', 1, 15],
    ['Laundry, done done', 'Wash, dry, fold AND put away one load', 2, 60],
    ['Deep clean a room', 'Deep clean one whole room, including floors and surfaces', 3, 60],
    ['Dishes zero', 'No dirty dishes left before bed', 1, 15],
    ['Fresh air', 'Open windows for fresh air and care for a plant', 1, 5],
    ['Fix one thing', 'Repair something that has been broken for a while', 3, 45],
    ['Errand plan', 'List and group this week’s errands into one trip', 1, 10],
    ['Organise files', 'Clean up your Downloads/Desktop folders', 2, 30, { stat: 'INT' }],
    ['Ready for tomorrow', 'Lay out clothes and pack your bag tonight', 1, 5],
    ['List-only shopping', 'Shop with a list and buy only what is on it', 2, 0, { stat: 'WIL' }],
    ['Kitchen reset', 'Leave the kitchen clean and surfaces clear', 1, 15],
    ['Wardrobe purge', 'Donate clothes you have not worn in a year', 3, 45],
    ['Life admin hour', 'Handle paperwork: bills, forms, appointments', 3, 60],
    ['Clean the fridge', 'Empty, wipe and restock the fridge', 2, 20],
    ['One-touch rule', 'Put every item away immediately after using it, all day', 2],
    ['Reset the bathroom', 'Clean sink, mirror and toilet', 2, 20],
  ],
  digital: [
    ['Screen time under {n} h', 'Your check-in shows at most {n} hours of phone screen time today', [5, 4, 3, 2, 1.5], 0, { m: 'screen', op: 'lte', mul: 60 }],
    ['Grayscale day', 'Turn on grayscale (Accessibility settings) for the whole day', 2, 2, { why: WHY.grayscale }],
    ['Phone sleeps outside', 'Charge your phone outside the bedroom tonight', 2, 1, { stat: 'VIT' }],
    ['Batch notifications', 'Use scheduled summaries or check notifications only 3 times today', 2, 5, { why: WHY.batching }],
    ['Social media cap', 'At most {n} minutes on social media today (use an app timer)', [60, 45, 30, 20, 10], 0, { why: WHY.social30 }],
    ['Phone-free morning', 'Don’t touch your phone for the first {n} minutes after waking', [15, 30, 60, 90], 0, { t0: 1 }],
    ['Hide the trap', 'Move or delete one time-wasting app from your home screen', 2, 2],
    ['Unfollow spree', 'Unfollow or mute 10 accounts that leave you feeling worse', 1, 10],
    ['Phone-free meals', 'Eat every meal today without your phone', 1],
    ['Offline block', 'Spend {n} waking hours with your phone in another room', [1, 2, 3, 4, 6]],
    ['Intentional opening', 'Before opening a social app, say why out loud — close it if there is no reason', 2, 0, { why: WHY.friction }],
    ['Kill autoplay', 'Turn off autoplay on YouTube, Netflix and Instagram', 1, 5],
    ['Screen-free evening', 'No recreational screens after {n}', ['22:00', '21:00', '20:00'], 0, { t0: 2 }],
    ['Desktop-only social', 'Log out of social media on your phone for 24 hours', 3],
    ['Gaming limit', 'Game for at most {n} minutes today (set a timer before you start)', [90, 60, 45, 30], 0, { t0: 1 }],
    ['Swap the scroll', 'Three times, replace the urge to scroll with 10 push-ups or one page of a book', 2, 5],
    ['Notification audit', 'Turn off notifications for every app that is not a real person', 2, 15],
    ['Digital sabbath', 'Spend a full half-day with no social media, games or videos', 4],
    ['Email unsubscribe', 'Unsubscribe from 10 marketing emails', 1, 10],
    ['Focus mode all day', 'Use Focus / Do Not Disturb during every study or work block', 1, 2],
    ['App timer setup', 'Set daily limits for your 3 most-used apps', 2, 10],
  ],
};

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 28);
}

function build(): QuestTemplate[] {
  const out: QuestTemplate[] = [];
  (Object.keys(LIB) as AreaId[]).forEach((area) => {
    const meta = AREA_MAP[area];
    LIB[area].forEach(([title, criteria, tiers, minutes = 0, x = {}]) => {
      const base = {
        area,
        stat: x.stat ?? meta.stat,
        why: x.why,
        tags: x.tags ?? [],
      };
      if (Array.isArray(tiers)) {
        tiers.forEach((n, i) => {
          const tier = Math.min(5, (x.t0 ?? 1) + i);
          const sub = (s: string) => s.replace(/\{n\}/g, String(n));
          const mins = x.mpn && typeof n === 'number' ? Math.max(1, Math.round(n * x.mpn)) : minutes;
          out.push({
            ...base,
            id: `${area}.${slug(title)}.${i}`,
            title: sub(title),
            criteria: sub(criteria),
            tier,
            minutes: mins,
            metric: x.m && typeof n === 'number' ? { key: x.m, op: x.op ?? 'gte', value: n * (x.mul ?? 1) } : undefined,
          });
        });
      } else {
        out.push({
          ...base,
          id: `${area}.${slug(title)}`,
          title,
          criteria,
          tier: tiers,
          minutes,
          metric: x.m ? { key: x.m, op: x.op ?? 'gte', value: x.v ?? 1 } : undefined,
        });
      }
    });
  });
  return out;
}

export const QUEST_LIBRARY: QuestTemplate[] = build();
export const QUEST_MAP: Record<string, QuestTemplate> = Object.fromEntries(QUEST_LIBRARY.map((q) => [q.id, q]));

export const TIER_RANK = ['E', 'E', 'D', 'C', 'B', 'A'] as const; // index by tier (1..5)
export function tierRank(tier: number) {
  return TIER_RANK[Math.max(1, Math.min(5, Math.round(tier)))];
}

/** Base rewards for side quests by tier */
export const SIDE_REWARDS: Record<number, { xp: number; gold: number }> = {
  1: { xp: 20, gold: 10 },
  2: { xp: 35, gold: 18 },
  3: { xp: 55, gold: 28 },
  4: { xp: 85, gold: 42 },
  5: { xp: 130, gold: 65 },
};
