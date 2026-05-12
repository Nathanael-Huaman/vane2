import { NextResponse } from "next/server";
import { AUTH_REDIRECT_ERROR_CODES } from "@/lib/auth/feedback";
import { createAuthJsSessionForUser, authenticateUserWithCredentials } from "@/lib/server/auth";
import { logError, logInfo, logWarn, validateCredentials } from "@/lib/server/shared";

function buildRedirectUrl(requestUrl, path, params = {}) {
  const url = new URL(path, requestUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

export async function POST(request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/tienda");

  const validation = validateCredentials(email, password);
  if (!validation.valid) {
    logWarn("credentials-login: validacion rechazada", {
      action: "credentials-login",
      email,
    });
    return NextResponse.redirect(
      buildRedirectUrl(request.url, "/", {
        error: AUTH_REDIRECT_ERROR_CODES.credentials,
      })
    );
  }

  try {
    const authResult = await authenticateUserWithCredentials(email, password);
    if (!authResult.ok) {
      logWarn("credentials-login: autenticacion rechazada", {
        action: "credentials-login",
        email,
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
        email,
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
      email,
      userId: user.id,
      callbackUrl,
    });

    return NextResponse.redirect(buildRedirectUrl(request.url, callbackUrl));
  } catch (error) {
    logError("credentials-login: error inesperado", {
      action: "credentials-login",
      email,
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return NextResponse.redirect(
      buildRedirectUrl(request.url, "/", {
        error: AUTH_REDIRECT_ERROR_CODES.configuration,
      })
    );
  }
}
