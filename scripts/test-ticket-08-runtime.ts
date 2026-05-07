/**
 * Pruebas runtime del Ticket 08 — Login con credenciales
 *
 * Verifica:
 * - existencia de usuario de prueba no administrador
 * - hash de contrasena valido
 * - comparacion de credenciales correctas e incorrectas
 * - validacion de formato de credenciales
 *
 * Uso:
 *   pnpm test:ticket-08:runtime
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { validateCredentials } from "../lib/server/validation.js";

const TEST_EMAIL = (process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local")
  .trim()
  .toLowerCase();
const TEST_PASSWORD = String(process.env.TEST_CLIENTE_PASSWORD || "Cliente123!");

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${description}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

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
  const prisma = new PrismaClient({ adapter: createAdapter(databaseUrl) });

  try {
    section("1. Precondiciones de usuario de prueba");
    const usuario = await prisma.usuario.findUnique({
      where: { email: TEST_EMAIL },
    });

    assert(
      "existe el usuario de prueba (si falla, ejecuta pnpm seed:test-cliente)",
      Boolean(usuario)
    );

    if (!usuario) {
      printSummaryAndExit();
      return;
    }

    assert("el rol del usuario de prueba es cliente", usuario.role === "cliente");
    assert("el usuario tiene passwordHash", Boolean(usuario.passwordHash));

    section("2. Verificacion de credenciales");
    const isValidPassword = await bcrypt.compare(TEST_PASSWORD, usuario.passwordHash || "");
    assert("la contrasena correcta valida contra el hash", isValidPassword === true);

    const isInvalidPassword = await bcrypt.compare(
      `${TEST_PASSWORD}_incorrecta`,
      usuario.passwordHash || ""
    );
    assert("una contrasena incorrecta no valida contra el hash", isInvalidPassword === false);

    section("3. Validacion de entrada (server-side)");
    const validInput = validateCredentials(TEST_EMAIL, TEST_PASSWORD);
    assert("credenciales con formato valido pasan validacion", validInput.valid === true);

    const invalidEmailInput = validateCredentials("correo-invalido", TEST_PASSWORD);
    assert(
      "un correo invalido es rechazado",
      invalidEmailInput.valid === false && Boolean(invalidEmailInput.error)
    );

    const invalidPasswordInput = validateCredentials(TEST_EMAIL, "123");
    assert(
      "una contrasena corta es rechazada",
      invalidPasswordInput.valid === false && Boolean(invalidPasswordInput.error)
    );
  } finally {
    await prisma.$disconnect();
  }

  printSummaryAndExit();
}

function printSummaryAndExit() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

  if (failed > 0) {
    console.log("\n\x1b[31mPRUEBAS TICKET 08 FALLARON\x1b[0m");
    process.exit(1);
  }

  console.log("\n\x1b[32mTicket 08 runtime validado correctamente.\x1b[0m");
}

main().catch((error: Error) => {
  console.error("Error ejecutando pruebas runtime del ticket 08:", error.message);
  process.exit(1);
});
