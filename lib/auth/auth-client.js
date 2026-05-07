"use client";

import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";

const PROVIDER_CREDENTIALS = "credentials";
const PROVIDER_GOOGLE = "google";
const GENERIC_CREDENTIALS_ERROR = "Credenciales invalidas. Intenta nuevamente.";
const GENERIC_GOOGLE_ERROR = "No se pudo iniciar sesion con Google. Intenta nuevamente.";
const GENERIC_SIGNOUT_ERROR = "No se pudo cerrar sesion. Intenta nuevamente.";

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
    const result = await nextAuthSignIn(PROVIDER_CREDENTIALS, {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { ok: false, error: getSafeAuthError("credentials") };
    }

    return { ok: true };
  } catch (error) {
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
      callbackUrl: options.callbackUrl || "/perfil",
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
