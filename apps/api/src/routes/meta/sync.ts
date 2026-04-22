import { Router } from "express";
import { metaSyncSchema, clientIdParamSchema } from "../../lib/schemas.js";
import { requireConfiguredSecret } from "../../lib/security.js";
import { store } from "../../lib/store.js";

export const metaSyncRouter = Router();

metaSyncRouter.use(
  requireConfiguredSecret(() => process.env.INTERNAL_API_SECRET ?? process.env.API_INTERNAL_SECRET ?? process.env.API_SECRET ?? process.env.INTERNAL_SECRET, {
    label: "endpoint interno de Meta",
    headerNames: ["x-internal-secret", "x-api-secret", "authorization"]
  })
);

metaSyncRouter.post("/sync/:clientId", (req, res) => {
  const params = clientIdParamSchema.safeParse(req.params);
  const body = metaSyncSchema.safeParse(req.body ?? {});

  if (!params.success) {
    return res.status(400).json({
      ok: false,
      mensaje: "El identificador del cliente no es válido",
      errores: params.error.flatten()
    });
  }

  if (!body.success) {
    return res.status(400).json({
      ok: false,
      mensaje: "El payload de sincronización no es válido",
      errores: body.error.flatten()
    });
  }

  try {
    const result = store.syncMeta(
      params.data.clientId,
      body.data.metrics_window_days,
      body.data.ad_account_id,
      body.data.access_token
    );

    return res.status(200).json({
      ok: true,
      mensaje: body.data.force_refresh ? "Sincronización forzada completada" : "Sincronización completada",
      data: result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo sincronizar Meta";
    return res.status(404).json({
      ok: false,
      mensaje: message
    });
  }
});
