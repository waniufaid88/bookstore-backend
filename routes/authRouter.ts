import { Router } from "express";
import {
  register,
  login,
  logout,
  getUser,
} from "../controllers/authController";
import { authMiddleware } from "@/middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/getuser", authMiddleware, getUser);

export default router;
