import { NextResponse } from "next/server";
import { registrarUsuario } from "../../../../lib/server/user/registro.js";
import { logError, logWarn } from "../../../../lib/server/logger.js";
import {
  buildRateLimitLogContext,
  checkRateLimit,
  NEUTRAL_THROTTLE_MESSAGE,
} from "../../../../lib/server/security/rate-limit.js";

const REGISTRO_LIMIT = Object.freeze({
  maxAttempts: 5,
  windowMinutes: 15,
});

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
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de solicitud invalido" },
      { status: 400 }
    );
  }

  const { email, password, confirmPassword } = body ?? {};

  const rateLimit = await checkRateLimit({
    surface: "auth:registro",
    actorParts: getRequestActorParts(request, email),
    limit: REGISTRO_LIMIT,
  });
  if (!rateLimit.allowed) {
    logWarn("POST /api/auth/registro: solicitud limitada", {
      action: "registro-route",
      ...buildRateLimitLogContext(rateLimit),
    });
    return buildRateLimitedJson(rateLimit);
  }

  try {
    const result = await registrarUsuario({ email, password, confirmPassword });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.status }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    logError("POST /api/auth/registro: error inesperado", {
      action: "registro-route",
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
