const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

export function validateEmailInput(value) {
  const normalized = normalizeEmail(value);

  if (!normalized) {
    return "El correo electronico es requerido";
  }

  if (!EMAIL_REGEX.test(normalized)) {
    return "El formato del correo no es valido";
  }

  return "";
}

export function validatePasswordInput(value) {
  if (!value) {
    return "La contrasena es requerida";
  }

  if (value.length < MIN_PASSWORD_LENGTH) {
    return "La contrasena debe tener al menos 8 caracteres";
  }

  return "";
}

export function validatePasswordConfirmation(password, confirmation) {
  if (!confirmation) {
    return "Confirma tu contrasena";
  }

  if (confirmation !== password) {
    return "Las contrasenas no coinciden";
  }

  return "";
}
