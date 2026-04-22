import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Alert, Client, MetricDaily } from "@bia-ops/shared";

export async function generateMetricAlerts(client: Client, metrics: MetricDaily[]): Promise<Omit<Alert, "id" | "created_at" | "status">[]> {
  const latest = metrics.at(-1);
  if (!latest) return [];

  if (!process.env.GEMINI_API_KEY) {
    const alerts: Omit<Alert, "id" | "created_at" | "status">[] = [];
    if (latest.roas < 2) {
      alerts.push({
        client_id: client.id,
        severity: "red",
        alert_type: "roas_drop",
        metric_affected: "Retorno",
        current_value: latest.roas,
        benchmark_value: 3.5,
        threshold_exceeded: "Retorno por debajo de umbral critico",
        suggested_action: "Revisar conjuntos con gasto alto, rotar creativos y validar conversiones."
      });
    }
    if (latest.frequency > 3.5) {
      alerts.push({
        client_id: client.id,
        severity: "yellow",
        alert_type: "frequency",
        metric_affected: "Frecuencia",
        current_value: latest.frequency,
        benchmark_value: 3.5,
        threshold_exceeded: "Frecuencia sobre limite operativo",
        suggested_action: "Rotar creativos con 100ads y abrir nuevos angulos de venta."
      });
    }
    return alerts;
  }

  const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(
    `Analiza metricas de ${client.business_name} y devuelve JSON de alertas. Ultimos datos: ${JSON.stringify(metrics.slice(-8))}`
  );
  const text = result.response.text();
  try {
    return JSON.parse(text) as Omit<Alert, "id" | "created_at" | "status">[];
  } catch {
    return [];
  }
}

export async function draftReport(input: { client: Client; metrics: MetricDaily[] }) {
  const totalSpend = input.metrics.reduce((sum, metric) => sum + metric.spend, 0);
  const avgReturn = input.metrics.reduce((sum, metric) => sum + metric.roas, 0) / Math.max(input.metrics.length, 1);

  if (!process.env.GEMINI_API_KEY) {
    return `Durante este periodo invertimos $${totalSpend.toFixed(0)} y logramos un retorno promedio de x${avgReturn.toFixed(1)}. El siguiente foco sera mantener escala gradual y renovar creativos antes de que suba la frecuencia.`;
  }

  const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(
    `Redacta en espanol un reporte ejecutivo para ${input.client.business_name}. Datos: ${JSON.stringify(input.metrics)}`
  );
  return result.response.text();
}
