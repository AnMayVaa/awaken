import React, { useState } from 'react';
import { Linking, Platform, Switch, View } from 'react-native';

import { DAILY_ELIGIBLE, DIFFICULTY_META, DUNGEON_GRACE_SEC } from '@/game/constants';
import type { Difficulty } from '@/game/types';
import { APK_URL, REPO_URL, WEB_URL } from '@/lib/links';
import { notificationsSupported, requestNotificationPermission } from '@/lib/notifications';
import { cloudEnabled } from '@/lib/supabase';
import { pull, signOut, useAuth } from '@/lib/sync';
import { systemConfirm, toast } from '@/store/alerts';
import { actions, useGame } from '@/store/game';
import { AuthForm } from '@/ui/AuthForm';
import { Btn, Chip, Input, Panel, Row, Segment, Txt } from '@/ui/kit';
import { Columns, Screen } from '@/ui/Screen';
import { C, withAlpha } from '@/ui/theme';

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row gap={12} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineDim }}>
      <View style={{ flex: 1 }}>
        <Txt v="bodyB">{label}</Txt>
        {desc ? <Txt v="tiny">{desc}</Txt> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#1A2A3D', true: withAlpha(C.cyan, 0.6) }}
        thumbColor={value ? C.cyanHi : '#7A8A9C'}
        {...(Platform.OS === 'web' ? ({ activeThumbColor: C.cyanHi } as object) : {})}
      />
    </Row>
  );
}

function HourPicker({ label, value, onChange }: { label: string; value: number; onChange: (h: number) => void }) {
  return (
    <Row gap={10} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineDim }}>
      <Txt v="bodyB" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Btn size="sm" icon="minus" onPress={() => onChange((value + 23) % 24)} />
      <Txt v="num" style={{ width: 64, textAlign: 'center' }} color={C.cyanHi}>
        {String(value).padStart(2, '0')}:00
      </Txt>
      <Btn size="sm" icon="plus" onPress={() => onChange((value + 1) % 24)} />
    </Row>
  );
}

export default function SettingsScreen() {
  const g = useGame((s) => s.game);
  const s = g.settings;
  const session = useAuth((x) => x.session);
  const status = useAuth((x) => x.status);
  const lastSync = useAuth((x) => x.lastSync);
  const syncError = useAuth((x) => x.error);
  const [name, setName] = useState(g.player.name);

  const toggleDaily = (id: string) => {
    const cur = s.dailyExercises;
    const next = cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : cur.length >= 5 ? cur : [...cur, id];
    actions.settings({ dailyExercises: next });
  };

  const account = (
    <Panel key="acc" title="Account & cloud sync" icon="cloud-sync">
      {session ? (
        <>
          <Txt v="body">
            Signed in as <Txt v="bodyB" color={C.cyanHi}>{session.user.email}</Txt>
          </Txt>
          <Txt v="small" style={{ marginTop: 4 }} color={status === 'error' ? C.red : C.textDim}>
            {status === 'error'
              ? `Sync error: ${syncError}`
              : status === 'syncing'
                ? 'Syncing…'
                : lastSync
                  ? `Last synced ${new Date(lastSync).toLocaleTimeString()}`
                  : 'Ready'}
          </Txt>
          <Row style={{ marginTop: 12 }}>
            <Btn flex label="Sync now" icon="cloud-refresh" onPress={() => pull('manual')} />
            <Btn flex label="Sign out" icon="logout" color={C.red} onPress={() => systemConfirm('SIGN OUT?', ['Your progress stays on this device and in the cloud.'], () => signOut(), { confirmLabel: 'Sign out' })} />
          </Row>
        </>
      ) : (
        <>
          {cloudEnabled ? (
            <Txt v="small" style={{ marginBottom: 12 }}>
              Sign in to back up your progress and play on any device — iPhone, Android or web.
            </Txt>
          ) : null}
          <AuthForm />
        </>
      )}
    </Panel>
  );

  const player = (
    <Panel key="pl" title="Player" icon="account-edit">
      <Input label="Player name" value={name} onChangeText={setName} maxLength={18} onBlur={() => actions.rename(name)} onSubmitEditing={() => actions.rename(name)} />
      <Txt v="label" style={{ marginBottom: 6 }}>
        Difficulty
      </Txt>
      <Segment
        value={s.difficulty}
        onChange={(v: Difficulty) => actions.settings({ difficulty: v })}
        options={(Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_META[d].label }))}
      />
      <Txt v="tiny" style={{ marginTop: 6 }}>
        {DIFFICULTY_META[s.difficulty].desc} Changes apply to today’s quest if not yet cleared.
      </Txt>
      <Txt v="label" style={{ marginTop: 16, marginBottom: 6 }}>
        Daily Quest tasks (1–5)
      </Txt>
      <Row wrap gap={6}>
        {DAILY_ELIGIBLE.map((e) => (
          <Chip key={e.id} label={e.name} icon={e.icon} active={s.dailyExercises.includes(e.id)} onPress={() => toggleDaily(e.id)} />
        ))}
      </Row>
    </Panel>
  );

  const prefs = (
    <Panel key="pr" title="System preferences" icon="tune">
      {notificationsSupported ? (
        <>
          <Toggle
            label="System notifications"
            desc="Morning quest alert, evening warning, dungeon and boss alerts"
            value={s.notifications}
            onChange={async (v) => {
              if (v) {
                const ok = await requestNotificationPermission();
                if (!ok) {
                  toast('PERMISSION DENIED', ['Enable notifications for AWAKEN in system settings.'], 'warning');
                  return;
                }
              }
              actions.settings({ notifications: v });
            }}
          />
          <HourPicker label="Daily Quest alert" value={s.reminderHour} onChange={(h) => actions.settings({ reminderHour: h })} />
          <HourPicker label="Penalty warning" value={s.warningHour} onChange={(h) => actions.settings({ warningHour: h })} />
        </>
      ) : (
        <Txt v="small" style={{ paddingVertical: 8 }}>
          Notifications are available in the iPhone / Android app. On web, System alerts appear inside the app.
        </Txt>
      )}
      <Toggle label="Strict dungeons" desc={`Leaving the app for over ${DUNGEON_GRACE_SEC}s during a dungeon makes it collapse`} value={s.strictDungeon} onChange={(v) => actions.settings({ strictDungeon: v })} />
      {Platform.OS !== 'web' ? <Toggle label="Haptics" value={s.haptics} onChange={(v) => actions.settings({ haptics: v })} /> : null}
    </Panel>
  );

  const getApp = (
    <Panel key="ga" title="Get AWAKEN everywhere" icon="cellphone-link" color={C.green}>
      <Txt v="small" style={{ marginBottom: 10 }}>
        iPhone: open the web app in Safari → Share → Add to Home Screen. Android: install the APK. Sign in to keep progress in sync.
      </Txt>
      <Row wrap gap={8}>
        <Btn size="sm" color={C.green} label="Web app" icon="web" onPress={() => Linking.openURL(WEB_URL)} />
        <Btn size="sm" color={C.green} label="Android APK" icon="android" onPress={() => Linking.openURL(APK_URL)} />
        <Btn size="sm" color={C.textDim} label="Source" icon="github" onPress={() => Linking.openURL(REPO_URL)} />
      </Row>
    </Panel>
  );

  const danger = (
    <Panel key="dz" title="Danger zone" icon="alert" color={C.red}>
      <Txt v="small" style={{ marginBottom: 10 }}>
        Erase this Player and start over from Level 1.{session ? ' The cloud save will be overwritten on next sync.' : ''}
      </Txt>
      <Btn
        label="Reset all progress"
        icon="delete-forever"
        color={C.red}
        onPress={() =>
          systemConfirm('RESET PLAYER?', ['All levels, stats, habits and items will be erased.', 'This cannot be undone.'], () => actions.reset(), {
            confirmLabel: 'Erase',
            tone: 'penalty',
          })
        }
      />
      <Txt v="tiny" center style={{ marginTop: 16 }}>
        AWAKEN v1.0 · Local save {(JSON.stringify(g).length / 1024).toFixed(1)} KB
      </Txt>
    </Panel>
  );

  return (
    <Screen title="SETTINGS" subtitle="Configuration" back inTabs={false}>
      <Columns>
        {[
          <View key="l">
            {account}
            {player}
          </View>,
          <View key="r">
            {prefs}
            {getApp}
            {danger}
          </View>,
        ]}
      </Columns>
    </Screen>
  );
}
