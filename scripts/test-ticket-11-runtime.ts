/**
 * Pruebas runtime del Ticket 11 — Redireccionamiento y entrada a la tienda
 *
 * Verifica:
 * - existencia de usuarios de prueba cliente y administrador
 * - roles validos para ambos accesos post-login
 * - creacion de sesiones persistidas consumibles por la tienda
 *
 * Uso:
 *   pnpm test:ticket-11:runtime
 */

import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const TEST_CLIENTE_EMAIL = (
  process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
  .trim()
  .toLowerCase();
const TEST_ADMIN_EMAIL = (process.env.TEST_ADMIN_EMAIL || "admin.prueba@obstedesign.local")
  .trim()
  .toLowerCase();
const ALLOWED_ROLES = new Set(["cliente", "administrador"]);

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

  const createdSessionIds: string[] = [];

  try {
    section("1. Precondiciones de usuarios para entrada a tienda");
    const [cliente, admin] = await Promise.all([
      prisma.usuario.findUnique({ where: { email: TEST_CLIENTE_EMAIL } }),
      prisma.usuario.findUnique({ where: { email: TEST_ADMIN_EMAIL } }),
    ]);

    assert(
      "existe usuario cliente de prueba (si falla, ejecuta pnpm seed:test-auth-users)",
      Boolean(cliente)
    );
    assert(
      "existe usuario administrador de prueba (si falla, ejecuta pnpm seed:test-auth-users)",
      Boolean(admin)
    );

    if (!cliente || !admin) {
      printSummaryAndExit();
      return;
    }

    assert("rol cliente es valido para tienda", ALLOWED_ROLES.has(cliente.role));
    assert("rol administrador es valido para tienda", ALLOWED_ROLES.has(admin.role));
    assert("usuario cliente conserva rol cliente", cliente.role === "cliente");
    assert("usuario administrador conserva rol administrador", admin.role === "administrador");

    section("2. Integridad de sesion persistida para acceso post-login");
    const clienteToken = randomBytes(32).toString("hex");
    const adminToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const [clienteSession, adminSession] = await Promise.all([
      prisma.sesion.create({
        data: {
          userId: cliente.id,
          sessionToken: clienteToken,
          expiresAt,
        },
      }),
      prisma.sesion.create({
        data: {
          userId: admin.id,
          sessionToken: adminToken,
          expiresAt,
        },
      }),
    ]);

    createdSessionIds.push(clienteSession.id, adminSession.id);

    assert("sesion cliente se persiste con token no vacio", clienteSession.sessionToken.length > 20);
    assert("sesion admin se persiste con token no vacio", adminSession.sessionToken.length > 20);
    assert(
      "sesiones cliente y admin usan tokens distintos",
      clienteSession.sessionToken !== adminSession.sessionToken
    );

    const persisted = await prisma.sesion.findMany({
      where: { id: { in: createdSessionIds } },
      select: { id: true, userId: true, expiresAt: true },
    });

    assert("ambas sesiones quedan registradas para la tienda", persisted.length === 2);
    assert(
      "todas las sesiones creadas tienen vencimiento futuro",
      persisted.every((row) => row.expiresAt.getTime() > Date.now())
    );
  } finally {
    if (createdSessionIds.length > 0) {
      await prisma.sesion.deleteMany({ where: { id: { in: createdSessionIds } } });
    }
    await prisma.$disconnect();
  }

  printSummaryAndExit();
}

function printSummaryAndExit() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

  if (failed > 0) {
    console.log("\n\x1b[31mPRUEBAS TICKET 11 FALLARON\x1b[0m");
    process.exit(1);
  }

  console.log("\n\x1b[32mTicket 11 runtime validado correctamente.\x1b[0m");
}

main().catch((error: Error) => {
  console.error("Error ejecutando pruebas runtime del ticket 11:", error.message);
  process.exit(1);
});
