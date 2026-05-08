import { AUTH_FEEDBACK_MESSAGES } from "../auth/feedback.js";
import { errorResponse, serverErrorResponse } from "./response.js";

const SERVER_AUTH_SCOPE_MESSAGES = Object.freeze({
  credentials: AUTH_FEEDBACK_MESSAGES.credentialsError,
  passwordResetRequest: AUTH_FEEDBACK_MESSAGES.passwordResetRequestError,
  passwordResetUpdate: AUTH_FEEDBACK_MESSAGES.passwordResetUpdateError,
  google: AUTH_FEEDBACK_MESSAGES.googleError,
  signOut: AUTH_FEEDBACK_MESSAGES.signOutError,
});

function resolveScopeMessage(scope, fallbackMessage) {
  return (
    SERVER_AUTH_SCOPE_MESSAGES[scope] ||
    fallbackMessage ||
    "No se pudo completar la operacion de autenticacion."
  );
}

export function safeAuthErrorResponse(scope, status = 400, details = null, fallbackMessage = "") {
  return errorResponse(resolveScopeMessage(scope, fallbackMessage), status, details);
}

export function safeAuthServerErrorResponse(scope, details = null, fallbackMessage = "") {
  return serverErrorResponse(resolveScopeMessage(scope, fallbackMessage), details);
}
