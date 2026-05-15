/**
 * Validacion de contratos del Ticket 17 — Mensajes de error y estados de carga
 *
 * Ejecutar: node scripts/validate-ticket-17.mjs
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

section("1. Componentes compartidos");

const authResponseFile = resolveFirstExisting([
  "lib/server/auth/auth-response.js",
  "lib/server/auth-response.js",
]);
const credentialsFile = resolveFirstExisting([
  "lib/server/auth/credentials.js",
  "lib/server/credentials.js",
]);

const sharedFiles = [
  "components/auth-feedback-banner.jsx",
  "components/loading-button-content.jsx",
  "lib/auth/feedback.js",
  authResponseFile,
];

for (const file of sharedFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const home = readFileSync(join(rootDir, "app/page.js"), "utf-8");
const authClient = readFileSync(join(rootDir, "lib/auth/auth-client.js"), "utf-8");
const credentials = readFileSync(
  join(rootDir, credentialsFile),
  "utf-8"
);
const resetRequest = readFileSync(
  join(rootDir, "components/password-reset-request-form.jsx"),
  "utf-8"
);
const resetConfirm = readFileSync(
  join(rootDir, "components/password-reset-confirm-form.jsx"),
  "utf-8"
);
const packageJson = readFileSync(join(rootDir, "package.json"), "utf-8");

section("2. Feedback visual unificado");

assert(
  "login usa banner compartido",
  home.includes("AuthFeedbackBanner")
);
assert(
  "login usa loading compartido",
  home.includes("LoadingButtonContent")
);
assert(
  "recuperacion usa banner compartido",
  resetRequest.includes("AuthFeedbackBanner")
);
assert(
  "restablecimiento usa banner compartido",
  resetConfirm.includes("AuthFeedbackBanner")
);

section("3. Mensajes seguros centralizados");

assert(
  "auth-client usa mensajes compartidos",
  authClient.includes("AUTH_FEEDBACK_MESSAGES")
);
assert(
  "backend usa traductor seguro de errores auth",
  credentials.includes("safeAuthErrorResponse")
);
assert(
  "backend usa traductor seguro de errores 500",
  credentials.includes("safeAuthServerErrorResponse")
);

section("4. Scripts");

assert(
  "package.json expone validate:ticket-17",
  packageJson.includes('"validate:ticket-17"')
);
assert(
  "package.json expone test:ticket-17",
  packageJson.includes('"test:ticket-17"')
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 17 validado correctamente.\x1b[0m");
