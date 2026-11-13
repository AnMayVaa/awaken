import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { cloudEnabled } from '@/lib/supabase';
import { resetPassword, signIn, signUp } from '@/lib/sync';
import { toast } from '@/store/alerts';

import { Btn, Input, Segment, Txt } from './kit';
import { C } from './theme';

export function AuthForm({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  if (!cloudEnabled) {
    return (
      <Txt v="small">
        Cloud sync is not configured in this build. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY (see README) to enable accounts. Your
        progress is saved on this device.
      </Txt>
    );
  }

  const submit = async () => {
    setMsg(null);
    if (!email.includes('@')) return setMsg({ text: 'Enter a valid email.' });
    if (password.length < 6) return setMsg({ text: 'Password must be at least 6 characters.' });
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        toast('SIGNED IN', [email.trim()]);
        onDone?.();
      } else {
        const r = await signUp(email, password);
        if (r === 'confirm-email') {
          setMsg({ ok: true, text: 'Account created. Check your inbox to confirm your email, then sign in.' });
          setMode('signin');
        } else {
          toast('ACCOUNT CREATED', [email.trim()]);
          onDone?.();
        }
      }
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.includes('@')) return setMsg({ text: 'Enter your email above first.' });
    setBusy(true);
    try {
      await resetPassword(email);
      setMsg({ ok: true, text: 'Password reset email sent.' });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Segment
        value={mode}
        onChange={(v) => {
          setMode(v);
          setMsg(null);
        }}
        options={[
          { value: 'signin', label: 'Sign in' },
          { value: 'signup', label: 'Create account' },
        ]}
      />
      <View style={{ height: 14 }} />
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" textContentType="emailAddress" />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        placeholder="••••••••"
        onSubmitEditing={submit}
        textContentType={mode === 'signin' ? 'password' : 'newPassword'}
      />
      {msg ? (
        <Txt v="small" color={msg.ok ? C.green : C.red} style={{ marginBottom: 10 }}>
          {msg.text}
        </Txt>
      ) : null}
      {busy ? (
        <ActivityIndicator color={C.cyan} style={{ height: 44 }} />
      ) : (
        <Btn kind="solid" label={mode === 'signin' ? 'Sign in' : 'Create account'} onPress={submit} icon={mode === 'signin' ? 'login' : 'account-plus'} />
      )}
      {mode === 'signin' ? (
        <Pressable onPress={forgot} style={{ alignSelf: 'center', marginTop: 12 }}>
          <Txt v="small" color={C.cyan}>
            Forgot password?
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
