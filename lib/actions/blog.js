"use server";

import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdminAccess,
  logError,
} from "@/lib/server/shared";
import {
  createBlogPost,
  updateBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  deleteBlogPost,
} from "@/lib/server/blog/blog-posts.js";
import { validateBlogPost } from "@/lib/server/blog/validation.js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Extrae y valida los datos del FormData para crear/actualizar un post.
 *
 * @param {FormData} formData
 * @returns {{ valid: boolean, data?: Object, error?: string }}
 */
function extractPostFormData(formData) {
  const data = {
    title: String(formData.get("title") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim() || undefined,
    excerpt: String(formData.get("excerpt") ?? "").trim() || undefined,
    seoTitle: String(formData.get("seoTitle") ?? "").trim() || undefined,
    seoDescription: String(formData.get("seoDescription") ?? "").trim() || undefined,
  };

  const validation = validateBlogPost(data);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  return { valid: true, data };
}

/**
 * Crea un nuevo post del blog. Requiere acceso de administrador.
 *
 * @param {*} _prevState — estado previo (no usado, requerido por useActionState)
 * @param {FormData} formData
 * @returns {Promise<{ ok: boolean, data?: Object, error?: { message: string, status: number } }>}
 */
export async function createBlogPostAction(_prevState, formData) {
  const auth = await requireAdminAccess();
  if (!auth.ok) {
    return auth;
  }

  const extracted = extractPostFormData(formData);
  if (!extracted.valid) {
    return errorResponse(extracted.error, 400);
  }

  try {
    const post = await createBlogPost({
      ...extracted.data,
      authorId: auth.data?.id,
    });

    revalidatePath("/admin/blog");
    revalidatePath("/blog");

    return successResponse(post);
  } catch (error) {
    return serverErrorResponse("No se pudo crear el post", {
      action: "createBlogPostAction",
      message: error.message,
    });
  }
}

/**
 * Actualiza un post existente. Requiere acceso de administrador.
 *
 * @param {*} _prevState
 * @param {FormData} formData
 * @returns {Promise<{ ok: boolean, data?: Object, error?: { message: string, status: number } }>}
 */
export async function updateBlogPostAction(_prevState, formData) {
  const auth = await requireAdminAccess();
  if (!auth.ok) {
    return auth;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return errorResponse("Se requiere el ID del post", 400);
  }

  const extracted = extractPostFormData(formData);
  if (!extracted.valid) {
    return errorResponse(extracted.error, 400);
  }

  try {
    const post = await updateBlogPost(id, extracted.data);
    if (!post) {
      return errorResponse("Post no encontrado", 404);
    }

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    if (post.slug) {
      revalidatePath(`/blog/${post.slug}`);
    }

    return successResponse(post);
  } catch (error) {
    return serverErrorResponse("No se pudo actualizar el post", {
      action: "updateBlogPostAction",
      id,
      message: error.message,
    });
  }
}

/**
 * Publica un post. Requiere acceso de administrador.
 *
 * @param {*} _prevState
 * @param {FormData} formData
 * @returns {Promise<{ ok: boolean, data?: Object, error?: { message: string, status: number } }>}
 */
export async function publishBlogPostAction(_prevState, formData) {
  const auth = await requireAdminAccess();
  if (!auth.ok) {
    return auth;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return errorResponse("Se requiere el ID del post", 400);
  }

  try {
    const post = await publishBlogPost(id);
    if (!post) {
      return errorResponse("Post no encontrado", 404);
    }

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);

    return successResponse(post);
  } catch (error) {
    return serverErrorResponse("No se pudo publicar el post", {
      action: "publishBlogPostAction",
      id,
      message: error.message,
    });
  }
}

/**
 * Despublica un post. Requiere acceso de administrador.
 *
 * @param {*} _prevState
 * @param {FormData} formData
 * @returns {Promise<{ ok: boolean, data?: Object, error?: { message: string, status: number } }>}
 */
export async function unpublishBlogPostAction(_prevState, formData) {
  const auth = await requireAdminAccess();
  if (!auth.ok) {
    return auth;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return errorResponse("Se requiere el ID del post", 400);
  }

  try {
    const post = await unpublishBlogPost(id);
    if (!post) {
      return errorResponse("Post no encontrado", 404);
    }

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);

    return successResponse(post);
  } catch (error) {
    return serverErrorResponse("No se pudo despublicar el post", {
      action: "unpublishBlogPostAction",
      id,
      message: error.message,
    });
  }
}

/**
 * Elimina un post. Requiere acceso de administrador.
 *
 * @param {*} _prevState
 * @param {FormData} formData
 * @returns {Promise<{ ok: boolean, data?: Object, error?: { message: string, status: number } }>}
 */
export async function deleteBlogPostAction(_prevState, formData) {
  const auth = await requireAdminAccess();
  if (!auth.ok) {
    return auth;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return errorResponse("Se requiere el ID del post", 400);
  }

  try {
    const post = await deleteBlogPost(id);
    if (!post) {
      return errorResponse("Post no encontrado", 404);
    }

    revalidatePath("/admin/blog");
    revalidatePath("/blog");

    return successResponse(post);
  } catch (error) {
    return serverErrorResponse("No se pudo eliminar el post", {
      action: "deleteBlogPostAction",
      id,
      message: error.message,
    });
  }
}
