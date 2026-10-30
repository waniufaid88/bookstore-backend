import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = 10;

if (!ACCESS_SECRET) {
  throw new Error("ACCESS_SECRET is not configured");
}

if (!REFRESH_SECRET) {
  throw new Error("REFRESH_SECRET is not configured");
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, ACCESS_SECRET);

      if (typeof decoded === "string" || typeof decoded.id !== "string") {
        return res.status(401).json({
          message: "Invalid access token",
        });
      }

      req.user = {
        id: decoded.id,
      };

      return next();
    } catch {
      // Expired access tokens should fall through to refresh-token validation.
    }
  }

  if (!refreshToken) {
    return res.status(401).json({
      message: "Access token expired. Please log in again.",
    });
  }
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    if (typeof decoded === "string" || typeof decoded.id !== "string") {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    const newAccessToken = jwt.sign({ id: decoded.id }, ACCESS_SECRET, {
      expiresIn: `${ACCESS_TOKEN_EXPIRY}m`,
    });

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: ACCESS_TOKEN_EXPIRY * 60 * 1000,
    });

    req.user = { id: decoded.id };

    return next();
  } catch {
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });

    return res.status(401).json({
      message: "Refresh token expired or invalid. Please log in again.",
    });
  }
};
