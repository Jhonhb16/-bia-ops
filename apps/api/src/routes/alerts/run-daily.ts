import { Router } from "express";
import { runDailyAlertsSchema } from "../../lib/schemas.js";
import { requireConfiguredSecret } from "../../lib/security.js";
import { store } from "../../lib/store.js";
import { sendTelegramMessage } from "../../lib/telegram.js";

export const alertsRouter = Router();

alertsRouter.use(
  requireConfiguredSecret(() => process.env.INTERNAL_API_SECRET ?? process.env.API_INTERNAL_SECRET ?? process.env.API_SECRET ?? process.env.INTERNAL_SECRET, {
    label: "endpoint interno de alertas",
    headerNames: ["x-internal-secret", "x-api-secret", "authorization"]
  })
);

alertsRouter.post("/run-daily", async (req, res) => {
  const parsed = runDailyAlertsSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      mensaje: "El payload de alertas no es válido",
      errores: parsed.error.flatten()
    });
  }

  const result = store.runDailyAlerts({
    ...(parsed.data.client_ids ? { clientIds: parsed.data.client_ids } : {}),
    ...(parsed.data.severity ? { severity: parsed.data.severity } : {})
  });

  if (result.alerts.length > 0) {
    const lines = result.alerts.map((a) => {
      const client = store.getClient(a.client_id);
      const emoji = a.severity === "red" ? "🔴" : "🟡";
      return `${emoji} <b>${client?.business_name ?? a.client_id}</b>\n${a.suggested_action}`;
    });
    const msg = `<b>Alertas BIA OPS (${result.alerts.length})</b>\n\n${lines.join("\n\n")}`;
    await sendTelegramMessage(msg).catch(() => {/* best-effort */});
  }

  return res.status(200).json({
    ok: true,
    mensaje: "Ejecución diaria de alertas completada",
    data: result
  });
});
