"use server";

import { requestPasswordReset } from "../server/password-reset.js";

export async function requestPasswordResetAction(input) {
  const email =
    typeof input === "string" ? input : String(input?.email ?? "");

  return requestPasswordReset(email);
}
