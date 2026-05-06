/**
 * Validacion de entrada del lado servidor.
 *
 * Todos los validadores retornan un objeto con el contrato:
 *   { valid: boolean, error?: string }
 *
 * Si valid === true, el campo es correcto y error estara ausente.
 * Si valid === false, error contendra un mensaje seguro (sin revelar
 * datos sensibles ni detalles internos del sistema).
 *
 * Contratos:
 *
 *   validateEmail(email) → { valid: boolean, error?: string }
 *     Valida que sea un string no vacio con formato de correo valido.
 *
 *   validatePassword(password) → { valid: boolean, error?: string }
 *     Valida que no este vacio y tenga al menos 8 caracteres.
 *
 *   validateCredentials(email, password) → { valid: boolean, error?: string }
 *     Valida email y contraseña juntos. Retorna el primer error encontrado.
 *
 *   validateRequired(value, fieldName) → { valid: boolean, error?: string }
 *     Valida que un valor este presente (no undefined, null, ni string vacio).
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email) {
  if (!email || typeof email !== "string" || !email.trim()) {
    return { valid: false, error: "El correo electronico es requerido" };
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return { valid: false, error: "El formato del correo no es valido" };
  }
  return { valid: true };
}

export function validatePassword(password) {
  if (!password || typeof password !== "string" || !password.trim()) {
    return { valid: false, error: "La contraseña es requerida" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: "La contraseña debe tener al menos 8 caracteres" };
  }
  return { valid: true };
}

export function validateCredentials(email, password) {
  const emailResult = validateEmail(email);
  if (!emailResult.valid) return emailResult;

  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) return passwordResult;

  return { valid: true };
}

export function validateRequired(value, fieldName) {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
    return { valid: false, error: `${fieldName} es requerido` };
  }
  return { valid: true };
}
