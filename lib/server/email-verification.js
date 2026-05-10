import { createHash, randomBytes } from "node:crypto";
import prisma from "../prisma.js";
import { logError, logInfo, logWarn } from "./logger.js";
import { errorResponse, successResponse, serverErrorResponse } from "./response.js";
import { sendTransactionalEmail } from "./mailer.js";
import { validateEmail } from "./validation.js";

const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;
const EMAIL_VERIFICATION_RESEND_LIMIT = 3;
const EMAIL_VERIFICATION_RESEND_WINDOW_MS = 60 * 60 * 1000;

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

export function hashEmailVerificationToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createEmailVerificationToken() {
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = hashEmailVerificationToken(rawToken);
  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000
  );

  return { rawToken, hashedToken, expiresAt };
}

function resolveAppBaseUrl() {
  const resolved =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";
  return resolved.endsWith("/") ? resolved.slice(0, -1) : resolved;
}

export function buildEmailVerificationUrl(email, token) {
  const url = new URL("/verificar-email", resolveAppBaseUrl());
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
}

export function buildEmailVerificationEmail({ verificacionUrl, expiresAt }) {
  const expiresLabel = expiresAt.toLocaleString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    subject: "Verifica tu correo en Obstedesign",
    text: [
      "Gracias por registrarte en Obstedesign.",
      "",
      `Verifica tu correo visitando este enlace: ${verificacionUrl}`,
      "",
      `El enlace expirara el ${expiresLabel}.`,
      "Si no creaste esta cuenta, puedes ignorar este mensaje.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h1 style="margin-bottom: 12px; color: #d946ef;">Obstedesign</h1>
        <p>Gracias por registrarte. Confirma tu correo electronico para activar tu cuenta.</p>
        <p>
          <a
            href="${verificacionUrl}"
            style="display: inline-block; margin: 12px 0; padding: 12px 20px; border-radius: 999px; background: #ec4899; color: white; text-decoration: none; font-weight: 600;"
          >
            Verificar correo
          </a>
        </p>
        <p>Tambien puedes copiar y pegar este enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #db2777;">${verificacionUrl}</p>
        <p>El enlace expirara el ${expiresLabel}.</p>
        <p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
      </div>
    `,
  };
}

export async function verifyEmailWithToken(rawToken) {
  const token = String(rawToken ?? "").trim();
  if (!token) {
    return errorResponse("Token requerido", 400);
  }

  const hashedToken = hashEmailVerificationToken(token);

  try {
    const usuario = await prisma.usuario.findFirst({
      where: {
        tokenVerificacion: hashedToken,
      },
      select: {
        id: true,
        email: true,
        tokenVerificacionExpira: true,
        emailVerificado: true,
      },
    });

    const now = new Date();
    if (!usuario?.id) {
      return errorResponse("El enlace es invalido o ha expirado.", 400);
    }

    if (usuario.emailVerificado) {
      return successResponse({
        message: "Tu correo ya esta verificado.",
      });
    }

    if (!usuario.tokenVerificacionExpira || usuario.tokenVerificacionExpira <= now) {
      return errorResponse("El enlace es invalido o ha expirado.", 400);
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        emailVerificado: true,
        emailVerified: now,
        tokenVerificacion: null,
        tokenVerificacionExpira: null,
      },
    });

    logInfo("verifyEmailWithToken: email verificado", {
      action: "verifyEmailWithToken",
      userId: usuario.id,
    });

    return successResponse({
      message: "Correo verificado correctamente.",
    });
  } catch (error) {
    return serverErrorResponse("No se pudo verificar el correo", {
      action: "verifyEmailWithToken",
      message: error.message,
    });
  }
}

async function enforceEmailVerificationResendLimit(userId) {
  const windowStart = new Date(Date.now() - EMAIL_VERIFICATION_RESEND_WINDOW_MS);

  const attemptCount = await prisma.emailVerificationResendAttempt.count({
    where: {
      userId,
      createdAt: {
        gt: windowStart,
      },
    },
  });

  if (attemptCount >= EMAIL_VERIFICATION_RESEND_LIMIT) {
    return errorResponse(
      "Has alcanzado el limite de reenvios. Intenta nuevamente mas tarde.",
      429
    );
  }

  return successResponse({
    remaining: EMAIL_VERIFICATION_RESEND_LIMIT - attemptCount,
  });
}

export async function resendEmailVerification(
  { userId = null, email = null },
  options = {}
) {
  const normalizedEmail = normalizeEmail(email);
  const hasAuthenticatedUser = Boolean(userId);

  if (!hasAuthenticatedUser && !normalizedEmail) {
    return errorResponse("El correo electronico es requerido", 400);
  }

  const emailCheck = normalizedEmail ? validateEmail(normalizedEmail) : { valid: true };
  if (!emailCheck.valid) {
    return errorResponse(emailCheck.error, 400);
  }

  try {
    const usuario = await prisma.usuario.findFirst({
      where: hasAuthenticatedUser
        ? { id: userId }
        : { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        emailVerificado: true,
      },
    });

    if (!usuario?.id) {
      logWarn("resendEmailVerification: usuario no encontrado", {
        action: "resendEmailVerification",
        hasAuthenticatedUser,
      });
      return successResponse({
        message: "Si existe una cuenta, enviaremos un correo de verificacion.",
      });
    }

    if (usuario.emailVerificado) {
      if (hasAuthenticatedUser) {
        return errorResponse("Tu correo ya esta verificado.", 400);
      }
      return successResponse({
        message: "Si existe una cuenta, enviaremos un correo de verificacion.",
      });
    }

    const limitResult = await enforceEmailVerificationResendLimit(usuario.id);
    if (!limitResult.ok) {
      return limitResult;
    }

    await prisma.emailVerificationResendAttempt.create({
      data: {
        userId: usuario.id,
      },
    });

    const { rawToken, hashedToken, expiresAt } = createEmailVerificationToken();

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tokenVerificacion: hashedToken,
        tokenVerificacionExpira: expiresAt,
      },
    });

    const verificacionUrl = buildEmailVerificationUrl(usuario.email, rawToken);
    const emailPayload = buildEmailVerificationEmail({
      verificacionUrl,
      expiresAt,
    });
    const emailSender = options.emailSender ?? sendTransactionalEmail;

    const deliveryResult = await emailSender({
      to: usuario.email,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html,
    });

    if (!deliveryResult?.ok) {
      logError("resendEmailVerification: no se pudo reenviar el correo", {
        action: "resendEmailVerification",
        userId: usuario.id,
      });
    }

    logInfo("resendEmailVerification: correo de verificacion reenviado", {
      action: "resendEmailVerification",
      userId: usuario.id,
      transport: deliveryResult?.data?.transport ?? null,
    });

    return successResponse({
      message: "Correo de verificacion enviado.",
    });
  } catch (error) {
    return serverErrorResponse("No se pudo reenviar el correo", {
      action: "resendEmailVerification",
      message: error.message,
    });
  }
}

