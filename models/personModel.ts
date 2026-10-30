import db from "../db";
import { Customers, Suppliers } from "../db/schema";
import { and, count, desc, eq, ilike } from "drizzle-orm";

type PersonData = {
  name: string;
  email: string;
  address: string;
  phone: string;
};

export async function getAllCustomers(
  userId: string,
  currentPage: number = 1,
  limit: number = 5,
  search = "",
) {
  const offset = (currentPage - 1) * limit;
  const condition = search
    ? and(eq(Customers.user_id, userId), ilike(Customers.name, `%${search}%`))
    : eq(Customers.user_id, userId);
  const [customers, totalCount] = await Promise.all([
    db.query.Customers.findMany({
      where: condition,
      orderBy: desc(Customers.createdAt),
      limit,
      offset,
      with: {
        transactions: true,
      },
    }),

    db.select({ count: count() }).from(Customers).where(condition),
  ]);
  const total = totalCount[0].count;
  return { customers, totalCount: total, totalPages: Math.ceil(total / limit) };
}

export async function addCustomer(data: PersonData, userId: string) {
  const [customer] = await db
    .insert(Customers)
    .values({ ...data, user_id: userId })
    .returning();
  return customer;
}

export async function updateCustomer(
  id: string,
  data: PersonData,
  userId: string,
) {
  const [customer] = await db
    .update(Customers)
    .set(data)
    .where(and(eq(Customers.id, id), eq(Customers.user_id, userId)))
    .returning();
  return customer;
}

export async function deleteCustomer(id: string, userId: string) {
  const [customer] = await db
    .delete(Customers)
    .where(and(eq(Customers.id, id), eq(Customers.user_id, userId)))
    .returning();
  return customer;
}

export async function getAllSuppliers(
  userId: string,
  currentPage: number = 1,
  limit: number = 5,
  search = "",
) {
  const offset = (currentPage - 1) * limit;
  const condition = search
    ? and(eq(Suppliers.user_id, userId), ilike(Suppliers.name, `%${search}%`))
    : eq(Suppliers.user_id, userId);
  const [suppliers, totalCount] = await Promise.all([
    db.query.Suppliers.findMany({
      where: condition,
      orderBy: desc(Suppliers.createdAt),
      limit,
      offset,
      with: {
        transactions: true,
      },
    }),

    db.select({ count: count() }).from(Suppliers).where(condition),
  ]);
  const total = totalCount[0].count;
  return { suppliers, totalCount: total, totalPages: Math.ceil(total / limit) };
}

export async function addSupplier(data: PersonData, userId: string) {
  const [supplier] = await db
    .insert(Suppliers)
    .values({ ...data, user_id: userId })
    .returning();
  return supplier;
}

export async function updateSupplier(
  id: string,
  data: PersonData,
  userId: string,
) {
  const [supplier] = await db
    .update(Suppliers)
    .set(data)
    .where(and(eq(Suppliers.id, id), eq(Suppliers.user_id, userId)))
    .returning();
  return supplier;
}

export async function deleteSupplier(id: string, userId: string) {
  const [supplier] = await db
    .delete(Suppliers)
    .where(and(eq(Suppliers.id, id), eq(Suppliers.user_id, userId)))
    .returning();
  return supplier;
}
