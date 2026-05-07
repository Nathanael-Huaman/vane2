"use client";

import {
  getCsrfToken,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";

const PROVIDER_GOOGLE = "google";
const DEFAULT_POST_LOGIN_URL = "/tienda";
const GENERIC_CREDENTIALS_ERROR = "Credenciales invalidas. Intenta nuevamente.";
const GENERIC_GOOGLE_ERROR = "No se pudo iniciar sesion con Google. Intenta nuevamente.";
const GENERIC_SIGNOUT_ERROR = "No se pudo cerrar sesion. Intenta nuevamente.";
const isDev = process.env.NODE_ENV !== "production";

function logAuthDebug(message, details = null) {
  if (!isDev) return;
  console.info(`[auth-client] ${message}`, details ?? "");
}

function submitCredentialsForm({ email, password, csrfToken, callbackUrl }) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/auth/callback/credentials";
  form.style.display = "none";

  for (const [name, value] of Object.entries({
    csrfToken,
    email,
    password,
    callbackUrl,
  })) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

/**
 * Sanitiza errores para no exponer detalles internos de autenticacion.
 *
 * @param {"credentials"|"google"|"signout"} scope
 * @returns {string}
 */
function getSafeAuthError(scope) {
  if (scope === "credentials") return GENERIC_CREDENTIALS_ERROR;
  if (scope === "google") return GENERIC_GOOGLE_ERROR;
  return GENERIC_SIGNOUT_ERROR;
}

/**
 * Inicia sesion con credenciales (email y contrasena).
 *
 * @param {{ email: string, password: string }} input
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function signInWithCredentials({ email, password }) {
  try {
    logAuthDebug("Iniciando login por credenciales", { email });

    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      logAuthDebug("No se pudo obtener csrfToken para credenciales", { email });
      return { ok: false, error: getSafeAuthError("credentials") };
    }

    submitCredentialsForm({
      email,
      password,
      csrfToken,
      callbackUrl: DEFAULT_POST_LOGIN_URL,
    });

    return { ok: true };
  } catch (error) {
    logAuthDebug("Excepcion en signIn con credenciales", {
      email,
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    return {
      ok: false,
      error: getSafeAuthError("credentials"),
    };
  }
}

/**
 * Inicia sesion con Google OAuth.
 *
 * @param {{ callbackUrl?: string }} [options]
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function signInWithGoogle(options = {}) {
  try {
    await nextAuthSignIn(PROVIDER_GOOGLE, {
      callbackUrl: options.callbackUrl || DEFAULT_POST_LOGIN_URL,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: getSafeAuthError("google"),
    };
  }
}

/**
 * Cierra la sesion actual.
 *
 * @param {{ callbackUrl?: string }} [options]
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function signOutUser(options = {}) {
  try {
    await nextAuthSignOut({
      callbackUrl: options.callbackUrl || "/",
      redirect: options.redirect ?? true,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: getSafeAuthError("signout"),
    };
  }
}
