import { NextResponse } from "next/server";
import { AUTH_REDIRECT_ERROR_CODES } from "../../../../lib/auth/feedback.js";
import { logError, logInfo, logWarn } from "../../../../lib/server/logger.js";
import {
  buildRateLimitLogContext,
  checkRateLimit,
  NEUTRAL_THROTTLE_MESSAGE,
} from "../../../../lib/server/security/rate-limit.js";
import { validateCredentials } from "../../../../lib/server/validation.js";

const CREDENTIALS_LOGIN_LIMIT = Object.freeze({
  maxAttempts: 5,
  windowMinutes: 15,
});

function buildRedirectUrl(requestUrl, path, params = {}) {
  const url = new URL(path, requestUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

function getRequestActorParts(request, email) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return {
    email,
    ip: forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
}

function buildRateLimitedJson(result) {
  return NextResponse.json(
    { error: NEUTRAL_THROTTLE_MESSAGE },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds ?? 60) },
    }
  );
}

export async function POST(request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/tienda");

  const rateLimit = await checkRateLimit({
    surface: "auth:credentials-login",
    actorParts: getRequestActorParts(request, email),
    limit: CREDENTIALS_LOGIN_LIMIT,
  });
  if (!rateLimit.allowed) {
    logWarn("credentials-login: solicitud limitada", {
      action: "credentials-login",
      ...buildRateLimitLogContext(rateLimit),
    });
    return buildRateLimitedJson(rateLimit);
  }

  const validation = validateCredentials(email, password);
  if (!validation.valid) {
    logWarn("credentials-login: validacion rechazada", {
      action: "credentials-login",
    });
    return NextResponse.redirect(
      buildRedirectUrl(request.url, "/", {
        error: AUTH_REDIRECT_ERROR_CODES.credentials,
      })
    );
  }

  try {
    const { authenticateUserWithCredentials } = await import(
      "../../../../lib/server/auth/credentials.js"
    );
    const { createAuthJsSessionForUser } = await import(
      "../../../../lib/server/auth/auth-session.js"
    );

    const authResult = await authenticateUserWithCredentials(email, password);
    if (!authResult.ok) {
      logWarn("credentials-login: autenticacion rechazada", {
        action: "credentials-login",
        status: authResult.error?.status ?? null,
      });
      return NextResponse.redirect(
        buildRedirectUrl(request.url, "/", {
          error: AUTH_REDIRECT_ERROR_CODES.credentials,
        })
      );
    }

    const user = authResult.data;

    const sessionResult = await createAuthJsSessionForUser(user.id);
    if (!sessionResult.ok) {
      logError("credentials-login: no se pudo crear la sesion", {
        action: "credentials-login",
        userId: user.id,
      });
      return NextResponse.redirect(
        buildRedirectUrl(request.url, "/", {
          error: AUTH_REDIRECT_ERROR_CODES.configuration,
        })
      );
    }

    logInfo("credentials-login: sesion creada correctamente", {
      action: "credentials-login",
      userId: user.id,
      callbackUrl,
    });

    return NextResponse.redirect(buildRedirectUrl(request.url, callbackUrl));
  } catch (error) {
    logError("credentials-login: error inesperado", {
      action: "credentials-login",
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return NextResponse.redirect(
      buildRedirectUrl(request.url, "/", {
        error: AUTH_REDIRECT_ERROR_CODES.configuration,
      })
    );
  }
}
