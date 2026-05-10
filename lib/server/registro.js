import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "../prisma.js";
import { logError, logInfo, logWarn } from "./logger.js";
import { errorResponse, successResponse, serverErrorResponse } from "./response.js";
import { validateEmail, validatePassword } from "./validation.js";
import { sendTransactionalEmail } from "./mailer.js";

const REGISTRO_SALT_ROUNDS = 12;
const VERIFICACION_TOKEN_TTL_HOURS = 24;

export const REGISTRO_SUCCESS_MESSAGE =
  "Cuenta creada. Revisa tu correo para verificarla.";
export const REGISTRO_DUPLICATE_MESSAGE =
  "Ya existe una cuenta con ese correo electronico.";

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function hashVerificacionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function resolveAppBaseUrl() {
  const resolved =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";
  return resolved.endsWith("/") ? resolved.slice(0, -1) : resolved;
}

function buildVerificacionUrl(email, token) {
  const url = new URL("/verificar-email", resolveAppBaseUrl());
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
}

function buildVerificacionEmail({ verificacionUrl, expiresAt }) {
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

export async function registrarUsuario(
  { email, password, confirmPassword },
  options = {}
) {
  const normalizedEmail = normalizeEmail(email);

  const emailCheck = validateEmail(normalizedEmail);
  if (!emailCheck.valid) {
    return errorResponse(emailCheck.error, 400);
  }

  const normalizedPassword = String(password ?? "");
  const passwordCheck = validatePassword(normalizedPassword);
  if (!passwordCheck.valid) {
    return errorResponse(passwordCheck.error, 400);
  }

  const normalizedConfirm = String(confirmPassword ?? "");
  if (normalizedPassword !== normalizedConfirm) {
    return errorResponse("Las contraseñas no coinciden", 400);
  }

  try {
    const existingUser = await prisma.usuario.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      logWarn("registrarUsuario: intento de registro con email existente", {
        action: "registrarUsuario",
        email: normalizedEmail,
      });
      return errorResponse(REGISTRO_DUPLICATE_MESSAGE, 409);
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, REGISTRO_SALT_ROUNDS);

    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = hashVerificacionToken(rawToken);
    const tokenExpira = new Date(
      Date.now() + VERIFICACION_TOKEN_TTL_HOURS * 60 * 60 * 1000
    );

    await prisma.usuario.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        emailVerificado: false,
        tokenVerificacion: hashedToken,
        tokenVerificacionExpira: tokenExpira,
      },
    });

    const verificacionUrl = buildVerificacionUrl(normalizedEmail, rawToken);
    const emailPayload = buildVerificacionEmail({
      verificacionUrl,
      expiresAt: tokenExpira,
    });
    const emailSender = options.emailSender ?? sendTransactionalEmail;

    const deliveryResult = await emailSender({
      to: normalizedEmail,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html,
    });

    if (!deliveryResult?.ok) {
      logError("registrarUsuario: no se pudo enviar el correo de verificacion", {
        action: "registrarUsuario",
        email: normalizedEmail,
      });
    }

    logInfo("registrarUsuario: cuenta creada exitosamente", {
      action: "registrarUsuario",
      email: normalizedEmail,
      transport: deliveryResult?.data?.transport ?? null,
    });

    return successResponse({
      message: REGISTRO_SUCCESS_MESSAGE,
    });
  } catch (error) {
    return serverErrorResponse("No se pudo completar el registro", {
      action: "registrarUsuario",
      email: normalizedEmail,
      message: error.message,
    });
  }
}
