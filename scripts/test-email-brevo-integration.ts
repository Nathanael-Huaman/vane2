/**
 * Pruebas de integracion del flujo de recuperacion usando el mailer real.
 *
 * Verifica:
 * - emision de token persistido
 * - llamada real al mailer Brevo con fetch simulado
 * - contenido del enlace de recuperacion
 * - respuesta neutra del flujo publico
 *
 * Uso:
 *   pnpm test:email:integration
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  PASSWORD_RESET_SUCCESS_MESSAGE,
  issuePasswordResetForUser,
  requestPasswordReset,
} from "../lib/server/password-reset.js";

const TEST_CLIENTE_EMAIL = (
  process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
  .trim()
  .toLowerCase();

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

function createAdapter(databaseUrl: string) {
  const lower = databaseUrl.toLowerCase();
  if (lower.startsWith("postgres://") || lower.startsWith("postgresql://")) {
    return new PrismaPg(new Pool({ connectionString: databaseUrl }));
  }
  if (lower.startsWith("file:") || lower.startsWith("libsql:")) {
    return new PrismaLibSql({ url: databaseUrl });
  }
  throw new Error(
    "DATABASE_URL no soportada. Usa file:/libsql: para SQLite o postgres:/postgresql: para PostgreSQL."
  );
}

function withEnv(values: Record<string, string | undefined>, callback: () => Promise<void>) {
  const previous = new Map<string, string | undefined>();

  for (const key of Object.keys(values)) {
    previous.set(key, process.env[key]);
    const nextValue = values[key];
    if (nextValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = nextValue;
    }
  }

  return callback().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
  const prisma = new PrismaClient({ adapter: createAdapter(databaseUrl) });
  const originalFetch = global.fetch;

  try {
    const user = await prisma.usuario.findUnique({
      where: { email: TEST_CLIENTE_EMAIL },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new Error(
        `Usuario de prueba no encontrado para ${TEST_CLIENTE_EMAIL}. Ejecuta pnpm seed:test-auth-users`
      );
    }

    await prisma.verificationToken.deleteMany({
      where: { identifier: TEST_CLIENTE_EMAIL },
    });

    section("1. Integracion directa entre recuperacion y mailer Brevo");
    await withEnv(
      {
        NODE_ENV: "production",
        BREVO_API_KEY: "brevo-test-key",
        EMAIL_FROM: "noreply@obstedesign.com",
        EMAIL_FROM_NAME: "Obstedesign",
      },
      async () => {
        let requestUrl = "";
        let requestBody = "";

        global.fetch = async (input: string | URL | Request, init?: RequestInit) => {
          requestUrl = String(input);
          requestBody = String(init?.body ?? "");
          return new Response(JSON.stringify({ messageId: "<integration-message-id>" }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        };

        const result = await issuePasswordResetForUser(user, {
          baseUrl: "http://localhost:3000",
        });

        const persistedToken = await prisma.verificationToken.findUnique({
          where: { identifier: TEST_CLIENTE_EMAIL },
        });
        const payload = JSON.parse(requestBody);

        assert("issuePasswordResetForUser retorna exito", result.ok === true);
        assert(
          "issuePasswordResetForUser reporta Brevo como transporte",
          result.ok === true && result.data.transport === "brevo"
        );
        assert("se llama al endpoint de Brevo", requestUrl === "https://api.brevo.com/v3/smtp/email");
        assert("se persiste el token de recuperacion", Boolean(persistedToken));
        assert(
          "el correo contiene el asunto esperado",
          payload.subject === "Recupera tu contrasena de Obstedesign"
        );
        assert(
          "el correo se dirige al usuario correcto",
          payload.to[0].email === TEST_CLIENTE_EMAIL
        );
        assert(
          "el html contiene la ruta de restablecimiento",
          typeof payload.htmlContent === "string" &&
            payload.htmlContent.includes("/restablecer-contrasena?")
        );
        assert(
          "el html incluye el correo del usuario en la URL",
          typeof payload.htmlContent === "string" &&
            payload.htmlContent.includes(encodeURIComponent(TEST_CLIENTE_EMAIL))
        );
      }
    );

    section("2. Flujo publico mantiene respuesta neutra");
    await withEnv(
      {
        NODE_ENV: "production",
        BREVO_API_KEY: "brevo-test-key",
        EMAIL_FROM: "noreply@obstedesign.com",
        EMAIL_FROM_NAME: "Obstedesign",
      },
      async () => {
        global.fetch = async () =>
          new Response(JSON.stringify({ messageId: "<public-flow-message-id>" }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });

        const result = await requestPasswordReset(TEST_CLIENTE_EMAIL, {
          baseUrl: "http://localhost:3000",
        });

        assert("requestPasswordReset retorna exito neutro", result.ok === true);
        assert(
          "requestPasswordReset mantiene el mensaje neutro",
          result.ok === true &&
            result.data.message === PASSWORD_RESET_SUCCESS_MESSAGE
        );
      }
    );
  } finally {
    global.fetch = originalFetch;
    await prisma.verificationToken.deleteMany({
      where: { identifier: TEST_CLIENTE_EMAIL },
    });
    await prisma.$disconnect();
  }

  printSummaryAndExit();
}

function printSummaryAndExit() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

  if (failed > 0) {
    console.log("\n\x1b[31mPRUEBAS DE INTEGRACION DE BREVO FALLARON\x1b[0m");
    process.exit(1);
  }

  console.log("\n\x1b[32mIntegracion Brevo con recuperacion validada correctamente.\x1b[0m");
}

main().catch((error: Error) => {
  console.error("Error ejecutando pruebas de integracion de Brevo:", error.message);
  process.exit(1);
});
