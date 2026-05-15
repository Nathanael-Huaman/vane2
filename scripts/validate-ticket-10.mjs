/**
 * Validacion de contratos del Ticket 10 — Resolucion de rol post-login
 *
 * Ejecutar: node scripts/validate-ticket-10.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

function normalizeText(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

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

function resolveFirstExisting(paths) {
  const found = paths.find((file) => existsSync(join(rootDir, file)));
  return found || paths[0];
}

section("1. Estructura de archivos del ticket");

const authSessionFile = resolveFirstExisting([
  "lib/server/auth/auth-session.js",
  "lib/server/auth-session.js",
]);

const requiredFiles = [
  authSessionFile,
  resolveFirstExisting(["lib/server/user/usuario.js", "lib/server/usuario.js"]),
  "lib/auth/flags.js",
  "components/auth-provider.jsx",
  "components/role-guard.jsx",
  "app/perfil/page.js",
];
for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const authSession = readFileSync(join(rootDir, authSessionFile), "utf-8");
const usuarioServerFile = resolveFirstExisting([
  "lib/server/user/usuario.js",
  "lib/server/usuario.js",
]);
const usuarioServer = readFileSync(join(rootDir, usuarioServerFile), "utf-8");
const authProvider = readFileSync(join(rootDir, "components/auth-provider.jsx"), "utf-8");
const roleGuard = readFileSync(join(rootDir, "components/role-guard.jsx"), "utf-8");
const perfilPage = readFileSync(join(rootDir, "app/perfil/page.js"), "utf-8");

section("2. Resolucion de rol desacoplada del provider");

assert("getAuthenticatedSession usa auth() de Auth.js", authSession.includes("const session = await auth()"));
assert("sesion autenticada consulta usuario en BD local", authSession.includes("getCurrentUserFromDb(userId)"));
assert(
  "si no hay sesion responde error controlado",
  authSession.includes('unauthorizedResponse("No hay sesion activa")')
);

section("3. Contrato reutilizable backend + UI");

assert("getCurrentUserFromDb valida userId", usuarioServer.includes('if (!userId)'));
assert("getCurrentUserFromDb valida rol permitido", usuarioServer.includes("isRoleValid(result.data.role)"));
assert("AuthProvider expone flags de autorizacion", authProvider.includes("isAdmin: isAdmin(user?.role)"));
assert("AuthProvider expone flag cliente", authProvider.includes("isCliente: isCliente(user?.role)"));
assert("RoleGuard aplica validacion de rol", roleGuard.includes("isRoleValid(user.role)"));

section("4. Consumo visual del rol resuelto");

assert("perfil muestra rol actual", perfilPage.includes("Rol asignado"));
assert("perfil tiene panel admin protegido", perfilPage.includes("<AdminOnly>"));
assert("perfil tiene panel cliente protegido", perfilPage.includes("<ClienteOnly>"));
assert(
  "mensaje de pantalla compartida permanece en login (criterio de ticket)",
  normalizeText(readFileSync(join(rootDir, "app/login/page.js"), "utf-8")).includes(
    "clientes y administradores ingresan desde esta misma pantalla"
  )
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 10 validado (resolucion de rol post-login lista).\x1b[0m");
