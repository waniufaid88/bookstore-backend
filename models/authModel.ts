import { eq } from "drizzle-orm";
import db from "../db";
import { Users } from "../db/schema";

export async function findUserByEmail(email: string) {
  const user = await db.query.Users.findFirst({
    where: eq(Users.email, email),
  });

  return user ?? null;
}

export async function getUserById(id: string) {
  const user = await db.query.Users.findFirst({
    where: eq(Users.id, id),
  });

  return user ?? null;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  const [user] = await db.insert(Users).values(data).returning({
    id: Users.id,
    name: Users.name,
    email: Users.email,
    createdAt: Users.createdAt,
  });

  return user;
}

export async function findUserById(id: string) {
  const [user] = await db
    .select({
      id: Users.id,
      name: Users.name,
      email: Users.email,
    })
    .from(Users)
    .where(eq(Users.id, id))
    .limit(1);

  return user ?? null;
}
