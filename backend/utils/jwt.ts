import jwt from 'jsonwebtoken';
import { Request } from 'express';

export function getUserIdFromToken(req: Request): number | null {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, "dev_secret_change_me") as { id?: number };
        return decoded.id ?? null;
    } catch {
        return null;
    }
}

export function getRoleFromToken(req: Request): string | null {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, "dev_secret_change_me") as { role?: string };
        return decoded.role ?? null;
    } catch {
        return null;
    }
}