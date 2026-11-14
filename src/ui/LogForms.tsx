/**
 * Small, fast log forms shared by the Quick Log sheet and the tracker screens.
 * Rule of thumb: every log is ≤ 3 taps, typing is optional.
 */
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { today } from '@/game/date';
import {
  FOOD_TAGS,
  fmtMoney,
  foodCounts,
  MEAL_SLOTS,
  MONEY_CAT_MAP,
  MONEY_CATS,
  PLAN_SIZE,
  peopleDue,
  RELATIONS,
  SKILL_PRESETS,
  skillTier,
  slotForHour,
  spentOn,
} from '@/game/tracking';
import type { FoodTag, MealSlot, MoneyCat } from '@/game/types';
import { life, useGame } from '@/store/game';

import { Btn, Chip, Icon, Input, Row, Segment, Txt } from './kit';
import { C, F, withAlpha } from './theme';

/* ------------------------------------------------------------------ */
/* Meal                                                                */
/* ------------------------------------------------------------------ */

export function MealForm({ onDone }: { onDone?: () => void }) {
  const [slot, setSlot] = useState<MealSlot>(() => slotForHour(new Date().getHours()));
  const [tags, setTags] = useState<FoodTag[]>([]);
  const [note, setNote] = useState('');
  const counts = useGame((s) => foodCounts(s.game, today()).meals);
  const toggle = (t: FoodTag) => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));
  return (
    <View>
      <Segment value={slot} onChange={setSlot} options={MEAL_SLOTS.map((m) => ({ value: m.id, label: m.short }))} />
      <Txt v="label" style={{ marginTop: 14, marginBottom: 8 }}>
        What was on the plate? (tap all that fit)
      </Txt>
      <View style={styles.tagGrid}>
        {FOOD_TAGS.map((t) => {
          const on = tags.includes(t.id);
          return (
            <Pressable
              key={t.id}
              testID={`food-${t.id}`}
              onPress={() => toggle(t.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.tag, { borderColor: withAlpha(t.color, on ? 0.9 : 0.25), backgroundColor: withAlpha(t.color, on ? 0.18 : 0.03) }]}>
              <Icon name={on ? 'check-circle' : t.icon} size={18} color={t.color} />
              <Txt v="bodyB" style={{ fontSize: 14, flex: 1 }} numberOfLines={1}>
                {t.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Input placeholder="Note (optional) — e.g. pad kra pao" value={note} onChangeText={setNote} maxLength={60} style={{ marginTop: 10 }} />
      <Btn
        kind="solid"
        color={C.green}
        icon="silverware-fork-knife"
        label={tags.length ? 'Log meal' : 'Pick at least one'}
        disabled={!tags.length}
        testID="log-meal"
        onPress={() => {
          life.logMeal({ tags, slot, note });
          setTags([]);
          setNote('');
          onDone?.();
        }}
      />
      <Txt v="tiny" center style={{ marginTop: 8 }}>
        {counts} meal{counts === 1 ? '' : 's'} logged today · no calorie counting, just awareness
      </Txt>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Water                                                               */
/* ------------------------------------------------------------------ */

export function WaterControl({ compact }: { compact?: boolean }) {
  const water = useGame((s) => s.game.track.water[today()] ?? 0);
  const goal = useGame((s) => s.game.track.waterGoal);
  return (
    <Row gap={10} style={{ alignItems: 'center' }}>
      <Btn icon="minus" size={compact ? 'sm' : 'md'} onPress={() => life.water(-1)} disabled={!water} />
      <View style={{ flex: 1 }}>
        <Row gap={3} style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          {Array.from({ length: Math.max(goal, water) }).map((_, i) => (
            <Icon key={i} name={i < water ? 'cup-water' : 'cup-outline'} size={compact ? 16 : 20} color={i < water ? C.cyan : C.muted} />
          ))}
        </Row>
        <Txt v="small" center style={{ marginTop: 2 }}>
          {water}/{goal} glasses{water >= goal ? ' · hydrated!' : ''}
        </Txt>
      </View>
      <Btn icon="plus" kind="solid" size={compact ? 'sm' : 'md'} onPress={() => life.water(1)} testID="water-plus" />
    </Row>
  );
}

/* ------------------------------------------------------------------ */
/* Expense                                                             */
/* ------------------------------------------------------------------ */

const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

export function SpendForm({ onDone }: { onDone?: () => void }) {
  const [amount, setAmount] = useState('');
  const [cat, setCat] = useState<MoneyCat>('food');
  const [want, setWant] = useState<'need' | 'want'>('need');
  const [note, setNote] = useState('');
  const spentToday = useGame((s) => spentOn(s.game, today()));
  const value = Number(amount.replace(/,/g, ''));
  const valid = value > 0 && value < 10_000_000;
  const pickCat = (c: MoneyCat) => {
    setCat(c);
    setWant(MONEY_CAT_MAP[c].essential ? 'need' : 'want');
  };
  const reset = () => {
    setAmount('');
    setNote('');
    onDone?.();
  };
  return (
    <View>
      <Row gap={8} style={{ alignItems: 'center' }}>
        <Txt style={{ fontFamily: F.display, fontSize: 28, color: C.gold }}>฿</Txt>
        <View style={{ flex: 1 }}>
          <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" style={{ fontSize: 26, fontFamily: F.display }} testID="spend-amount" />
        </View>
      </Row>
      <Row gap={6} wrap style={{ marginTop: -4, marginBottom: 10 }}>
        {QUICK_AMOUNTS.map((a) => (
          <Chip key={a} label={`${a}`} onPress={() => setAmount(String((Number(amount) || 0) + a))} color={C.gold} />
        ))}
      </Row>
      <View style={styles.tagGrid}>
        {MONEY_CATS.map((c) => {
          const on = cat === c.id;
          return (
            <Pressable
              key={c.id}
              testID={`cat-${c.id}`}
              onPress={() => pickCat(c.id)}
              style={[styles.catTile, { borderColor: withAlpha(c.color, on ? 0.9 : 0.25), backgroundColor: withAlpha(c.color, on ? 0.18 : 0.03) }]}>
              <Icon name={c.icon} size={18} color={c.color} />
              <Txt v="small" color={on ? C.white : C.textDim} style={{ fontSize: 12.5 }} numberOfLines={1}>
                {c.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <View style={{ marginTop: 10 }}>
        <Segment value={want} onChange={setWant} color={want === 'want' ? C.orange : C.green} options={[{ value: 'need', label: 'Need' }, { value: 'want', label: 'Want' }]} />
      </View>
      <Input placeholder="Note (optional)" value={note} onChangeText={setNote} maxLength={60} style={{ marginTop: 10 }} />
      <Btn
        kind="solid"
        color={C.gold}
        icon="cash-minus"
        label="Log expense"
        disabled={!valid}
        testID="log-spend"
        onPress={() => {
          life.logExpense({ amount: value, cat, note, essential: want === 'need' });
          reset();
        }}
      />
      {want === 'want' && valid ? (
        <Btn
          kind="ghost"
          color={C.purple}
          icon="shield-half-full"
          label="Not bought yet? Hold 24 h"
          style={{ marginTop: 6 }}
          testID="spend-wish"
          onPress={() => {
            life.addWish(note || MONEY_CAT_MAP[cat].label, value);
            reset();
          }}
        />
      ) : null}
      <Txt v="tiny" center style={{ marginTop: 8 }}>
        Spent today: {fmtMoney(spentToday)}
      </Txt>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Skill practice                                                      */
/* ------------------------------------------------------------------ */

const MINUTES = [10, 15, 30, 45, 60, 90];

export function SkillForm({ onDone }: { onDone?: () => void }) {
  const skills = useGame((s) => s.game.track.skills);
  const [picked, setPicked] = useState<string | null>(null);
  const [min, setMin] = useState(30);
  const id = picked ?? skills[0]?.id ?? null;
  if (!skills.length) {
    return (
      <View>
        <Txt v="small" style={{ marginBottom: 10 }}>
          Pick a skill to start tracking. Every hour of practice moves you up a tier: Novice → Apprentice (5 h) → Adept (20 h) → Expert → Master.
        </Txt>
        <Row gap={6} wrap>
          {SKILL_PRESETS.map((p) => (
            <Chip key={p.name} label={p.name} icon={p.icon} onPress={() => life.addSkill(p.name, p.icon, p.stat)} testID={`preset-${p.name}`} />
          ))}
        </Row>
        <Btn kind="ghost" label="Custom skill…" icon="plus" onPress={() => router.push('/skills')} style={{ marginTop: 10 }} />
      </View>
    );
  }
  return (
    <View>
      <Row gap={6} wrap>
        {skills.map((k) => (
          <Chip key={k.id} label={`${k.name} · ${skillTier(k.minutes).name}`} icon={k.icon} active={k.id === id} onPress={() => setPicked(k.id)} />
        ))}
      </Row>
      <Txt v="label" style={{ marginTop: 14, marginBottom: 8 }}>
        Minutes practised
      </Txt>
      <Row gap={6} wrap>
        {MINUTES.map((m) => (
          <Chip key={m} label={`${m}`} active={m === min} onPress={() => setMin(m)} color={C.purple} testID={`min-chip-${m}`} />
        ))}
      </Row>
      <Btn
        kind="solid"
        color={C.purple}
        icon="timer-check"
        label={`Log ${min} min`}
        style={{ marginTop: 14 }}
        disabled={!id}
        testID="log-skill"
        onPress={() => {
          if (id) life.logSkill(id, min);
          onDone?.();
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export function PeopleForm({ onDone }: { onDone?: () => void }) {
  const g = useGame((s) => s.game);
  const t = today();
  const due = peopleDue(g, t);
  const rest = g.track.people.filter((p) => !due.some((d) => d.p.id === p.id));
  const [name, setName] = useState('');
  if (!g.track.people.length) {
    return (
      <View>
        <Txt v="small" style={{ marginBottom: 10 }}>
          Add the people who matter. The System reminds you when it has been a while — small, regular contact keeps bonds strong.
        </Txt>
        <QuickAddPerson name={name} setName={setName} />
      </View>
    );
  }
  return (
    <View>
      {due.length ? (
        <Txt v="label" color={C.gold} style={{ marginBottom: 6 }}>
          Due for a hello
        </Txt>
      ) : (
        <Txt v="small" style={{ marginBottom: 6 }}>
          Everyone is up to date. Nice.
        </Txt>
      )}
      {[...due.map((d) => d.p), ...rest].map((p) => {
        const contacted = p.lastContact === t;
        const rel = RELATIONS.find((r) => r.id === p.relation);
        return (
          <Row key={p.id} gap={10} style={styles.personRow}>
            <Icon name={rel?.icon ?? 'account'} size={20} color={C.pink} />
            <View style={{ flex: 1 }}>
              <Txt v="bodyB">{p.name}</Txt>
              <Txt v="tiny">{p.lastContact ? `Last: ${p.lastContact}` : 'Not contacted yet'} · every {p.everyDays} d</Txt>
            </View>
            <Btn
              size="sm"
              kind={contacted ? 'ghost' : 'solid'}
              color={contacted ? C.green : C.pink}
              icon={contacted ? 'check' : 'message-text'}
              label={contacted ? 'Done' : 'Reached out'}
              disabled={contacted}
              onPress={() => {
                life.contact(p.id);
                if (due.length <= 1) onDone?.();
              }}
            />
          </Row>
        );
      })}
      <View style={{ marginTop: 10 }}>
        <QuickAddPerson name={name} setName={setName} />
      </View>
    </View>
  );
}

function QuickAddPerson({ name, setName }: { name: string; setName: (v: string) => void }) {
  const [rel, setRel] = useState<(typeof RELATIONS)[number]['id']>('family');
  return (
    <View>
      <Row gap={6} wrap style={{ marginBottom: 8 }}>
        {RELATIONS.map((r) => (
          <Chip key={r.id} label={r.label} icon={r.icon} active={rel === r.id} color={C.pink} onPress={() => setRel(r.id)} />
        ))}
      </Row>
      <Row gap={8}>
        <View style={{ flex: 1 }}>
          <Input placeholder="Name, e.g. Mom" value={name} onChangeText={setName} maxLength={24} testID="person-name" />
        </View>
        <Btn
          icon="account-plus"
          color={C.pink}
          disabled={!name.trim()}
          testID="person-add"
          onPress={() => {
            life.addPerson({ name, relation: rel, everyDays: RELATIONS.find((r) => r.id === rel)?.days ?? 14 });
            setName('');
          }}
        />
      </Row>
      <Txt v="tiny">
        Reminder every {RELATIONS.find((r) => r.id === rel)?.days} days · change it in People
      </Txt>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Top 3                                                               */
/* ------------------------------------------------------------------ */

export function PlanEditor({ onDone }: { onDone?: () => void }) {
  const existing = useGame((s) => s.game.track.plans[today()]);
  const [items, setItems] = useState<string[]>(() => Array.from({ length: PLAN_SIZE }, (_, i) => existing?.items[i]?.text ?? ''));
  const ph = ['The one thing that matters most', 'Second priority', 'A small win'];
  return (
    <View>
      <Txt v="small" style={{ marginBottom: 10 }}>
        Pick only three. Finishing all three gives a bonus — fewer, clearer goals beat a long list.
      </Txt>
      {items.map((v, i) => (
        <Row key={i} gap={8} style={{ alignItems: 'flex-start' }}>
          <Txt style={{ fontFamily: F.display, color: C.gold, fontSize: 18, marginTop: 10, width: 18 }}>{i + 1}</Txt>
          <View style={{ flex: 1 }}>
            <Input value={v} placeholder={ph[i]} maxLength={60} onChangeText={(x) => setItems((arr) => arr.map((y, j) => (j === i ? x : y)))} testID={`plan-item-${i}`} />
          </View>
        </Row>
      ))}
      <Btn
        kind="solid"
        color={C.gold}
        icon="format-list-checks"
        label="Save my Top 3"
        disabled={!items.some((x) => x.trim())}
        testID="plan-save"
        onPress={() => {
          life.setPlan(items);
          onDone?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, minHeight: 46 },
  catTile: { flexBasis: '22%', flexGrow: 1, alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 4, paddingVertical: 8 },
  personRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.lineDim, alignItems: 'center' },
});
