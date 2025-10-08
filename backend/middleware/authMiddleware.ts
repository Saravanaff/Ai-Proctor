import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = "dev_secret_change_me";

function getTokenFromRequest(req: Request): string | null {
  // Prefer Authorization header
  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  // Check query parameter for token (for video streaming)
  if (req.query.token && typeof req.query.token === "string") {
    return decodeURIComponent(req.query.token);
  }

  // Fallback: parse cookie header for authToken (no cookie-parser required)
  const cookieHeader = req.headers["cookie"];
  if (typeof cookieHeader === "string") {
    const parts = cookieHeader.split(/;\s*/);
    for (const part of parts) {
      const [k, v] = part.split("=");
      if (k === "authToken" && v) return decodeURIComponent(v);
    }
  }

  return null;
}

export default function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Allow CORS preflight
    if (req.method === "OPTIONS") {
      next();
      return;
    }

    const token = getTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ message: "unauthorized" });
      return;
    }

    const payload = jwt.verify(token, JWT_SECRET);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ message: "unauthorized" });
  }
}
