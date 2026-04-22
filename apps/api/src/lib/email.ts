import { Resend } from "resend";

const DEMO_MODE = !process.env.RESEND_API_KEY;
const resend = DEMO_MODE ? null : new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "BIA Agency <noreply@biaagency.co>";

function styleBase(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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

function ctaButton(text: string, href: string): string {
  return `<p style="margin:24px 0 0;"><a href="${href}" style="display:inline-block;background:#8930D6;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:bold;">${text}</a></p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #EEEEEE;margin:24px 0;" />`;
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

export async function sendWelcomeEmail(params: {
  to: string;
  clientName: string;
  businessName: string;
  plan: string;
  accessLink: string;
}): Promise<void> {
  const { to, clientName, businessName, plan, accessLink } = params;

  if (DEMO_MODE || !resend) {
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
    subject: `¡Bienvenido a BIA Agency, ${clientName}!`,
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

  if (DEMO_MODE || !resend) {
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
    ${paragraph("Si tienes alguna pregunta sobre los resultados, no dudes en escribirnos por WhatsApp.")}
  `);

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Reporte quincenal de ${businessName} — ${period}`,
    html
  });
}
