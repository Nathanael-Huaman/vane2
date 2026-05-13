/**
 * Validación de posts del blog.
 *
 * Todos los validadores retornan un objeto con el contrato:
 *   { valid: boolean, error?: string }
 *
 * Si valid === true, el campo es correcto y error estará ausente.
 * Si valid === false, error contendrá un mensaje seguro.
 *
 * Contratos:
 *
 *   BLOG_POST_STATUS_BORRADOR — constante "borrador"
 *   BLOG_POST_STATUS_PUBLICADO — constante "publicado"
 *   BLOG_POST_STATUSES — [BORRADOR, PUBLICADO] congelado
 *
 *   normalizeSlug(title) → string
 *     Normaliza un título a slug: minúsculas, guiones, sin caracteres especiales.
 *
 *   validateBlogPost(input) → { valid: boolean, error?: string }
 *     Valida campos requeridos, status, slug y límites SEO.
 */

/** @type {string} */
export const BLOG_POST_STATUS_BORRADOR = "borrador";

/** @type {string} */
export const BLOG_POST_STATUS_PUBLICADO = "publicado";

/** @type {ReadonlyArray<string>} */
export const BLOG_POST_STATUSES = Object.freeze([
  BLOG_POST_STATUS_BORRADOR,
  BLOG_POST_STATUS_PUBLICADO,
]);

const SEO_TITLE_MAX = 70;
const SEO_DESCRIPTION_MAX = 160;

/**
 * Normaliza un string a formato slug: minúsculas, guiones en lugar de espacios,
 * elimina caracteres especiales y colapsa guiones múltiples.
 *
 * @param {string} input
 * @returns {string}
 */
export function normalizeSlug(input) {
  if (!input || typeof input !== "string") return "";

  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/[\s]+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

/**
 * Valida que un slug tenga formato correcto (solo minúsculas, números y guiones).
 *
 * @param {string} slug
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSlugFormat(slug) {
  if (!slug || typeof slug !== "string" || !slug.trim()) {
    return { valid: false, error: "El slug es requerido" };
  }
  const trimmed = slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) {
    return {
      valid: false,
      error:
        "El slug solo puede contener letras minúsculas, números y guiones, y no puede empezar ni terminar con guiones",
    };
  }
  return { valid: true };
}

/**
 * Valida los campos de un post del blog.
 *
 * Campos requeridos: title, content, status
 * Campos opcionales: slug, excerpt, seoTitle, seoDescription
 *
 * @param {Object} input
 * @param {string} [input.title]
 * @param {string} [input.content]
 * @param {string} [input.status]
 * @param {string} [input.slug]
 * @param {string} [input.excerpt]
 * @param {string} [input.seoTitle]
 * @param {string} [input.seoDescription]
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBlogPost(input = {}) {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Se requieren datos del post" };
  }

  // title — required, non-empty
  if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
    return { valid: false, error: "El título es requerido" };
  }

  // content — required, non-empty
  if (
    !input.content ||
    typeof input.content !== "string" ||
    !input.content.trim()
  ) {
    return { valid: false, error: "El contenido es requerido" };
  }

  // status — required, must be one of the valid statuses
  if (
    !input.status ||
    typeof input.status !== "string" ||
    !BLOG_POST_STATUSES.includes(input.status.trim())
  ) {
    return {
      valid: false,
      error: `El estado debe ser "${BLOG_POST_STATUS_BORRADOR}" o "${BLOG_POST_STATUS_PUBLICADO}"`,
    };
  }

  // slug — optional, but validate format if provided
  if (input.slug !== undefined && input.slug !== null && input.slug !== "") {
    const slugCheck = validateSlugFormat(input.slug);
    if (!slugCheck.valid) return slugCheck;
  }

  // seoTitle — optional, max length
  if (
    input.seoTitle !== undefined &&
    input.seoTitle !== null &&
    input.seoTitle !== ""
  ) {
    if (typeof input.seoTitle !== "string" || input.seoTitle.length > SEO_TITLE_MAX) {
      return {
        valid: false,
        error: `El título SEO no puede superar los ${SEO_TITLE_MAX} caracteres`,
      };
    }
  }

  // seoDescription — optional, max length
  if (
    input.seoDescription !== undefined &&
    input.seoDescription !== null &&
    input.seoDescription !== ""
  ) {
    if (
      typeof input.seoDescription !== "string" ||
      input.seoDescription.length > SEO_DESCRIPTION_MAX
    ) {
      return {
        valid: false,
        error: `La descripción SEO no puede superar los ${SEO_DESCRIPTION_MAX} caracteres`,
      };
    }
  }

  return { valid: true };
}
