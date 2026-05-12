/**
 * Crea (o actualiza) usuarios de prueba cliente y administrador para E2E.
 *
 * Uso:
 *   pnpm seed:test-auth-users
 *
 * Variables opcionales:
 *   TEST_CLIENTE_EMAIL
 *   TEST_CLIENTE_PASSWORD
 *   TEST_CLIENTE_NAME
 *   TEST_ADMIN_EMAIL
 *   TEST_ADMIN_PASSWORD
 *   TEST_ADMIN_NAME
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

const SALT_ROUNDS = 12;
const DEFAULT_CLIENTE = {
  email: "cliente.prueba@obstedesign.local",
  password: "Cliente123!",
  name: "Cliente Prueba",
  role: "cliente",
};
const DEFAULT_ADMIN = {
  email: "admin.prueba@obstedesign.local",
  password: "Admin12345!",
  name: "Admin Prueba",
  role: "administrador",
};

function validateUserInput(email: string, password: string, label: string) {
  if (!email.includes("@")) {
    throw new Error(`${label}: email invalido`);
  }
  if (password.length < 8) {
    throw new Error(`${label}: password debe tener al menos 8 caracteres`);
  }
}

async function upsertUser(prisma: PrismaClient, user: {
  email: string;
  password: string;
  name: string;
  role: "cliente" | "administrador";
}) {
  const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
  return prisma.usuario.upsert({
    where: { email: user.email },
    update: {
      name: user.name,
      passwordHash,
      role: user.role,
    },
    create: {
      email: user.email,
      name: user.name,
      passwordHash,
      role: user.role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function main() {
  const cliente = {
    email: (process.env.TEST_CLIENTE_EMAIL || DEFAULT_CLIENTE.email).trim().toLowerCase(),
    password: String(process.env.TEST_CLIENTE_PASSWORD || DEFAULT_CLIENTE.password),
    name: String(process.env.TEST_CLIENTE_NAME || DEFAULT_CLIENTE.name).trim(),
    role: "cliente" as const,
  };
  const admin = {
    email: (process.env.TEST_ADMIN_EMAIL || DEFAULT_ADMIN.email).trim().toLowerCase(),
    password: String(process.env.TEST_ADMIN_PASSWORD || DEFAULT_ADMIN.password),
    name: String(process.env.TEST_ADMIN_NAME || DEFAULT_ADMIN.name).trim(),
    role: "administrador" as const,
  };

  validateUserInput(cliente.email, cliente.password, "cliente");
  validateUserInput(admin.email, admin.password, "admin");

  const prisma: PrismaClient = createRuntimePrismaClient();
  try {
    const [clienteRecord, adminRecord] = await Promise.all([
      upsertUser(prisma, cliente),
      upsertUser(prisma, admin),
    ]);

    console.log("Usuarios de prueba listos:");
    console.log(JSON.stringify({ cliente: clienteRecord, admin: adminRecord }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: Error) => {
  console.error("No se pudieron crear usuarios de prueba:", error.message);
  process.exit(1);
});
