import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
};

type TokenPayload = {
  id: string;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
};

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev_jwt_secret_change_me";
}

function extractToken(req: Request) {
  const authHeader = req.header("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookieToken = (req.cookies as Record<string, unknown> | undefined)?.deepenk_token;
  return typeof cookieToken === "string" ? cookieToken : undefined;
}

export function authOptional() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      next();
      return;
    }
    try {
      const payload = jwt.verify(token, getJwtSecret()) as TokenPayload;
      req.ctx = { ...(req.ctx || { requestId: "unknown" }), userId: payload.id };
    } catch {
      next();
      return;
    }
    next();
  };
}

export function authRequired() {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }
    try {
      const payload = jwt.verify(token, getJwtSecret()) as TokenPayload;
      req.ctx = { ...(req.ctx || { requestId: "unknown" }), userId: payload.id };
      next();
    } catch {
      res.status(401).json({ error: "INVALID_TOKEN" });
    }
  };
}

