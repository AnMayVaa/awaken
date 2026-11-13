import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Switch, View } from 'react-native';

import { AREAS, type AreaId } from '@/game/areas';
import { MAX_BOARD } from '@/game/director';
import { QUEST_LIBRARY } from '@/game/questLibrary';
import { aiAvailable, requestAIQuests } from '@/lib/ai';
import { useAuth } from '@/lib/sync';
import { toast } from '@/store/alerts';
import { actions, game, useGame } from '@/store/game';

import { Btn, Chip, Empty, Input, Panel, Row, Txt } from './kit';
import { QuestCard, TemplateRow } from './QuestCard';
import { SystemModal } from './SystemModal';
import { C, withAlpha } from './theme';

function AIModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const share = useGame((s) => s.game.profile.aiShareRecovery);
  const hasRecovery = useGame((s) => s.game.recovery.length > 0);
  const session = useAuth((s) => s.session);
  const [wish, setWish] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    const res = await requestAIQuests(game(), wish);
    setBusy(false);
    if ('error' in res) return setErr(res.error);
    onClose();
    setWish('');
    setTimeout(() => {
      const n = actions.addAIQuests(res.quests);
      toast('AI QUESTS ADDED', [`${n} new quest${n === 1 ? '' : 's'} on your board`], 'reward');
    }, 200);
  };

  return (
    <SystemModal visible={visible} onClose={onClose} title="AI Quest Director" icon="robot-happy-outline" color={C.purple}>
      {!session ? (
        <Txt v="body" style={{ marginBottom: 12 }}>
          Sign in first (Settings → Account) — AI quests run on your private Supabase server so your API key stays secret.
        </Txt>
      ) : null}
      <Txt v="small" style={{ marginBottom: 12 }}>
        Gemini designs quests from your focus areas, area levels, Life Wheel, yesterday’s steps/sleep/screen time and recent quests. Mood, wellbeing scores and notes
        are never sent. On Gemini’s free tier Google may use prompts to improve its products.
      </Txt>
      <Input label="Anything specific today? (optional)" value={wish} onChangeText={setWish} placeholder="e.g. exam on Friday, want to feel less lonely" maxLength={300} multiline />
      {hasRecovery ? (
        <Row gap={10} style={{ marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt v="bodyB">Share Break Free goals</Txt>
            <Txt v="tiny">Off by default. Lets the AI add one discreet supportive quest.</Txt>
          </View>
          <Switch value={share} onValueChange={(v) => void actions.setProfile({ aiShareRecovery: v })} trackColor={{ false: '#1A2A3D', true: withAlpha(C.purple, 0.6) }} />
        </Row>
      ) : null}
      {err ? (
        <Txt v="small" color={C.red} style={{ marginBottom: 10 }}>
          {err}
        </Txt>
      ) : null}
      {busy ? (
        <View style={{ alignItems: 'center', paddingVertical: 10, gap: 8 }}>
          <ActivityIndicator color={C.purple} />
          <Txt v="tiny">The System is designing your quests…</Txt>
        </View>
      ) : (
        <Btn kind="solid" color={C.purple} label="Generate quests" icon="creation" onPress={run} disabled={!session} />
      )}
    </SystemModal>
  );
}

export function SideQuestsPanel({ onBrowse }: { onBrowse: () => void }) {
  const board = useGame((s) => s.game.board);
  const [ai, setAi] = useState(false);
  const done = board.quests.filter((q) => q.status === 'done').length;
  const sorted = [...board.quests].sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1));
  return (
    <Panel title="Side Quests" icon="map-marker-star" right={<Txt v="num" style={{ fontSize: 13 }} color={C.cyanHi}>{`${done}/${board.quests.length}`}</Txt>}>
      <Txt v="small" style={{ marginBottom: 10 }}>
        Chosen by the Quest Director from your focus areas, Life Wheel and yesterday’s data. Difficulty adapts to keep you around 80% success — hard enough to grow,
        easy enough to win.
      </Txt>
      {sorted.length ? sorted.map((q) => <QuestCard key={q.id} q={q} />) : <Empty icon="map-search-outline" title="No side quests" text="Browse the library to add some." />}
      <Row gap={8} style={{ marginTop: 4 }} wrap>
        <Btn size="sm" icon="bookshelf" label="Library" onPress={onBrowse} flex />
        {aiAvailable() ? <Btn size="sm" icon="robot-happy-outline" label="AI quests" color={C.purple} onPress={() => setAi(true)} flex testID="ai-quests" /> : null}
      </Row>
      <Txt v="tiny" center style={{ marginTop: 8 }}>
        Rerolls left today: {board.rerolls} · max {MAX_BOARD} open quests
      </Txt>
      <AIModal visible={ai} onClose={() => setAi(false)} />
    </Panel>
  );
}

export function LibraryView() {
  const board = useGame((s) => s.game.board);
  const [area, setArea] = useState<AreaId | 'all'>('all');
  const [tier, setTier] = useState<number | 0>(0);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(40);
  const onBoard = new Set(board.quests.filter((x) => x.status === 'open').map((x) => x.templateId));
  const open = board.quests.filter((x) => x.status === 'open').length;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return QUEST_LIBRARY.filter(
      (t) => (area === 'all' || t.area === area) && (!tier || t.tier === tier) && (!s || t.title.toLowerCase().includes(s) || t.criteria.toLowerCase().includes(s)),
    );
  }, [area, tier, q]);
  return (
    <Panel title={`Quest Library · ${QUEST_LIBRARY.length}`} icon="bookshelf">
      <Input value={q} onChangeText={setQ} placeholder="Search quests…" />
      <Row wrap gap={6} style={{ marginBottom: 10 }}>
        <Chip label="All" active={area === 'all'} onPress={() => setArea('all')} />
        {AREAS.map((a) => (
          <Chip key={a.id} label={a.short} icon={a.icon} color={a.color} active={area === a.id} onPress={() => setArea(a.id)} />
        ))}
      </Row>
      <Row wrap gap={6} style={{ marginBottom: 10 }}>
        {[0, 1, 2, 3, 4, 5].map((t) => (
          <Chip key={t} label={t === 0 ? 'Any rank' : ['', 'E', 'D', 'C', 'B', 'A'][t]} active={tier === t} onPress={() => setTier(t)} />
        ))}
      </Row>
      <Txt v="tiny" style={{ marginBottom: 6 }}>
        {list.length} quests · {open}/{MAX_BOARD} on today’s board
      </Txt>
      {list.slice(0, limit).map((t) => (
        <TemplateRow
          key={t.id}
          t={t}
          added={onBoard.has(t.id)}
          onAdd={() => {
            if (open >= MAX_BOARD) return toast('BOARD FULL', [`Finish or skip a quest first (max ${MAX_BOARD}).`], 'warning');
            actions.addToBoard(t.id);
            toast('ADDED TO TODAY', [t.title], 'info');
          }}
        />
      ))}
      {list.length > limit ? <Btn kind="ghost" label={`Show more (${list.length - limit})`} onPress={() => setLimit((l) => l + 40)} /> : null}
    </Panel>
  );
}
