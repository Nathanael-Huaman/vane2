/**
 * Validacion de contratos del Ticket 05 — Configuracion de Auth.js (Backend)
 *
 * Ejecutar: node scripts/validate-ticket-05.mjs
 *
 * Cubre contratos puros y casos edge sin depender de BD o servidor:
 *   1. Tipos publicos: UsuarioPublico con campos de Auth.js (name, image, emailVerified)
 *   2. Validacion de credenciales para provider Credentials
 *   3. Contrato de respuesta estandarizado
 *   4. Roles permitidos
 *   5. Estructura de archivos de Auth.js
 *   6. Estructura del adaptador Prisma personalizado
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const typesUrl = new URL("../lib/types.js", import.meta.url).href;
const validationUrl = new URL("../lib/server/validation.js", import.meta.url).href;

const types = await import(typesUrl);
const validation = await import(validationUrl);

const { toUsuarioPublico, isRoleValid, ROLE_CLIENTE, ROLE_ADMINISTRADOR } = types;
const { validateEmail, validatePassword, validateCredentials } = validation;

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

section("1. UsuarioPublico con campos de Auth.js (name, image, emailVerified)");

const fullUser = {
  id: "usr_auth_01",
  email: "auth@obstedesign.com",
  name: "Usuario Auth",
  image: "https://example.com/avatar.png",
  emailVerified: new Date(),
  role: "cliente",
  passwordHash: "hash_secreto",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const publicUser = toUsuarioPublico(fullUser);
assert("incluye id", publicUser.id === "usr_auth_01");
assert("incluye email", publicUser.email === "auth@obstedesign.com");
assert("incluye name", publicUser.name === "Usuario Auth");
assert("incluye image", publicUser.image === "https://example.com/avatar.png");
assert("incluye emailVerified", publicUser.emailVerified instanceof Date);
assert("incluye role", publicUser.role === "cliente");
assert("incluye createdAt", publicUser.createdAt instanceof Date);
assert("incluye updatedAt", publicUser.updatedAt instanceof Date);
assert("NO expone passwordHash", !("passwordHash" in publicUser));

const minimalUser = {
  id: "usr_min_01",
  email: "min@obstedesign.com",
  name: null,
  image: null,
  emailVerified: null,
  role: "administrador",
  passwordHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const publicMinimal = toUsuarioPublico(minimalUser);
assert("name null se preserva", publicMinimal.name === null);
assert("image null se preserva", publicMinimal.image === null);
assert("emailVerified null se preserva", publicMinimal.emailVerified === null);

const strPublico = JSON.stringify(publicUser);
assert("JSON no contiene passwordHash", !strPublico.includes("passwordHash"));

section("2. Validacion de credenciales para provider Credentials");

const validEmail = validateEmail("auth@obstedesign.com");
const invalidEmail = validateEmail("no-es-email");
const emptyEmail = validateEmail("");
assert("email valido pasa validacion", validEmail.valid === true);
assert("email invalido es rechazado", invalidEmail.valid === false);
assert("email vacio es rechazado", emptyEmail.valid === false);

const validPassword = validatePassword("contrasena8");
const shortPassword = validatePassword("corta");
const emptyPassword = validatePassword("");
assert("contrasena valida pasa (>=8 chars)", validPassword.valid === true);
assert("contrasena corta es rechazada (<8)", shortPassword.valid === false);
assert("contrasena vacia es rechazada", emptyPassword.valid === false);

const validCreds = validateCredentials("auth@obstedesign.com", "contrasena8");
const invalidCreds = validateCredentials("bad", "short");
assert("credenciales validas pasan", validCreds.valid === true);
assert("credenciales invalidas son rechazadas", invalidCreds.valid === false);

section("3. Roles permitidos y validacion");

assert("ROLE_CLIENTE es 'cliente'", ROLE_CLIENTE === "cliente");
assert("ROLE_ADMINISTRADOR es 'administrador'", ROLE_ADMINISTRADOR === "administrador");
assert("isRoleValid acepta cliente", isRoleValid("cliente") === true);
assert("isRoleValid acepta administrador", isRoleValid("administrador") === true);
assert("isRoleValid rechaza rol invalido", isRoleValid("superadmin") === false);

section("4. Estructura de archivos de Auth.js");

const requiredFiles = [
  "lib/auth/config.js",
  "lib/auth/adapter.js",
  "lib/auth/index.js",
  "lib/auth/flags.js",
  "lib/auth/role.js",
  resolveFirstExisting(["lib/server/auth/auth-session.js", "lib/server/auth-session.js"]),
  "lib/actions/auth.js",
  "app/api/auth/[...nextauth]/route.js",
];

for (const file of requiredFiles) {
  const fullPath = join(rootDir, file);
  assert(`archivo existe: ${file}`, existsSync(fullPath));
}

section("5. Contenido clave del adaptador Prisma personalizado");

const adapterPath = join(rootDir, "lib/auth/adapter.js");
const adapterContent = readFileSync(adapterPath, "utf-8");

const adapterMethods = [
  "createUser",
  "getUser",
  "getUserByEmail",
  "getUserByAccount",
  "updateUser",
  "deleteUser",
  "linkAccount",
  "unlinkAccount",
  "getAccount",
  "createSession",
  "getSessionAndUser",
  "updateSession",
  "deleteSession",
  "createVerificationToken",
  "useVerificationToken",
];

for (const method of adapterMethods) {
  assert(`adapter contiene metodo ${method}`, adapterContent.includes(method));
}

assert("adapter usa prisma.usuario", adapterContent.includes("prisma.usuario"));
assert("adapter usa prisma.account", adapterContent.includes("prisma.account"));
assert("adapter usa prisma.sesion", adapterContent.includes("prisma.sesion"));
assert("adapter usa prisma.verificationToken", adapterContent.includes("prisma.verificationToken"));
assert("adapter mapea expiresAt a expires", adapterContent.includes("expiresAt"));

section("6. Contenido clave de configuracion de Auth.js");

const configPath = join(rootDir, "lib/auth/config.js");
const configContent = readFileSync(configPath, "utf-8");

assert("config importa NextAuth", configContent.includes("NextAuth"));
assert("config define provider Credentials", configContent.includes("Credentials"));
assert("config define provider Google", configContent.includes("Google"));
assert("config usa PrismaCustomAdapter", configContent.includes("PrismaCustomAdapter"));
assert("config define strategy database", configContent.includes('"database"'));
assert("config define callback session", configContent.includes("async session"));
assert("config define callback signIn", configContent.includes("async signIn"));
assert("config define callback jwt", configContent.includes("async jwt"));
assert("config exporta auth y handlers", configContent.includes("export const { auth, signIn, signOut, handlers }"));

section("7. Modelo Prisma para Auth.js");

const schemaPath = join(rootDir, "prisma/schema.prisma");
const schemaContent = readFileSync(schemaPath, "utf-8");

assert("schema tiene modelo Account", schemaContent.includes("model Account"));
assert("schema tiene modelo VerificationToken", schemaContent.includes("model VerificationToken"));
assert("schema tiene modelo Usuario con name", schemaContent.includes("name") && schemaContent.includes("String?"));
assert("schema tiene modelo Usuario con image", schemaContent.includes("image") && schemaContent.includes("String?"));
assert("schema tiene modelo Usuario con emailVerified", schemaContent.includes("emailVerified") && schemaContent.includes("DateTime?"));
assert(
  "Usuario tiene relacion cuentas",
  /\bcuentas\s+Account\[\]/.test(schemaContent)
);
assert("Account tiene relacion usuario", schemaContent.includes("usuario Usuario @relation"));
assert("Account mapeado a cuentas", schemaContent.includes('@@map("cuentas")'));
assert("VerificationToken mapeado a tokens_verificacion", schemaContent.includes('@@map("tokens_verificacion")'));

section("8. Funcion getUsuarioByEmailForAuth en usuario.js");

const usuarioPath = resolveFirstExisting([
  "lib/server/user/usuario.js",
  "lib/server/usuario.js",
]);
const usuarioContent = readFileSync(join(rootDir, usuarioPath), "utf-8");

assert("usuario.js exporta getUsuarioByEmailForAuth", usuarioContent.includes("export async function getUsuarioByEmailForAuth"));
assert("usuario.js sigue exportando getUsuarioByEmail", usuarioContent.includes("export async function getUsuarioByEmail"));
assert("usuario.js sigue exportando getUsuarioById", usuarioContent.includes("export async function getUsuarioById"));
assert("usuario.js sigue exportando getCurrentUserFromDb", usuarioContent.includes("export async function getCurrentUserFromDb"));

section("9. Route handler de Auth.js");

const routePath = join(rootDir, "app/api/auth/[...nextauth]/route.js");
const routeContent = readFileSync(routePath, "utf-8");

assert("route handler importa handlers desde auth", routeContent.includes("handlers"));
assert("route handler exporta GET y POST", routeContent.includes("GET") && routeContent.includes("POST"));

section("10. auth-session.js integra Auth.js");

const authSessionPath = join(
  rootDir,
  resolveFirstExisting(["lib/server/auth/auth-session.js", "lib/server/auth-session.js"])
);
const authSessionContent = readFileSync(authSessionPath, "utf-8");

assert("auth-session importa auth desde modulo auth", authSessionContent.includes("auth"));
assert("auth-session define getAuthenticatedSession", authSessionContent.includes("getAuthenticatedSession"));
assert("auth-session define getSessionToken", authSessionContent.includes("getSessionToken"));

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 05 validado (contratos puros y estructura).\x1b[0m");
