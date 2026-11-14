import { router } from 'expo-router';
import React from 'react';

import { actions } from '@/store/game';
import { Panel } from '@/ui/kit';
import { PlanBuilder } from '@/ui/PlanBuilder';
import { Screen } from '@/ui/Screen';

/** Re-run the Plan Builder any time: answers replace your daily load, focus and style. */
export default function PlanScreen() {
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <Screen title="YOUR PLAN" subtitle="The System adapts to you" back inTabs={false}>
      <Panel title="Personalize" icon="auto-fix">
        <PlanBuilder
          intro="Answer a few quick questions. Your progress, items and stats are kept — only your daily load, focus and style change."
          onCancel={close}
          onDone={(c) => {
            close();
            setTimeout(() => actions.applyPlan(c.plan, c.opts), 250);
          }}
        />
      </Panel>
    </Screen>
  );
}
