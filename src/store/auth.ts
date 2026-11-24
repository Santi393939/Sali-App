/**
 * Accounts: email (6-digit code), Google and Apple sign-in through Supabase.
 * Signing in is optional: counting always works offline; an account adds
 * sync across devices, groups and the Telegram bot.
 */
import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

// ---- session state, shared app-wide ----
let session: Session | null = null;
let ready = !supabase; // nothing to load when Supabase isn't configured
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    session = data.session;
    ready = true;
    emit();
  });
  supabase.auth.onAuthStateChange((_event, s) => {
    session = s;
    ready = true;
    emit();
  });
}

export type AuthState = { session: Session | null; ready: boolean; configured: boolean };
let snap: AuthState = { session, ready, configured: !!supabase };
function getSnap(): AuthState {
  if (snap.session !== session || snap.ready !== ready) snap = { session, ready, configured: !!supabase };
  return snap;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnap,
    getSnap,
  );
}

export const getSession = () => session;

/** Subscribe to sign-in / sign-out outside React. */
export function onSessionChange(fn: (s: Session | null) => void) {
  const l = () => fn(session);
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function client() {
  if (!supabase) throw new Error('Accounts are not set up yet.');
  return supabase;
}

// ---- email: send a 6-digit code, then verify it ----

export async function sendEmailCode(email: string) {
  const { error } = await client().auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(friendly(error.message));
}

export async function verifyEmailCode(email: string, code: string) {
  const { error } = await client().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  if (error) throw new Error(friendly(error.message));
}

// ---- Google (through Supabase OAuth) ----

export async function signInWithGoogle() {
  const sb = client();
  if (Platform.OS === 'web') {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw new Error(friendly(error.message));
    return;
  }
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error(friendly(error?.message ?? 'Could not start Google sign-in.'));
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return; // cancelled
  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('Google sign-in did not finish. Please try again.');
  const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
  if (exchangeError) throw new Error(friendly(exchangeError.message));
}

// ---- Apple (iPhone only, native sheet) ----

export const appleAvailable = () =>
  Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync() : Promise.resolve(false);

export async function signInWithApple(): Promise<{ fullName: string | null }> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
  });
  if (!credential.identityToken) throw new Error('Apple did not return a sign-in token.');
  const { error } = await client().auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
  if (error) throw new Error(friendly(error.message));
  // Apple shares the name only on the very first sign-in.
  const n = credential.fullName;
  const fullName = [n?.givenName, n?.familyName].filter(Boolean).join(' ') || null;
  return { fullName };
}

export async function signOut() {
  await client().auth.signOut();
}

/** Turn Supabase errors into plain words. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('token has expired') || m.includes('invalid') && m.includes('token')) {
    return 'That code is wrong or has expired. Request a new one.';
  }
  if (m.includes('rate limit') || m.includes('security purposes')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (m.includes('network') || m.includes('fetch')) return 'No connection. Check your internet and try again.';
  if (m.includes('provider is not enabled')) return 'This sign-in option is not switched on yet.';
  return message;
}
