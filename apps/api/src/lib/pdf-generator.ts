import PDFDocument from "pdfkit";

export interface ReportData {
  clientName: string;
  businessName: string;
  period: { start: string; end: string };
  metrics: {
    totalSpend: number;
    avgRoas: number;
    totalReach: number;
    totalImpressions: number;
    totalConversions: number;
    totalRevenue: number;
    prevPeriodRoas?: number;
  };
  topCreatives: Array<{
    name: string;
    spend: number;
    roas: number;
    conversions: number;
  }>;
  actions: Array<{
    date: string;
    description: string;
    actionType: string;
  }>;
  recommendations: string;
  nextSteps: string;
  plan: string;
}

const PURPLE = "#8930D6";
const DARK_TEXT = "#1A1A2E";
const GRAY_TEXT = "#555555";
const LIGHT_GRAY = "#F4F4F8";
const WHITE = "#FFFFFF";
const BORDER_GRAY = "#DDDDDD";

function formatCurrency(value: number): string {
  return `USD ${value.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

export async function generateReportPDF(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100;

    // ── HEADER ────────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill(DARK_TEXT);

    doc
      .fill(PURPLE)
      .fontSize(22)
      .font("Helvetica-Bold")
      .text("BIA AGENCY", 50, 20);

    doc
      .fill(WHITE)
      .fontSize(11)
      .font("Helvetica")
      .text("Reporte de Rendimiento", 50, 46);

    doc
      .fill(WHITE)
      .fontSize(10)
      .font("Helvetica")
      .text(data.businessName, doc.page.width - 270, 20, { width: 220, align: "right" });

    doc
      .fill(LIGHT_GRAY)
      .fontSize(9)
      .text(
        `${formatDate(data.period.start)} — ${formatDate(data.period.end)}`,
        doc.page.width - 270,
        40,
        { width: 220, align: "right" }
      );

    doc
      .fill(LIGHT_GRAY)
      .fontSize(9)
      .text(`Plan: ${data.plan}`, doc.page.width - 270, 58, { width: 220, align: "right" });

    doc.moveDown(0);
    doc.y = 110;

    // ── SECTION 1: Resumen del período ─────────────────────────────────────
    sectionTitle(doc, "1. Resumen del período");

    const hasComparison = data.metrics.prevPeriodRoas !== undefined;
    const roasDiff = hasComparison ? data.metrics.avgRoas - (data.metrics.prevPeriodRoas ?? 0) : 0;

    const metricsGrid = [
      { label: "Inversión total", value: formatCurrency(data.metrics.totalSpend) },
      { label: "ROAS promedio", value: data.metrics.avgRoas.toFixed(2) },
      { label: "Conversiones", value: data.metrics.totalConversions.toString() },
      { label: "Ingresos generados", value: formatCurrency(data.metrics.totalRevenue) },
      { label: "Impresiones", value: data.metrics.totalImpressions.toLocaleString("es-CO") },
      { label: "Alcance", value: data.metrics.totalReach.toLocaleString("es-CO") }
    ];

    drawMetricsGrid(doc, metricsGrid, pageWidth);

    if (hasComparison) {
      const roasTrend = roasDiff >= 0 ? `+${roasDiff.toFixed(2)}` : roasDiff.toFixed(2);
      const trendColor = roasDiff >= 0 ? "#2E7D32" : "#C62828";
      const trendBg = roasDiff >= 0 ? "#E8F5E9" : "#FFEBEE";

      doc.y += 10;
      doc.rect(50, doc.y, pageWidth, 30).fill(trendBg);
      doc
        .fill(trendColor)
        .fontSize(10)
        .font("Helvetica")
        .text(
          `Comparación vs período anterior: ROAS ${data.metrics.prevPeriodRoas?.toFixed(2) ?? "N/D"} → ${data.metrics.avgRoas.toFixed(2)} (${roasTrend})`,
          60,
          doc.y + 10
        );
      doc.y += 38;
    }

    doc.moveDown(0.5);

    // ── SECTION 2: Tus mejores anuncios ────────────────────────────────────
    sectionTitle(doc, "2. Tus mejores anuncios");

    if (data.topCreatives.length === 0) {
      doc
        .fill(GRAY_TEXT)
        .fontSize(10)
        .font("Helvetica")
        .text("No hay datos de creativos para este período.", 50, doc.y);
      doc.moveDown(1);
    } else {
      drawCreativesTable(doc, data.topCreatives.slice(0, 3), pageWidth);
    }

    doc.moveDown(0.5);

    // ── SECTION 3: Lo que hicimos ───────────────────────────────────────────
    sectionTitle(doc, "3. Lo que hicimos");

    if (data.actions.length === 0) {
      doc
        .fill(GRAY_TEXT)
        .fontSize(10)
        .font("Helvetica")
        .text("Sin acciones registradas en este período.", 50, doc.y);
      doc.moveDown(1);
    } else {
      for (const action of data.actions.slice(0, 6)) {
        const y = doc.y;
        doc.circle(58, y + 5, 3).fill(PURPLE);
        doc
          .fill(GRAY_TEXT)
          .fontSize(8)
          .font("Helvetica")
          .text(formatDate(action.date), 65, y, { width: 80 });
        doc
          .fill(DARK_TEXT)
          .fontSize(10)
          .font("Helvetica")
          .text(action.description, 155, y, { width: pageWidth - 105 });
        doc.moveDown(0.3);
      }
    }

    doc.moveDown(0.5);

    // ── SECTION 4: Próximos pasos ───────────────────────────────────────────
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }

    sectionTitle(doc, "4. Próximos pasos");

    const nextStepsText = data.nextSteps || data.recommendations || "Sin recomendaciones adicionales para este período.";

    doc.rect(50, doc.y, pageWidth, 8).fill(LIGHT_GRAY);
    doc
      .fill(DARK_TEXT)
      .fontSize(10)
      .font("Helvetica")
      .text(nextStepsText, 58, doc.y + 14, { width: pageWidth - 16, lineGap: 4 });

    doc.y += 24 + Math.ceil(nextStepsText.length / 95) * 14;

    doc.moveDown(1);

    // ── FOOTER ─────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 55;
    doc.rect(0, footerY - 8, doc.page.width, 55).fill(DARK_TEXT);

    doc
      .fill(PURPLE)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("¿Preguntas? Escríbenos por WhatsApp", 50, footerY);

    doc
      .fill(LIGHT_GRAY)
      .fontSize(8)
      .font("Helvetica")
      .text(`Generado por BIA Agency · ${new Date().toLocaleDateString("es-CO")}`, 50, footerY + 14);

    doc.end();
  });
}

function sectionTitle(doc: InstanceType<typeof PDFDocument>, title: string): void {
  const pageWidth = doc.page.width - 100;
  doc.rect(50, doc.y, pageWidth, 24).fill(PURPLE);
  doc
    .fill(WHITE)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(title, 58, doc.y + 7);
  doc.y += 32;
}

function drawMetricsGrid(
  doc: InstanceType<typeof PDFDocument>,
  items: Array<{ label: string; value: string }>,
  pageWidth: number
): void {
  const cols = 3;
  const cellWidth = pageWidth / cols;
  const cellHeight = 46;
  const startY = doc.y;

  for (let i = 0; i < items.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 50 + col * cellWidth;
    const y = startY + row * cellHeight;

    doc.rect(x, y, cellWidth - 4, cellHeight - 4).fill(LIGHT_GRAY);
    doc
      .fill(GRAY_TEXT)
      .fontSize(8)
      .font("Helvetica")
      .text(items[i]?.label ?? "", x + 8, y + 6, { width: cellWidth - 20 });
    doc
      .fill(DARK_TEXT)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(items[i]?.value ?? "", x + 8, y + 18, { width: cellWidth - 20 });
  }

  const rows = Math.ceil(items.length / cols);
  doc.y = startY + rows * cellHeight + 6;
}

function drawCreativesTable(
  doc: InstanceType<typeof PDFDocument>,
  creatives: Array<{ name: string; spend: number; roas: number; conversions: number }>,
  pageWidth: number
): void {
  const headers = ["Creativo", "Inversión", "ROAS", "Conversiones"];
  const colWidths = [pageWidth * 0.45, pageWidth * 0.22, pageWidth * 0.16, pageWidth * 0.17];
  const rowHeight = 26;
  let x = 50;
  const headerY = doc.y;

  doc.rect(50, headerY, pageWidth, rowHeight).fill(DARK_TEXT);

  for (let i = 0; i < headers.length; i++) {
    doc
      .fill(WHITE)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(headers[i] ?? "", x + 6, headerY + 9, { width: (colWidths[i] ?? 0) - 10 });
    x += colWidths[i] ?? 0;
  }

  doc.y = headerY + rowHeight;

  for (let r = 0; r < creatives.length; r++) {
    const creative = creatives[r];
    if (!creative) continue;
    const rowY = doc.y;
    const bg = r % 2 === 0 ? WHITE : LIGHT_GRAY;

    doc.rect(50, rowY, pageWidth, rowHeight).fill(bg).stroke(BORDER_GRAY);

    const rowData = [
      creative.name,
      formatCurrency(creative.spend),
      creative.roas.toFixed(2),
      creative.conversions.toString()
    ];

    let rx = 50;
    for (let c = 0; c < rowData.length; c++) {
      doc
        .fill(DARK_TEXT)
        .fontSize(9)
        .font("Helvetica")
        .text(rowData[c] ?? "", rx + 6, rowY + 9, { width: (colWidths[c] ?? 0) - 10 });
      rx += colWidths[c] ?? 0;
    }

    doc.y = rowY + rowHeight;
  }

  doc.moveDown(0.5);
}
