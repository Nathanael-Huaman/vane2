/**
 * Servicio de lectura y escritura de posts del blog.
 *
 * Proporciona queries para operaciones administrativas (CRUD completo)
 * y consultas públicas (solo posts publicados).
 *
 * Contratos:
 *   - Las consultas públicas filtran por status === "publicado".
 *   - Las mutaciones validan datos con validateBlogPost antes de escribir.
 *   - El slug se normaliza automáticamente si no se provee explícitamente.
 *
 * Dependencias:
 *   - prisma (lib/prisma.js) — cliente de base de datos
 *   - validation (./validation.js) — validación de campos
 */

import prisma from "../../prisma.js";
import {
  BLOG_POST_STATUS_BORRADOR,
  BLOG_POST_STATUS_PUBLICADO,
  normalizeSlug,
  validateBlogPost,
} from "./validation.js";

/**
 * Crea un nuevo post en la base de datos.
 *
 * @param {Object} data
 * @param {string} data.title
 * @param {string} data.content
 * @param {string} data.status
 * @param {string} [data.slug] — si no se provee, se genera a partir del título
 * @param {string} [data.excerpt]
 * @param {string} [data.seoTitle]
 * @param {string} [data.seoDescription]
 * @param {string} [data.authorId]
 * @returns {Promise<Object>} El post creado
 * @throws {Error} Si la validación falla o el slug está duplicado
 */
export async function createBlogPost(data) {
  const validation = validateBlogPost(data);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const slug = data.slug?.trim() || normalizeSlug(data.title.trim());

  const publishedAt =
    data.status === BLOG_POST_STATUS_PUBLICADO ? new Date() : undefined;

  return prisma.blogPost.create({
    data: {
      title: data.title.trim(),
      slug,
      content: data.content.trim(),
      status: data.status.trim(),
      excerpt: data.excerpt?.trim() || null,
      seoTitle: data.seoTitle?.trim() || null,
      seoDescription: data.seoDescription?.trim() || null,
      authorId: data.authorId || null,
      publishedAt,
    },
  });
}

/**
 * Obtiene solo los posts publicados, ordenados por fecha de publicación descendente.
 *
 * @returns {Promise<Array<Object>>} Lista de posts publicados
 */
export async function getPublishedPosts() {
  return prisma.blogPost.findMany({
    where: { status: BLOG_POST_STATUS_PUBLICADO },
    orderBy: { publishedAt: "desc" },
  });
}

/**
 * Obtiene un post publicado por su slug.
 *
 * @param {string} slug
 * @returns {Promise<Object|null>} El post publicado o null si no existe o no está publicado
 */
export async function getPublishedPostBySlug(slug) {
  if (!slug || typeof slug !== "string" || !slug.trim()) return null;

  return prisma.blogPost.findFirst({
    where: {
      slug: slug.trim(),
      status: BLOG_POST_STATUS_PUBLICADO,
    },
  });
}

/**
 * Obtiene todos los posts (admin), ordenados por fecha de creación descendente.
 *
 * @returns {Promise<Array<Object>>} Lista de todos los posts
 */
export async function getAllPosts() {
  return prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Obtiene un post por su ID.
 *
 * @param {string} id
 * @returns {Promise<Object|null>} El post o null si no existe
 */
export async function getPostById(id) {
  if (!id || typeof id !== "string" || !id.trim()) return null;

  return prisma.blogPost.findUnique({
    where: { id: id.trim() },
  });
}

/**
 * Actualiza campos de un post existente.
 *
 * @param {string} id
 * @param {Object} data — campos a actualizar (title, content, excerpt, seoTitle, seoDescription, slug)
 * @returns {Promise<Object|null>} El post actualizado o null si no existe
 */
export async function updateBlogPost(id, data = {}) {
  if (!id || typeof id !== "string" || !id.trim()) return null;

  const updateData = {};

  if (data.title !== undefined) {
    updateData.title = data.title.trim();
  }
  if (data.content !== undefined) {
    updateData.content = data.content.trim();
  }
  if (data.excerpt !== undefined) {
    updateData.excerpt = data.excerpt?.trim() || null;
  }
  if (data.seoTitle !== undefined) {
    updateData.seoTitle = data.seoTitle?.trim() || null;
  }
  if (data.seoDescription !== undefined) {
    updateData.seoDescription = data.seoDescription?.trim() || null;
  }
  if (data.slug !== undefined && data.slug !== null && data.slug !== "") {
    updateData.slug = data.slug.trim();
  }

  if (Object.keys(updateData).length === 0) return getPostById(id);

  return prisma.blogPost.update({
    where: { id: id.trim() },
    data: updateData,
  });
}

/**
 * Publica un post: cambia status a "publicado" y establece publishedAt.
 *
 * @param {string} id
 * @returns {Promise<Object|null>} El post publicado o null si no existe
 */
export async function publishBlogPost(id) {
  if (!id || typeof id !== "string" || !id.trim()) return null;

  return prisma.blogPost.update({
    where: { id: id.trim() },
    data: {
      status: BLOG_POST_STATUS_PUBLICADO,
      publishedAt: new Date(),
    },
  });
}

/**
 * Despublica un post: cambia status a "borrador".
 *
 * @param {string} id
 * @returns {Promise<Object|null>} El post despublicado o null si no existe
 */
export async function unpublishBlogPost(id) {
  if (!id || typeof id !== "string" || !id.trim()) return null;

  return prisma.blogPost.update({
    where: { id: id.trim() },
    data: {
      status: BLOG_POST_STATUS_BORRADOR,
    },
  });
}

/**
 * Elimina un post por su ID.
 *
 * @param {string} id
 * @returns {Promise<Object|null>} El post eliminado o null si no existe
 */
export async function deleteBlogPost(id) {
  if (!id || typeof id !== "string" || !id.trim()) return null;

  return prisma.blogPost.delete({
    where: { id: id.trim() },
  });
}
