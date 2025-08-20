import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

const JWT_SECRET = "dev_secret_change_me";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: "email already registered" });

    // Hash the password before storing
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed } as any);

    const token = jwt.sign({ sub: user.id, id: user.id, name: user.name, email: user.email }, JWT_SECRET, {
      expiresIn: "2h",
    });
    res.cookie("authToken", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 2 * 60 * 60 * 1000,
    } as any);

    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err: any) {
    return res.status(500).json({ message: "registration failed", error: err?.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: "invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "invalid credentials" });
    const token = jwt.sign({ sub: user.id, id: user.id, name: user.name, email: user.email,role:user.role }, JWT_SECRET, {
      expiresIn: "2h",
    });
    res.cookie("authToken", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 2 * 60 * 60 * 1000,
    } as any);

    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err: any) {
    return res.status(500).json({ message: "login failed", error: err?.message });
  }
};
