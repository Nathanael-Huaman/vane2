/**
 * Validacion de contratos del Ticket 09 — Login con Google
 *
 * Ejecutar: node scripts/validate-ticket-09.mjs
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

section("1. Estructura de archivos del ticket");

const requiredFiles = [
  "app/page.js",
  "app/login/page.js",
  "components/auth-google-button.jsx",
  "hooks/use-google-provider.js",
  "lib/auth/auth-client.js",
  "lib/auth/config.js",
  "lib/auth/feedback.js",
];
for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const loginPage = readFileSync(join(rootDir, "app/login/page.js"), "utf-8");
const googleButton = readFileSync(join(rootDir, "components/auth-google-button.jsx"), "utf-8");
const googleProviderHook = readFileSync(join(rootDir, "hooks/use-google-provider.js"), "utf-8");
const authClient = readFileSync(join(rootDir, "lib/auth/auth-client.js"), "utf-8");
const authConfig = readFileSync(join(rootDir, "lib/auth/config.js"), "utf-8");
const feedback = readFileSync(join(rootDir, "lib/auth/feedback.js"), "utf-8");
const normalizedLoginPage = normalizeText(loginPage);
const normalizedFeedback = normalizeText(feedback);

section("2. Flujo de UI para acceso con Google");

assert("pantalla tiene boton de Google", normalizedLoginPage.includes("iniciar sesion con google"));
assert("UI maneja estado de carga Google", googleButton.includes("googleLoading") || feedback.includes("Conectando"));
assert("UI dispara handleGoogleSignIn", loginPage.includes("onClick={handleGoogleSignIn}"));
assert("login usa helper signInWithGoogle", loginPage.includes("signInWithGoogle()"));
assert("se consulta disponibilidad del provider", loginPage.includes("useGoogleProvider") && googleProviderHook.includes("getProviders"));
assert(
  "si el provider no existe, muestra mensaje minimo",
  normalizedLoginPage.includes("el acceso con google no esta disponible en este entorno.") ||
    normalizedFeedback.includes("el acceso con google no esta disponible en este entorno.")
);
assert(
  "si Auth.js retorna error por query, se sanitiza en cliente",
  loginPage.includes('searchParams.get("error")') &&
    loginPage.includes("getSafeAuthErrorFromQuery")
);

section("3. Cliente de autenticacion para provider Google");

assert("auth client usa provider google", authClient.includes('const PROVIDER_GOOGLE = "google"'));
assert("auth client usa nextAuth signIn", authClient.includes("nextAuthSignIn(PROVIDER_GOOGLE"));
assert(
  "auth client define callback por defecto /tienda",
  authClient.includes("DEFAULT_POST_LOGIN_URL") &&
    authClient.includes("callbackUrl: options.callbackUrl || DEFAULT_POST_LOGIN_URL")
);
assert(
  "auth client devuelve mensaje minimo de error",
  authClient.includes("No se pudo iniciar sesion con Google. Intenta nuevamente.") ||
    authClient.includes("AUTH_FEEDBACK_MESSAGES.googleError") &&
      normalizedFeedback.includes("no se pudo iniciar sesion con google. intenta nuevamente.")
);

section("4. Integracion backend Auth.js con Google");

assert("config define provider Google", authConfig.includes("Google({"));
assert(
  "Google solo se habilita con variables OAuth",
  authConfig.includes("hasGoogleOAuthConfig") &&
    authConfig.includes("AUTH_GOOGLE_ID") &&
    authConfig.includes("AUTH_GOOGLE_SECRET")
);
assert(
  "config permite vinculacion por email para cuenta existente",
  authConfig.includes("allowDangerousEmailAccountLinking: true")
);
assert(
  "callback signIn exige email verificado por Google",
  authConfig.includes("isGoogleEmailVerified") &&
    authConfig.includes("Google con correo no verificado")
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 09 validado (login con Google integrado y seguro).\x1b[0m");
