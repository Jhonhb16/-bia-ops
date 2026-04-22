import { z } from "zod";

const booleanLike = z
  .union([z.boolean(), z.string(), z.number()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  });

const csvToList = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default("*"),
  ENABLE_CRON_JOBS: booleanLike.optional(),
  ENABLE_CRON: booleanLike.optional(),
  CRON_INTERVAL_MS: z.coerce.number().int().positive().default(86_400_000),
  APP_NAME: z.string().default("BIA OPS API"),
  EXTERNAL_BASE_URL: z.string().url().optional(),
  HOTMART_WEBHOOK_SECRET: z.string().min(1).optional(),
  ONBOARDING_WEBHOOK_SECRET: z.string().min(1).optional(),
  INTERNAL_API_SECRET: z.string().min(1).optional()
});

const rawEnv = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.API_PORT ?? process.env.PORT,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  ENABLE_CRON_JOBS: process.env.ENABLE_CRON_JOBS ?? process.env.ENABLE_CRON,
  ENABLE_CRON: process.env.ENABLE_CRON,
  CRON_INTERVAL_MS: process.env.CRON_INTERVAL_MS,
  APP_NAME: process.env.APP_NAME,
  EXTERNAL_BASE_URL: process.env.EXTERNAL_BASE_URL,
  HOTMART_WEBHOOK_SECRET: process.env.HOTMART_WEBHOOK_SECRET,
  ONBOARDING_WEBHOOK_SECRET: process.env.ONBOARDING_WEBHOOK_SECRET,
  INTERNAL_API_SECRET:
    process.env.INTERNAL_API_SECRET ?? process.env.API_INTERNAL_SECRET ?? process.env.API_SECRET ?? process.env.INTERNAL_SECRET
});

export const env = {
  ...rawEnv,
  ENABLE_CRON_JOBS: rawEnv.ENABLE_CRON_JOBS ?? rawEnv.ENABLE_CRON ?? false,
  ENABLE_CRON: rawEnv.ENABLE_CRON ?? rawEnv.ENABLE_CRON_JOBS ?? false,
  corsOrigins: rawEnv.CORS_ORIGIN === "*" ? "*" : csvToList.parse(rawEnv.CORS_ORIGIN)
};

export type AppEnv = typeof env;
