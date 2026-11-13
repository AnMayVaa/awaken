/**
 * Cloud save: one JSON row per user in `player_states` (RLS protected).
 * Local-first: the game always runs from local storage; we push changes
 * (debounced) and pull on sign-in / app resume. Newest save wins.
 */
import type { Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { rankForLevel } from '@/game/engine';
import type { GameState } from '@/game/types';
import { toast } from '@/store/alerts';
import { actions, replaceGame, useGame } from '@/store/game';

import { cloudEnabled, supabase } from './supabase';

type SyncStatus = 'offline' | 'idle' | 'syncing' | 'synced' | 'error';

interface AuthStore {
  session: Session | null;
  ready: boolean;
  status: SyncStatus;
  lastSync: number | null;
  error: string | null;
}

export const useAuth = create<AuthStore>(() => ({
  session: null,
  ready: !cloudEnabled,
  status: cloudEnabled ? 'idle' : 'offline',
  lastSync: null,
  error: null,
}));

let lastPushed = 0;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;
let lastPull = 0;

const uidOf = () => useAuth.getState().session?.user.id ?? null;

async function push() {
  const uid = uidOf();
  if (!supabase || !uid) return;
  const g = useGame.getState().game;
  if (!g.onboarded) return;
  const payload: GameState = { ...g, syncedUserId: uid };
  useAuth.setState({ status: 'syncing' });
  const { error } = await supabase.from('player_states').upsert({
    user_id: uid,
    state: payload,
    level: g.player.level,
    rank: rankForLevel(g.player.level).rank,
    display_name: g.player.name,
    updated_at: new Date(g.updatedAt).toISOString(),
  });
  if (error) {
    useAuth.setState({ status: 'error', error: error.message });
    return;
  }
  lastPushed = g.updatedAt;
  if (g.syncedUserId !== uid) {
    // mark local save as linked without bumping updatedAt
    useGame.setState({ game: { ...useGame.getState().game, syncedUserId: uid } });
  }
  useAuth.setState({ status: 'synced', lastSync: Date.now(), error: null });
}

export function schedulePush(delay = 2500) {
  if (!supabase || !uidOf()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    push().catch((e) => useAuth.setState({ status: 'error', error: String(e) }));
  }, delay);
}

export async function pull(reason: 'signin' | 'resume' | 'manual' = 'manual') {
  const uid = uidOf();
  if (!supabase || !uid) return;
  lastPull = Date.now();
  useAuth.setState({ status: 'syncing' });
  const { data, error } = await supabase.from('player_states').select('state, updated_at').eq('user_id', uid).maybeSingle();
  if (error) {
    useAuth.setState({ status: 'error', error: error.message });
    return;
  }
  const local = useGame.getState().game;
  if (!data) {
    await push();
    if (reason === 'signin') toast('CLOUD SAVE CREATED', ['Your progress is now backed up.']);
    return;
  }
  const remote = data.state as GameState;
  const remoteAt = new Date(data.updated_at as string).getTime();
  const linked = local.syncedUserId === uid;
  const takeRemote = !linked || !local.onboarded || remoteAt > local.updatedAt;
  if (takeRemote && remote?.player) {
    lastPushed = remoteAt;
    replaceGame({ ...remote, syncedUserId: uid, updatedAt: remoteAt });
    actions.tick();
    useAuth.setState({ status: 'synced', lastSync: Date.now(), error: null });
    if (reason !== 'resume') toast('CLOUD SAVE LOADED', [`Welcome back, ${remote.player.name}.`]);
  } else if (local.updatedAt > remoteAt) {
    await push();
  } else {
    useAuth.setState({ status: 'synced', lastSync: Date.now(), error: null });
  }
}

export function startSync() {
  if (started || !supabase) return;
  started = true;

  supabase.auth.getSession().then(({ data }) => {
    useAuth.setState({ session: data.session, ready: true });
    if (data.session) pull('resume');
  });

  supabase.auth.onAuthStateChange((event, session) => {
    const prev = useAuth.getState().session?.user.id;
    useAuth.setState({ session, ready: true });
    if (event === 'SIGNED_IN' && session && session.user.id !== prev) pull('signin');
    if (event === 'SIGNED_OUT') useAuth.setState({ status: 'idle', lastSync: null });
  });

  useGame.subscribe((s, prev) => {
    if (s.game.updatedAt !== prev.game.updatedAt && s.game.updatedAt > lastPushed) schedulePush();
  });

  AppState.addEventListener('change', (st) => {
    if (st === 'active' && Date.now() - lastPull > 30000) pull('resume');
    if (st === 'background' && pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
      push();
    }
  });
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Cloud sync is not configured.');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function signUp(email: string, password: string): Promise<'signed-in' | 'confirm-email'> {
  if (!supabase) throw new Error('Cloud sync is not configured.');
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  return data.session ? 'signed-in' : 'confirm-email';
}

export async function signOut() {
  if (!supabase) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
    await push();
  }
  await supabase.auth.signOut();
}

export async function resetPassword(email: string) {
  if (!supabase) throw new Error('Cloud sync is not configured.');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw error;
}
