/**
 * Pruebas runtime del Ticket 15 — Recuperacion de contrasena
 *
 * Verifica:
 * - validacion segura del email de entrada
 * - emision de token persistido para cuentas existentes
 * - confirmacion neutra para correos inexistentes
 * - renovacion del token cuando el usuario solicita otro enlace
 *
 * Uso:
 *   pnpm test:ticket-15:runtime
 */

import "dotenv/config";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";
import {
  PASSWORD_RESET_SUCCESS_MESSAGE,
  issuePasswordResetForUser,
  requestPasswordReset,
  resetPasswordWithToken,
  validatePasswordResetToken,
} from "../lib/server/password/password-reset.js";
import { authenticateUserWithCredentials } from "../lib/server/auth/credentials.js";

const TEST_CLIENTE_EMAIL = (
  process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
  .trim()
  .toLowerCase();
const UNKNOWN_EMAIL = "no.existe@obstedesign.local";
const TEST_NEW_PASSWORD = "Cliente123!Reset";

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${description}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

async function successfulEmailSender() {
  return {
    ok: true,
    data: { transport: "stub" },
  };
}

async function main() {
  const prisma = createRuntimePrismaClient();
  let originalPasswordHash: string | null | undefined;

  try {
    section("1. Validacion de entrada");
    const invalidEmailResult = await requestPasswordReset("correo-invalido", {
      emailSender: successfulEmailSender,
    });

    assert("email invalido retorna 400", invalidEmailResult.ok === false);
    assert(
      "email invalido conserva mensaje seguro",
      invalidEmailResult.ok === false &&
        invalidEmailResult.error.message === "El formato del correo no es valido"
    );

    section("2. Emision del enlace para usuario existente");
    await prisma.verificationToken.deleteMany({
      where: { identifier: { in: [TEST_CLIENTE_EMAIL, UNKNOWN_EMAIL] } },
    });

    const firstResult = await requestPasswordReset(TEST_CLIENTE_EMAIL, {
      baseUrl: "http://localhost:3000",
      emailSender: successfulEmailSender,
    });

    assert("solicitud existente retorna exito neutro", firstResult.ok === true);
    assert(
      "mensaje de exito es neutro",
      firstResult.ok === true &&
        firstResult.data.message === PASSWORD_RESET_SUCCESS_MESSAGE
    );

    const firstToken = await prisma.verificationToken.findUnique({
      where: { identifier: TEST_CLIENTE_EMAIL },
    });

    assert("se persiste un token de recuperacion", Boolean(firstToken));
    assert(
      "token persistido queda hasheado",
      Boolean(firstToken) && firstToken!.token.length === 64
    );
    assert(
      "token persistido tiene expiracion futura",
      Boolean(firstToken) && firstToken!.expires.getTime() > Date.now()
    );

    const secondResult = await requestPasswordReset(TEST_CLIENTE_EMAIL, {
      baseUrl: "http://localhost:3000",
      emailSender: successfulEmailSender,
    });

    assert("segunda solicitud tambien retorna exito neutro", secondResult.ok === true);

    const secondToken = await prisma.verificationToken.findUnique({
      where: { identifier: TEST_CLIENTE_EMAIL },
    });
    const tokenCount = await prisma.verificationToken.count({
      where: { identifier: TEST_CLIENTE_EMAIL },
    });

    assert(
      "solo existe un token activo por identificador",
      tokenCount === 1
    );
    assert(
      "una nueva solicitud rota el token almacenado",
      Boolean(firstToken && secondToken) && firstToken!.token !== secondToken!.token
    );

    section("3. Consumo real del enlace y login con nueva contrasena");
    const currentUser = await prisma.usuario.findUnique({
      where: { email: TEST_CLIENTE_EMAIL },
    });

    if (!currentUser) {
      throw new Error(`Usuario de prueba no encontrado para ${TEST_CLIENTE_EMAIL}`);
    }

    originalPasswordHash = currentUser.passwordHash;
    const issueResult = await issuePasswordResetForUser(currentUser, {
      baseUrl: "http://localhost:3000",
      emailSender: successfulEmailSender,
    });

    assert("emision directa del enlace retorna exito", issueResult.ok === true);

    const resetUrl = issueResult.ok ? new URL(issueResult.data.resetUrl) : null;
    const resetToken = resetUrl?.searchParams.get("token") || "";

    const tokenValidation = await validatePasswordResetToken(
      TEST_CLIENTE_EMAIL,
      resetToken
    );

    assert("token emitido queda validado", tokenValidation.ok === true);

    const resetResult = await resetPasswordWithToken({
      email: TEST_CLIENTE_EMAIL,
      token: resetToken,
      password: TEST_NEW_PASSWORD,
    });

    assert("restablecer contrasena retorna exito", resetResult.ok === true);

    const consumedToken = await validatePasswordResetToken(
      TEST_CLIENTE_EMAIL,
      resetToken
    );
    assert("token deja de ser valido tras uso", consumedToken.ok === false);

    const loginResult = await authenticateUserWithCredentials(
      TEST_CLIENTE_EMAIL,
      TEST_NEW_PASSWORD
    );
    assert("nueva contrasena permite login", loginResult.ok === true);

    const oldPasswordResult = await authenticateUserWithCredentials(
      TEST_CLIENTE_EMAIL,
      process.env.TEST_CLIENTE_PASSWORD || "Cliente123!"
    );
    assert("password anterior deja de funcionar", oldPasswordResult.ok === false);

    section("4. Confirmacion neutra para correo inexistente");
    const unknownResult = await requestPasswordReset(UNKNOWN_EMAIL, {
      baseUrl: "http://localhost:3000",
      emailSender: successfulEmailSender,
    });

    assert("correo inexistente retorna exito neutro", unknownResult.ok === true);
    assert(
      "correo inexistente usa el mismo mensaje neutro",
      unknownResult.ok === true &&
        unknownResult.data.message === PASSWORD_RESET_SUCCESS_MESSAGE
    );

    const unknownToken = await prisma.verificationToken.findUnique({
      where: { identifier: UNKNOWN_EMAIL },
    });

    assert(
      "correo inexistente no crea token persistido",
      unknownToken === null
    );
  } finally {
    if (originalPasswordHash !== undefined) {
      await prisma.usuario.update({
        where: { email: TEST_CLIENTE_EMAIL },
        data: { passwordHash: originalPasswordHash },
      });
    }
    await prisma.verificationToken.deleteMany({
      where: { identifier: { in: [TEST_CLIENTE_EMAIL, UNKNOWN_EMAIL] } },
    });
    await prisma.$disconnect();
  }

  printSummaryAndExit();
}

function printSummaryAndExit() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

  if (failed > 0) {
    console.log("\n\x1b[31mPRUEBAS TICKET 15 FALLARON\x1b[0m");
    process.exit(1);
  }

  console.log("\n\x1b[32mTicket 15 runtime validado correctamente.\x1b[0m");
}

main().catch((error: Error) => {
  console.error("Error ejecutando pruebas runtime del ticket 15:", error.message);
  process.exit(1);
});
