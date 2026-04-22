import { Router } from "express";
import { store } from "../lib/store.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  const snapshot = store.getHealthSnapshot();

  res.status(200).json({
    ok: true,
    mensaje: "API operativa",
    data: {
      status: snapshot.healthy ? "healthy" : "degraded",
      snapshot
    }
  });
});
