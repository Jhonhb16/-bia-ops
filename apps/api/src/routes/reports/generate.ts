import { Router } from "express";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfiguredSecret } from "../../lib/security.js";
import { store } from "../../lib/store.js";
import { generateReportPDF, type ReportData } from "../../lib/pdf-generator.js";
import { sendReportEmail } from "../../lib/email.js";

export const reportsRouter = Router();

reportsRouter.use(
  requireConfiguredSecret(
    () => process.env.INTERNAL_API_SECRET ?? process.env.API_INTERNAL_SECRET ?? "",
    {
      label: "endpoint de reportes",
      headerNames: ["x-internal-secret", "x-api-secret", "authorization"]
    }
  )
);

reportsRouter.post("/generate", async (req, res) => {
  const { clientId, period_start, period_end, report_type = "biweekly" } = (req.body ?? {}) as {
    clientId?: string;
    period_start?: string;
    period_end?: string;
    report_type?: "biweekly" | "monthly" | "custom";
  };

  if (!clientId) {
    return res.status(400).json({ ok: false, message: "clientId requerido" });
  }

  try {
    const result = store.generateReport({
      clientId,
      ...(period_start !== undefined ? { periodStart: period_start } : {}),
      ...(period_end !== undefined ? { periodEnd: period_end } : {}),
      reportType: report_type
    });

    const { report, meta } = result;
    const client = store.getClient(clientId);
    if (!client) {
      return res.status(404).json({ ok: false, message: "Cliente no encontrado" });
    }

    const actions = store.getClientActions(clientId).slice(0, 6);
    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
    const periodLabel = `${fmtDate(report.period_start)} – ${fmtDate(report.period_end)}`;

    const totalConversions = report.top_creatives.reduce((s, c) => s + c.conversions, 0);

    const reportData: ReportData = {
      clientName: client.contact_name,
      businessName: client.business_name,
      period: { start: report.period_start, end: report.period_end },
      metrics: {
        totalSpend: report.total_spend,
        avgRoas: report.avg_roas,
        totalReach: report.total_reach,
        totalImpressions: report.total_impressions,
        totalConversions,
        totalRevenue: Number((report.total_spend * report.avg_roas).toFixed(2))
      },
      topCreatives: report.top_creatives.map((c) => ({
        name: c.name,
        spend: c.spend,
        roas: c.roas,
        conversions: c.conversions
      })),
      actions: actions.map((a) => ({
        date: a.created_at,
        description: a.description,
        actionType: a.action_type
      })),
      recommendations: report.recommendations,
      nextSteps: report.recommendations,
      plan: client.plan_type
    };

    const pdfBuffer = await generateReportPDF(reportData);

    const reportsDir = join(process.cwd(), "public", "reports", clientId);
    mkdirSync(reportsDir, { recursive: true });
    const filename = `report-${Date.now()}.pdf`;
    writeFileSync(join(reportsDir, filename), pdfBuffer);

    const baseUrl =
      process.env.EXTERNAL_BASE_URL ??
      `http://127.0.0.1:${process.env.API_PORT ?? process.env.PORT ?? "4000"}`;
    const pdfUrl = `${baseUrl}/public/reports/${clientId}/${filename}`;

    store.updateReportPdfUrl(report.id, clientId, pdfUrl);

    let emailSent = false;
    if (client.email) {
      await sendReportEmail({
        to: client.email,
        clientName: client.contact_name,
        businessName: client.business_name,
        period: periodLabel,
        roas: report.avg_roas,
        totalSpend: report.total_spend,
        pdfUrl
      });
      emailSent = true;
    }

    return res.status(200).json({
      ok: true,
      message: emailSent ? "Reporte generado y enviado por email" : "Reporte generado",
      data: {
        reportId: report.id,
        pdfUrl,
        metricsCount: meta.metrics_count,
        campaignsCount: meta.campaigns_count,
        emailSent
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error generando reporte";
    return res.status(500).json({ ok: false, message });
  }
});
