/**
 * Validacion de contratos del Ticket 19 — Validacion BDD
 *
 * Ejecutar: node scripts/validate-ticket-19.mjs
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
  "e2e/ticket-19-bdd-validation.spec.ts",
  "reports/ticket-19-bdd-validation.md",
];

for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const e2eContent = readFileSync(
  join(rootDir, "e2e/ticket-19-bdd-validation.spec.ts"),
  "utf-8"
);
const reportContent = readFileSync(
  join(rootDir, "reports/ticket-19-bdd-validation.md"),
  "utf-8"
);
const packageJson = readFileSync(join(rootDir, "package.json"), "utf-8");

section("2. Escenarios BDD requeridos");

assert("cubre cliente por credenciales", reportContent.includes("Cliente por credenciales"));
assert("cubre admin por credenciales", reportContent.includes("Admin por credenciales"));
assert("cubre error minimo en login", reportContent.includes("Error minimo en login"));
assert("cubre inicio OAuth con Google", reportContent.includes("Inicio OAuth con Google"));
assert("cubre cliente con Google vinculado", reportContent.includes("Cliente con Google vinculado"));
assert("cubre admin con Google vinculado", reportContent.includes("Admin con Google vinculado"));

section("3. Cobertura tecnica en Playwright");

assert(
  "la suite usa nombres Given/When/Then",
  e2eContent.includes("Given un cliente por credenciales") &&
    e2eContent.includes("Given un administrador por credenciales") &&
    e2eContent.includes("Given Google disponible")
);
assert(
  "la suite cubre restriccion admin en setup",
  e2eContent.includes('page.goto("/setup")') &&
    e2eContent.includes("Acceso restringido") &&
    e2eContent.includes("Estado de la base de datos")
);
assert(
  "la suite cubre cambio de vista por sesion",
  e2eContent.includes('getByRole("button", { name: "Vista cliente" })') &&
    e2eContent.includes("Modo actual: vista cliente")
);
assert(
  "la suite cubre cuentas Google vinculadas",
  e2eContent.includes("ensureGoogleLinkedUser") &&
    e2eContent.includes('provider: "google"')
);

section("4. Scripts");

assert(
  "package.json expone validate:ticket-19",
  packageJson.includes('"validate:ticket-19"')
);
assert(
  "package.json expone test:ticket-19:e2e",
  packageJson.includes('"test:ticket-19:e2e"')
);
assert("package.json expone test:ticket-19", packageJson.includes('"test:ticket-19"'));

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 19 validado correctamente.\x1b[0m");
