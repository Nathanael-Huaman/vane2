"use server";

import { headers } from "next/headers";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "../server/password/password-reset.js";

async function getPasswordResetRequestContext(overrides = {}) {
  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    return {
      ip: forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown",
      userAgent: requestHeaders.get("user-agent") || "unknown",
      ...overrides,
    };
  } catch {
    return overrides;
  }
}

export async function requestPasswordResetAction(input) {
  const email =
    typeof input === "string" ? input : String(input?.email ?? "");

  return requestPasswordReset(email, {
    context: await getPasswordResetRequestContext(input?.context ?? {}),
  });
}

export async function resetPasswordWithTokenAction(input) {
  return resetPasswordWithToken({
    email: String(input?.email ?? ""),
    token: String(input?.token ?? ""),
    password: String(input?.password ?? ""),
    context: await getPasswordResetRequestContext(input?.context ?? {}),
  });
}
