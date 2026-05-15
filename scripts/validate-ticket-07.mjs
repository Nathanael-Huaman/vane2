/**
 * Validacion de contratos del Ticket 07 — Pantalla de login
 *
 * Ejecutar: node scripts/validate-ticket-07.mjs
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
  "app/recuperar-contrasena/page.js",
  "components/auth-google-button.jsx",
  "components/theme-toggle.jsx",
  "hooks/use-google-provider.js",
  "lib/actions/auth.js",
  "lib/auth/auth-client.js",
  "lib/auth/config.js",
  "lib/auth/feedback.js",
];

for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

section("2. Contrato visual de login");

const loginPage = readFileSync(join(rootDir, "app/login/page.js"), "utf-8");
const normalizedLoginPage = normalizeText(loginPage);
const googleProviderHook = readFileSync(join(rootDir, "hooks/use-google-provider.js"), "utf-8");
const googleButton = readFileSync(join(rootDir, "components/auth-google-button.jsx"), "utf-8");
const feedback = readFileSync(join(rootDir, "lib/auth/feedback.js"), "utf-8");

assert("muestra branding OBSTEDESIGN", loginPage.includes("OBSTEDESIGN"));
assert("renderiza campo correo", normalizedLoginPage.includes("correo electronico"));
assert("renderiza campo contrasena", normalizedLoginPage.includes("contrasena"));
assert(
  "renderiza boton iniciar sesion con correo",
  normalizedLoginPage.includes("iniciar sesion con correo")
);
assert(
  "renderiza boton iniciar sesion con Google",
  normalizedLoginPage.includes("iniciar sesion con google")
);
assert(
  "incluye enlace a recuperacion de contrasena",
  loginPage.includes('href="/recuperar-contrasena"')
);
assert(
  "incluye nota de pantalla compartida para cliente y administrador",
  normalizedLoginPage.includes("clientes y administradores ingresan desde esta misma pantalla")
);

section("3. Seguridad y UX del flujo de Google");

assert("consulta providers de auth en cliente", loginPage.includes("useGoogleProvider") && googleProviderHook.includes("getProviders"));
assert(
  "deshabilita Google cuando provider no esta disponible",
  loginPage.includes("!googleProviderEnabled") || googleButton.includes("!googleProviderEnabled")
);
assert(
  "muestra mensaje seguro cuando Google no esta disponible",
  loginPage.includes("El acceso con Google no esta disponible en este entorno.") ||
    feedback.includes("El acceso con Google no esta disponible en este entorno.")
);

section("4. Login por credenciales via Server Action");

assert(
  "login usa flujo seguro de credenciales",
  loginPage.includes("signInWithCredentialsAction") ||
    loginPage.includes('action="/api/auth/credentials-login"')
);
assert(
  "evita exponer detalles internos en error de credenciales",
  loginPage.includes("Credenciales invalidas. Intenta nuevamente.") ||
    feedback.includes("Credenciales invalidas. Intenta nuevamente.")
);

section("5. Tema dark/light y soporte visual base");

const themeToggle = readFileSync(join(rootDir, "components/theme-toggle.jsx"), "utf-8");
const globalsCss = readFileSync(join(rootDir, "app/globals.css"), "utf-8");

assert("theme toggle permite alternar dark/light", themeToggle.includes("setTheme"));
assert("globals define variables de tema light", globalsCss.includes(":root"));
assert("globals define variables de tema dark", globalsCss.includes(".dark"));

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 07 validado (pantalla de login y contratos base).\x1b[0m");
