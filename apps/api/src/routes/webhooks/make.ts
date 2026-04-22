import { Router } from "express";
import { z } from "zod";
import { requireConfiguredSecret } from "../../lib/security.js";
import { store } from "../../lib/store.js";

export const makeRouter = Router();

const campaignBuiltSchema = z.object({
  event: z.literal("campaign_built"),
  clientId: z.string().min(1),
  campaignId: z.string().min(1),
  platform: z.string().min(1)
});

const creativesUploadedSchema = z.object({
  event: z.literal("creatives_uploaded"),
  clientId: z.string().min(1),
  count: z.coerce.number().int().nonnegative()
});

const campaignLiveSchema = z.object({
  event: z.literal("campaign_live"),
  clientId: z.string().min(1)
});

const reportSentSchema = z.object({
  event: z.literal("report_sent"),
  clientId: z.string().min(1),
  reportId: z.string().min(1)
});

const whatsappSentSchema = z.object({
  event: z.literal("whatsapp_sent"),
  clientId: z.string().min(1),
  messageType: z.string().min(1)
});

const makeEventSchema = z.discriminatedUnion("event", [
  campaignBuiltSchema,
  creativesUploadedSchema,
  campaignLiveSchema,
  reportSentSchema,
  whatsappSentSchema
]);

type MakeEvent = z.infer<typeof makeEventSchema>;

const ONBOARDING_STEP: Record<MakeEvent["event"], number> = {
  campaign_built: 4,
  creatives_uploaded: 5,
  campaign_live: 6,
  report_sent: 7,
  whatsapp_sent: 3
};

makeRouter.use(
  requireConfiguredSecret(() => process.env.MAKE_WEBHOOK_SECRET, {
    label: "webhook de Make.com",
    headerNames: ["x-make-secret"]
  })
);

makeRouter.post("/", (req, res) => {
  const parsed = makeEventSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      mensaje: "El payload de Make.com no es valido",
      errores: parsed.error.flatten()
    });
  }

  const payload = parsed.data;
  const { clientId } = payload;

  const client = store.getClient(clientId);
  if (!client) {
    return res.status(404).json({
      ok: false,
      mensaje: `Cliente no encontrado: ${clientId}`
    });
  }

  const step = ONBOARDING_STEP[payload.event];
  const notes = buildNotes(payload);

  store.registerOnboarding(clientId, step, true, notes);

  return res.status(200).json({
    ok: true,
    success: true,
    processed: payload.event
  });
});

function buildNotes(payload: MakeEvent): string {
  switch (payload.event) {
    case "campaign_built":
      return `Campaña ${payload.campaignId} creada en ${payload.platform} via Make`;
    case "creatives_uploaded":
      return `${payload.count} creativo(s) subido(s) via Make`;
    case "campaign_live":
      return "Campaña activada via Make";
    case "report_sent":
      return `Reporte ${payload.reportId} enviado via Make`;
    case "whatsapp_sent":
      return `WhatsApp tipo ${payload.messageType} enviado via Make`;
  }
}
