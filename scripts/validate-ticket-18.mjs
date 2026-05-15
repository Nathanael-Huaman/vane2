/**
 * Validacion de contratos del Ticket 18 — Validacion funcional
 *
 * Ejecutar: node scripts/validate-ticket-18.mjs
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

section("1. Estructura base del ticket");

const requiredFiles = [
  "scripts/test-ticket-18-functional.mjs",
  "reports/ticket-18-functional-validation.md",
];

for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const reportContent = readFileSync(
  join(rootDir, "reports/ticket-18-functional-validation.md"),
  "utf-8"
);
const runnerContent = readFileSync(
  join(rootDir, "scripts/test-ticket-18-functional.mjs"),
  "utf-8"
);
const packageJson = readFileSync(join(rootDir, "package.json"), "utf-8");

section("2. Trazabilidad funcional");

assert("el reporte cubre login con credenciales", reportContent.includes("Login con credenciales"));
assert("el reporte cubre login con Google", reportContent.includes("Login con Google"));
assert("el reporte cubre roles post-login", reportContent.includes("Roles post-login"));
assert("el reporte cubre sesiones persistidas", reportContent.includes("Sesiones persistidas"));
assert("el reporte cubre autorizacion UI y backend", reportContent.includes("Autorizacion UI y backend"));
assert(
  "el reporte cubre recuperacion de contrasena",
  reportContent.includes("Recuperacion de contrasena")
);
assert(
  "el reporte cubre feedback y seguridad",
  reportContent.includes("Feedback seguro y estados de carga")
);

section("3. Orquestacion reproducible");

const expectedCommands = [
  "pnpm seed:test-auth-users",
  "pnpm test:ticket-08:runtime",
  "pnpm test:ticket-09:e2e",
  "pnpm test:ticket-10:runtime",
  "pnpm test:ticket-11:runtime",
  "pnpm test:ticket-12:e2e",
  "pnpm test:ticket-13:e2e",
  "pnpm test:ticket-14:e2e",
  "pnpm test:ticket-15:runtime",
  "pnpm test:ticket-16",
  "pnpm test:ticket-17",
];

for (const command of expectedCommands) {
  assert(`runner incluye ${command}`, runnerContent.includes(command));
}

assert(
  "runner genera reporte JSON de validacion funcional",
  runnerContent.includes("ticket-18-functional-validation.json")
);

section("4. Scripts");

assert(
  "package.json expone validate:ticket-18",
  packageJson.includes('"validate:ticket-18"')
);
assert("package.json expone test:ticket-18", packageJson.includes('"test:ticket-18"'));

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 18 validado correctamente.\x1b[0m");
