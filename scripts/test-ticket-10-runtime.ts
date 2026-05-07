/**
 * Pruebas runtime del Ticket 10 — Resolucion de rol post-login
 *
 * Verifica:
 * - usuarios de prueba cliente/admin presentes con rol esperado
 * - lectura de rol consistente para cliente/admin desde BD local
 * - invariantes de datos de rol para evitar drift post-login
 *
 * Uso:
 *   pnpm test:ticket-10:runtime
 */

import "dotenv/config";
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
    section("1. Precondiciones de usuarios de prueba");
    const [cliente, admin] = await Promise.all([
      prisma.usuario.findUnique({ where: { email: TEST_CLIENTE_EMAIL } }),
      prisma.usuario.findUnique({ where: { email: TEST_ADMIN_EMAIL } }),
    ]);

    assert(
      "existe usuario cliente de prueba (si falla: pnpm seed:test-auth-users)",
      Boolean(cliente)
    );
    assert(
      "existe usuario admin de prueba (si falla: pnpm seed:test-auth-users)",
      Boolean(admin)
    );

    if (!cliente || !admin) {
      printSummaryAndExit();
      return;
    }

    assert("rol del cliente es 'cliente'", cliente.role === "cliente");
    assert("rol del admin es 'administrador'", admin.role === "administrador");
    assert("ids de cliente y admin son distintos", cliente.id !== admin.id);

    section("2. Resolucion de rol desde registro autenticable");
    const [clienteAgain, adminAgain] = await Promise.all([
      prisma.usuario.findUnique({
        where: { id: cliente.id },
        select: { id: true, email: true, role: true },
      }),
      prisma.usuario.findUnique({
        where: { id: admin.id },
        select: { id: true, email: true, role: true },
      }),
    ]);

    assert("relectura de cliente existe por id", Boolean(clienteAgain));
    assert("relectura de admin existe por id", Boolean(adminAgain));
    assert(
      "contexto cliente mantiene rol 'cliente'",
      Boolean(clienteAgain) &&
        clienteAgain?.role === "cliente" &&
        clienteAgain?.email === TEST_CLIENTE_EMAIL
    );
    assert(
      "contexto admin mantiene rol 'administrador'",
      Boolean(adminAgain) &&
        adminAgain?.role === "administrador" &&
        adminAgain?.email === TEST_ADMIN_EMAIL
    );

    section("3. Edge case de referencia inexistente");
    const missing = await prisma.usuario.findUnique({
      where: { id: "usr_ticket10_inexistente" },
      select: { id: true },
    });
    assert(
      "consulta de usuario inexistente retorna null (sin exponer datos extra)",
      missing === null
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
    console.log("\n\x1b[31mPRUEBAS TICKET 10 FALLARON\x1b[0m");
    process.exit(1);
  }

  console.log("\n\x1b[32mTicket 10 runtime validado correctamente.\x1b[0m");
}

main().catch((error: Error) => {
  console.error("Error ejecutando pruebas runtime del ticket 10:", error.message);
  process.exit(1);
});
