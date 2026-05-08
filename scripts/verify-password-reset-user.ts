/**
 * Verificacion end-to-end del flujo de recuperacion para un usuario real.
 *
 * Ejecuta:
 * - emision del email de recuperacion
 * - comprobacion de accesibilidad del enlace
 * - validacion del token
 * - cambio real de contrasena
 * - validacion de login con la nueva contrasena
 * - generacion de reporte JSON
 *
 * Uso:
 *   VERIFY_PASSWORD_RESET_EMAIL="nathaexp2025@gmail.com" \
 *   VERIFY_PASSWORD_RESET_NEW_PASSWORD="Cliente123!" \
 *   pnpm verify:password-reset:user
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  issuePasswordResetForUser,
  resetPasswordWithToken,
  validatePasswordResetToken,
} from "../lib/server/password-reset.js";
import { authenticateUserWithCredentials } from "../lib/server/credentials.js";

const targetEmail = (
  process.env.VERIFY_PASSWORD_RESET_EMAIL || "nathaexp2025@gmail.com"
)
  .trim()
  .toLowerCase();
const nextPassword = String(
  process.env.VERIFY_PASSWORD_RESET_NEW_PASSWORD || ""
).trim();
const appUrl = (
  process.env.VERIFY_PASSWORD_RESET_APP_URL ||
  process.env.APP_URL ||
  process.env.AUTH_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");
const allowLogPreview =
  process.env.VERIFY_PASSWORD_RESET_ALLOW_LOG_PREVIEW === "1";

const report = {
  targetEmail,
  appUrl,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  status: "running",
  steps: [],
};

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

function logStep(name: string, status: "ok" | "error", details: Record<string, unknown>) {
  const entry = {
    name,
    status,
    at: new Date().toISOString(),
    details,
  };

  report.steps.push(entry);
  const label = status === "ok" ? "\x1b[32mOK\x1b[0m" : "\x1b[31mERROR\x1b[0m";
  console.log(`[${entry.at}] ${label} ${name}`);
  console.log(details);
}

function maskUrlToken(url: URL) {
  const clone = new URL(url.toString());
  if (clone.searchParams.get("token")) {
    clone.searchParams.set("token", "[REDACTED]");
  }
  return clone.toString();
}

function saveReport() {
  report.finishedAt = new Date().toISOString();
  const safeFileName = targetEmail.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const reportsDir = join(process.cwd(), "reports");
  mkdirSync(reportsDir, { recursive: true });
  const reportPath = join(reportsDir, `password-reset-verification-${safeFileName}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Reporte guardado en: ${reportPath}`);
  return reportPath;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
  const prisma = new PrismaClient({ adapter: createAdapter(databaseUrl) });

  if (!nextPassword) {
    throw new Error(
      "Falta VERIFY_PASSWORD_RESET_NEW_PASSWORD para completar la verificacion real."
    );
  }

  let verificationUrl: URL | null = null;

  try {
    const user = await prisma.usuario.findUnique({
      where: { email: targetEmail },
      select: { id: true, email: true, role: true, passwordHash: true },
    });

    if (!user) {
      report.status = "failed";
      logStep("buscar usuario", "error", {
        reason: "account_not_found",
        targetEmail,
      });
      saveReport();
      process.exit(1);
    }

    logStep("buscar usuario", "ok", {
      userId: user.id,
      role: user.role,
      hadPasswordHash: Boolean(user.passwordHash),
    });

    const issueResult = await issuePasswordResetForUser(user, {
      baseUrl: appUrl,
    });

    if (!issueResult.ok) {
      report.status = "failed";
      logStep("enviar correo de recuperacion", "error", {
        status: issueResult.error.status,
        message: issueResult.error.message,
      });
      saveReport();
      process.exit(1);
    }

    verificationUrl = new URL(issueResult.data.resetUrl);
    logStep("enviar correo de recuperacion", "ok", {
      transport: issueResult.data.transport,
      providerAccepted: issueResult.data.transport === "brevo",
      resetUrl: maskUrlToken(verificationUrl),
      expiresAt: issueResult.data.expiresAt,
    });

    if (issueResult.data.transport !== "brevo" && !allowLogPreview) {
      report.status = "failed";
      logStep("confirmar envio real por Brevo", "error", {
        reason: "email_not_sent_via_brevo",
        transport: issueResult.data.transport,
        message:
          "El sistema genero el enlace, pero no hizo un envio real porque la configuracion activa de Brevo no esta disponible.",
      });
      saveReport();
      process.exit(1);
    }

    const pageResponse = await fetch(verificationUrl.toString(), {
      redirect: "manual",
    });
    const pageHtml = await pageResponse.text();

    if (!pageResponse.ok || !pageHtml.includes("Configura tu nueva contrasena")) {
      report.status = "failed";
      logStep("verificar accesibilidad del enlace", "error", {
        httpStatus: pageResponse.status,
        containsResetForm: pageHtml.includes("Configura tu nueva contrasena"),
      });
      saveReport();
      process.exit(1);
    }

    logStep("verificar accesibilidad del enlace", "ok", {
      httpStatus: pageResponse.status,
      containsResetForm: true,
    });

    const token = verificationUrl.searchParams.get("token") || "";
    const email = verificationUrl.searchParams.get("email") || targetEmail;
    const tokenValidation = await validatePasswordResetToken(email, token);

    if (!tokenValidation.ok) {
      report.status = "failed";
      logStep("validar token", "error", {
        status: tokenValidation.error.status,
        message: tokenValidation.error.message,
      });
      saveReport();
      process.exit(1);
    }

    logStep("validar token", "ok", {
      email: tokenValidation.data.email,
      expiresAt: tokenValidation.data.expiresAt,
    });

    const resetResult = await resetPasswordWithToken({
      email,
      token,
      password: nextPassword,
    });

    if (!resetResult.ok) {
      report.status = "failed";
      logStep("restablecer contrasena", "error", {
        status: resetResult.error.status,
        message: resetResult.error.message,
      });
      saveReport();
      process.exit(1);
    }

    logStep("restablecer contrasena", "ok", {
      email: resetResult.data.email,
      message: resetResult.data.message,
    });

    const consumedTokenResult = await validatePasswordResetToken(email, token);
    logStep("invalidar token tras uso", consumedTokenResult.ok ? "error" : "ok", {
      tokenStillValid: consumedTokenResult.ok,
    });

    if (consumedTokenResult.ok) {
      report.status = "failed";
      saveReport();
      process.exit(1);
    }

    const loginResult = await authenticateUserWithCredentials(email, nextPassword);
    if (!loginResult.ok) {
      report.status = "failed";
      logStep("validar login con nueva contrasena", "error", {
        status: loginResult.error.status,
        message: loginResult.error.message,
      });
      saveReport();
      process.exit(1);
    }

    logStep("validar login con nueva contrasena", "ok", {
      userId: loginResult.data.id,
      email: loginResult.data.email,
      role: loginResult.data.role,
    });

    report.status = "passed";
    const reportPath = saveReport();
    console.log("\nVerificacion completa del sistema de recuperacion: OK");
    console.log(`Reporte final: ${reportPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: Error) => {
  report.status = "failed";
  logStep("error inesperado", "error", {
    message: error.message,
  });
  saveReport();
  process.exit(1);
});
