import db from "../db";
import {
  Books,
  Customers,
  Suppliers,
  TransactionItems,
  Transactions,
} from "../db/schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";

type PurchaseItem = {
  bookId: string;
  quantity: number;
  unitPrice: number;
};

type SaleItem = {
  bookId: string;
  quantity: number;
};

type SortBy = "name-asc" | "name-desc" | "price-asc" | "price-desc";

export async function getAllBooks(
  userId: string,
  currentPage: number = 1,
  limit: number = 5,
  search = "",
  sortBy: SortBy = "price-asc",
) {
  const offset = (currentPage - 1) * limit;

  const conditions = search
    ? and(eq(Books.user_id, userId), ilike(Books.name, `%${search}%`))
    : eq(Books.user_id, userId);

  const sortBooks =
    sortBy === "name-asc"
      ? asc(Books.name)
      : sortBy === "name-desc"
        ? desc(Books.name)
        : sortBy === "price-asc"
          ? asc(Books.price)
          : desc(Books.price);

  const [userBooks, totalCount] = await Promise.all([
    db.query.Books.findMany({
      where: conditions,
      orderBy: [sortBooks, desc(Books.created_at)],
      limit,
      offset,
      with: {
        transactionItems: true,
      },
    }),

    db.select({ count: count() }).from(Books).where(conditions),
  ]);

  const books = userBooks.map((b) => {
    const { transactionItems, ...book } = b;

    return {
      ...book,
      canDelete: transactionItems.length === 0,
    };
  });

  const total = totalCount[0].count;

  return {
    books,
    totalCount: total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function addBook(
  data: {
    name: string;
    description: string | null;
    price: string;
    stock: number;
    class: string;
  },
  userId: string,
) {
  const [book] = await db
    .insert(Books)
    .values({
      ...data,
      user_id: userId,
    })
    .returning();

  return book;
}

export async function updateBook(
  id: string,
  userId: string,
  data: {
    name: string;
    description: string | null;
    price: string;
    stock: number;
    class: string;
  },
) {
  const [book] = await db
    .update(Books)
    .set(data)
    .where(and(eq(Books.id, id), eq(Books.user_id, userId)))
    .returning();

  return book;
}

export async function deleteBook(id: string, userId: string) {
  const [book] = await db
    .delete(Books)
    .where(and(eq(Books.id, id), eq(Books.user_id, userId)))
    .returning();

  return { book };
}

export async function purchaseBooks(
  userId: string,
  supplierId: string,
  items: PurchaseItem[],
) {
  return db.transaction(async (tx) => {
    const [supplier] = await tx
      .select()
      .from(Suppliers)
      .where(and(eq(Suppliers.id, supplierId), eq(Suppliers.user_id, userId)));

    if (!supplier) {
      throw new Error("supplier not found");
    }

    const [purchase] = await tx
      .insert(Transactions)
      .values({
        type: "purchase",
        supplierId,
        customerId: null,
        amount: (
          items.reduce(
            (sum, item) =>
              sum + Math.round(item.unitPrice * 100) * item.quantity,
            0,
          ) / 100
        ).toFixed(2),
      })
      .returning();

    for (const item of items) {
      const [book] = await tx
        .select()
        .from(Books)
        .where(and(eq(Books.id, item.bookId), eq(Books.user_id, userId)));

      if (!book) {
        throw new Error("book not found");
      }

      await tx
        .update(Books)
        .set({ stock: sql`${Books.stock} + ${item.quantity}` })
        .where(and(eq(Books.id, item.bookId), eq(Books.user_id, userId)));

      await tx.insert(TransactionItems).values({
        transactionId: purchase.id,
        bookId: item.bookId,
        quantity: item.quantity,
        unitPrice: (Math.round(item.unitPrice * 100) / 100).toFixed(2),
      });
    }

    return purchase;
  });
}

export async function sellBooks(
  userId: string,
  customerId: string,
  items: SaleItem[],
) {
  return db.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(Customers)
      .where(and(eq(Customers.id, customerId), eq(Customers.user_id, userId)));

    if (!customer) {
      throw new Error("customer not found");
    }

    const [sale] = await tx
      .insert(Transactions)
      .values({
        type: "sale",
        customerId,
        supplierId: null,
        amount: "0",
      })
      .returning();

    let total = 0;

    for (const item of items) {
      const [book] = await tx
        .select()
        .from(Books)
        .where(and(eq(Books.id, item.bookId), eq(Books.user_id, userId)));

      if (!book) {
        throw new Error("book not found");
      }

      const [updatedBook] = await tx
        .update(Books)
        .set({ stock: sql`${Books.stock} - ${item.quantity}` })
        .where(
          and(
            eq(Books.id, item.bookId),
            eq(Books.user_id, userId),
            gte(Books.stock, item.quantity),
          ),
        )
        .returning();

      if (!updatedBook) {
        throw new Error("not enough stock");
      }

      await tx.insert(TransactionItems).values({
        transactionId: sale.id,
        bookId: item.bookId,
        quantity: item.quantity,
        unitPrice: book.price,
      });

      total += Number(book.price) * item.quantity;
    }

    const [updatedSale] = await tx
      .update(Transactions)
      .set({ amount: total.toFixed(2) })
      .where(eq(Transactions.id, sale.id))
      .returning();

    return updatedSale;
  });
}

export async function getTransactionHistorySummary(
  userId: string,
  currentPage: number,
  limit: number,
  filters: { search?: string } = {},
) {
  const { transactions: history } = await getTransactionHistory(userId, {
    search: filters.search,
  });
  const groups = new Map<
    string,
    {
      personId: string | null;
      name: string | null;
      type: string;
      transactionCount: number;
      amountTotal: number;
      hasUnrecordedAmount: boolean;
      latestDate: Date;
    }
  >();

  for (const transaction of history) {
    const name = transaction.name ?? "Unknown";
    const groupKey = `${transaction.type}:${name}`;
    let group = groups.get(groupKey);

    if (!group) {
      group = {
        personId: name,
        name,
        type: transaction.type,
        transactionCount: 0,
        amountTotal: 0,
        hasUnrecordedAmount: false,
        latestDate: transaction.createdAt,
      };
      groups.set(groupKey, group);
    }

    group.transactionCount += 1;
    if (transaction.amount === null) {
      group.hasUnrecordedAmount = true;
    } else {
      group.amountTotal += Number(transaction.amount);
    }
    if (transaction.createdAt > group.latestDate) {
      group.latestDate = transaction.createdAt;
    }
  }

  const allGroups = Array.from(groups.values())
    .map(({ amountTotal, ...group }) => ({
      ...group,
      totalAmount: group.hasUnrecordedAmount ? null : amountTotal.toFixed(2),
    }))
    .sort(
      (first, second) =>
        second.latestDate.getTime() - first.latestDate.getTime(),
    );

  const safeLimit = Math.max(1, limit);
  const totalCount = allGroups.length;
  const totalPages = Math.ceil(totalCount / safeLimit);
  const page =
    totalPages === 0 ? 1 : Math.min(Math.max(1, currentPage), totalPages);
  const transactions = allGroups
    .slice((page - 1) * safeLimit, page * safeLimit)
    .map((group) => ({ ...group, latestDate: group.latestDate.toISOString() }));

  return { transactions, page, limit: safeLimit, totalCount, totalPages };
}

export async function getTransactionHistory(
  userId: string,
  filters: {
    customerId?: string;
    supplierId?: string;
    search?: string;
    type?: "sale" | "purchase";
    page?: number;
    limit?: number;
  } = {},
) {
  const pattern = filters.search?.trim()
    ? `%${filters.search.trim()}%`
    : undefined;
  const condition = and(
    filters.type ? eq(Transactions.type, filters.type) : undefined,
    filters.customerId
      ? eq(Transactions.customerId, filters.customerId)
      : undefined,
    filters.supplierId
      ? eq(Transactions.supplierId, filters.supplierId)
      : undefined,
    pattern
      ? or(ilike(Customers.name, pattern), ilike(Suppliers.name, pattern))
      : undefined,
  );

  const countQuery = db
    .select({ count: sql<number>`count(distinct ${Transactions.id})` })
    .from(Transactions)
    .innerJoin(
      TransactionItems,
      eq(TransactionItems.transactionId, Transactions.id),
    )
    .innerJoin(
      Books,
      and(eq(TransactionItems.bookId, Books.id), eq(Books.user_id, userId)),
    )
    .leftJoin(Customers, eq(Transactions.customerId, Customers.id))
    .leftJoin(Suppliers, eq(Transactions.supplierId, Suppliers.id));
  const countRows = condition
    ? await countQuery.where(condition)
    : await countQuery;
  const totalCount = Number(countRows[0]?.count ?? 0);
  const safeLimit = Math.max(1, filters.limit ?? Math.max(1, totalCount));
  const totalPages = Math.ceil(totalCount / safeLimit);
  const page =
    totalPages === 0 ? 1 : Math.min(Math.max(1, filters.page ?? 1), totalPages);

  const transactionIdQuery = db
    .selectDistinct({ id: Transactions.id, createdAt: Transactions.createdAt })
    .from(Transactions)
    .innerJoin(
      TransactionItems,
      eq(TransactionItems.transactionId, Transactions.id),
    )
    .innerJoin(
      Books,
      and(eq(TransactionItems.bookId, Books.id), eq(Books.user_id, userId)),
    )
    .leftJoin(Customers, eq(Transactions.customerId, Customers.id))
    .leftJoin(Suppliers, eq(Transactions.supplierId, Suppliers.id));
  const pagedTransactions = condition
    ? await transactionIdQuery
        .where(condition)
        .orderBy(desc(Transactions.createdAt))
        .limit(safeLimit)
        .offset((page - 1) * safeLimit)
    : await transactionIdQuery
        .orderBy(desc(Transactions.createdAt))
        .limit(safeLimit)
        .offset((page - 1) * safeLimit);
  const transactionIds = pagedTransactions.map(({ id }) => id);

  if (transactionIds.length === 0) {
    return { transactions: [], page, limit: safeLimit, totalCount, totalPages };
  }

  const rows = await db
    .select({
      id: Transactions.id,
      type: Transactions.type,
      amount: Transactions.amount,
      createdAt: Transactions.createdAt,
      customerName: Customers.name,
      supplierName: Suppliers.name,
      bookId: Books.id,
      bookName: Books.name,
      quantity: TransactionItems.quantity,
      unitPrice: TransactionItems.unitPrice,
    })
    .from(Transactions)
    .innerJoin(
      TransactionItems,
      eq(TransactionItems.transactionId, Transactions.id),
    )
    .innerJoin(
      Books,
      and(eq(TransactionItems.bookId, Books.id), eq(Books.user_id, userId)),
    )
    .leftJoin(Customers, eq(Transactions.customerId, Customers.id))
    .leftJoin(Suppliers, eq(Transactions.supplierId, Suppliers.id))
    .where(and(condition, inArray(Transactions.id, transactionIds)))
    .orderBy(desc(Transactions.createdAt));

  const history = new Map<
    string,
    {
      id: string;
      type: string;
      amount: string | null;
      createdAt: Date;
      name: string | null;
      items: {
        bookId: string;
        bookName: string;
        quantity: number;
        unitPrice: string | null;
      }[];
    }
  >();

  for (const row of rows) {
    let transaction = history.get(row.id);
    if (!transaction) {
      transaction = {
        id: row.id,
        type: row.type,
        amount: row.amount,
        createdAt: row.createdAt,
        name: row.type === "sale" ? row.customerName : row.supplierName,
        items: [],
      };
      history.set(row.id, transaction);
    }
    transaction.items.push({
      bookId: row.bookId,
      bookName: row.bookName,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
    });
  }

  return {
    transactions: Array.from(history.values()),
    page,
    limit: safeLimit,
    totalCount,
    totalPages,
  };
}
