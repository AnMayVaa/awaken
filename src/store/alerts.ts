import { create } from 'zustand';

import type { GameEvent } from '@/game/types';
import { hapticFor } from '@/lib/haptics';

export interface QueuedAlert extends GameEvent {
  id: string;
  /** optional custom actions for confirm dialogs */
  actions?: { label: string; onPress?: () => void; kind?: 'solid' | 'outline' | 'ghost'; color?: string }[];
}

interface AlertStore {
  queue: QueuedAlert[];
  toasts: QueuedAlert[];
  push: (events: GameEvent[]) => void;
  confirm: (a: Omit<QueuedAlert, 'id'>) => void;
  dismiss: () => void;
  dropToast: (id: string) => void;
}

let n = 0;
const nid = () => `a${Date.now()}_${n++}`;

export const useAlerts = create<AlertStore>((set) => ({
  queue: [],
  toasts: [],
  push: (events) => {
    if (!events.length) return;
    const major = events.filter((e) => !e.minor).map((e) => ({ ...e, id: nid() }));
    const minor = events.filter((e) => e.minor).map((e) => ({ ...e, id: nid() }));
    const top = major[0] ?? minor[0];
    if (top) hapticFor(top.tone);
    set((s) => ({
      queue: [...s.queue, ...major].slice(-12),
      toasts: [...s.toasts, ...minor].slice(-3),
    }));
  },
  confirm: (a) => set((s) => ({ queue: [...s.queue, { ...a, id: nid() }] })),
  dismiss: () => set((s) => ({ queue: s.queue.slice(1) })),
  dropToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function systemConfirm(
  title: string,
  lines: string[],
  onConfirm: () => void,
  opts: { confirmLabel?: string; tone?: GameEvent['tone']; cancelLabel?: string } = {},
) {
  useAlerts.getState().confirm({
    tone: opts.tone ?? 'warning',
    title,
    lines,
    actions: [
      { label: opts.cancelLabel ?? 'Cancel', kind: 'ghost' },
      { label: opts.confirmLabel ?? 'Confirm', kind: 'solid', onPress: onConfirm },
    ],
  });
}

export function systemNotice(title: string, lines: string[], tone: GameEvent['tone'] = 'info') {
  useAlerts.getState().push([{ title, lines, tone }]);
}

export function toast(title: string, lines: string[] = [], tone: GameEvent['tone'] = 'info') {
  useAlerts.getState().push([{ title, lines, tone, minor: true }]);
}
