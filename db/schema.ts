import { relations } from "drizzle-orm";
import { pgTable, uniqueIndex } from "drizzle-orm/pg-core";

export const Books = pgTable("books", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  name: t.varchar({ length: 255 }).notNull(),
  description: t.varchar({ length: 255 }),
  price: t.numeric().notNull(),
  stock: t.integer().notNull().default(0),
  class: t.varchar({ length: 255 }).notNull(),
  user_id: t
    .uuid()
    .notNull()
    .references(() => Users.id),
  created_at: t.timestamp().defaultNow().notNull(),
  updated_at: t.timestamp().defaultNow().notNull(),
}));

export const BooksRelations = relations(Books, ({ many, one }) => ({
  transactionItems: many(TransactionItems),
  user: one(Users, {
    fields: [Books.user_id],
    references: [Users.id],
  }),
}));

export const Users = pgTable("users", (t) => ({
  id: t.uuid().defaultRandom().primaryKey(),
  name: t.varchar({ length: 255 }).notNull(),
  email: t.varchar({ length: 255 }).notNull().unique(),
  password: t.varchar({ length: 255 }).notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
}));

export const UsersRealtion = relations(Users, ({ many }) => ({
  books: many(Books),
  customers: many(Customers),
  suppliers: many(Suppliers),
}));

export const Customers = pgTable(
  "customers",
  (t) => ({
    id: t.uuid().defaultRandom().primaryKey(),
    name: t.varchar({ length: 255 }).notNull(),
    email: t.varchar({ length: 255 }).notNull(),
    address: t.varchar({ length: 255 }).notNull(),
    phone: t.varchar({ length: 15 }).notNull(),
    user_id: t
      .uuid()
      .notNull()
      .references(() => Users.id),
    createdAt: t.timestamp().defaultNow().notNull(),
  }),
  (table) => [
    uniqueIndex("customers_user_email_unique").on(table.user_id, table.email),
  ],
);

export const CustomersRelation = relations(Customers, ({ one, many }) => ({
  transactions: many(Transactions),
  user: one(Users, { fields: [Customers.user_id], references: [Users.id] }),
}));

export const Suppliers = pgTable(
  "suppliers",
  (t) => ({
    id: t.uuid().defaultRandom().primaryKey(),
    name: t.varchar({ length: 255 }).notNull(),
    email: t.varchar({ length: 255 }).notNull(),
    address: t.varchar({ length: 255 }).notNull(),
    phone: t.varchar({ length: 255 }).notNull(),
    user_id: t
      .uuid()
      .notNull()
      .references(() => Users.id),
    createdAt: t.timestamp().defaultNow().notNull(),
  }),
  (table) => [
    uniqueIndex("suppliers_user_email_unique").on(table.user_id, table.email),
  ],
);

export const SuppliersRelation = relations(Suppliers, ({ one, many }) => ({
  transactions: many(Transactions),
  user: one(Users, { fields: [Suppliers.user_id], references: [Users.id] }),
}));

export const Transactions = pgTable("transactions", (t) => ({
  id: t.uuid().defaultRandom().primaryKey(),
  type: t.varchar({ length: 30 }).notNull(),
  customerId: t.uuid().references(() => Customers.id),
  supplierId: t.uuid().references(() => Suppliers.id),
  amount: t.numeric(),
  createdAt: t.timestamp().defaultNow().notNull(),
}));

export const TransactionsRelations = relations(
  Transactions,
  ({ many, one }) => ({
    items: many(TransactionItems),

    customer: one(Customers, {
      fields: [Transactions.customerId],
      references: [Customers.id],
    }),

    supplier: one(Suppliers, {
      fields: [Transactions.supplierId],
      references: [Suppliers.id],
    }),
  }),
);

export const TransactionItems = pgTable("transactions_items", (t) => ({
  id: t.uuid().defaultRandom().primaryKey(),
  transactionId: t
    .uuid()
    .notNull()
    .references(() => Transactions.id),
  bookId: t
    .uuid()
    .notNull()
    .references(() => Books.id),
  quantity: t.integer().notNull(),
  unitPrice: t.numeric(),
  createdAt: t.timestamp().defaultNow().notNull(),
}));

export const TransactionItemsRelations = relations(
  TransactionItems,
  ({ one }) => ({
    book: one(Books, {
      fields: [TransactionItems.bookId],
      references: [Books.id],
    }),

    transaction: one(Transactions, {
      fields: [TransactionItems.transactionId],
      references: [Transactions.id],
    }),
  }),
);
