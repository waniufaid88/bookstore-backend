import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { createUser, findUserByEmail, getUserById } from "../models/authModel";
import { AuthRequest } from "@/middleware/authMiddleware";

const ACCESS_SECRET = process.env.ACCESS_SECRET ?? "access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET ?? "refresh_secret";
const ACCESS_TOKEN_EXPIRY = 10;
const REFRESH_TOKEN_EXPIRY = 7;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("ACCESS_SECRET or REFRESH_SECRET is missing from .env");
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      password.length < 6
    ) {
      return res.status(400).json({
        error: "Enter a valid credentials",
      });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        error: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await createUser({
      name: name.trim(),
      email: email,
      password: hashedPassword,
    });

    const accessToken = jwt.sign({ id: user.id }, ACCESS_SECRET, {
      expiresIn: `${ACCESS_TOKEN_EXPIRY}m`,
    });
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, {
      expiresIn: `${REFRESH_TOKEN_EXPIRY}d`,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: ACCESS_TOKEN_EXPIRY * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_TOKEN_EXPIRY * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      error: "Could not register user",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const accessToken = jwt.sign({ id: user.id }, ACCESS_SECRET, {
      expiresIn: `${ACCESS_TOKEN_EXPIRY}m`,
    });

    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, {
      expiresIn: `${REFRESH_TOKEN_EXPIRY}d`,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // secure: false,
      maxAge: ACCESS_TOKEN_EXPIRY * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // secure: false,
      maxAge: REFRESH_TOKEN_EXPIRY * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Could not log in",
    });
  }
}

export async function logout(req: Request, res: Response) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  return res.status(200).json({
    message: "Logout successful",
  });
}

export async function getUser(req: AuthRequest, res: Response) {
  const id = req.user?.id;

  if (!id) {
    return res.status(400).json({
      error: "User id not provided",
      user: null,
    });
  }
  try {
    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        user: null,
      });
    }

    return res.status(200).json({
      message: "User found successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Get user error", error);

    res.status(500).json({
      error: "Failed to fetch user",
    });
  }
}
