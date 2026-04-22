interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  accent?: "purple" | "green" | "red" | "amber" | "blue";
}

const accents = {
  purple: "#8930D6",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  blue: "#3b82f6"
};

export function MetricCard({ label, value, sub, accent = "purple" }: MetricCardProps) {
  return (
    <div className="card card-pad metric-card" style={{ "--accent": accents[accent] } as React.CSSProperties}>
      <div className="label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="small">{sub}</div>
    </div>
  );
}
