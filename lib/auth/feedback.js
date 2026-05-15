export const AUTH_FEEDBACK_MESSAGES = Object.freeze({
  credentialsError: "Credenciales invalidas. Intenta nuevamente.",
  googleError: "No se pudo iniciar sesion con Google. Intenta nuevamente.",
  credentialsAlreadyExistError: "Ya existe una cuenta con ese correo electronico. Inicia sesion con tu contrasena.",
  signOutError: "No se pudo cerrar sesion. Intenta nuevamente.",
  googleUnavailable: "El acceso con Google no esta disponible en este entorno.",
  credentialsLoading: "Validando acceso...",
  googleLoading: "Conectando con Google...",
  providersLoading: "Verificando Google...",
  authChecking: "Verificando tu sesion...",
  passwordResetRequestError: "No se pudo procesar la solicitud. Intenta nuevamente.",
  passwordResetRequestLoading: "Enviando enlace...",
  passwordResetUpdateError: "No se pudo actualizar la contrasena. Intenta nuevamente.",
  passwordResetUpdateLoading: "Actualizando...",
  passwordResetSuccess: "Contrasena actualizada correctamente.",
  registroLoading: "Creando cuenta...",
  registroError: "No se pudo crear la cuenta. Intenta nuevamente.",
});

export const AUTH_REDIRECT_ERROR_CODES = Object.freeze({
  credentials: "CredentialsSignin",
  configuration: "Configuration",
  google: "OAuthSignin",
  credentialsAlreadyExist: "CredentialsAlreadyExist",
});

export function getSafeAuthErrorFromQuery(errorCode) {
  if (!errorCode) return "";

  if (errorCode === AUTH_REDIRECT_ERROR_CODES.credentials) {
    return AUTH_FEEDBACK_MESSAGES.credentialsError;
  }

  if (errorCode === AUTH_REDIRECT_ERROR_CODES.credentialsAlreadyExist) {
    return AUTH_FEEDBACK_MESSAGES.credentialsAlreadyExistError;
  }

  return AUTH_FEEDBACK_MESSAGES.googleError;
}
