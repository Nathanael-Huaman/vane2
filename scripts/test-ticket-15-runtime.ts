/**
 * Pruebas runtime del Ticket 15 — Recuperacion de contrasena
 *
 * Verifica:
 * - validacion segura del email de entrada
 * - emision de token persistido para cuentas existentes
 * - confirmacion neutra para correos inexistentes
 * - renovacion del token cuando el usuario solicita otro enlace
 *
 * Uso:
 *   pnpm test:ticket-15:runtime
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  PASSWORD_RESET_SUCCESS_MESSAGE,
  requestPasswordReset,
} from "../lib/server/password-reset.js";

const TEST_CLIENTE_EMAIL = (
  process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
  .trim()
  .toLowerCase();
const UNKNOWN_EMAIL = "no.existe@obstedesign.local";

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

async function successfulEmailSender() {
  return {
    ok: true,
    data: { transport: "stub" },
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
  const prisma = new PrismaClient({ adapter: createAdapter(databaseUrl) });

  try {
    section("1. Validacion de entrada");
    const invalidEmailResult = await requestPasswordReset("correo-invalido", {
      emailSender: successfulEmailSender,
    });

    assert("email invalido retorna 400", invalidEmailResult.ok === false);
    assert(
      "email invalido conserva mensaje seguro",
      invalidEmailResult.ok === false &&
        invalidEmailResult.error.message === "El formato del correo no es valido"
    );

    section("2. Emision del enlace para usuario existente");
    await prisma.verificationToken.deleteMany({
      where: { identifier: { in: [TEST_CLIENTE_EMAIL, UNKNOWN_EMAIL] } },
    });

    const firstResult = await requestPasswordReset(TEST_CLIENTE_EMAIL, {
      baseUrl: "http://localhost:3000",
      emailSender: successfulEmailSender,
    });

    assert("solicitud existente retorna exito neutro", firstResult.ok === true);
    assert(
      "mensaje de exito es neutro",
      firstResult.ok === true &&
        firstResult.data.message === PASSWORD_RESET_SUCCESS_MESSAGE
    );

    const firstToken = await prisma.verificationToken.findUnique({
      where: { identifier: TEST_CLIENTE_EMAIL },
    });

    assert("se persiste un token de recuperacion", Boolean(firstToken));
    assert(
      "token persistido queda hasheado",
      Boolean(firstToken) && firstToken!.token.length === 64
    );
    assert(
      "token persistido tiene expiracion futura",
      Boolean(firstToken) && firstToken!.expires.getTime() > Date.now()
    );

    const secondResult = await requestPasswordReset(TEST_CLIENTE_EMAIL, {
      baseUrl: "http://localhost:3000",
      emailSender: successfulEmailSender,
    });

    assert("segunda solicitud tambien retorna exito neutro", secondResult.ok === true);

    const secondToken = await prisma.verificationToken.findUnique({
      where: { identifier: TEST_CLIENTE_EMAIL },
    });
    const tokenCount = await prisma.verificationToken.count({
      where: { identifier: TEST_CLIENTE_EMAIL },
    });

    assert(
      "solo existe un token activo por identificador",
      tokenCount === 1
    );
    assert(
      "una nueva solicitud rota el token almacenado",
      Boolean(firstToken && secondToken) && firstToken!.token !== secondToken!.token
    );

    section("3. Confirmacion neutra para correo inexistente");
    const unknownResult = await requestPasswordReset(UNKNOWN_EMAIL, {
      baseUrl: "http://localhost:3000",
      emailSender: successfulEmailSender,
    });

    assert("correo inexistente retorna exito neutro", unknownResult.ok === true);
    assert(
      "correo inexistente usa el mismo mensaje neutro",
      unknownResult.ok === true &&
        unknownResult.data.message === PASSWORD_RESET_SUCCESS_MESSAGE
    );

    const unknownToken = await prisma.verificationToken.findUnique({
      where: { identifier: UNKNOWN_EMAIL },
    });

    assert(
      "correo inexistente no crea token persistido",
      unknownToken === null
    );
  } finally {
    await prisma.verificationToken.deleteMany({
      where: { identifier: { in: [TEST_CLIENTE_EMAIL, UNKNOWN_EMAIL] } },
    });
    await prisma.$disconnect();
  }

  printSummaryAndExit();
}

function printSummaryAndExit() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

  if (failed > 0) {
    console.log("\n\x1b[31mPRUEBAS TICKET 15 FALLARON\x1b[0m");
    process.exit(1);
  }

  console.log("\n\x1b[32mTicket 15 runtime validado correctamente.\x1b[0m");
}

main().catch((error: Error) => {
  console.error("Error ejecutando pruebas runtime del ticket 15:", error.message);
  process.exit(1);
});
