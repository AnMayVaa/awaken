/** Bot "hunters" for the guild. Their progress is deterministic from seed + date. */
import { BOT_ARCHETYPES, BOT_AVATARS, BOT_NAMES, DUNGEONS } from './constants';
import { addDays, diffDays, today } from './date';
import { rankForLevel } from './engine';
import { hash, pick, rand01 } from './rng';
import type { Bot, Rank } from './types';

export interface BotSnapshot {
  bot: Bot;
  level: number;
  rank: Rank;
  streak: number;
  totalXp: number;
  power: number;
}

const ARCH = ['rookie', 'steady', 'grinder', 'elite'] as const;

export function generateCandidates(seed: number, count = 4, playerLevel = 1, taken: string[] = []): Bot[] {
  const out: Bot[] = [];
  let i = 0;
  while (out.length < count && i < 60) {
    const h = hash('cand', seed, i++);
    const name = BOT_NAMES[h % BOT_NAMES.length];
    if (taken.includes(name) || out.find((b) => b.name === name)) continue;
    const archetype = ARCH[hash('arch', seed, i) % ARCH.length];
    const spread = archetype === 'elite' ? 6 : archetype === 'grinder' ? 3 : archetype === 'steady' ? 1 : -1;
    const baseLevel = Math.max(1, playerLevel + spread + (hash('lv', seed, i) % 3) - 1);
    out.push({
      id: `bot_${h.toString(36)}`,
      name,
      archetype,
      seed: h,
      joinedAt: today(),
      baseLevel,
      avatar: pick(BOT_AVATARS, rand01('av', h)),
    });
  }
  return out;
}

export function botSnapshot(bot: Bot, date = today()): BotSnapshot {
  const a = BOT_ARCHETYPES[bot.archetype];
  const days = Math.max(0, diffDays(bot.joinedAt, date));
  const noise = (rand01('n', bot.seed, date) - 0.5) * 0.6;
  const level = Math.max(1, Math.floor(bot.baseLevel + a.rate * Math.pow(days, 0.9) + noise));
  // streak: count back until a "missed" day
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = addDays(date, -i);
    if (diffDays(bot.joinedAt, d) < -30) break;
    if (rand01('miss', bot.seed, d) < a.miss) break;
    streak++;
  }
  const totalXp = Math.round(60 * Math.pow(level, 2.35) / 2.35 + 40 * level + (bot.seed % 97));
  const power = Math.round(level * 120 * (0.9 + (bot.seed % 20) / 100));
  return { bot, level, rank: rankForLevel(level).rank, streak, totalXp, power };
}

export interface FeedItem {
  id: string;
  name: string;
  avatar: string;
  text: string;
  date: string;
}

export function botFeed(bots: Bot[], days = 3): FeedItem[] {
  const t = today();
  const items: FeedItem[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(t, -i);
    for (const b of bots) {
      if (diffDays(b.joinedAt, d) < 0) continue;
      const r = rand01('feed', b.seed, d);
      const a = BOT_ARCHETYPES[b.archetype];
      let text: string;
      if (rand01('miss', b.seed, d) < a.miss) text = 'failed the Daily Quest and entered the Penalty Zone.';
      else if (r < 0.35) text = 'cleared the Daily Quest.';
      else if (r < 0.6) {
        const dg = DUNGEONS[Math.min(DUNGEONS.length - 1, Math.floor(rand01('dg', b.seed, d) * (b.archetype === 'elite' ? 6 : 4)))];
        text = `cleared a ${dg.rank}-Rank dungeon (${dg.minutes} min).`;
      } else if (r < 0.75) text = `logged ${10 + (hash('pu', b.seed, d) % 9) * 10} push-ups.`;
      else if (r < 0.88) text = `ran ${1 + (hash('km', b.seed, d) % 8)} km.`;
      else if (r < 0.95) text = 'dealt heavy damage to the weekly boss.';
      else text = 'leveled up!';
      items.push({ id: `${b.id}_${d}`, name: b.name, avatar: b.avatar, text, date: d });
    }
  }
  return items;
}
