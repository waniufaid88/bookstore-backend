import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";

import authRouter from "./routes/authRouter";
import bookRoutes from "./routes/bookRoutes";
import personRoutes from "./routes/personRoutes";
import { authMiddleware } from "./middleware/authMiddleware";

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Book Store API is running",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/books", authMiddleware, bookRoutes);
app.use("/api", authMiddleware, personRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
