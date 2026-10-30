import type { Response } from "express";

import {
  getAllBooks,
  addBook,
  updateBook,
  deleteBook,
  purchaseBooks,
  sellBooks,
  getTransactionHistory,
  getTransactionHistorySummary,
} from "../models/bookModel";

import type { AuthRequest } from "../middleware/authMiddleware";

export async function getBooks(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    if (req.query.all === "true") {
      const books = await getAllBooks(userId);
      return res.status(200).json({ books, totalCount: books.totalCount });
    }

    const requestedPage = Number(req.query.page) || 1;
    const requestedLimit = Number(req.query.limit) || 2;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const requestedSortBy = req.query.sortBy;
    const sortBy =
      requestedSortBy === "name-desc" ||
      requestedSortBy === "price-asc" ||
      requestedSortBy === "price-desc"
        ? requestedSortBy
        : "name-asc";

    const page = Math.max(1, Math.floor(requestedPage));
    const limit = Math.min(50, Math.max(1, Math.floor(requestedLimit)));

    const results = await getAllBooks(userId, page, limit, search, sortBy);

    return res.status(200).json({
      ...results,
      page,
      limit,
      search,
      sortBy,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not fetch books",
    });
  }
}

export async function createBook(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const { name, description, price, stock, class: bookClass } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      typeof bookClass !== "string" ||
      !bookClass.trim() ||
      (description != null && typeof description !== "string")
    ) {
      return res.status(400).json({
        error: "Invalid book data",
      });
    }

    const book = await addBook(
      {
        name: name.trim(),
        description: description?.trim() || null,
        price: String(price),
        stock,
        class: bookClass.trim(),
      },
      userId,
    );

    return res.status(201).json(book);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not add book",
    });
  }
}

export async function editBook(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const paramId = req.params.id;
    const id = Array.isArray(paramId) ? paramId[0] : paramId;

    if (!id) {
      return res.status(400).json({
        error: "Book ID is required",
      });
    }

    const { name, description, price, stock, class: bookClass } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      typeof bookClass !== "string" ||
      !bookClass.trim() ||
      (description != null && typeof description !== "string")
    ) {
      return res.status(400).json({
        error: "Invalid book data",
      });
    }

    const book = await updateBook(id, userId, {
      name: name.trim(),
      description: description?.trim() || null,
      price: String(price),
      stock,
      class: bookClass.trim(),
    });

    if (!book) {
      return res.status(404).json({
        error: "Book not found",
      });
    }

    return res.status(200).json(book);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not update book",
    });
  }
}

export async function removeBook(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const paramId = req.params.id;
    const id = Array.isArray(paramId) ? paramId[0] : paramId;

    if (!id) {
      return res.status(400).json({
        error: "Book ID is required",
      });
    }

    const book = await deleteBook(id, userId);

    if (!book) {
      return res.status(404).json({
        error: "Book not found",
      });
    }

    return res.status(200).json({
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Could not delete book.Because it has transactions",
    });
  }
}

export async function createPurchase(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { supplierId, items } = req.body ?? {};
    if (
      typeof supplierId !== "string" ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        error: "Choose a supplier and at least one book",
      });
    }

    for (const item of items) {
      if (
        !item ||
        typeof item.bookId !== "string" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        typeof item.unitPrice !== "number" ||
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice <= 0
      ) {
        return res.status(400).json({
          error: "Each book needs a valid ID, quantity, and purchase unit cost",
        });
      }
    }

    const purchase = await purchaseBooks(userId, supplierId, items);
    return res.status(201).json(purchase);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not record purchase" });
  }
}

export async function createSale(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { customerId, items } = req.body ?? {};
    if (
      typeof customerId !== "string" ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        error: "Choose a customer and at least one book",
      });
    }

    for (const item of items) {
      if (
        !item ||
        typeof item.bookId !== "string" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return res.status(400).json({
          error: "Each book needs a valid ID and quantity greater than zero",
        });
      }
    }

    const sale = await sellBooks(userId, customerId, items);
    return res.status(201).json(sale);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not record sale" });
  }
}

export async function getTransactionHistoryController(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const requestedPage = Number(req.query.page) || 1;
    const requestedLimit = Number(req.query.limit) || 4;

    const page = Math.max(1, Math.floor(requestedPage));
    const limit = Math.min(50, Math.max(1, Math.floor(requestedLimit)));

    const type =
      req.query.type === "sale" || req.query.type === "purchase"
        ? req.query.type
        : undefined;
    const customerId =
      typeof req.query.customerId === "string"
        ? req.query.customerId
        : undefined;
    const supplierId =
      typeof req.query.supplierId === "string"
        ? req.query.supplierId
        : undefined;
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : undefined;

    const result = await getTransactionHistory(userId, {
      customerId,
      supplierId,
      search,
      type,
      page,
      limit,
    });
    return res.status(200).json({ ...result, search: search ?? "", type });
  } catch (error) {
    console.error("Transaction history error:", error);
    return res.status(500).json({
      error: "Could not fetch transaction history",
    });
  }
}

export async function getTransactionHistorySummaryController(
  req: AuthRequest,
  res: Response,
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const requestedPage = Number(req.query.page) || 1;
    const requestedLimit = Number(req.query.limit) || 8;
    const page = Math.max(1, Math.floor(requestedPage));
    const limit = Math.min(50, Math.max(1, Math.floor(requestedLimit)));
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const result = await getTransactionHistorySummary(userId, page, limit, {
      search,
    });

    return res.status(200).json({ ...result, search });
  } catch (error) {
    console.error("Transaction history summary error:", error);
    return res.status(500).json({
      error: "Could not fetch transaction history",
    });
  }
}
