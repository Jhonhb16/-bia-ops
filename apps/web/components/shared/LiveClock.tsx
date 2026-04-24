"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const date = now.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const time = now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="live-clock" title="Fecha y hora actual del sistema">
      <Clock size={13} strokeWidth={1.5} style={{ opacity: 0.6 }} />
      <span className="live-clock-date">{date}</span>
      <span className="live-clock-time">{time}</span>
    </div>
  );
}
