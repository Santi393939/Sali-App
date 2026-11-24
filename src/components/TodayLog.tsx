import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { Entry, EntrySource } from '@/store/counts';
import { colors, fonts, spacing } from '@/theme';

import { Card } from './Card';

const SOURCE_LABEL: Record<EntrySource, string> = {
  tap: 'Tap counter',
  quick: 'Quick add',
  pad: 'Number pad',
  reminder: 'From a reminder',
  telegram: 'Telegram bot',
};

type Props = {
  entries: Entry[]; // newest first
  limit?: number;
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();

/** Today's latest entries: source, time and amount. */
export function TodayLog({ entries, limit = 8 }: Props) {
  const shown = entries.slice(0, limit);
  return (
    <Card>
      <View style={styles.head}>
        <Text style={styles.title}>Today&apos;s log</Text>
        {entries.length > 0 && (
          <Text style={styles.count}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        )}
      </View>
      {shown.length === 0 ? (
        <Text style={styles.empty}>Nothing yet. Tap the arch or use a quick-add button to begin.</Text>
      ) : (
        shown.map((e, i) => (
          <View key={e.clientId} style={[styles.row, i > 0 && styles.divider]}>
            <SourceIcon source={e.source} />
            <View style={{ flex: 1 }}>
              <Text style={styles.source}>{SOURCE_LABEL[e.source]}</Text>
              <Text style={styles.time}>
                {time(e.createdAt) !== time(e.updatedAt)
                  ? `${time(e.createdAt)} – ${time(e.updatedAt)}`
                  : time(e.createdAt)}
              </Text>
            </View>
            <Text style={styles.amount}>+{e.amount.toLocaleString('en-US')}</Text>
          </View>
        ))
      )}
    </Card>
  );
}

function SourceIcon({ source }: { source: EntrySource }) {
  const stroke = colors.zelligeGreen;
  return (
    <View style={styles.icon}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {source === 'tap' && (
          <>
            <Circle cx={12} cy={12} r={3} fill={stroke} />
            <Circle cx={12} cy={12} r={7.5} />
          </>
        )}
        {source === 'quick' && <Path d="M13 3 5 14h6l-1 7 8-11h-6Z" />}
        {source === 'pad' && (
          <>
            <Rect x={4} y={4} width={4} height={4} rx={1} />
            <Rect x={10} y={4} width={4} height={4} rx={1} />
            <Rect x={16} y={4} width={4} height={4} rx={1} />
            <Rect x={4} y={10} width={4} height={4} rx={1} />
            <Rect x={10} y={10} width={4} height={4} rx={1} />
            <Rect x={16} y={10} width={4} height={4} rx={1} />
            <Rect x={10} y={16} width={4} height={4} rx={1} />
          </>
        )}
        {source === 'reminder' && <Path d="M5 4h11a3 3 0 0 1 3 3v13l-4-2.5L11 20V7a3 3 0 0 0-3-3" />}
        {source === 'telegram' && <Path d="M21 4 3 11l6 2 2 6 3-4 5 4Z M9 13l9-6" />}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  count: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted },
  empty: { fontFamily: fonts.ui, fontSize: 14, color: colors.muted, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.plaster,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  source: { fontFamily: fonts.uiMedium, fontSize: 15, color: colors.ink },
  time: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted, marginTop: 1 },
  amount: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 22, color: colors.terracotta },
});
