interface MiniChartProps {
  series: { label: string; gross?: number; net?: number; value?: number }[];
  height?: number;
}

export function MiniChart({ series, height = 230 }: MiniChartProps) {
  const values = series.flatMap((point) => [point.gross, point.net, point.value].filter((value): value is number => typeof value === "number"));
  const max = Math.max(...values, 1);
  const width = 640;
  const padding = 28;
  const points = (key: "gross" | "net" | "value") =>
    series
      .map((point, index) => {
        const x = padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
        const y = height - padding - (((point[key] ?? 0) / max) * (height - padding * 2));
        return `${x},${y}`;
      })
      .join(" ");

  if (series.length === 0) return null;

  const first = series[0];

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafica de rendimiento">
      <defs>
        <linearGradient id="chartPurple" x1="0" x2="1">
          <stop offset="0%" stopColor="#8930D6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      {Array.from({ length: 4 }, (_, index) => (
        <line key={index} x1={padding} x2={width - padding} y1={padding + index * 48} y2={padding + index * 48} stroke="#2a2a2a" strokeWidth="1" />
      ))}
      {"gross" in first ? <polyline fill="none" points={points("gross")} stroke="url(#chartPurple)" strokeWidth="4" /> : null}
      {"net" in first ? <polyline fill="none" points={points("net")} stroke="#22c55e" strokeDasharray="7 8" strokeWidth="3" /> : null}
      {"value" in first ? <polyline fill="none" points={points("value")} stroke="url(#chartPurple)" strokeWidth="4" /> : null}
      {series.map((point, index) => {
        const x = padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
        return (
          <text key={point.label} x={x} y={height - 5} fill="#9ca3af" fontSize="12" textAnchor="middle">
            {point.label}
          </text>
        );
      })}
    </svg>
  );
}
