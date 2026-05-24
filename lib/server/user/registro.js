import bcrypt from "bcryptjs";
import prisma from "../../prisma.js";
import { logError, logInfo, logWarn } from "../logger.js";
import { errorResponse, successResponse, serverErrorResponse } from "../response.js";
import { validateEmail, validatePassword } from "../validation.js";
import { sendTransactionalEmail } from "../mailer.js";
import {
  buildEmailVerificationEmail,
  buildEmailVerificationUrl,
  createEmailVerificationToken,
} from "../auth/email-verification.js";

const REGISTRO_SALT_ROUNDS = 12;
export const REGISTRO_SUCCESS_MESSAGE =
  "Cuenta creada. Revisa tu correo para verificarla.";
export const REGISTRO_DUPLICATE_MESSAGE =
  "Ya existe una cuenta con ese correo electronico.";

function maskEmailForLog(email) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized.includes("@")) return normalized ? "[invalid-email]" : "[empty]";
  const [localPart, domain] = normalized.split("@");
  return `${localPart.slice(0, 2) || "*"}***@${domain || "unknown"}`;
}

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

export async function registrarUsuario(
  { email, password, confirmPassword },
  options = {}
) {
  const normalizedEmail = normalizeEmail(email);
  const emailMasked = maskEmailForLog(normalizedEmail);

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
        emailMasked,
      });
      return errorResponse(REGISTRO_DUPLICATE_MESSAGE, 409);
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, REGISTRO_SALT_ROUNDS);

    const { rawToken, hashedToken, expiresAt: tokenExpira } =
      createEmailVerificationToken();

    await prisma.usuario.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        emailVerificado: false,
        tokenVerificacion: hashedToken,
        tokenVerificacionExpira: tokenExpira,
      },
    });

    const verificacionUrl = buildEmailVerificationUrl(normalizedEmail, rawToken);
    const emailPayload = buildEmailVerificationEmail({
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
        emailMasked,
      });
    }

    logInfo("registrarUsuario: cuenta creada exitosamente", {
      action: "registrarUsuario",
      transport: deliveryResult?.data?.transport ?? null,
    });

    return successResponse({
      message: REGISTRO_SUCCESS_MESSAGE,
    });
  } catch (error) {
    return serverErrorResponse("No se pudo completar el registro", {
      action: "registrarUsuario",
      emailMasked,
      message: error.message,
    });
  }
}
