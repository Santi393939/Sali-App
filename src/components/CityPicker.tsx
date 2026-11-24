/** Search a city (or use the phone's location) for Maghrib and Asr times. */
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { CITIES } from '@/content/cities';
import { feedback } from '@/lib/feedback';
import { asrOn, getLocation, maghribOn, type SavedLocation } from '@/lib/salliDay';
import { setCity } from '@/store/settings';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

const time = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export function CityPicker({ onPicked }: { onPicked?: (loc: SavedLocation) => void }) {
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState<SavedLocation | null>(getLocation());
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? CITIES.filter((c) => `${c.city} ${c.country}`.toLowerCase().includes(q)) : CITIES;
    return list.slice(0, q ? 12 : 8);
  }, [query]);

  const pick = (loc: SavedLocation) => {
    feedback.medium();
    setCity(loc);
    setCurrent(loc);
    setError(null);
    onPicked?.(loc);
  };

  const useMyLocation = async () => {
    setError(null);
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error('Location permission was not given. Pick your city from the list instead.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      let name = 'My location';
      try {
        const [place] = await Location.reverseGeocodeAsync(pos.coords);
        if (place?.city) name = place.city;
      } catch {}
      pick({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, city: name });
    } catch (e) {
      setError(e instanceof Error && e.message.includes('permission') ? e.message : 'Could not find your location here. Pick your city from the list.');
    } finally {
      setLocating(false);
    }
  };

  const today = new Date();
  return (
    <View style={{ gap: spacing.md }}>
      {current && (
        <View style={styles.current}>
          <Text style={styles.currentCity}>{current.city}</Text>
          <Text style={styles.currentTimes}>
            Asr {time(asrOn(today))} · Maghrib {time(maghribOn(today))}
          </Text>
          <Text style={styles.currentHint}>Your day, streak and reminders follow Maghrib here.</Text>
        </View>
      )}

      <Pressable onPress={useMyLocation} accessibilityRole="button" style={({ pressed }) => [styles.locate, pressed && { opacity: 0.8 }]}>
        {locating ? (
          <ActivityIndicator color={colors.link} />
        ) : (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.link} strokeWidth={1.8} strokeLinecap="round">
            <Circle cx={12} cy={12} r={3.5} />
            <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
          </Svg>
        )}
        <Text style={styles.locateText}>Use my location</Text>
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search your city"
        placeholderTextColor={colors.muted}
        style={styles.search}
        accessibilityLabel="Search your city"
        autoCorrect={false}
      />
      <View style={styles.list}>
        {results.map((c) => {
          const selected = current?.city === c.city && Math.abs(current.latitude - c.latitude) < 0.01;
          return (
            <Pressable
              key={`${c.city}-${c.country}`}
              onPress={() => pick({ latitude: c.latitude, longitude: c.longitude, city: c.city })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.item, selected && styles.itemSelected, pressed && { opacity: 0.8 }]}>
              <Text style={styles.itemCity}>{c.city}</Text>
              <Text style={styles.itemCountry}>{c.country}</Text>
            </Pressable>
          );
        })}
        {results.length === 0 && <Text style={styles.none}>No match. Try “Use my location”, or a nearby big city.</Text>}
      </View>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    current: { backgroundColor: colors.highlight, borderRadius: radius.card, borderWidth: 1, borderColor: colors.saffron, padding: spacing.lg, alignItems: 'center' },
    currentCity: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
    currentTimes: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.terracotta, marginTop: 2 },
    currentHint: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: 4, textAlign: 'center' },
    locate: {
      height: 52,
      borderRadius: radius.button,
      borderWidth: 1.5,
      borderColor: colors.saffron,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    locateText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.link },
    error: { fontFamily: fonts.ui, fontSize: 13, color: colors.terracotta, textAlign: 'center' },
    search: {
      height: 50,
      borderRadius: radius.button,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.lg,
      fontFamily: fonts.ui,
      fontSize: 15,
      color: colors.ink,
    },
    list: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, overflow: 'hidden' },
    item: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: -1 },
    itemSelected: { backgroundColor: colors.highlight },
    itemCity: { fontFamily: fonts.uiMedium, fontSize: 15, color: colors.ink },
    itemCountry: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted },
    none: { fontFamily: fonts.ui, fontSize: 13, color: colors.muted, padding: spacing.lg, textAlign: 'center' },
  }),
);
