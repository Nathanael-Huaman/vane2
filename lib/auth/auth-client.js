"use client";

import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";

const PROVIDER_CREDENTIALS = "credenciales";
const PROVIDER_GOOGLE = "google";

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
      return { ok: false, error: result.error };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Error al iniciar sesion con credenciales",
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
      error:
        error?.message ||
        "Error al iniciar sesion con Google",
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
      error: error?.message || "Error al cerrar sesion",
    };
  }
}
