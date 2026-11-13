import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ITEMS, REWARD_ICONS } from '@/game/constants';
import type { ItemId } from '@/game/types';
import { systemConfirm } from '@/store/alerts';
import { actions, useGame } from '@/store/game';
import { Btn, Empty, Icon, Input, Panel, Row, Segment, Txt } from '@/ui/kit';
import { Screen } from '@/ui/Screen';
import { SystemModal } from '@/ui/SystemModal';
import { C, withAlpha } from '@/ui/theme';

type Tab = 'items' | 'rewards' | 'inventory';

export default function ShopScreen() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'inventory' ? 'inventory' : params.tab === 'rewards' ? 'rewards' : 'items');
  const g = useGame((s) => s.game);
  const [form, setForm] = useState<{ name: string; cost: string; icon: string } | null>(null);
  const gold = g.player.gold;

  const save = () => {
    if (!form) return;
    const cost = parseInt(form.cost, 10);
    if (!form.name.trim() || !(cost > 0)) return;
    actions.addReward({ name: form.name.trim(), cost, icon: form.icon });
    setForm(null);
  };

  return (
    <Screen
      title="SHOP"
      subtitle="The System store"
      back
      inTabs={false}
      tint={C.gold}
      right={
        <Row gap={6}>
          <Icon name="hexagon-multiple" color={C.gold} size={18} />
          <Txt v="num" color={C.gold} glowColor={C.gold}>
            {gold.toLocaleString()}
          </Txt>
        </Row>
      }>
      <Segment
        color={C.gold}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'items', label: 'Items' },
          { value: 'rewards', label: 'Rewards' },
          { value: 'inventory', label: 'Inventory' },
        ]}
      />
      <View style={{ height: 14 }} />

      {tab === 'items' ? (
        <Panel title="System items" icon="flask" color={C.gold}>
          {ITEMS.map((it) => {
            const afford = gold >= it.cost;
            return (
              <Row key={it.id} gap={12} style={styles.row}>
                <View style={[styles.itemIcon, { borderColor: withAlpha(it.color, 0.6), backgroundColor: withAlpha(it.color, 0.1) }]}>
                  <Icon name={it.icon} size={24} color={it.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt v="bodyB">
                    {it.name} <Txt v="tiny">owned {g.inventory[it.id] ?? 0}</Txt>
                  </Txt>
                  <Txt v="small">{it.desc}</Txt>
                </View>
                <Btn size="sm" label={`${it.cost} G`} color={C.gold} disabled={!afford} onPress={() => actions.buyItem(it.id)} testID={`buy-${it.id}`} />
              </Row>
            );
          })}
        </Panel>
      ) : null}

      {tab === 'inventory' ? (
        <Panel title="Inventory" icon="bag-personal" color={C.purple}>
          {ITEMS.filter((it) => (g.inventory[it.id] ?? 0) > 0).length === 0 ? <Empty icon="bag-personal-outline" title="Empty" text="Buy items in the shop or loot them from bosses." /> : null}
          {ITEMS.filter((it) => (g.inventory[it.id] ?? 0) > 0).map((it) => (
            <Row key={it.id} gap={12} style={styles.row}>
              <View style={[styles.itemIcon, { borderColor: withAlpha(it.color, 0.6), backgroundColor: withAlpha(it.color, 0.1) }]}>
                <Icon name={it.icon} size={24} color={it.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt v="bodyB">
                  {it.name} <Txt v="num" color={it.color} style={{ fontSize: 13 }}>×{g.inventory[it.id]}</Txt>
                </Txt>
                <Txt v="small">{it.desc}</Txt>
              </View>
              {it.id === 'streak_shield' ? (
                <Txt v="tiny" color={C.blue}>
                  PASSIVE
                </Txt>
              ) : (
                <Btn size="sm" label="Use" color={it.color} onPress={() => actions.useItem(it.id as ItemId)} />
              )}
            </Row>
          ))}
        </Panel>
      ) : null}

      {tab === 'rewards' ? (
        <>
          <Panel title="My rewards" icon="gift" color={C.gold} right={<Btn size="sm" icon="plus" label="Add" color={C.gold} onPress={() => setForm({ name: '', cost: '200', icon: 'gift' })} />}>
            <Txt v="small" style={{ marginBottom: 6 }}>
              Turn gold into real-life treats. Set the price — make the good stuff expensive.
            </Txt>
            {!g.rewards.length ? <Empty icon="gift-outline" title="No rewards" text="Add something you enjoy." /> : null}
            {g.rewards.map((r) => {
              const afford = gold >= r.cost;
              return (
                <Row key={r.id} gap={12} style={styles.row}>
                  <Icon name={r.icon} size={24} color={C.gold} />
                  <Pressable
                    style={{ flex: 1 }}
                    onLongPress={() => systemConfirm('DELETE REWARD?', [r.name], () => actions.deleteReward(r.id), { confirmLabel: 'Delete', tone: 'penalty' })}>
                    <Txt v="bodyB">{r.name}</Txt>
                    <Txt v="tiny">{r.cost} Gold · long-press to delete</Txt>
                  </Pressable>
                  <Btn
                    size="sm"
                    label="Redeem"
                    color={C.gold}
                    disabled={!afford}
                    onPress={() => systemConfirm('REDEEM REWARD?', [r.name, `−${r.cost} Gold`], () => actions.redeemReward(r.id), { confirmLabel: 'Redeem', tone: 'achievement' })}
                  />
                </Row>
              );
            })}
          </Panel>
          {g.purchases.length ? (
            <Panel title="Redeemed" icon="receipt" color={C.textDim}>
              {g.purchases.slice(0, 10).map((p) => (
                <Row key={p.id} style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
                  <Txt v="body">{p.name}</Txt>
                  <Txt v="tiny">
                    {new Date(p.ts).toLocaleDateString()} · −{p.cost} G
                  </Txt>
                </Row>
              ))}
            </Panel>
          ) : null}
        </>
      ) : null}

      <SystemModal visible={!!form} onClose={() => setForm(null)} title="New reward" icon="gift" color={C.gold}>
        {form ? (
          <>
            <Input label="Reward" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. Bubble tea" maxLength={40} />
            <Input label="Price (gold)" value={form.cost} onChangeText={(v) => setForm({ ...form, cost: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" />
            <Txt v="label" style={{ marginBottom: 6 }}>
              Icon
            </Txt>
            <Row wrap gap={6} style={{ marginBottom: 16 }}>
              {REWARD_ICONS.map((ic) => (
                <Pressable
                  key={ic}
                  onPress={() => setForm({ ...form, icon: ic })}
                  style={[styles.pick, { borderColor: form.icon === ic ? C.gold : C.lineDim, backgroundColor: form.icon === ic ? withAlpha(C.gold, 0.16) : 'transparent' }]}>
                  <Icon name={ic} size={20} color={form.icon === ic ? C.gold : C.textDim} />
                </Pressable>
              ))}
            </Row>
            <Btn kind="solid" color={C.gold} label="Add reward" icon="check" onPress={save} disabled={!form.name.trim() || !(parseInt(form.cost, 10) > 0)} />
          </>
        ) : null}
      </SystemModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineDim },
  itemIcon: { width: 46, height: 46, borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  pick: { width: 40, height: 40, borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
});
