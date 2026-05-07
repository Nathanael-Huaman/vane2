import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAuthJsSessionForUser } from "@/lib/server/auth-session";
import { logError, logInfo, logWarn } from "@/lib/server/logger";
import { validateCredentials } from "@/lib/server/validation";
import { getUsuarioByEmailForAuth } from "@/lib/server/usuario";

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
      buildRedirectUrl(request.url, "/", { error: "CredentialsSignin" })
    );
  }

  try {
    const userResult = await getUsuarioByEmailForAuth(email);
    if (!userResult.ok || !userResult.data?.passwordHash) {
      logWarn("credentials-login: usuario no disponible para credenciales", {
        action: "credentials-login",
        email,
        status: userResult.error?.status ?? null,
      });
      return NextResponse.redirect(
        buildRedirectUrl(request.url, "/", { error: "CredentialsSignin" })
      );
    }

    const passwordMatches = await bcrypt.compare(password, userResult.data.passwordHash);
    if (!passwordMatches) {
      logWarn("credentials-login: password incorrecta", {
        action: "credentials-login",
        email,
        userId: userResult.data.id,
      });
      return NextResponse.redirect(
        buildRedirectUrl(request.url, "/", { error: "CredentialsSignin" })
      );
    }

    const sessionResult = await createAuthJsSessionForUser(userResult.data.id);
    if (!sessionResult.ok) {
      logError("credentials-login: no se pudo crear la sesion", {
        action: "credentials-login",
        email,
        userId: userResult.data.id,
      });
      return NextResponse.redirect(
        buildRedirectUrl(request.url, "/", { error: "Configuration" })
      );
    }

    logInfo("credentials-login: sesion creada correctamente", {
      action: "credentials-login",
      email,
      userId: userResult.data.id,
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
      buildRedirectUrl(request.url, "/", { error: "Configuration" })
    );
  }
}
