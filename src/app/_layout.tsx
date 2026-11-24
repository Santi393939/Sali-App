import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { View } from 'react-native';

import { ThemeVeil } from '@/components/ThemeVeil';
import { useActiveThemeId } from '@/store/rewards';
import { startSync } from '@/store/sync';
import { PALETTES, setActiveTheme } from '@/theme';

startSync();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // The badge theme being worn colours the whole app. Set it before anything
  // renders, and rebuild the screens when it changes (the tab you are on and
  // your place on Me are kept).
  const themeId = useActiveThemeId();
  setActiveTheme(themeId);
  // Read from the theme id (not the shared palette object) so the React
  // Compiler sees these colours change with the theme.
  const palette = PALETTES[themeId];

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.plaster }}>
      <StatusBar style={palette.statusBar} />
      <View key={themeId} style={{ flex: 1, backgroundColor: palette.plaster }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.plaster },
        }}>
        <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
      </Stack>
      </View>
      <ThemeVeil />
    </GestureHandlerRootView>
  );
}
