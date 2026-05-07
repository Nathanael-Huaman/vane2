/**
 * Validacion de contratos del Ticket 03 — Modelo de Usuario y Rol (Backend)
 *
 * Ejecutar: node scripts/validate-ticket-03.mjs
 *
 * Valida contratos puros (sin dependencia de BD):
 *   1. toUsuarioPublico no incluye passwordHash
 *   2. isRoleValid solo acepta roles permitidos
 *   3. validateEmail rechaza emails invalidos
 *   4. validateId rechaza ids vacios
 *   5. validatePassword / validateCredentials / validateRequired
 *   6. Roles y constantes exportadas correctamente
 */

const typesUrl = new URL("../lib/types.js", import.meta.url).href;
const validationUrl = new URL("../lib/server/validation.js", import.meta.url).href;

const types = await import(typesUrl);
const validation = await import(validationUrl);

const {
  ROLE_CLIENTE,
  ROLE_ADMINISTRADOR,
  ROLES_PERMITIDOS,
  isRoleValid,
  toUsuarioPublico,
} = types;

const {
  validateEmail,
  validatePassword,
  validateId,
  validateRequired,
  validateCredentials,
} = validation;

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

function assertEqual(description, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${description}`);
    console.error(`    esperado: ${JSON.stringify(expected)}`);
    console.error(`    obtenido: ${JSON.stringify(actual)}`);
  }
}

// ─── 1. Tipos publicos y sanitizacion ───
console.log("\n1. Tipos publicos y sanitizacion");

assertEqual("ROLE_CLIENTE", ROLE_CLIENTE, "cliente");
assertEqual("ROLE_ADMINISTRADOR", ROLE_ADMINISTRADOR, "administrador");
assert("ROLES_PERMITIDOS length es 2", ROLES_PERMITIDOS.length === 2);
assert("ROLES_PERMITIDOS contiene cliente", ROLES_PERMITIDOS.includes("cliente"));
assert("ROLES_PERMITIDOS contiene administrador", ROLES_PERMITIDOS.includes("administrador"));
assert("isRoleValid('cliente') === true", isRoleValid("cliente") === true);
assert("isRoleValid('administrador') === true", isRoleValid("administrador") === true);
assert("isRoleValid('hacker') === false", isRoleValid("hacker") === false);
assert("isRoleValid('') === false", isRoleValid("") === false);
assert("isRoleValid(123) === false", isRoleValid(123) === false);

const usuarioCrudo = {
  id: "usr_01",
  email: "test@obs.com",
  passwordHash: "hashed_secret",
  role: "administrador",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const publico = toUsuarioPublico(usuarioCrudo);
assert("NO incluye passwordHash", !("passwordHash" in publico));
assert("incluye id", publico.id === "usr_01");
assert("incluye email", publico.email === "test@obs.com");
assert("incluye role", publico.role === "administrador");
assert("createdAt es Date", publico.createdAt instanceof Date);
assert("updatedAt es Date", publico.updatedAt instanceof Date);

try { toUsuarioPublico(null); assert("null lanza error", false); }
catch { assert("null lanza error", true); }

try { toUsuarioPublico(undefined); assert("undefined lanza error", false); }
catch { assert("undefined lanza error", true); }

// ─── 2. Validacion de entrada ───
console.log("\n2. Validacion de entrada");

const checks = [
  ["validateEmail('')", () => validateEmail("").valid === false],
  ["validateEmail('bad')", () => validateEmail("no-es-email").valid === false],
  ["validateEmail(null)", () => validateEmail(null).valid === false],
  ["validateEmail('x@y.com')", () => validateEmail("user@obs.com").valid === true],
  ["validateId('')", () => validateId("").valid === false],
  ["validateId(null)", () => validateId(null).valid === false],
  ["validateId(undefined)", () => validateId(undefined).valid === false],
  ["validateId('ok')", () => validateId("usr_abc_123").valid === true],
  ["validatePassword('')", () => validatePassword("").valid === false],
  ["validatePassword('1234567')", () => validatePassword("1234567").valid === false],
  ["validatePassword('12345678')", () => validatePassword("12345678").valid === true],
  ["validateRequired('')", () => validateRequired("", "X").valid === false],
  ["validateRequired('ok')", () => validateRequired("valor", "X").valid === true],
  ["validateCredentials mal", () => validateCredentials("bad", "1234567").valid === false],
  ["validateCredentials bien", () => validateCredentials("user@obs.com", "12345678").valid === true],
];

for (const [label, fn] of checks) {
  assert(label, fn());
}

// ─── 3. Contratos de respuesta segura ───
console.log("\n3. Verificacion de contratos de respuesta segura");

const fieldsPublico = Object.keys(publico);
assert("UsuarioPublico tiene 8 campos", fieldsPublico.length === 8);
assert("campos correctos", fieldsPublico.includes("id") && fieldsPublico.includes("email") && fieldsPublico.includes("role") && fieldsPublico.includes("createdAt") && fieldsPublico.includes("updatedAt") && fieldsPublico.includes("name") && fieldsPublico.includes("image") && fieldsPublico.includes("emailVerified"));

const strPublico = JSON.stringify(publico);
assert("JSON no contiene passwordHash", !strPublico.includes("passwordHash"));
assert("JSON no contiene password", !strPublico.toLowerCase().includes("password"));
assert("JSON no contiene secret", !strPublico.toLowerCase().includes("secret"));
assert("JSON no contiene token", !strPublico.toLowerCase().includes("token"));

// ─── 4. Solo existen roles cliente/administrador ───
console.log("\n4. Solo existen roles cliente/administrador");

assert("solo 2 roles", ROLES_PERMITIDOS.length === 2);
assert("ningun otro rol es valido", !isRoleValid("admin") && !isRoleValid("user") && !isRoleValid("superadmin"));
assert("constantes congeladas", Object.isFrozen(ROLES_PERMITIDOS));
try {
  ROLES_PERMITIDOS.push("hacker");
  assert("ROLES_PERMITIDOS es inmutable", false);
} catch {
  assert("ROLES_PERMITIDOS es inmutable", true);
}

// ─── Resultados ───
console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTodos los contratos puros validados.\x1b[0m");
console.log("Para validacion completa con BD: ejecutar dentro del runtime de Next.js.");
