import React, { useState } from 'react';
import { View } from 'react-native';

import { EXERCISE_MAP, STAT_META } from '@/game/constants';
import { actions } from '@/store/game';

import { Btn, Chip, Icon, Input, Row, Txt } from './kit';
import { SystemModal } from './SystemModal';
import { C } from './theme';

export function LogModal({ exerciseId, onClose }: { exerciseId: string | null; onClose: () => void }) {
  if (!exerciseId || !EXERCISE_MAP[exerciseId]) return null;
  return <LogModalInner key={exerciseId} exerciseId={exerciseId} onClose={onClose} />;
}

function LogModalInner({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const ex = EXERCISE_MAP[exerciseId];
  const [amount, setAmount] = useState(() => String(ex.steps[1] ?? ex.steps[0]));
  const val = parseFloat(amount.replace(',', '.'));
  const valid = Number.isFinite(val) && val > 0 && val < 100000;
  const submit = () => {
    if (!valid) return;
    onClose();
    // let the modal close before popups appear
    setTimeout(() => actions.logWorkout(ex.id, Math.round(val * 100) / 100), 250);
  };
  return (
    <SystemModal visible={!!ex} onClose={onClose} title={`Log ${ex.name}`} icon={ex.icon}>
      <Row gap={8} style={{ marginBottom: 12 }}>
        <Icon name={STAT_META[ex.stat].icon} color={STAT_META[ex.stat].color} size={16} />
        <Txt v="small">
          Trains {STAT_META[ex.stat].name} · {ex.xpPer} XP per {ex.unit === 'reps' ? 'rep' : ex.unit}
        </Txt>
      </Row>
      <Row wrap gap={8} style={{ marginBottom: 12 }}>
        {[...ex.steps, ex.steps[2] * 2].map((s) => (
          <Chip key={s} label={`${s} ${ex.unit}`} active={String(s) === amount} onPress={() => setAmount(String(s))} />
        ))}
      </Row>
      <Input label={`Amount (${ex.unit})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" onSubmitEditing={submit} selectTextOnFocus />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Txt v="label">Estimated reward</Txt>
        <Txt v="num" color={C.cyanHi}>
          +{valid ? Math.round(val * ex.xpPer) : 0} XP
        </Txt>
      </View>
      <Btn kind="solid" label="Log activity" icon="check" onPress={submit} disabled={!valid} testID="log-submit" />
    </SystemModal>
  );
}
