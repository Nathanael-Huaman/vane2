/**
 * Validacion de contratos del Ticket 15 — Recuperacion de contrasena
 *
 * Ejecutar: node scripts/validate-ticket-15.mjs
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

const passwordResetFile = resolveFirstExisting([
  "lib/server/password/password-reset.js",
  "lib/server/password-reset.js",
]);

const requiredFiles = [
  "app/recuperar-contrasena/page.js",
  "app/restablecer-contrasena/page.js",
  "components/password-reset-request-form.jsx",
  "components/password-reset-confirm-form.jsx",
  "lib/actions/password-reset.js",
  passwordResetFile,
  "lib/server/mailer.js",
];

for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const loginPage = readFileSync(join(rootDir, "app/login/page.js"), "utf-8");
const recoveryPage = readFileSync(
  join(rootDir, "app/recuperar-contrasena/page.js"),
  "utf-8"
);
const recoveryForm = readFileSync(
  join(rootDir, "components/password-reset-request-form.jsx"),
  "utf-8"
);
const resetConfirmForm = readFileSync(
  join(rootDir, "components/password-reset-confirm-form.jsx"),
  "utf-8"
);
const action = readFileSync(join(rootDir, "lib/actions/password-reset.js"), "utf-8");
const serverReset = readFileSync(
  join(rootDir, passwordResetFile),
  "utf-8"
);
const mailer = readFileSync(join(rootDir, "lib/server/mailer.js"), "utf-8");
const resetPage = readFileSync(
  join(rootDir, "app/restablecer-contrasena/page.js"),
  "utf-8"
);

section("2. Acceso visual desde login");

assert(
  "login enlaza a recuperar contrasena",
  loginPage.includes('href="/recuperar-contrasena"')
);
assert(
  "pagina renderiza el formulario real de recuperacion",
  recoveryPage.includes("<PasswordResetRequestForm />")
);
assert(
  "pantalla de restablecimiento valida el token",
  resetPage.includes("validatePasswordResetToken")
);

section("3. Flujo del formulario");

assert(
  "formulario usa la server action de recuperacion",
  recoveryForm.includes("requestPasswordResetAction")
);
assert(
  "formulario valida email en cliente",
  recoveryForm.includes("function validateEmail")
);
assert(
  "formulario muestra confirmacion neutra",
  recoveryForm.includes(
    "Si existe una cuenta asociada a ese correo, enviaremos un enlace de recuperacion en unos minutos."
  )
);
assert(
  "formulario de restablecimiento consume la server action",
  resetConfirmForm.includes("resetPasswordWithTokenAction")
);

section("4. Logica backend");

assert(
  "server define mensaje de exito neutro reutilizable",
  serverReset.includes("PASSWORD_RESET_SUCCESS_MESSAGE")
);
assert(
  "server genera enlace hacia restablecer contrasena",
  serverReset.includes('new URL("/restablecer-contrasena"')
);
assert(
  "server persiste token de verificacion",
  serverReset.includes("prisma.verificationToken.upsert")
);
assert(
  "server envia email transaccional",
  serverReset.includes("sendTransactionalEmail")
);
assert(
  "server emite token aleatorio seguro",
  serverReset.includes('randomBytes(32).toString("hex")')
);
assert(
  "server valida el token antes de actualizar password",
  serverReset.includes("export async function validatePasswordResetToken")
);
assert(
  "server permite restablecer password con token",
  serverReset.includes("export async function resetPasswordWithToken")
);

section("5. Transporte de email");

assert(
  "mailer soporta envio real con Brevo",
  mailer.includes("https://api.brevo.com/v3/smtp/email")
);
assert(
  "mailer tiene fallback local para desarrollo",
  mailer.includes('transport: "log"')
);
assert(
  "mailer soporta plantillas de Brevo",
  mailer.includes("templateId")
);
assert(
  "server action expone requestPasswordResetAction",
  action.includes("export async function requestPasswordResetAction")
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 15 validado (flujo visual y backend de recuperacion).\x1b[0m");
