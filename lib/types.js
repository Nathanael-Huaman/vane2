/**
 * Tipos publicos desacoplados del ORM para consumo en frontend.
 *
 * Este modulo define las formas de datos que la capa de presentacion
 * puede usar sin depender de Prisma ni de detalles internos del backend.
 * Todos los objetos expuestos eliminan campos sensibles o de infraestructura.
 */

/** @type {string} */
export const ROLE_CLIENTE = "cliente";

/** @type {string} */
export const ROLE_ADMINISTRADOR = "administrador";

/** @type {ReadonlyArray<string>} */
export const ROLES_PERMITIDOS = Object.freeze([ROLE_CLIENTE, ROLE_ADMINISTRADOR]);

/** @type {string} */
export const VIEW_MODE_CLIENTE = "cliente";

/** @type {string} */
export const VIEW_MODE_ADMINISTRADOR = "administrador";

/** @type {ReadonlyArray<string>} */
export const VIEW_MODES_PERMITIDOS = Object.freeze([
  VIEW_MODE_CLIENTE,
  VIEW_MODE_ADMINISTRADOR,
]);

/**
 * Representacion publica de un usuario.
 * Excluye passwordHash y cualquier dato sensible.
 *
 * @typedef {Object} UsuarioPublico
 * @property {string} id
 * @property {string} email
 * @property {string|null} name
 * @property {string|null} image
 * @property {Date|null} emailVerified
 * @property {string} role
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * Representacion publica de una sesion.
 * Excluye sessionToken, userAgent e ip.
 *
 * @typedef {Object} SesionPublica
 * @property {string} id
 * @property {string} userId
 * @property {Date} expiresAt
 * @property {Date} createdAt
 * @property {"cliente" | "administrador" | null} viewMode
 */

/**
 * Representacion de una sesion activa para la capa de presentacion.
 * Incluye fechas formateadas y estado derivado para consumo en UI.
 *
 * @typedef {Object} ActiveSessionView
 * @property {string} id
 * @property {string} userId
 * @property {string} expiresAtFormatted - Fecha de expiracion formateada (ej: "20 de mayo de 2025, 14:30").
 * @property {string} createdAtFormatted - Fecha de creacion formateada.
 * @property {"activa" | "expirada"} status - Estado derivado segun expiresAt.
 * @property {boolean} isCurrent - Indica si es la sesion actualmente autenticada.
 */

/**
 * Valida que un rol sea uno de los permitidos.
 *
 * @param {string} role
 * @returns {boolean}
 */
export function isRoleValid(role) {
  return ROLES_PERMITIDOS.includes(role);
}

/**
 * Valida que un viewMode sea uno de los permitidos.
 *
 * @param {string | null | undefined} viewMode
 * @returns {boolean}
 */
export function isViewModeValid(viewMode) {
  return viewMode != null && VIEW_MODES_PERMITIDOS.includes(viewMode);
}

/**
 * Convierte un usuario crudo (ej. desde Prisma) a su forma publica.
 * Elimina campos sensibles y garantiza que solo datos seguros lleguen al cliente.
 *
 * @param {Object} usuario
 * @param {string} usuario.id
 * @param {string} usuario.email
 * @param {string} usuario.role
 * @param {Date} usuario.createdAt
 * @param {Date} usuario.updatedAt
 * @returns {UsuarioPublico}
 */
export function toUsuarioPublico(usuario) {
  if (!usuario || typeof usuario !== "object") {
    throw new Error("Se requiere un objeto usuario para sanitizar");
  }
  return {
    id: usuario.id,
    email: usuario.email,
    name: usuario.name ?? null,
    image: usuario.image ?? null,
    emailVerified: usuario.emailVerified ?? null,
    role: usuario.role,
    createdAt: usuario.createdAt,
    updatedAt: usuario.updatedAt,
  };
}

/**
 * Convierte una sesion cruda (ej. desde Prisma) a su forma publica.
 * Elimina campos sensibles de infraestructura y rastreo.
 *
 * @param {Object} sesion
 * @param {string} sesion.id
 * @param {string} sesion.userId
 * @param {Date} sesion.expiresAt
 * @param {Date} sesion.createdAt
 * @returns {SesionPublica}
 */
export function toSesionPublica(sesion) {
  if (!sesion || typeof sesion !== "object") {
    throw new Error("Se requiere un objeto sesion para sanitizar");
  }
  return {
    id: sesion.id,
    userId: sesion.userId,
    expiresAt: sesion.expiresAt,
    createdAt: sesion.createdAt,
    viewMode: sesion.viewMode ?? null,
  };
}

/**
 * Formatea una fecha a string legible en espanol.
 *
 * @param {Date} date
 * @returns {string}
 */
function formatSessionDate(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convierte una SesionPublica a su forma visual para la UI.
 *
 * @param {SesionPublica} sesion
 * @param {{ currentSessionId?: string }} [options]
 * @returns {ActiveSessionView}
 */
export function toActiveSessionView(sesion, options = {}) {
  if (!sesion || typeof sesion !== "object") {
    throw new Error("Se requiere una SesionPublica para convertir a vista");
  }
  const now = new Date();
  const expiresAt =
    typeof sesion.expiresAt === "string"
      ? new Date(sesion.expiresAt)
      : sesion.expiresAt;

  return {
    id: sesion.id,
    userId: sesion.userId,
    expiresAtFormatted: formatSessionDate(sesion.expiresAt),
    createdAtFormatted: formatSessionDate(sesion.createdAt),
    status: expiresAt > now ? "activa" : "expirada",
    isCurrent: options.currentSessionId === sesion.id,
  };
}
