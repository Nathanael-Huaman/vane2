import { logError, logInfo, logWarn } from "./logger.js";
import { serverErrorResponse, successResponse } from "./response.js";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function hasBrevoConfiguration() {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

function buildSender() {
  return {
    email: process.env.EMAIL_FROM,
    ...(process.env.EMAIL_FROM_NAME
      ? { name: process.env.EMAIL_FROM_NAME }
      : {}),
  };
}

function buildBrevoPayload({ to, subject, text, html, templateId, params }) {
  const payload = {
    sender: buildSender(),
    to: [{ email: to }],
  };

  if (templateId) {
    payload.templateId = templateId;
    if (params && typeof params === "object") {
      payload.params = params;
    }
    if (subject) {
      payload.subject = subject;
    }
    return payload;
  }

  payload.subject = subject;
  if (text) payload.textContent = text;
  if (html) payload.htmlContent = html;
  return payload;
}

export async function sendTransactionalEmail({
  to,
  subject,
  text,
  html,
  templateId = null,
  params = null,
}) {
  const hasContent = Boolean(templateId || subject) && Boolean(text || html || templateId);

  if (!to || !hasContent) {
    return serverErrorResponse("No se pudo preparar el correo", {
      action: "sendTransactionalEmail",
      hasRecipient: Boolean(to),
      hasSubject: Boolean(subject),
      hasText: Boolean(text),
      hasHtml: Boolean(html),
      hasTemplateId: Boolean(templateId),
    });
  }

  if (!hasBrevoConfiguration()) {
    if (process.env.NODE_ENV !== "production") {
      logInfo("sendTransactionalEmail: vista previa local disponible", {
        action: "sendTransactionalEmail",
        to,
        subject,
        templateId,
      });

      return successResponse({
        transport: "log",
        previewText: text ?? "",
        previewHtml: html ?? "",
        previewTemplateId: templateId,
        previewParams: params ?? null,
      });
    }

    logWarn("sendTransactionalEmail: configuracion de email incompleta", {
      action: "sendTransactionalEmail",
      hasApiKey: Boolean(process.env.BREVO_API_KEY),
      hasFrom: Boolean(process.env.EMAIL_FROM),
    });

    return serverErrorResponse("No se pudo enviar el correo", {
      action: "sendTransactionalEmail",
      reason: "missing_email_configuration",
    });
  }

  try {
    const payload = buildBrevoPayload({
      to,
      subject,
      text,
      html,
      templateId,
      params,
    });

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text();
    let parsedBody = null;

    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }
    }

    if (!response.ok) {
      logError("sendTransactionalEmail: fallo el proveedor de email", {
        action: "sendTransactionalEmail",
        status: response.status,
        body: parsedBody,
      });

      return serverErrorResponse("No se pudo enviar el correo", {
        action: "sendTransactionalEmail",
        status: response.status,
      });
    }

    return successResponse({
      transport: "brevo",
      providerMessageId: parsedBody?.messageId ?? null,
    });
  } catch (error) {
    return serverErrorResponse("No se pudo enviar el correo", {
      action: "sendTransactionalEmail",
      message: error.message,
    });
  }
}
