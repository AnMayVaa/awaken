import { Orbitron_500Medium } from '@expo-google-fonts/orbitron/500Medium';
import { Orbitron_700Bold } from '@expo-google-fonts/orbitron/700Bold';
import { Orbitron_900Black } from '@expo-google-fonts/orbitron/900Black';
import { Rajdhani_500Medium } from '@expo-google-fonts/rajdhani/500Medium';
import { Rajdhani_600SemiBold } from '@expo-google-fonts/rajdhani/600SemiBold';
import { Rajdhani_700Bold } from '@expo-google-fonts/rajdhani/700Bold';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useGame } from '@/store/game';
import { AlertHost } from '@/ui/AlertHost';
import { GameClock } from '@/ui/GameClock';
import { Onboarding } from '@/ui/Onboarding';
import { QuickLogSheet } from '@/ui/QuickLog';
import { C } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg0, card: C.bg1, primary: C.cyan, text: C.text, border: C.line },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Orbitron_500Medium,
    Orbitron_700Bold,
    Orbitron_900Black,
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
    ...MaterialCommunityIcons.font,
  });
  const hydrated = useGame((s) => s.hydrated);
  const onboarded = useGame((s) => s.game.onboarded);
  const ready = (fontsLoaded || !!fontError) && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg0 }} />;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <GameClock />
        <View style={{ flex: 1, backgroundColor: C.bg0 }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg0 }, animation: 'fade' }} />
          {onboarded ? <QuickLogSheet /> : null}
          {!onboarded ? <Onboarding /> : null}
          <AlertHost />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
