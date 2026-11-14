import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { formatHM, today } from '@/game/date';
import { budgetRows, fmtMoney, monthOf, MONEY_CAT_MAP, MONEY_CATS, moneyScore, noSpendStreak, spentInMonth, spentOn, WISH_WAIT_MS } from '@/game/tracking';
import type { MoneyCat } from '@/game/types';
import { systemConfirm } from '@/store/alerts';
import { life, useGame } from '@/store/game';
import { Bar, Btn, Chip, Icon, Input, Panel, Pill, Row, Stat, Txt } from '@/ui/kit';
import { SpendForm } from '@/ui/LogForms';
import { Columns, Screen } from '@/ui/Screen';
import { SystemModal } from '@/ui/SystemModal';
import { Hint, ScoreBadge } from '@/ui/Trackers';
import { C } from '@/ui/theme';

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(iv);
  }, [ms]);
  return now;
}

export default function MoneyScreen() {
  const g = useGame((s) => s.game);
  const t = today();
  const now = useNow();
  const tr = g.track;
  const month = monthOf(t);
  const rows = budgetRows(g, t);
  const [budgetCat, setBudgetCat] = useState<MoneyCat | null>(null);
  const [budgetVal, setBudgetVal] = useState('');
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [depositFor, setDepositFor] = useState<string | null>(null);
  const [depositVal, setDepositVal] = useState('');
  const waiting = tr.wishlist.filter((w) => w.status === 'waiting');
  const recent = tr.expenses.slice(-15).reverse();
  const wantsToday = spentOn(g, t, true);
  const noSpendToday = !!tr.noSpend[t];

  return (
    <Screen title="TREASURY" subtitle="Money — calm, simple control" back inTabs={false}>
      <Columns>
        {[
          <View key="l">
            <Panel title="Overview" icon="treasure-chest" color={C.gold}>
              <Row gap={14}>
                <ScoreBadge value={moneyScore(g, t)} label="Money score" color={C.gold} />
                <View style={{ flex: 1 }}>
                  <Row>
                    <Stat label="This month" value={fmtMoney(spentInMonth(g, month))} color={C.text} />
                    <Stat label="Kept" value={fmtMoney(tr.savedByWaiting)} color={C.green} />
                  </Row>
                  <Row style={{ marginTop: 8 }}>
                    <Stat label="Today" value={fmtMoney(spentOn(g, t))} color={C.text} />
                    <Stat label="No-spend" value={`${noSpendStreak(g, t)}d`} color={C.cyan} />
                  </Row>
                </View>
              </Row>
              <Btn
                style={{ marginTop: 12 }}
                kind={noSpendToday ? 'ghost' : 'solid'}
                color={noSpendToday ? C.green : C.cyan}
                icon={noSpendToday ? 'check-decagram' : 'wallet'}
                label={noSpendToday ? 'No-spend day ✓' : wantsToday > 0 ? `Wants: ${fmtMoney(wantsToday)}` : 'Mark no-spend day'}
                disabled={noSpendToday || wantsToday > 0}
                onPress={() => life.noSpend()}
                testID="no-spend"
              />
            </Panel>
            <Panel title="Log spending" icon="cash-minus" color={C.gold}>
              <SpendForm />
            </Panel>
            <Panel title="Recent" icon="receipt">
              {!recent.length ? <Txt v="small">No expenses yet. Logging is the habit that changes everything else.</Txt> : null}
              {recent.map((e) => (
                <Row key={e.id} gap={10} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.lineDim, alignItems: 'center' }}>
                  <Icon name={MONEY_CAT_MAP[e.cat].icon} size={18} color={MONEY_CAT_MAP[e.cat].color} />
                  <View style={{ flex: 1 }}>
                    <Txt v="bodyB" numberOfLines={1}>
                      {e.note || MONEY_CAT_MAP[e.cat].label}
                    </Txt>
                    <Txt v="tiny">
                      {e.date} · {e.essential ? 'need' : 'want'}
                    </Txt>
                  </View>
                  <Txt v="num" style={{ fontSize: 14 }}>
                    {fmtMoney(e.amount)}
                  </Txt>
                  <Pressable onPress={() => life.deleteExpense(e.id)} hitSlop={10} accessibilityLabel="Delete expense">
                    <Icon name="close" size={16} color={C.muted} />
                  </Pressable>
                </Row>
              ))}
            </Panel>
          </View>,
          <View key="r">
            <Panel title="Impulse Shield" icon="shield-half-full" color={C.purple} right={waiting.length ? <Pill text={`${waiting.length} ON HOLD`} color={C.purple} /> : undefined}>
              <Txt v="small" style={{ marginBottom: 8 }}>
                Want something? Put it on hold for 24 h. Most urges fade — skipping counts as an urge resisted.
              </Txt>
              {waiting.map((w) => {
                const left = WISH_WAIT_MS - (now - w.addedAt);
                return (
                  <View key={w.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.lineDim }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt v="bodyB" style={{ flex: 1 }}>
                        {w.name}
                      </Txt>
                      <Txt v="num" color={C.gold} style={{ fontSize: 14 }}>
                        {fmtMoney(w.price)}
                      </Txt>
                    </Row>
                    <Txt v="tiny">{left > 0 ? `Decide in ${formatHM(left)}` : 'Ready to decide — do you still want it?'}</Txt>
                    <Row gap={6} style={{ marginTop: 6 }}>
                      <Btn flex size="sm" kind="solid" color={C.green} icon="hand-back-left" label="Skip it" onPress={() => life.decideWish(w.id, false)} />
                      <Btn flex size="sm" color={C.gold} icon="cart" label="Bought" disabled={left > 0} onPress={() => life.decideWish(w.id, true)} />
                    </Row>
                  </View>
                );
              })}
              <WishQuickAdd />
            </Panel>
            <Panel title="Monthly budgets" icon="chart-donut" right={<Txt v="tiny">{month}</Txt>}>
              {!rows.length ? <Txt v="small">Set a limit for the categories you want to watch — start with Fun or Shopping.</Txt> : null}
              {rows.map((r) => (
                <Pressable key={r.cat} onPress={() => (setBudgetCat(r.cat), setBudgetVal(String(r.limit)))} style={{ marginBottom: 10 }}>
                  <Bar
                    label={MONEY_CAT_MAP[r.cat].label}
                    right={`${fmtMoney(r.spent)} / ${fmtMoney(r.limit)}`}
                    value={Math.min(r.spent, r.limit)}
                    max={r.limit}
                    color={r.pct > 1 ? C.red : r.pace === 'fast' ? C.orange : MONEY_CAT_MAP[r.cat].color}
                    height={8}
                  />
                  {r.pct > 1 ? <Txt v="tiny" color={C.red}>Over by {fmtMoney(-r.left)}</Txt> : r.pace === 'fast' ? <Txt v="tiny" color={C.orange}>Spending faster than the month</Txt> : null}
                </Pressable>
              ))}
              <Row gap={6} wrap style={{ marginTop: 4 }}>
                {MONEY_CATS.filter((c) => !tr.budgets[c.id]).map((c) => (
                  <Chip key={c.id} label={`+ ${c.label}`} icon={c.icon} color={c.color} onPress={() => (setBudgetCat(c.id), setBudgetVal(''))} />
                ))}
              </Row>
            </Panel>
            <Panel title="Savings goals" icon="piggy-bank" color={C.green} right={<Btn size="sm" icon="plus" label="Goal" onPress={() => setGoalOpen(true)} testID="goal-new" />}>
              {!tr.goals.length ? <Txt v="small">Give your savings a name — “Emergency fund ฿5,000” or “New phone”. Milestones pay gold at 25/50/75/100%.</Txt> : null}
              {tr.goals.map((sg) => (
                <View key={sg.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.lineDim }}>
                  <Bar label={sg.name} right={`${fmtMoney(sg.saved)} / ${fmtMoney(sg.target)}`} value={sg.saved} max={sg.target} color={sg.doneAt ? C.green : C.gold} height={8} />
                  {sg.doneAt ? (
                    <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
                      <Txt v="tiny" color={C.green}>
                        Complete!
                      </Txt>
                      <Pressable onPress={() => life.deleteGoal(sg.id)} hitSlop={8}>
                        <Txt v="tiny">Remove</Txt>
                      </Pressable>
                    </Row>
                  ) : (
                    <Row gap={6} style={{ marginTop: 6 }}>
                      {[100, 500, 1000].map((a) => (
                        <Chip key={a} label={`+${a}`} color={C.green} onPress={() => life.deposit(sg.id, a)} />
                      ))}
                      <Chip label="Other" onPress={() => (setDepositFor(sg.id), setDepositVal(''))} />
                      <View style={{ flex: 1 }} />
                      <Pressable onPress={() => systemConfirm('DELETE GOAL', [`Remove “${sg.name}”?`], () => life.deleteGoal(sg.id))} hitSlop={8}>
                        <Icon name="trash-can-outline" size={18} color={C.muted} />
                      </Pressable>
                    </Row>
                  )}
                </View>
              ))}
            </Panel>
            <Panel title="How Treasury feeds the game" icon="link-variant">
              <Hint icon="eye" text="Tracking spending trains Sense. No-spend days and skipped impulses train Willpower." color={C.gold} />
              <Hint icon="storefront" text="Reward yourself with gold, not money: add real treats in the Shop." color={C.purple} />
              <Btn size="sm" icon="storefront" label="Open treat shop" onPress={() => router.push('/shop')} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
            </Panel>
          </View>,
        ]}
      </Columns>

      <SystemModal visible={!!budgetCat} onClose={() => setBudgetCat(null)} title={budgetCat ? `${MONEY_CAT_MAP[budgetCat].label} budget` : 'Budget'} icon="chart-donut" color={C.gold}>
        <Input label="Monthly limit (฿) — 0 removes it" value={budgetVal} onChangeText={setBudgetVal} keyboardType="decimal-pad" autoFocus />
        <Btn
          kind="solid"
          color={C.gold}
          label="Save"
          onPress={() => {
            if (budgetCat) life.setBudget(budgetCat, Number(budgetVal) || 0);
            setBudgetCat(null);
          }}
        />
      </SystemModal>
      <SystemModal visible={goalOpen} onClose={() => setGoalOpen(false)} title="New savings goal" icon="piggy-bank" color={C.green}>
        <Input label="Name" value={goalName} onChangeText={setGoalName} placeholder="e.g. Emergency fund" maxLength={40} />
        <Input label="Target (฿)" value={goalTarget} onChangeText={setGoalTarget} keyboardType="decimal-pad" placeholder="5000" />
        <Btn
          kind="solid"
          color={C.green}
          label="Create goal"
          disabled={!goalName.trim() || !(Number(goalTarget) > 0)}
          onPress={() => {
            life.addGoal(goalName, Number(goalTarget));
            setGoalName('');
            setGoalTarget('');
            setGoalOpen(false);
          }}
        />
      </SystemModal>
      <SystemModal visible={!!depositFor} onClose={() => setDepositFor(null)} title="Add to savings" icon="piggy-bank" color={C.green}>
        <Input label="Amount (฿) — negative to withdraw" value={depositVal} onChangeText={setDepositVal} keyboardType="numbers-and-punctuation" autoFocus />
        <Btn
          kind="solid"
          color={C.green}
          label="Save"
          disabled={!Number(depositVal)}
          onPress={() => {
            if (depositFor) life.deposit(depositFor, Number(depositVal));
            setDepositFor(null);
          }}
        />
      </SystemModal>
    </Screen>
  );
}

function WishQuickAdd() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  return (
    <View style={{ marginTop: 10 }}>
      <Row gap={8}>
        <View style={{ flex: 2 }}>
          <Input placeholder="What do you want?" value={name} onChangeText={setName} maxLength={40} testID="wish-name" />
        </View>
        <View style={{ flex: 1 }}>
          <Input placeholder="฿ price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" testID="wish-price" />
        </View>
      </Row>
      <Btn
        color={C.purple}
        icon="timer-sand"
        label="Hold for 24 h"
        disabled={!name.trim() || !(Number(price) > 0)}
        testID="wish-add"
        onPress={() => {
          life.addWish(name, Number(price));
          setName('');
          setPrice('');
        }}
      />
    </View>
  );
}
