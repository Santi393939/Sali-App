/**
 * Sign in: Apple (iPhone), Google, or email with a 6-digit code.
 * Optional — counting works without an account.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo, PlasterPattern, PrimaryButton, ZelligeBand } from '@/components';
import { feedback } from '@/lib/feedback';
import {
  appleAvailable,
  sendEmailCode,
  signInWithApple,
  signInWithGoogle,
  useAuth,
  verifyEmailCode,
} from '@/store/auth';
import { getSettings, updateSettings } from '@/store/settings';
import { colors, fonts, radius, spacing, themedStyles } from '@/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { session, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState<null | 'apple' | 'google' | 'email'>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApple, setHasApple] = useState(false);

  useEffect(() => {
    appleAvailable().then(setHasApple);
  }, []);

  // Close as soon as a session appears (any method).
  useEffect(() => {
    if (session) {
      feedback.add('large');
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }
  }, [session]);

  const run = async (kind: 'apple' | 'google' | 'email', fn: () => Promise<void>) => {
    setError(null);
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/canceled|cancelled/i.test(msg)) setError(msg);
    } finally {
      setBusy(null);
    }
  };

  const validEmail = EMAIL_RE.test(email.trim());

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <PlasterPattern />
          <View style={styles.heroBody}>
            <Logo size={88} />
            <Text style={styles.title}>Sign in to Salli</Text>
            <Text style={styles.subtitle}>Keep your counts safe across phones, and count together with your family.</Text>
          </View>
          <ZelligeBand height={18} />
        </View>

        {!configured && (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Accounts aren&apos;t connected yet</Text>
            <Text style={styles.noticeBody}>
              Your counts are saved on this phone. Sign-in switches on once the Salli Supabase project is connected.
            </Text>
          </View>
        )}

        {hasApple && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.button}
            style={styles.apple}
            onPress={() =>
              run('apple', async () => {
                const { fullName } = await signInWithApple();
                if (fullName && !getSettings().name) updateSettings({ name: fullName });
              })
            }
          />
        )}

        <Pressable
          accessibilityRole="button"
          disabled={!configured || !!busy}
          onPress={() => run('google', signInWithGoogle)}
          style={({ pressed }) => [styles.google, pressed && { opacity: 0.8 }, (!configured || !!busy) && styles.disabled]}>
          {busy === 'google' ? <ActivityIndicator color={colors.ink} /> : <GoogleG />}
          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>

        <View style={styles.or}>
          <View style={styles.rule} />
          <Text style={styles.orText}>or with email</Text>
          <View style={styles.rule} />
        </View>

        {step === 'email' ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              style={styles.input}
              accessibilityLabel="Email address"
              editable={configured}
              onSubmitEditing={() => validEmail && run('email', async () => {
                await sendEmailCode(email);
                setStep('code');
              })}
            />
            <PrimaryButton
              label={busy === 'email' ? 'Sending…' : 'Email me a code'}
              disabled={!configured || !validEmail || !!busy}
              onPress={() =>
                run('email', async () => {
                  await sendEmailCode(email);
                  setStep('code');
                })
              }
            />
          </>
        ) : (
          <>
            <Text style={styles.sent}>
              We sent a 6-digit code to <Text style={{ fontFamily: fonts.uiSemi }}>{email.trim()}</Text>.
            </Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
              placeholder="123456"
              placeholderTextColor={colors.cardBorder}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              style={[styles.input, styles.codeInput]}
              accessibilityLabel="Code from the email"
              autoFocus
            />
            <PrimaryButton
              label={busy === 'email' ? 'Checking…' : 'Sign in'}
              disabled={code.length < 6 || !!busy}
              onPress={() => run('email', () => verifyEmailCode(email, code))}
            />
            <View style={styles.row}>
              <Pressable onPress={() => run('email', () => sendEmailCode(email))} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>Send a new code</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
                hitSlop={8}
                accessibilityRole="button">
                <Text style={styles.link}>Use a different email</Text>
              </Pressable>
            </View>
          </>
        )}

        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.notNow} accessibilityRole="button">
          <Text style={styles.notNowText}>Not now</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GoogleG() {
  // Neutral "G" mark (not Google's logo artwork).
  return (
    <View style={styles.g}>
      <Text style={styles.gText}>G</Text>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.plaster },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md, maxWidth: 520, width: '100%', alignSelf: 'center' },
  hero: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden', marginBottom: spacing.sm },
  heroBody: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.ink, marginTop: spacing.sm },
  subtitle: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', maxWidth: 300 },
  notice: { backgroundColor: colors.highlight, borderColor: colors.saffron, borderWidth: 1, borderRadius: radius.card, padding: spacing.lg },
  noticeTitle: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.ink },
  noticeBody: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 4 },
  apple: { height: 54, width: '100%' },
  google: {
    height: 54,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  googleText: { fontFamily: fonts.uiSemi, fontSize: 16, color: colors.ink },
  g: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.cobalt, alignItems: 'center', justifyContent: 'center' },
  gText: { fontFamily: fonts.uiSemi, fontSize: 13, color: colors.cobalt },
  disabled: { opacity: 0.5 },
  or: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  rule: { flex: 1, height: 1, backgroundColor: colors.cardBorder },
  orText: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.muted },
  input: {
    height: 54,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.ink,
  },
  codeInput: { fontFamily: fonts.display, fontVariant: ['lining-nums'], fontSize: 30, letterSpacing: 8, textAlign: 'center', height: 64 },
  sent: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  link: { fontFamily: fonts.uiSemi, fontSize: 14, color: colors.link },
  error: { fontFamily: fonts.uiMedium, fontSize: 14, color: '#A23B2A', textAlign: 'center' },
  notNow: { height: 48, alignItems: 'center', justifyContent: 'center' },
  notNowText: { fontFamily: fonts.uiSemi, fontSize: 15, color: colors.muted },
}),
);
