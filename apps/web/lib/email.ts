import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const DEMO_MODE = !process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "BIA Agency <noreply@biaagency.co>";

function styleBase(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BIA Agency</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1A1A2E;padding:24px 40px;">
            <span style="color:#8930D6;font-size:22px;font-weight:bold;letter-spacing:1px;">BIA AGENCY</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background:#1A1A2E;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#AAAAAA;font-size:12px;">¿Preguntas? Escríbenos por WhatsApp</p>
            <p style="margin:6px 0 0;color:#555555;font-size:11px;">BIA Agency · Todos los derechos reservados</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 20px;color:#1A1A2E;font-size:22px;font-weight:bold;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;color:#444444;font-size:15px;line-height:1.6;">${text}</p>`;
}

function metricBox(label: string, value: string): string {
  return `
  <td style="padding:4px;">
    <div style="background:#F4F4F8;border-radius:6px;padding:14px 18px;text-align:center;">
      <div style="color:#888888;font-size:11px;margin-bottom:6px;">${label}</div>
      <div style="color:#1A1A2E;font-size:20px;font-weight:bold;">${value}</div>
    </div>
  </td>`;
}

function ctaButton(text: string, href: string): string {
  return `
  <p style="margin:24px 0 0;">
    <a href="${href}" style="display:inline-block;background:#8930D6;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:bold;">${text}</a>
  </p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #EEEEEE;margin:24px 0;" />`;
}

export async function sendWelcomeEmail(params: {
  to: string;
  clientName: string;
  businessName: string;
  plan: string;
  accessLink: string;
}): Promise<void> {
  const { to, clientName, businessName, plan, accessLink } = params;

  if (DEMO_MODE) {
    console.log("[EMAIL DEMO] sendWelcomeEmail", { to, clientName, businessName, plan });
    return;
  }

  const html = styleBase(`
    ${heading(`¡Bienvenido a BIA Agency, ${clientName}!`)}
    ${paragraph(`Hola ${clientName}, estamos muy contentos de tenerte en el equipo. A partir de ahora gestionaremos las campañas de <strong>${businessName}</strong> para que puedas escalar con tranquilidad.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      ${metricBox("Tu plan", plan)}
      ${metricBox("Estado", "Activo")}
    </tr></table>
    ${divider()}
    ${paragraph("En las próximas horas nuestro equipo te contactará para completar el proceso de accesos y configuración inicial.")}
    ${paragraph("Mientras tanto, puedes revisar tu dashboard en el siguiente enlace:")}
    ${ctaButton("Ver mi dashboard", accessLink)}
  `);

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `¡Bienvenido a BIA Agency, ${clientName}! 🚀`,
    html
  });
}

export async function sendReportEmail(params: {
  to: string;
  clientName: string;
  businessName: string;
  period: string;
  roas: number;
  totalSpend: number;
  pdfUrl: string;
}): Promise<void> {
  const { to, clientName, businessName, period, roas, totalSpend, pdfUrl } = params;

  if (DEMO_MODE) {
    console.log("[EMAIL DEMO] sendReportEmail", { to, clientName, businessName, period, roas, totalSpend, pdfUrl });
    return;
  }

  const roasFormatted = roas.toFixed(2);
  const spendFormatted = `USD ${totalSpend.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;
  const roasColor = roas >= 2 ? "#2E7D32" : roas >= 1.2 ? "#E65100" : "#C62828";

  const html = styleBase(`
    ${heading(`Tu reporte quincenal está listo, ${clientName}`)}
    ${paragraph(`Aquí tienes el resumen del rendimiento de <strong>${businessName}</strong> para el período <strong>${period}</strong>.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      ${metricBox("Inversión total", spendFormatted)}
      <td style="padding:4px;">
        <div style="background:#F4F4F8;border-radius:6px;padding:14px 18px;text-align:center;">
          <div style="color:#888888;font-size:11px;margin-bottom:6px;">ROAS promedio</div>
          <div style="color:${roasColor};font-size:20px;font-weight:bold;">${roasFormatted}</div>
        </div>
      </td>
    </tr></table>
    ${divider()}
    ${paragraph("Puedes descargar el reporte completo con todos los detalles, creativos y próximos pasos en el siguiente enlace:")}
    ${ctaButton("Descargar reporte PDF", pdfUrl)}
    ${divider()}
    ${paragraph("Si tienes alguna pregunta sobre los resultados, no dudes en escribirnos por WhatsApp. Estamos aquí para ayudarte.")}
  `);

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Reporte quincenal de ${businessName} — ${period}`,
    html
  });
}

export async function sendCEOWeeklySummary(params: {
  to: string;
  mrr: number;
  activeClients: number;
  newClients: number;
  churnedClients: number;
  alertsResolved: number;
  alertsPending: number;
  topClients: Array<{ name: string; roas: number }>;
  atRiskClients: Array<{ name: string; status: string }>;
}): Promise<void> {
  const {
    to,
    mrr,
    activeClients,
    newClients,
    churnedClients,
    alertsResolved,
    alertsPending,
    topClients,
    atRiskClients
  } = params;

  if (DEMO_MODE) {
    console.log("[EMAIL DEMO] sendCEOWeeklySummary", {
      to,
      mrr,
      activeClients,
      newClients,
      churnedClients,
      alertsResolved,
      alertsPending
    });
    return;
  }

  const mrrFormatted = `USD ${mrr.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;
  const weekDate = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

  const topClientsRows = topClients
    .slice(0, 5)
    .map(
      (c) =>
        `<tr>
          <td style="padding:8px 12px;font-size:13px;color:#1A1A2E;">${c.name}</td>
          <td style="padding:8px 12px;font-size:13px;color:#2E7D32;font-weight:bold;">${c.roas.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const atRiskRows = atRiskClients
    .slice(0, 5)
    .map(
      (c) =>
        `<tr>
          <td style="padding:8px 12px;font-size:13px;color:#1A1A2E;">${c.name}</td>
          <td style="padding:8px 12px;font-size:13px;color:#C62828;">${c.status}</td>
        </tr>`
    )
    .join("");

  const html = styleBase(`
    ${heading(`Resumen semanal CEO — ${weekDate}`)}
    ${paragraph("Aquí está el resumen ejecutivo de la semana para BIA Agency.")}
    ${divider()}
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        ${metricBox("MRR", mrrFormatted)}
        ${metricBox("Clientes activos", activeClients.toString())}
        ${metricBox("Nuevos", `+${newClients}`)}
        ${metricBox("Bajas", churnedClients.toString())}
      </tr>
      <tr>
        ${metricBox("Alertas resueltas", alertsResolved.toString())}
        ${metricBox("Alertas pendientes", alertsPending.toString())}
      </tr>
    </table>
    ${divider()}
    ${
      topClients.length > 0
        ? `<p style="margin:0 0 10px;color:#1A1A2E;font-weight:bold;font-size:14px;">Top clientes por ROAS</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #EEEEEE;border-radius:6px;overflow:hidden;">
      <tr style="background:#F4F4F8;">
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#555555;">Cliente</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#555555;">ROAS</th>
      </tr>
      ${topClientsRows}
    </table>`
        : ""
    }
    ${
      atRiskClients.length > 0
        ? `${divider()}
    <p style="margin:0 0 10px;color:#C62828;font-weight:bold;font-size:14px;">Clientes en riesgo</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #FFCCCC;border-radius:6px;overflow:hidden;">
      <tr style="background:#FFF5F5;">
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#C62828;">Cliente</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#C62828;">Estado</th>
      </tr>
      ${atRiskRows}
    </table>`
        : ""
    }
  `);

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Resumen semanal CEO — BIA Agency ${weekDate}`,
    html
  });
}
