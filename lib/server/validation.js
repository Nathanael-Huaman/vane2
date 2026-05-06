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
