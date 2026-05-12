/**
 * Validacion de contratos del Ticket 06 — Vinculacion Google con cuenta existente
 *
 * Ejecutar: node scripts/validate-ticket-06.mjs
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

section("1. Estructura de archivos del ticket");

const usuarioFile = resolveFirstExisting([
  "lib/server/user/usuario.js",
  "lib/server/usuario.js",
]);

const requiredFiles = ["lib/auth/config.js", "lib/auth/adapter.js", usuarioFile];
for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

section("2. Configuracion Google con vinculacion por email");

const configContent = readFileSync(join(rootDir, "lib/auth/config.js"), "utf-8");

assert("config define provider Google", configContent.includes("Google({"));
assert(
  "config habilita allowDangerousEmailAccountLinking",
  configContent.includes("allowDangerousEmailAccountLinking: true")
);
assert("config define callback signIn", configContent.includes("async signIn"));
assert("callback signIn valida correo para Google", configContent.includes("Google sin correo valido"));
assert(
  "callback signIn exige email verificado por Google",
  configContent.includes("Google con correo no verificado")
);
assert(
  "callback signIn consulta usuario existente por email",
  configContent.includes("getUsuarioByEmailForAuth(normalizedEmail)")
);

section("3. Adaptador evita duplicados por email");

const adapterContent = readFileSync(join(rootDir, "lib/auth/adapter.js"), "utf-8");

assert("adapter normaliza email", adapterContent.includes("trim().toLowerCase()"));
assert("adapter valida email obligatorio", adapterContent.includes("createUser requiere email valido"));
assert("adapter valida email en updateUser", adapterContent.includes("updateUser requiere email valido"));
assert("adapter usa upsert para Usuario", adapterContent.includes("prisma.usuario.upsert"));
assert("upsert usa where por email", adapterContent.includes("where: { email: normalizedEmail }"));
assert("upsert no sobreescribe rol existente", adapterContent.includes("update: {}"));

section("4. Rol sigue saliendo de base de datos propia");

const usuarioContent = readFileSync(join(rootDir, usuarioFile), "utf-8");

assert("usuario.js sigue exportando getUsuarioByEmailForAuth", usuarioContent.includes("export async function getUsuarioByEmailForAuth"));
assert("auth config conserva callback session", configContent.includes("async session"));
assert(
  "session propaga role",
  configContent.includes("session.user.role") ||
    configContent.includes("role: user?.role")
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 06 validado (vinculacion por email sin duplicados).\x1b[0m");
