"use server";

import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "../server/password/password-reset.js";

export async function requestPasswordResetAction(input) {
  const email =
    typeof input === "string" ? input : String(input?.email ?? "");

  return requestPasswordReset(email);
}

export async function resetPasswordWithTokenAction(input) {
  return resetPasswordWithToken({
    email: String(input?.email ?? ""),
    token: String(input?.token ?? ""),
    password: String(input?.password ?? ""),
  });
}
