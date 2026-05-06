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

/**
 * Representacion publica de un usuario.
 * Excluye passwordHash y cualquier dato sensible.
 *
 * @typedef {Object} UsuarioPublico
 * @property {string} id
 * @property {string} email
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
  };
}
