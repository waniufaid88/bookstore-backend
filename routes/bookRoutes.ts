import { Router } from "express";

import {
  getBooks,
  createBook,
  editBook,
  removeBook,
  createPurchase,
  createSale,
  getTransactionHistoryController,
  getTransactionHistorySummaryController,
} from "../controllers/bookController";

const router = Router();

router.get("/", getBooks);

router.post("/", createBook);
router.patch("/:id", editBook);
router.delete("/:id", removeBook);
router.get("/transactions/history", getTransactionHistoryController);
router.get("/transactions/history/summary", getTransactionHistorySummaryController);

router.post("/purchase", createPurchase);
router.post("/sale", createSale);

export default router;
