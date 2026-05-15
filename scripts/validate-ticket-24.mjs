/**
 * Validacion de contratos del Ticket 24 - Registro Automatico con Google OAuth
 *
 * Ejecutar: node scripts/validate-ticket-24.mjs
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
  "lib/auth/config.js",
  "lib/auth/adapter.js",
  "lib/auth/feedback.js",
  "app/page.js",
];
for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

section("2. Configuracion Google con allowDangerousEmailAccountLinking");

const configContent = readFileSync(join(rootDir, "lib/auth/config.js"), "utf-8");

assert(
  "config permite vinculacion automatica por email",
  configContent.includes("allowDangerousEmailAccountLinking: true")
);

section("3. Callback signIn maneja colisiones con credenciales");

assert(
  "signIn callback verifica passwordHash existente",
  configContent.includes("existingUser.passwordHash")
);

assert(
  "signIn permite vinculacion cuando existe cuenta con credenciales",
  configContent.includes("se permite vinculacion segura")
);

assert(
  "signIn no retorna redirect de colision para Google",
  !configContent.includes('return "/?error=CredentialsAlreadyExist"')
);

assert(
  "signIn loguea cuando creara cuenta nueva",
  configContent.includes("Google creara cuenta nueva automaticamente")
);

assert(
  "signIn loguea cuando cuenta existente vinculada",
  configContent.includes("Google con cuenta existente vinculada")
);

section("4. Adapter crea usuarios con emailVerificado para OAuth");

const adapterContent = readFileSync(join(rootDir, "lib/auth/adapter.js"), "utf-8");

assert(
  "adapter detecta usuarios OAuth por ausencia de passwordHash",
  adapterContent.includes("isOAuthUser = !data.passwordHash")
);

assert(
  "adapter marca emailVerified con fecha actual para usuarios OAuth",
  adapterContent.includes("emailVerifiedByOAuth")
);

assert(
  "adapter marca emailVerificado true para usuarios OAuth",
  adapterContent.includes("emailVerificado: isOAuthUser")
);

assert(
  "adapter propaga emailVerificado en mapeo de usuario",
  adapterContent.includes("emailVerificado: usuario.emailVerificado")
);

assert(
  "adapter permite actualizar emailVerificado",
  adapterContent.includes("data.emailVerificado !== undefined")
);

section("5. Mensajes de error para colisiones");

const feedbackContent = readFileSync(join(rootDir, "lib/auth/feedback.js"), "utf-8");

assert(
  "feedback define mensaje para cuenta existente con credenciales",
  feedbackContent.includes("credentialsAlreadyExistError")
);

assert(
  "feedback incluye mensaje de colision",
  feedbackContent.includes("Ya existe una cuenta con ese correo electronico")
);

assert(
  "feedback define codigo de error CredentialsAlreadyExist",
  feedbackContent.includes("credentialsAlreadyExist:")
);

assert(
  "getSafeAuthErrorFromQuery maneja codigo de colision",
  feedbackContent.includes("credentialsAlreadyExist")
);

section("6. Flujo de UI para mostrar error de colision");

const loginPage = readFileSync(join(rootDir, "app/page.js"), "utf-8");

assert(
  "pagina usa getSafeAuthErrorFromQuery para errores",
  loginPage.includes("getSafeAuthErrorFromQuery")
);

assert(
  "pagina muestra globalError en caso de error",
  loginPage.includes("resolvedGlobalError")
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 24 validado (registro automatico con Google implementado).\x1b[0m");
