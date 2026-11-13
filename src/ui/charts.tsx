import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { C, F, withAlpha } from './theme';

/** Life Wheel radar. values are 0..10 (undefined = not rated). */
export function Radar({
  axes,
  size = 280,
  layers,
}: {
  axes: { label: string; color: string }[];
  size?: number;
  layers: { values: (number | undefined)[]; color: string; fill?: number }[];
}) {
  const n = axes.length;
  const c = size / 2;
  const r = size / 2 - 50;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * r * (v / 10), c + Math.sin(a) * r * (v / 10)] as const;
  };
  return (
    <Svg width={size} height={size}>
      {[2, 4, 6, 8, 10].map((ring) => (
        <Polygon
          key={ring}
          points={axes.map((_, i) => pt(i, ring).join(',')).join(' ')}
          fill="none"
          stroke={C.cyan}
          strokeOpacity={ring === 10 ? 0.35 : 0.12}
          strokeWidth={1}
        />
      ))}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 10);
        const [lx, ly] = pt(i, 10.9);
        const anchor = lx < c - 6 ? 'end' : lx > c + 6 ? 'start' : 'middle';
        return (
          <G key={a.label}>
            <Line x1={c} y1={c} x2={x} y2={y} stroke={C.cyan} strokeOpacity={0.12} />
            <SvgText x={lx} y={ly + 3.5} fill={a.color} fontSize={9.5} fontFamily={F.displayMed} textAnchor={anchor}>
              {a.label}
            </SvgText>
          </G>
        );
      })}
      {layers.map((l, li) => (
        <G key={li}>
          <Polygon
            points={l.values.map((v, i) => pt(i, v ?? 0).join(',')).join(' ')}
            fill={l.color}
            fillOpacity={l.fill ?? 0.18}
            stroke={l.color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {l.values.map((v, i) => {
            const [x, y] = pt(i, v ?? 0);
            return v === undefined ? null : <Circle key={i} cx={x} cy={y} r={3} fill={axes[i].color} />;
          })}
        </G>
      ))}
    </Svg>
  );
}

/** Minimal line chart with dots */
export function Sparkline({
  points,
  width = 280,
  height = 70,
  color = C.cyan,
  min = 0,
  max = 100,
  dashedAt,
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  min?: number;
  max?: number;
  dashedAt?: number;
}) {
  if (!points.length) return null;
  const pad = 6;
  const xs = (i: number) => (points.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (points.length - 1));
  const ys = (v: number) => height - pad - ((Math.max(min, Math.min(max, v)) - min) / (max - min || 1)) * (height - pad * 2);
  return (
    <Svg width={width} height={height}>
      {dashedAt !== undefined ? <Line x1={0} x2={width} y1={ys(dashedAt)} y2={ys(dashedAt)} stroke={C.red} strokeOpacity={0.5} strokeDasharray="4 4" /> : null}
      <Polyline points={points.map((v, i) => `${xs(i)},${ys(v)}`).join(' ')} fill="none" stroke={color} strokeWidth={2} />
      {points.map((v, i) => (
        <Circle key={i} cx={xs(i)} cy={ys(v)} r={i === points.length - 1 ? 4 : 2.5} fill={color} />
      ))}
    </Svg>
  );
}

/** GitHub-style activity grid: weeks × 7 days. levels 0..4 */
export function Heatmap({ levels, width }: { levels: number[]; width: number }) {
  const weeks = Math.ceil(levels.length / 7);
  const gap = 3;
  const cell = Math.max(6, Math.min(16, Math.floor((width - gap * (weeks - 1)) / weeks)));
  const h = cell * 7 + gap * 6;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={weeks * cell + gap * (weeks - 1)} height={h}>
        {levels.map((lv, i) => {
          const w = Math.floor(i / 7);
          const d = i % 7;
          return (
            <Rect
              key={i}
              x={w * (cell + gap)}
              y={d * (cell + gap)}
              width={cell}
              height={cell}
              rx={2}
              fill={lv < 0 ? 'transparent' : lv === 0 ? withAlpha(C.cyan, 0.07) : withAlpha(C.cyan, 0.2 + lv * 0.2)}
            />
          );
        })}
      </Svg>
    </View>
  );
}
