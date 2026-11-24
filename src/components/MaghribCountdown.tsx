/** "Lantern waiting · 2 h 14 m until Maghrib" while today's goal isn't met. */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, themedStyles } from '@/theme';
import { dateLocale, t } from '@/lib/i18n';

export function MaghribCountdown({ endsAt, lit }: { endsAt: Date; lit: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const ms = endsAt.getTime() - now;
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const left = h > 0 ? t('{h} h {m} m', { h, m }) : t('{m} m', { m });
  const at = endsAt.toLocaleTimeString(dateLocale(), { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  const urgent = !lit && ms < 3 * 3600000;
  return (
    <View style={[styles.pill, urgent && styles.urgent]}>
      <Text style={[styles.text, urgent && styles.urgentText]}>
        {lit ? t('Lit today · new day at Maghrib, {at}', { at }) : t('Lantern waiting · {left} until Maghrib', { left })}
      </Text>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    pill: { alignSelf: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 12, paddingVertical: 4, marginTop: 6 },
    urgent: { borderColor: colors.saffron, backgroundColor: colors.highlight },
    text: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.muted },
    urgentText: { color: colors.terracotta, fontFamily: fonts.uiSemi },
  }),
);
