/**
 * Crea (o actualiza) un usuario de prueba no administrador para validar
 * el flujo de login por credenciales del Ticket 08.
 *
 * Uso:
 *   pnpm seed:test-cliente
 *
 * Variables opcionales:
 *   TEST_CLIENTE_EMAIL
 *   TEST_CLIENTE_PASSWORD
 *   TEST_CLIENTE_NAME
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DEFAULT_EMAIL = "cliente.prueba@obstedesign.local";
const DEFAULT_PASSWORD = "Cliente123!";
const DEFAULT_NAME = "Cliente Prueba";
const SALT_ROUNDS = 12;

function createAdapter(databaseUrl: string) {
  const lower = databaseUrl.toLowerCase();
  if (lower.startsWith("postgres://") || lower.startsWith("postgresql://")) {
    return new PrismaPg(new Pool({ connectionString: databaseUrl }));
  }
  if (lower.startsWith("file:") || lower.startsWith("libsql:")) {
    return new PrismaLibSql({ url: databaseUrl });
  }
  throw new Error(
    "DATABASE_URL no soportada. Usa file:/libsql: para SQLite o postgres:/postgresql: para PostgreSQL."
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
  const email = (process.env.TEST_CLIENTE_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const password = String(process.env.TEST_CLIENTE_PASSWORD || DEFAULT_PASSWORD);
  const name = String(process.env.TEST_CLIENTE_NAME || DEFAULT_NAME).trim();

  if (!email.includes("@")) {
    throw new Error("TEST_CLIENTE_EMAIL no tiene formato valido");
  }
  if (password.length < 8) {
    throw new Error("TEST_CLIENTE_PASSWORD debe tener al menos 8 caracteres");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const prisma = new PrismaClient({ adapter: createAdapter(databaseUrl) });

  try {
    const usuario = await prisma.usuario.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        role: "cliente",
      },
      create: {
        email,
        name,
        passwordHash,
        role: "cliente",
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

    console.log("Usuario de prueba listo:");
    console.log(JSON.stringify(usuario, null, 2));
    console.log("");
    console.log("Credenciales de prueba:");
    console.log(`- email: ${email}`);
    console.log(`- password: ${password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: Error) => {
  console.error("No se pudo crear el usuario de prueba:", error.message);
  process.exit(1);
});
