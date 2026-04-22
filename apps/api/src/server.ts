import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { join } from "node:path";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { hotmartWebhookRouter } from "./routes/webhooks/hotmart.js";
import { onboardingWebhookRouter } from "./routes/webhooks/onboarding.js";
import { makeRouter } from "./routes/webhooks/make.js";
import { metaSyncRouter } from "./routes/meta/sync.js";
import { alertsRouter } from "./routes/alerts/run-daily.js";
import { reportsRouter } from "./routes/reports/generate.js";
import { startDailyJobs } from "./jobs/daily.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins === "*" ? true : env.corsOrigins
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/public/reports", express.static(join(process.cwd(), "public", "reports")));

app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    mensaje: "BIA OPS API lista",
    data: {
      env: env.NODE_ENV,
      timezone: "America/Bogota"
    }
  });
});

app.use("/health", healthRouter);
app.use("/webhooks/hotmart", hotmartWebhookRouter);
app.use("/webhooks/onboarding", onboardingWebhookRouter);
app.use("/webhooks/make", makeRouter);
app.use("/meta", metaSyncRouter);
app.use("/alerts", alertsRouter);
app.use("/reports", reportsRouter);

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: "Ruta no encontrada"
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Error interno del servidor";
  res.status(500).json({
    ok: false,
    mensaje: message
  });
});

const port = env.PORT;
const server = app.listen(port, () => {
  console.log(`[api] ${env.APP_NAME} escuchando en http://127.0.0.1:${port}`);
});

if (env.ENABLE_CRON_JOBS) {
  startDailyJobs(env.CRON_INTERVAL_MS);
}

export default server;
