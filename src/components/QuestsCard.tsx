/** Today's three quests, and progress toward the next quest-earned shield. */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Quest } from '@/store/quests';
import { QUEST_DAYS_PER_SHIELD } from '@/store/streaks';
import { colors, fonts, spacing, themedStyles } from '@/theme';

import { Card } from './Card';
import { ShieldIcon } from './StreakTakeover';
import { isRTL, t } from '@/lib/i18n';

export function QuestsCard({ quests, questDays }: { quests: Quest[]; questDays: number }) {
  const done = quests.filter((q) => q.done).length;
  const towardShield = questDays % QUEST_DAYS_PER_SHIELD;
  const allDone = done === quests.length;
  return (
    <Card>
      <View style={styles.head}>
        <View>
          <Text style={styles.title}>{t('Today’s quests')}</Text>
          <Text style={styles.sub}>{allDone ? t('All done today · ما شاء الله') : t('{n} of {total} done', { n: done, total: quests.length })}</Text>
        </View>
        <View style={styles.meter} accessibilityLabel={t('{n} of {total} quest days toward a shield', { n: towardShield, total: QUEST_DAYS_PER_SHIELD })}>
          {Array.from({ length: QUEST_DAYS_PER_SHIELD }, (_, i) => (
            <View key={i} style={[styles.pip, i < towardShield && styles.pipOn]} />
          ))}
          <ShieldIcon size={18} color={towardShield > 0 ? colors.saffron : colors.cardBorder} />
        </View>
      </View>
      {quests.map((q) => (
        <View key={q.id} style={styles.row}>
          <View style={[styles.check, q.done && styles.checkDone]}>
            {q.done && (
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.onPrimary} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12.5 10 17.5 19 7" />
              </Svg>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.questTitle, q.done && styles.questDone]}>{q.title}</Text>
            {!q.done && (
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(3, (q.progress / q.target) * 100)}%` }]} />
              </View>
            )}
          </View>
          <Text style={styles.count}>{q.done ? '✓' : `${q.progress.toLocaleString('en-US')}/${q.target.toLocaleString('en-US')}`}</Text>
        </View>
      ))}
      <Text style={styles.foot}>
        {t('Finish all three on {total} days to earn a streak shield · {n}/{total}', { n: towardShield, total: QUEST_DAYS_PER_SHIELD })}
      </Text>
    </Card>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
    sub: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted },
    meter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    pip: { width: 10, height: 10, transform: [{ rotate: '45deg' }], borderRadius: 2, borderWidth: 1.5, borderColor: colors.cardBorder },
    pipOn: { backgroundColor: colors.saffron, borderColor: colors.saffron },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.cardBorder },
    check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
    checkDone: { backgroundColor: colors.zelligeGreen, borderColor: colors.zelligeGreen },
    questTitle: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.ink },
    questDone: { color: colors.muted, textDecorationLine: 'line-through' },
    track: { height: 5, borderRadius: 3, backgroundColor: colors.plaster, marginTop: 5, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3, backgroundColor: colors.saffron },
    count: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.terracotta, minWidth: 54, textAlign: isRTL() ? 'left' : 'right' },
    foot: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: spacing.sm },
  }),
);
