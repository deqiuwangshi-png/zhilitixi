'use client';

// 轻量 SVG 图表组件（无第三方依赖，严格纯色，无渐变）
// 颜色取自 DESIGN.md：品牌绿 #006855 / 边框 #E5E6EB / 文字 #646A73 / 风险色 #D92D20 #FF8800

const AXIS = '#D8D8DE';
const TEXT = '#646A73';
const GREEN = '#006855';

export function LineChart({
  data,
  height = 230,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const width = 600;
  const padL = 34;
  const padR = 18;
  const padT = 16;
  const padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = max <= 1 ? 1 : Math.ceil(max / 2) * 2;
  const step = innerW / Math.max(1, data.length - 1);

  const px = (i: number) => padL + i * step;
  const py = (v: number) => padT + innerH - (v / niceMax) * innerH;

  const linePoints = data.map((d, i) => `${px(i)},${py(d.value)}`).join(' ');

  // 横向网格线（4 条）
  const gridLines = [0, 1, 2, 3, 4].map((g) => {
    const y = padT + (innerH / 4) * g;
    const val = Math.round(niceMax - (niceMax / 4) * g);
    return { y, val };
  });

  // X 轴标签：数据多时抽样
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="趋势折线图">
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={width - padR} y2={g.y} stroke={AXIS} strokeWidth={1} strokeDasharray="3 4" />
            <text x={padL - 8} y={g.y + 4} textAnchor="end" fontSize={11} fill={TEXT}>
              {g.val}
            </text>
          </g>
        ))}
        <polyline points={linePoints} fill="none" stroke={GREEN} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i}>
            {i % labelEvery === 0 && (
              <text x={px(i)} y={height - 10} textAnchor="middle" fontSize={10.5} fill={TEXT}>
                {d.label}
              </text>
            )}
            <circle cx={px(i)} cy={py(d.value)} r={3.2} fill={GREEN} />
            <text x={px(i)} y={py(d.value) - 8} textAnchor="middle" fontSize={10} fill={TEXT} fontWeight={600}>
              {d.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const BAR_COLORS = [GREEN, '#D92D20', '#FF8800', '#3370FF', '#8A93A5'];

export function BarChart({
  data,
  height = 230,
}: {
  data: { type: string; count: number }[];
  height?: number;
}) {
  const width = 420;
  const padL = 30;
  const padR = 12;
  const padT = 16;
  const padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const n = Math.max(1, data.length);
  const slot = innerW / n;
  const barW = Math.min(56, slot * 0.52);
  const max = Math.max(1, ...data.map((d) => d.count));
  const niceMax = max <= 1 ? 1 : Math.ceil(max / 2) * 2;

  const gridLines = [0, 1, 2, 3, 4].map((g) => {
    const y = padT + (innerH / 4) * g;
    const val = Math.round(niceMax - (niceMax / 4) * g);
    return { y, val };
  });

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="处罚分布柱状图">
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={width - padR} y2={g.y} stroke={AXIS} strokeWidth={1} strokeDasharray="3 4" />
            <text x={padL - 8} y={g.y + 4} textAnchor="end" fontSize={11} fill={TEXT}>
              {g.val}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + slot * i + (slot - barW) / 2;
          const h = (d.count / niceMax) * innerH;
          const y = padT + innerH - h;
          const color = BAR_COLORS[i % BAR_COLORS.length];
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx={3} fill={color} />
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={11} fill="#1F2329" fontWeight={600}>
                {d.count}
              </text>
              <text x={x + barW / 2} y={height - 10} textAnchor="middle" fontSize={10.5} fill={TEXT}>
                {d.type}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}