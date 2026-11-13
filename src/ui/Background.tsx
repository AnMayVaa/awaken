import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, Line, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { C } from './theme';

/** Dark holographic backdrop: gradient + grid + top glow + scanlines */
export function Background({ tint = C.cyan }: { tint?: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[C.bg2, C.bg1, C.bg0]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <Line x1="0" y1="0" x2="36" y2="0" stroke={tint} strokeOpacity={0.06} strokeWidth={1} />
            <Line x1="0" y1="0" x2="0" y2="36" stroke={tint} strokeOpacity={0.06} strokeWidth={1} />
          </Pattern>
          <Pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
            <Rect x="0" y="0" width="4" height="1" fill="#000" fillOpacity={0.22} />
          </Pattern>
          <RadialGradient id="glow" cx="50%" cy="0%" rx="70%" ry="45%">
            <Stop offset="0" stopColor={tint} stopOpacity={0.16} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="vign" cx="50%" cy="50%" rx="75%" ry="70%">
            <Stop offset="0.6" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.55} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grid)" />
        <Ellipse cx="50%" cy="0%" rx="70%" ry="45%" fill="url(#glow)" />
        <Rect width="100%" height="100%" fill="url(#scan)" />
        <Rect width="100%" height="100%" fill="url(#vign)" />
      </Svg>
    </View>
  );
}
