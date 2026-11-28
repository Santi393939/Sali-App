/**
 * Community (under Groups): requests for salawat that anyone can add to.
 *
 * Sections: your review queue (admins), your own requests (with their
 * status), "Close to the goal", "New", and "Reached" (recently completed).
 * Each card: title, note, who asked (or Anonymous), a progress bar, how many
 * people helped, time left, quick +10 / +33 / +100, and "Count for this",
 * which opens the full-screen counter for the request.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { feedback } from '@/lib/feedback';
import { t } from '@/lib/i18n';
import { showToast } from '@/lib/toast';
import { useAuth } from '@/store/auth';
import { contribute, createRequest, loadFeed, moderate, reportRequest, useCommunity, withdrawRequest, type CommunityRequest } from '@/store/community';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

import { Card } from '../Card';
import { PrimaryButton } from '../PrimaryButton';
import { Toggle } from '../Toggle';

const fmt = (n: number) => n.toLocaleString('en-US');
const GOALS = [1000, 5000, 10000, 33000, 100000];
const DAYS = [3, 7, 14];

/** Still open for contributions (read at render; the feed refreshes often). */
const stillOpen = (iso: string) => new Date(iso).getTime() > Date.now();

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return t('Ended');
  const d = Math.floor(ms / 86400000);
  if (d >= 1) return t(d === 1 ? '1 day left' : '{n} days left', { n: d });
  return t('{n} h left', { n: Math.max(1, Math.round(ms / 3600000)) });
}

export function CommunityView() {
  const auth = useAuth();
  const { feed, loading, loaded, error, isAdmin, queue } = useCommunity();
  const [asking, setAsking] = useState(false);
  const signedIn = auth.configured && !!auth.session;

  useEffect(() => {
    void loadFeed();
  }, [signedIn]);

  const open = feed.filter((r) => r.status === 'approved' && stillOpen(r.endsAt));
  const close = [...open].filter((r) => r.total / r.goal >= 0.5).sort((a, b) => b.total / b.goal - a.total / a.goal).slice(0, 3);
  const rest = open.filter((r) => !close.includes(r));
  const reached = feed.filter((r) => r.status === 'completed' && !r.mine);
  const mine = feed.filter((r) => r.mine);

  const ask = () => {
    if (!signedIn) return router.push('/sign-in');
    setAsking(true);
  };

  return (
    <>
      <Card>
        <Text style={styles.introTitle}>{t('Salawat for each other')}</Text>
        <Text style={styles.introText}>
          {t('Someone asks for salawat for a need, and anyone can add to it. What you send also counts for your own day.')}
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <PrimaryButton label={t('Ask for salawat')} onPress={ask} />
        </View>
      </Card>

      {isAdmin && queue.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>{t('To review ({n})', { n: queue.length })}</Text>
          {queue.map((q) => (
            <View key={q.id} style={styles.reviewRow}>
              <Text style={styles.cardTitle}>{q.title}</Text>
              {q.note ? <Text style={styles.note}>{q.note}</Text> : null}
              <Text style={styles.meta}>
                {t('Goal {n}', { n: fmt(q.goal) })} · {q.author ?? t('Anonymous')}
                {q.status === 'hidden' ? ` · ${t('Hidden after {n} reports', { n: q.reports })}` : ''}
              </Text>
              <View style={styles.reviewActions}>
                <Pressable onPress={() => void moderate(q.id, true)} accessibilityRole="button" style={[styles.pill, styles.pillOn]}>
                  <Text style={[styles.pillText, { color: colors.onPrimary }]}>{t('Approve')}</Text>
                </Pressable>
                <Pressable onPress={() => void moderate(q.id, false)} accessibilityRole="button" style={styles.pill}>
                  <Text style={styles.pillText}>{t('Decline')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      )}

      {mine.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>{t('Your requests')}</Text>
          {mine.map((r) => (
            <RequestCard key={r.id} r={r} signedIn={signedIn} />
          ))}
        </View>
      )}

      {!loaded && loading && <ActivityIndicator color={colors.saffron} style={{ marginTop: spacing.lg }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {close.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>{t('Close to the goal')}</Text>
          {close.map((r) => (
            <RequestCard key={r.id} r={r} signedIn={signedIn} />
          ))}
        </View>
      )}
      {rest.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>{t('New')}</Text>
          {rest.map((r) => (
            <RequestCard key={r.id} r={r} signedIn={signedIn} />
          ))}
        </View>
      )}
      {loaded && open.length === 0 && mine.length === 0 && (
        <Card>
          <Text style={styles.emptyTitle}>{t('No requests yet')}</Text>
          <Text style={styles.introText}>{t('Be the first to ask your community for salawat. Every request is reviewed before it appears.')}</Text>
        </Card>
      )}
      {reached.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>{t('Reached ما شاء الله')}</Text>
          {reached.map((r) => (
            <RequestCard key={r.id} r={r} signedIn={signedIn} />
          ))}
        </View>
      )}

      <AskSheet visible={asking} onClose={() => setAsking(false)} />
    </>
  );
}

function RequestCard({ r, signedIn }: { r: CommunityRequest; signedIn: boolean }) {
  const [confirmReport, setConfirmReport] = useState(false);
  const pct = Math.min(1, r.total / r.goal);
  const done = r.status === 'completed';
  const canGive = signedIn && (r.status === 'approved' || done) && stillOpen(r.endsAt);
  const give = (n: number) => {
    if (!signedIn) return router.push('/sign-in');
    feedback.add(n >= 100 ? 'small' : 'tap');
    contribute(r.id, n);
  };
  const statusLabel =
    r.status === 'pending' ? t('Waiting for review') : r.status === 'declined' ? t('Not approved') : r.status === 'hidden' ? t('Hidden for review') : null;

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{r.title}</Text>
        {statusLabel ? (
          <View style={styles.status}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>
      {r.note ? <Text style={styles.note}>{r.note}</Text> : null}
      <Text style={styles.meta}>{r.mine ? t('Your request') : r.author ? t('Asked by {name}', { name: r.author }) : t('Asked anonymously')}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, done && { backgroundColor: colors.link }, { width: `${Math.max(2, pct * 100)}%` }]} />
      </View>
      <View style={styles.statsRow}>
        <Text style={styles.total}>
          {fmt(r.total)} <Text style={styles.goalOf}>/ {fmt(r.goal)}</Text>
        </Text>
        <Text style={styles.meta}>
          {t(r.contributors === 1 ? '1 person' : '{n} people', { n: r.contributors })} · {done ? t('Goal reached ✓') : timeLeft(r.endsAt)}
        </Text>
      </View>
      {r.myTotal > 0 && <Text style={styles.mine}>{t('You sent {n}', { n: fmt(r.myTotal) })}</Text>}

      {r.status === 'approved' && !r.mine && (
        <View style={styles.actions}>
          {[10, 33, 100].map((n) => (
            <Pressable
              key={n}
              onPress={() => give(n)}
              disabled={signedIn && !canGive}
              accessibilityRole="button"
              accessibilityLabel={t('Send {n} for this request', { n })}
              style={({ pressed }) => [styles.pill, pressed && { transform: [{ scale: 0.95 }] }]}>
              <Text style={styles.pillText}>+{n}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => (signedIn ? router.push({ pathname: '/tasbih', params: { request: r.id, title: r.title } }) : router.push('/sign-in'))}
            accessibilityRole="button"
            style={({ pressed }) => [styles.pill, styles.pillOn, { flex: 1 }, pressed && { opacity: 0.85 }]}>
            <Text style={[styles.pillText, { color: colors.onPrimary }]} numberOfLines={1}>
              {t('Counter ›')}
            </Text>
          </Pressable>
        </View>
      )}
      {r.mine && r.status !== 'completed' && (
        <Pressable onPress={() => void withdrawRequest(r.id)} accessibilityRole="button" style={styles.linkBtn}>
          <Text style={styles.linkText}>{t('Withdraw request')}</Text>
        </Pressable>
      )}
      {!r.mine && signedIn && !done && (
        <Pressable onPress={() => setConfirmReport(true)} accessibilityRole="button" style={styles.linkBtn}>
          <Text style={styles.reportText}>{t('Report')}</Text>
        </Pressable>
      )}

      <Modal visible={confirmReport} transparent animationType="fade" onRequestClose={() => setConfirmReport(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{t('Report this request?')}</Text>
            <Text style={styles.introText}>{t('Report it if it shares private details, isn’t a sincere request, or is inappropriate. It will be checked.')}</Text>
            <PrimaryButton
              label={t('Report')}
              onPress={async () => {
                setConfirmReport(false);
                try {
                  await reportRequest(r.id);
                  showToast({ tone: 'quest', title: t('Thank you, it will be checked') });
                } catch (e) {
                  showToast({ tone: 'quest', title: e instanceof Error ? e.message : String(e) });
                }
              }}
            />
            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={() => setConfirmReport(false)}>
              <Text style={styles.linkText}>{t('Cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AskSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [goal, setGoal] = useState(10000);
  const [days, setDays] = useState(7);
  const [showName, setShowName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ready = title.trim().length >= 3;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await createRequest({ title, note, goal, days, showName });
      feedback.add('small');
      showToast({ tone: 'quest', title: t('Sent for review'), sub: t('It appears for everyone once it’s approved, usually within a day.') });
      setTitle('');
      setNote('');
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('Close')} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView contentContainerStyle={{ gap: spacing.md }} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTitle}>{t('Ask for salawat')}</Text>
            <Text style={styles.fieldLabel}>{t('What is it for?')}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('e.g. For my father’s recovery')}
              placeholderTextColor={colors.muted}
              style={styles.input}
              maxLength={80}
            />
            <Text style={styles.fieldLabel}>{t('A short note (optional)')}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('e.g. His surgery is on Friday')}
              placeholderTextColor={colors.muted}
              style={[styles.input, { height: 72, paddingTop: 12, textAlignVertical: 'top' }]}
              maxLength={200}
              multiline
            />
            <Text style={styles.fieldLabel}>{t('Goal')}</Text>
            <View style={styles.chips}>
              {GOALS.map((g) => (
                <Pressable key={g} onPress={() => setGoal(g)} accessibilityRole="radio" accessibilityState={{ selected: goal === g }} style={[styles.pill, goal === g && styles.pillOn]}>
                  <Text style={[styles.pillText, goal === g && { color: colors.onPrimary }]}>{fmt(g)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>{t('Open for')}</Text>
            <View style={styles.chips}>
              {DAYS.map((d) => (
                <Pressable key={d} onPress={() => setDays(d)} accessibilityRole="radio" accessibilityState={{ selected: days === d }} style={[styles.pill, days === d && styles.pillOn]}>
                  <Text style={[styles.pillText, days === d && { color: colors.onPrimary }]}>{t('{n} days', { n: d })}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>{t('Show my name')}</Text>
                <Text style={styles.meta}>{t('Off: posted anonymously')}</Text>
              </View>
              <Toggle label={t('Show my name')} value={showName} onChange={setShowName} />
            </View>
            <Text style={styles.guide}>
              {t('Please keep it kind and private: no full names, links or phone numbers. Every request is reviewed before it appears.')}
            </Text>
            {err ? <Text style={styles.error}>{err}</Text> : null}
            <PrimaryButton label={busy ? t('One moment…') : t('Send for review')} onPress={submit} disabled={!ready || busy} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    introTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
    introText: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 4 },
    emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
    sectionTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, marginBottom: spacing.sm },
    sectionLabel: { fontFamily: fonts.uiSemi, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.terracotta, marginLeft: 4 },
    card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.lg, gap: 6 },
    cardDone: { borderColor: colors.saffron },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    cardTitle: { flex: 1, fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.ink },
    note: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.ink },
    meta: { fontFamily: fonts.ui, fontSize: 12, color: colors.muted },
    status: { borderRadius: 999, backgroundColor: colors.highlight, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontFamily: fonts.uiSemi, fontSize: 11, color: colors.terracotta },
    track: { height: 10, borderRadius: 5, backgroundColor: colors.plaster, overflow: 'hidden', marginTop: 6 },
    fill: { height: '100%', borderRadius: 5, backgroundColor: colors.saffron },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    total: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 22, color: colors.ink },
    goalOf: { fontSize: 15, color: colors.muted },
    mine: { fontFamily: fonts.uiSemi, fontSize: 12, color: colors.link },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    pill: { borderRadius: 999, borderWidth: 1.5, borderColor: colors.cardBorder, paddingHorizontal: 14, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    pillOn: { backgroundColor: colors.zelligeGreen, borderColor: colors.saffron },
    pillText: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.ink },
    linkBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
    linkText: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.link },
    reportText: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.muted },
    reviewRow: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingVertical: spacing.sm, gap: 4 },
    reviewActions: { flexDirection: 'row', gap: spacing.sm, marginTop: 6 },
    error: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.terracotta, textAlign: 'center' },
    sheetRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22,19,15,0.5)' },
    sheet: {
      backgroundColor: colors.plaster,
      borderTopLeftRadius: radius.card,
      borderTopRightRadius: radius.card,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      maxHeight: '92%',
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
    },
    grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.cardBorder, marginBottom: spacing.sm },
    sheetTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
    fieldLabel: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.muted, marginBottom: -spacing.sm },
    input: {
      height: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      fontFamily: fonts.uiMedium,
      fontSize: 16,
      color: colors.ink,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    toggleLabel: { fontFamily: fonts.uiMedium, fontSize: 15, color: colors.ink },
    guide: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17, color: colors.muted },
    modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,19,15,0.5)', padding: spacing.lg },
    dialog: { width: '100%', maxWidth: 400, backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
    dialogTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
    cancelBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  }),
);
