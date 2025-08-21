import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

const JWT_SECRET = "dev_secret_change_me";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password and role are required" });
    }
    
    console.log("Registration attempt:", { name, email, role });
    
    const existing = await User.findOne({ 
      where: { 
        email: email.toLowerCase() 
      } 
    });
    
    console.log("Existing user check result:", existing);
    
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    const user = await User.create({ 
      name, 
      email: email.toLowerCase(), 
      password: hashed, 
      role: role 
    } as any);

    console.log("User created successfully:", { id: user.id, email: user.email, role: user.role });

    const token = jwt.sign({ 
      sub: user.id, 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    }, JWT_SECRET, {
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
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Registration failed", error: err?.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    console.log("Login attempt for email:", email);
    
    const user = await User.findOne({ 
      where: { 
        email: email.toLowerCase() 
      } 
    });
    
    console.log("User found:", user ? { id: user.id, email: user.email, role: user.role } : "No user found");
    
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    console.log("Password comparison result:", ok);
    
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const token = jwt.sign({ 
      sub: user.id, 
      id: user.id, 
      name: user.name, 
      email: user.email,
      role: user.role 
    }, JWT_SECRET, {
      expiresIn: "2h",
    });
    
    res.cookie("authToken", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 2 * 60 * 60 * 1000,
    } as any);

    return res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login failed", error: err?.message });
  }
};
