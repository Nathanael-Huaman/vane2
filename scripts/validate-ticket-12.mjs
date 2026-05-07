/**
 * Validacion de contratos del Ticket 12 — Autorizacion en UI
 *
 * Ejecutar: node scripts/validate-ticket-12.mjs
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
  "app/tienda/page.js",
  "app/perfil/page.js",
  "components/role-guard.jsx",
  "components/sign-out-button.jsx",
];

for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const tiendaPage = readFileSync(join(rootDir, "app/tienda/page.js"), "utf-8");
const perfilPage = readFileSync(join(rootDir, "app/perfil/page.js"), "utf-8");
const roleGuard = readFileSync(join(rootDir, "components/role-guard.jsx"), "utf-8");

section("2. Render de autorizacion desde servidor");

assert("tienda resuelve sesion en servidor", tiendaPage.includes("await getAuthenticatedSession()"));
assert("perfil resuelve sesion en servidor", perfilPage.includes("await getAuthenticatedSession()"));
assert(
  "tienda deja de depender de useAuth para visibilidad admin",
  !tiendaPage.includes("useAuth()")
);
assert(
  "perfil deja de depender de useAuth para visibilidad admin",
  !perfilPage.includes("useAuth()")
);

section("3. Guard reutilizable por rol");

assert("RoleGuard acepta un role explicito", roleGuard.includes("role, fallback = null"));
assert("RoleGuard usa role explicito o contexto", roleGuard.includes("const resolvedRole = role ?? authState?.user?.role ?? null"));
assert("AdminOnly propaga el role", roleGuard.includes('<RoleGuard allowedRoles={["administrador"]} role={role} fallback={fallback}>'));
assert("ClienteOnly propaga el role", roleGuard.includes('<RoleGuard allowedRoles={["cliente"]} role={role} fallback={fallback}>'));

section("4. Visibilidad condicional en UI");

assert("tienda usa guard visual admin con role server-side", tiendaPage.includes("<AdminOnly role={user.role}>"));
assert("tienda usa guard visual cliente con role server-side", tiendaPage.includes("<ClienteOnly role={user.role}>"));
assert("perfil usa guard visual admin con role server-side", perfilPage.includes("<AdminOnly role={user.role}>"));
assert("perfil usa guard visual cliente con role server-side", perfilPage.includes("<ClienteOnly role={user.role}>"));

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 12 validado (autorizacion visual desacoplada del cliente).\x1b[0m");
