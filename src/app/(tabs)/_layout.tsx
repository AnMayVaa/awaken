import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/ui/TabBar';
import { useLayout } from '@/ui/Screen';
import { C } from '@/ui/theme';

export default function TabLayout() {
  const { isWide } = useLayout();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: isWide ? 'left' : 'bottom',
        sceneStyle: { backgroundColor: C.bg0 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Status' }} />
      <Tabs.Screen name="quests" options={{ title: 'Quests' }} />
      <Tabs.Screen name="habits" options={{ title: '66 Days' }} />
      <Tabs.Screen name="train" options={{ title: 'Train' }} />
      <Tabs.Screen name="dungeon" options={{ title: 'Dungeon' }} />
    </Tabs>
  );
}
