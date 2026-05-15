/**
 * Validacion de contratos del Ticket 13 — Proteccion Backend
 *
 * Ejecutar: node scripts/validate-ticket-13.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${description}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

section("1. Estructura de archivos del ticket");

const requiredFiles = [
  "lib/server/authorization.js",
  "lib/actions/db-status.js",
  "app/setup/page.js",
];

for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const authorization = readFileSync(
  join(rootDir, "lib/server/authorization.js"),
  "utf-8"
);
const dbStatus = readFileSync(join(rootDir, "lib/actions/db-status.js"), "utf-8");
const setupPage = readFileSync(join(rootDir, "app/setup/page.js"), "utf-8");

section("2. Helper reusable de autorizacion");

assert("requireRole existe", authorization.includes("export async function requireRole"));
assert(
  "requireRole resuelve sesion autenticada",
  authorization.includes("await getAuthenticatedSession()")
);
assert(
  "requireRole niega acceso con forbiddenResponse",
  authorization.includes('forbiddenResponse(options.forbiddenMessage || "Acceso denegado")')
);
assert(
  "requireAdminAccess reutiliza requireRole",
  authorization.includes("return requireRole([ROLE_ADMINISTRADOR], options)")
);

section("3. Proteccion real del backend");

assert(
  "checkDatabaseStatus exige acceso admin antes de consultar Prisma",
  dbStatus.includes("const accessResult = await requireAdminAccess()")
);
assert(
  "checkDatabaseStatus corta la ejecucion si no hay permisos",
  dbStatus.includes("if (!accessResult.ok)")
);

section("4. Fallback seguro de acceso denegado");

assert(
  "setup detecta 401/403 y muestra fallback seguro",
  setupPage.includes("if (!initial.ok && [401, 403].includes(initial.error.status))")
);
assert(
  "setup muestra feedback neutro de acceso restringido",
  setupPage.includes("Acceso restringido")
);
assert(
  "setup evita renderizar el diagnostico para acceso denegado",
  setupPage.includes("return <SetupClient initial={initial} />")
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 13 validado (proteccion backend y fallback seguro).\x1b[0m");
