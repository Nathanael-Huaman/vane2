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

const credentialsModuleFile = resolveFirstExisting([
  "lib/server/auth/credentials.js",
  "lib/auth/config.js",
]);

const requiredFiles = [
  "app/page.js",
  "app/login/page.js",
  "app/api/auth/credentials-login/route.js",
  "lib/actions/auth.js",
  "lib/auth/config.js",
  credentialsModuleFile,
];

for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const loginPage = readFileSync(join(rootDir, "app/login/page.js"), "utf-8");
const credentialsRoute = readFileSync(join(rootDir, "app/api/auth/credentials-login/route.js"), "utf-8");
const authAction = readFileSync(join(rootDir, "lib/actions/auth.js"), "utf-8");
const authConfig = readFileSync(join(rootDir, "lib/auth/config.js"), "utf-8");
const credentialsModule = readFileSync(join(rootDir, credentialsModuleFile), "utf-8");
const feedback = readFileSync(join(rootDir, "lib/auth/feedback.js"), "utf-8");
const normalizedFeedback = normalizeText(feedback);

section("2. Flujo de submit y loading en login");

assert("el formulario usa handleSubmit", loginPage.includes("onSubmit={handleSubmit}"));
assert("normaliza correo antes de enviar", loginPage.includes("normalizeEmail(formData.email)") && credentialsRoute.includes(".toLowerCase()"));
assert(
  "envia credenciales por endpoint seguro",
  loginPage.includes('action="/api/auth/credentials-login"') &&
    credentialsRoute.includes("authenticateUserWithCredentials")
);
assert("el boton submit refleja estado loading", loginPage.includes("LoadingButtonContent"));
assert(
  "muestra mensaje minimo de credenciales invalidas",
  loginPage.includes("AUTH_FEEDBACK_MESSAGES") &&
    normalizedFeedback.includes("credenciales invalidas. intenta nuevamente.")
);

section("3. Validacion y respuesta segura en servidor");

assert(
  "endpoint valida credenciales",
  credentialsRoute.includes("const validation = validateCredentials(email, password)") ||
    authAction.includes("const validation = validateCredentials(email, password)")
);
assert(
  "endpoint usa autenticacion de credenciales controlada",
  credentialsRoute.includes("authenticateUserWithCredentials(email, password)") ||
    authAction.includes('authSignIn("credentials"')
);
assert(
  "endpoint devuelve error generico",
  credentialsRoute.includes("AUTH_REDIRECT_ERROR_CODES.credentials") ||
    authAction.includes('const GENERIC_CREDENTIALS_ERROR = "Credenciales invalidas"')
);
assert(
  "endpoint redirige en login valido",
  credentialsRoute.includes("return NextResponse.redirect(buildRedirectUrl(request.url, callbackUrl))") ||
    authAction.includes("return successResponse({ redirect: true })")
);

section("4. Integracion con provider de credenciales");

assert("Auth.js define provider Credentials", authConfig.includes("Credentials({"));
assert("authorize valida email y password", authConfig.includes("validateEmail(email)"));
assert(
  "authorize compara password hash con bcrypt",
  authConfig.includes("authenticateUserWithCredentials") &&
    credentialsModule.includes("bcrypt.compare") &&
    credentialsModule.includes("user.passwordHash")
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 08 validado (login con credenciales operativo y seguro).\x1b[0m");
