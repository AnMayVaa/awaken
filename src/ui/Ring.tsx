import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { C, withAlpha } from './theme';

export function Ring({
  size = 220,
  stroke = 10,
  progress,
  color = C.cyan,
  children,
  ticks = 60,
}: {
  size?: number;
  stroke?: number;
  progress: number;
  color?: string;
  children?: React.ReactNode;
  ticks?: number;
}) {
  const r = (size - stroke) / 2 - 8;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${c}, ${c}`}>
          {Array.from({ length: ticks }).map((_, i) => {
            const a = (i / ticks) * Math.PI * 2;
            const r1 = r + stroke / 2 + 3;
            const r2 = r1 + (i % 5 === 0 ? 6 : 3);
            const on = i / ticks <= p;
            return (
              <G key={i}>
                <Circle cx={c + Math.cos(a) * ((r1 + r2) / 2)} cy={c + Math.sin(a) * ((r1 + r2) / 2)} r={i % 5 === 0 ? 1.4 : 0.9} fill={on ? color : withAlpha(color, 0.25)} />
              </G>
            );
          })}
          <Circle cx={c} cy={c} r={r} stroke={withAlpha(color, 0.14)} strokeWidth={stroke} fill="none" />
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={circ * (1 - p)}
          />
          <Circle cx={c} cy={c} r={r - stroke - 6} stroke={withAlpha(color, 0.25)} strokeWidth={1} fill="none" strokeDasharray="2 6" />
        </G>
      </Svg>
      {children}
    </View>
  );
}
