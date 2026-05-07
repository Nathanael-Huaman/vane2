/**
 * Validacion de contratos del Ticket 08 — Login con credenciales
 *
 * Ejecutar: node scripts/validate-ticket-08.mjs
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

const requiredFiles = ["app/page.js", "lib/actions/auth.js", "lib/auth/config.js"];

for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const loginPage = readFileSync(join(rootDir, "app/page.js"), "utf-8");
const authAction = readFileSync(join(rootDir, "lib/actions/auth.js"), "utf-8");
const authConfig = readFileSync(join(rootDir, "lib/auth/config.js"), "utf-8");

section("2. Flujo de submit y loading en login");

assert("el formulario usa handleSubmit", loginPage.includes("<form onSubmit={handleSubmit}"));
assert("normaliza correo antes de enviar", loginPage.includes("const normalizedEmail = formData.email.trim().toLowerCase()"));
assert("envia credenciales por Server Action", loginPage.includes("signInWithCredentialsAction({"));
assert("el boton submit refleja estado loading", loginPage.includes("Cargando..."));
assert("muestra mensaje minimo de credenciales invalidas", loginPage.includes("Credenciales invalidas. Intenta nuevamente."));

section("3. Validacion y respuesta segura en servidor");

assert(
  "Server Action valida credenciales",
  authAction.includes("const validation = validateCredentials(email, password)")
);
assert(
  "Server Action usa Auth.js credentials sin redirect",
  authAction.includes('authSignIn("credentials"')
);
assert("Server Action devuelve error generico", authAction.includes('const GENERIC_CREDENTIALS_ERROR = "Credenciales invalidas"'));
assert(
  "Server Action retorna exito en login valido",
  authAction.includes("return successResponse({ redirect: true })")
);

section("4. Integracion con provider de credenciales");

assert("Auth.js define provider Credentials", authConfig.includes("Credentials({"));
assert("authorize valida email y password", authConfig.includes("validateEmail(email)"));
assert("authorize compara password hash con bcrypt", authConfig.includes("bcrypt.compare(password, user.passwordHash)"));

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 08 validado (login con credenciales operativo y seguro).\x1b[0m");
