import React, { useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';

import { APK_URL } from '@/lib/links';

import { Btn, Icon, Panel, Row, Txt } from './kit';
import { C } from './theme';

function env() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
  const ua = nav.userAgent || '';
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  const android = /Android/i.test(ua);
  return { standalone, ios, android };
}

let dismissedThisSession = false;

/** Web-only banner that explains how to install AWAKEN on a phone. */
export function InstallHint() {
  const [hidden, setHidden] = useState(dismissedThisSession);
  const e = env();
  if (!e || e.standalone || hidden || (!e.ios && !e.android)) return null;
  const close = () => {
    dismissedThisSession = true;
    setHidden(true);
  };
  return (
    <Panel
      title="Install AWAKEN"
      icon="cellphone-arrow-down"
      color={C.green}
      right={
        <Pressable onPress={close} hitSlop={10} accessibilityLabel="Dismiss">
          <Icon name="close" size={18} color={C.textDim} />
        </Pressable>
      }>
      {e.ios ? (
        <View style={{ gap: 6 }}>
          <Txt v="body">Play full-screen like a real app:</Txt>
          <Row gap={8}>
            <Icon name="export-variant" size={18} color={C.green} />
            <Txt v="small" color={C.text}>
              Tap Share in Safari
            </Txt>
          </Row>
          <Row gap={8}>
            <Icon name="plus-box-outline" size={18} color={C.green} />
            <Txt v="small" color={C.text}>
              Choose “Add to Home Screen”
            </Txt>
          </Row>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Txt v="body">Get the Android app, or add this page to your home screen from the browser menu.</Txt>
          <Btn kind="solid" color={C.green} label="Download APK" icon="android" onPress={() => Linking.openURL(APK_URL)} />
        </View>
      )}
    </Panel>
  );
}
