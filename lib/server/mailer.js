import { logError, logInfo, logWarn } from "./logger.js";
import { serverErrorResponse, successResponse } from "./response.js";

const RESEND_API_URL = "https://api.resend.com/emails";

function hasResendConfiguration() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendTransactionalEmail({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) {
    return serverErrorResponse("No se pudo preparar el correo", {
      action: "sendTransactionalEmail",
      hasRecipient: Boolean(to),
      hasSubject: Boolean(subject),
      hasText: Boolean(text),
      hasHtml: Boolean(html),
    });
  }

  if (!hasResendConfiguration()) {
    if (process.env.NODE_ENV !== "production") {
      logInfo("sendTransactionalEmail: vista previa local disponible", {
        action: "sendTransactionalEmail",
        to,
        subject,
      });

      return successResponse({
        transport: "log",
        previewText: text ?? "",
        previewHtml: html ?? "",
      });
    }

    logWarn("sendTransactionalEmail: configuracion de email incompleta", {
      action: "sendTransactionalEmail",
      hasApiKey: Boolean(process.env.RESEND_API_KEY),
      hasFrom: Boolean(process.env.EMAIL_FROM),
    });

    return serverErrorResponse("No se pudo enviar el correo", {
      action: "sendTransactionalEmail",
      reason: "missing_email_configuration",
    });
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();

      logError("sendTransactionalEmail: fallo el proveedor de email", {
        action: "sendTransactionalEmail",
        status: response.status,
        body,
      });

      return serverErrorResponse("No se pudo enviar el correo", {
        action: "sendTransactionalEmail",
        status: response.status,
      });
    }

    return successResponse({ transport: "resend" });
  } catch (error) {
    return serverErrorResponse("No se pudo enviar el correo", {
      action: "sendTransactionalEmail",
      message: error.message,
    });
  }
}
