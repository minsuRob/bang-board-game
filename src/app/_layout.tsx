import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { preloadArt } from '@/game/ui/art-preload';
import { useColors, useScheme } from '@/game/ui/theme/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useScheme();
  const c = useColors();

  useEffect(() => {
    SplashScreen.hideAsync();
    // 첫 화면에 있는 동안 카드·보드 그림을 전부 받아 둔다
    void preloadArt();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.background },
        }}
      />
    </GestureHandlerRootView>
  );
}
