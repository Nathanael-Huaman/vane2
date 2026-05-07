/**
 * Validacion de contratos del Ticket 04 — Modelo de Sesion Persistida
 *
 * Ejecutar: node scripts/validate-ticket-04.mjs
 *
 * Cubre contratos puros y casos edge sin depender de BD:
 *   1. Sanitizacion de sesion publica (sin token/ip/userAgent)
 *   2. Conversor de vista activa (activa/expirada + current session)
 *   3. Validaciones base de ids y campos requeridos
 */

const typesUrl = new URL("../lib/types.js", import.meta.url).href;
const validationUrl = new URL("../lib/server/validation.js", import.meta.url).href;

const types = await import(typesUrl);
const validation = await import(validationUrl);

const { toSesionPublica, toActiveSessionView } = types;
const { validateId, validateRequired } = validation;

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

section("1. Sanitizacion de SesionPublica");
const now = new Date();
const rawSession = {
  id: "sess_01",
  userId: "usr_01",
  sessionToken: "sensitive-token",
  userAgent: "Mozilla/5.0",
  ip: "127.0.0.1",
  expiresAt: new Date(now.getTime() + 60_000),
  createdAt: now,
};

const publicSession = toSesionPublica(rawSession);
assert("incluye id", publicSession.id === "sess_01");
assert("incluye userId", publicSession.userId === "usr_01");
assert("incluye expiresAt", publicSession.expiresAt instanceof Date);
assert("incluye createdAt", publicSession.createdAt instanceof Date);
assert("NO expone sessionToken", !("sessionToken" in publicSession));
assert("NO expone userAgent", !("userAgent" in publicSession));
assert("NO expone ip", !("ip" in publicSession));

try {
  toSesionPublica(null);
  assert("null debe lanzar error", false);
} catch {
  assert("null debe lanzar error", true);
}

section("2. ActiveSessionView y edge cases");
const activeView = toActiveSessionView({
  id: "sess_active",
  userId: "usr_01",
  createdAt: new Date(now.getTime() - 60_000),
  expiresAt: new Date(now.getTime() + 60_000),
}, { currentSessionId: "sess_active" });

const expiredView = toActiveSessionView({
  id: "sess_expired",
  userId: "usr_01",
  createdAt: new Date(now.getTime() - 120_000),
  expiresAt: new Date(now.getTime() - 60_000),
}, { currentSessionId: "sess_active" });

assert("sesion activa marca status activa", activeView.status === "activa");
assert("sesion activa marca isCurrent=true", activeView.isCurrent === true);
assert("sesion expirada marca status expirada", expiredView.status === "expirada");
assert("sesion expirada marca isCurrent=false", expiredView.isCurrent === false);
assert("formatea createdAt", typeof activeView.createdAtFormatted === "string");
assert("formatea expiresAt", typeof activeView.expiresAtFormatted === "string");

try {
  toActiveSessionView(undefined);
  assert("undefined debe lanzar error", false);
} catch {
  assert("undefined debe lanzar error", true);
}

section("3. Validaciones base para server actions");
assert("validateId acepta id valido", validateId("sess_ok").valid === true);
assert("validateId rechaza vacio", validateId("").valid === false);
assert("validateRequired acepta valor", validateRequired("abc", "token").valid === true);
assert(
  "validateRequired rechaza undefined",
  validateRequired(undefined, "token").valid === false
);
assert(
  "validateRequired rechaza string en blanco",
  validateRequired("   ", "token").valid === false
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 04 validado (contratos puros).\x1b[0m");
