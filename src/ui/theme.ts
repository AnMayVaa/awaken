import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const C = {
  bg0: '#02040A',
  bg1: '#050B18',
  bg2: '#081428',
  panel: 'rgba(5, 16, 34, 0.86)',
  panelSolid: '#061226',
  panelHi: 'rgba(12, 34, 66, 0.9)',
  line: 'rgba(60, 200, 255, 0.28)',
  lineDim: 'rgba(60, 200, 255, 0.12)',
  cyan: '#3CC8FF',
  cyanHi: '#8BE3FF',
  blue: '#2A7BFF',
  text: '#DDF3FF',
  textDim: '#86A9C6',
  muted: '#4D6E8C',
  gold: '#FFD166',
  red: '#FF3D5A',
  redDim: 'rgba(255, 61, 90, 0.18)',
  green: '#45F0A0',
  purple: '#B58CFF',
  orange: '#FF8A3D',
  hp: '#FF4D6D',
  xp: '#3CC8FF',
  white: '#FFFFFF',
} as const;

export const F = {
  display: 'Orbitron_700Bold',
  displayBlack: 'Orbitron_900Black',
  displayMed: 'Orbitron_500Medium',
  body: 'Rajdhani_500Medium',
  bodySemi: 'Rajdhani_600SemiBold',
  bodyBold: 'Rajdhani_700Bold',
} as const;

export const MAX_W = 760;

export function glow(color: string = C.cyan, radius = 14, opacity = 0.55): ViewStyle {
  const a = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');
  return Platform.select<ViewStyle>({
    web: { boxShadow: `0 0 ${radius}px ${color}${a}, inset 0 0 ${Math.round(radius * 0.8)}px ${color}22` } as ViewStyle,
    default: { boxShadow: `0 0 ${radius}px ${color}${a}` } as ViewStyle,
  })!;
}

export function textGlow(color: string = C.cyan, radius = 10): TextStyle {
  return { textShadowColor: color, textShadowRadius: radius, textShadowOffset: { width: 0, height: 0 } };
}

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`;
}

export const toneColor: Record<string, string> = {
  info: C.cyan,
  reward: C.cyan,
  levelup: C.cyanHi,
  rankup: C.gold,
  warning: C.orange,
  penalty: C.red,
  boss: C.purple,
  achievement: C.gold,
};
