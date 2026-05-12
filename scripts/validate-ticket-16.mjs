/**
 * Validacion de contratos del Ticket 16 — Seguridad complementaria de recuperacion
 *
 * Ejecutar: node scripts/validate-ticket-16.mjs
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

function resolveFirstExisting(paths) {
  const found = paths.find((file) => existsSync(join(rootDir, file)));
  return found || paths[0];
}

section("1. Estructura de seguridad complementaria");

const securityFile = resolveFirstExisting([
  "lib/server/password/password-reset-security.js",
  "lib/server/password-reset-security.js",
]);
const passwordResetFile = resolveFirstExisting([
  "lib/server/password/password-reset.js",
  "lib/server/password-reset.js",
]);
assert(
  `archivo existe: ${securityFile}`,
  existsSync(join(rootDir, securityFile))
);

const securityModule = readFileSync(join(rootDir, securityFile), "utf-8");
const passwordReset = readFileSync(
  join(rootDir, passwordResetFile),
  "utf-8"
);
const requestForm = readFileSync(
  join(rootDir, "components/password-reset-request-form.jsx"),
  "utf-8"
);
const confirmForm = readFileSync(
  join(rootDir, "components/password-reset-confirm-form.jsx"),
  "utf-8"
);
const packageJson = readFileSync(join(rootDir, "package.json"), "utf-8");

section("2. Backlog de rate limiting y auditoria");

assert(
  "define limites futuros para envio",
  securityModule.includes("PASSWORD_RESET_SEND_LIMITS")
);
assert(
  "define limites futuros para uso del enlace",
  securityModule.includes("PASSWORD_RESET_TOKEN_USE_LIMITS")
);
assert(
  "documenta backlog de seguridad reutilizable",
  securityModule.includes("PASSWORD_RESET_SECURITY_BACKLOG")
);
assert(
  "expone eventos de auditoria para recuperacion",
  securityModule.includes('"password_reset_completed"')
);

section("3. Integracion en el flujo actual");

assert(
  "requestPasswordReset evalua riesgo de envio",
  passwordReset.includes("assessPasswordResetSendRisk")
);
assert(
  "validatePasswordResetToken evalua riesgo del enlace",
  passwordReset.includes("assessPasswordResetTokenRisk")
);
assert(
  "requestPasswordReset mantiene mensaje neutro",
  passwordReset.includes("PASSWORD_RESET_NEUTRAL_LIMIT_MESSAGE")
);
assert(
  "flujo registra eventos de auditoria",
  passwordReset.includes("auditPasswordResetEvent")
);

section("4. Preparacion visual");

assert(
  "formulario de solicitud anticipa enfriamiento futuro",
  requestForm.includes("enfriamiento futuro")
);
assert(
  "formulario de restablecimiento anticipa proteccion por intentos",
  confirmForm.includes("demasiados intentos en el futuro")
);

section("5. Scripts");

assert(
  "package.json expone validate:ticket-16",
  packageJson.includes('"validate:ticket-16"')
);
assert(
  "package.json expone test:ticket-16",
  packageJson.includes('"test:ticket-16"')
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 16 validado correctamente.\x1b[0m");
