import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import { Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme, View } from 'react-native';

import { ThemeVeil } from '@/components/ThemeVeil';
import { ToastHost } from '@/components/ToastHost';
import { startReminders } from '@/lib/notifications';
import { useActiveThemeId } from '@/store/rewards';
import { startGroups } from '@/store/groups';
import { startSync } from '@/store/sync';
import { paletteFor, setActiveTheme } from '@/theme';
import { setLanguage } from '@/lib/i18n';
import { useSettings } from '@/store/settings';

startSync();
startGroups();
startReminders();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // The badge theme being worn colours the whole app. Set it before anything
  // renders, and rebuild the screens when it changes (the tab you are on and
  // your place on Me are kept).
  const themeId = useActiveThemeId();
  // Read from the theme id (not the shared palette object) so the React
  // Compiler sees these colours change with the theme.
  // Dark mode follows the phone unless chosen in Me › Appearance.
  const scheme = useColorScheme();
  const appearance = useSettings().appearance;
  const dark = appearance === 'dark' || (appearance === 'system' && scheme === 'dark');
  setActiveTheme(themeId, dark);
  const palette = paletteFor(themeId, dark);
  // Language works the same way: set before rendering, screens rebuilt on change.
  const lang = useSettings().language;
  setLanguage(lang);
  const direction = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.plaster }}>
      <StatusBar style={palette.statusBar} />
      <View key={`${themeId}-${dark ? 'dark' : 'light'}-${lang}`} style={{ flex: 1, backgroundColor: palette.plaster, direction }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.plaster, direction },
        }}>
        <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
        <Stack.Screen name="city" options={{ presentation: 'modal' }} />
        <Stack.Screen name="privacy" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tasbih" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="recap" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="rewards" />
        <Stack.Screen name="settings" />
      </Stack>
      </View>
      <ToastHost />
      <ThemeVeil />
    </GestureHandlerRootView>
  );
}
