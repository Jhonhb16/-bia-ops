import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

type SecretSource = {
  label: string;
  headerNames: string[];
  message?: string;
};

export function requireConfiguredSecret(expectedSecret: string | undefined | (() => string | undefined), source: SecretSource) {
  return (req: Request, res: Response, next: NextFunction) => {
    const configuredSecret = typeof expectedSecret === "function" ? expectedSecret() : expectedSecret;

    if (!configuredSecret) {
      return next();
    }

    const providedSecret = readSecretHeader(req, source.headerNames);
    if (!providedSecret || !secretsMatch(providedSecret, configuredSecret)) {
      return res.status(401).json({
        ok: false,
        mensaje: source.message ?? `Se requiere un secreto valido para ${source.label}.`
      });
    }

    return next();
  };
}

function readSecretHeader(req: Request, headerNames: string[]) {
  for (const headerName of headerNames) {
    const value = req.get(headerName)?.trim();
    if (!value) continue;
    if (value.toLowerCase().startsWith("bearer ")) {
      return value.slice(7).trim();
    }
    return value;
  }
  return null;
}

function secretsMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
