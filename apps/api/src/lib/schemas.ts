import { z } from "zod";

export const clientIdParamSchema = z.object({
  clientId: z.string().min(1, "El clientId es obligatorio")
});

export const hotmartWebhookSchema = z
  .object({
    event: z.string().optional(),
    event_type: z.string().optional(),
    order_id: z.string().min(1).optional(),
    transaction: z.string().min(1).optional(),
    product_name: z.string().min(1).optional(),
    product: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    buyer_name: z.string().min(1).optional(),
    buyer_email: z.string().email().optional(),
    email: z.string().email().optional(),
    value: z.coerce.number().nonnegative().optional(),
    currency: z.string().min(1).optional(),
    client_id: z.string().min(1).optional(),
    access_token: z.string().min(1).optional()
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (!value.order_id && !value.transaction) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Se requiere order_id o transaction"
      });
    }

    if (!value.buyer_email && !value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Se requiere buyer_email o email"
      });
    }
  });

export const onboardingWebhookSchema = z.object({
  client_id: z.string().min(1, "client_id es obligatorio"),
  step: z.coerce.number().int().min(1).max(7),
  completed: z.boolean().optional().default(true),
  notes: z.string().optional(),
  expert_id: z.string().optional(),
  source: z.string().optional()
});

export const metaSyncSchema = z.object({
  force_refresh: z.boolean().optional().default(false),
  ad_account_id: z.string().optional(),
  access_token: z.string().optional(),
  metrics_window_days: z.coerce.number().int().min(1).max(90).optional().default(7)
});

export const runDailyAlertsSchema = z.object({
  client_ids: z.array(z.string().min(1)).optional(),
  severity: z.enum(["red", "yellow"]).optional()
});

export const generateReportSchema = z.object({
  client_id: z.string().min(1, "client_id es obligatorio"),
  period_start: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  period_end: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  report_type: z.enum(["biweekly", "monthly", "custom"]).optional().default("custom")
});

export type HotmartWebhookInput = z.infer<typeof hotmartWebhookSchema>;
export type OnboardingWebhookInput = z.infer<typeof onboardingWebhookSchema>;
export type MetaSyncInput = z.infer<typeof metaSyncSchema>;
export type RunDailyAlertsInput = z.infer<typeof runDailyAlertsSchema>;
export type GenerateReportInput = z.infer<typeof generateReportSchema>;
