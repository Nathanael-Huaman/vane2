/**
 * Pruebas runtime del blog integrado — Foundation (PR 1)
 *
 * Verifica:
 * - Modelo Prisma BlogPost + BlogPostStatus (task 1.1)
 * - Validación de posts (task 1.2)
 * - Servicio de lectura/escritura de posts (task 1.3)
 *
 * Uso:
 *   pnpm test:blog-foundation
 */
import "dotenv/config";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

// These imports will FAIL (RED) until production code is written
// Task 1.2 — validation
import {
  BLOG_POST_STATUS_BORRADOR,
  BLOG_POST_STATUS_PUBLICADO,
  BLOG_POST_STATUSES,
  normalizeSlug,
  validateBlogPost,
} from "../lib/server/blog/validation.js";

// Task 1.3 — blog service queries
import {
  createBlogPost,
  getPublishedPosts,
  getPublishedPostBySlug,
  getAllPosts,
  getPostById,
  updateBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  deleteBlogPost,
} from "../lib/server/blog/blog-posts.js";

// --- Test infrastructure (mirrors existing patterns) ---

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${description}`);
  }
}

function assertEqual<T>(description: string, actual: T, expected: T) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${description}`);
    console.error(`    esperado: ${JSON.stringify(expected)}`);
    console.error(`    obtenido: ${JSON.stringify(actual)}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

function printSummaryAndExit() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

  if (failed > 0) {
    console.log("\n\x1b[31mPRUEBAS BLOG FOUNDATION FALLARON\x1b[0m");
    process.exit(1);
  }

  console.log("\n\x1b[32mBlog foundation validado correctamente.\x1b[0m");
}

// --- Main test suite ---

async function main() {
  const prisma = createRuntimePrismaClient();

  try {
    // ================================================================
    // Section 1: Prisma Model Contract (Task 1.1)
    // ================================================================
    section("1. Contrato del modelo BlogPost");

    // 1a. Clean up any leftover test data
    await prisma.blogPost.deleteMany().catch(() => {
      // Table might not exist yet — that's OK for RED phase
    });

    // 1b. Create a published post
    const post = await prisma.blogPost.create({
      data: {
        title: "Mi primer post del blog",
        slug: "mi-primer-post-del-blog",
        content: "Contenido de prueba para el blog integrado.",
        status: "publicado",
        excerpt: "Un excerpt de prueba",
        seoTitle: "SEO Title de prueba",
        seoDescription: "SEO Description de prueba para el post",
        publishedAt: new Date(),
      },
    });

    assert("crea un post con id", Boolean(post.id));
    assert("el post tiene titulo correcto", post.title === "Mi primer post del blog");
    assert("el post tiene slug correcto", post.slug === "mi-primer-post-del-blog");
    assert("el post tiene contenido", post.content === "Contenido de prueba para el blog integrado.");
    assert("el post tiene status publicado", post.status === "publicado");
    assert("el post tiene excerpt", post.excerpt === "Un excerpt de prueba");
    assert("el post tiene seoTitle", post.seoTitle === "SEO Title de prueba");
    assert("el post tiene seoDescription", post.seoDescription === "SEO Description de prueba para el post");
    assert("el post tiene publishedAt", post.publishedAt instanceof Date);
    assert("el post tiene createdAt", post.createdAt instanceof Date);
    assert("el post tiene updatedAt", post.updatedAt instanceof Date);

    // 1c. Create a draft post
    const draft = await prisma.blogPost.create({
      data: {
        title: "Borrador privado",
        slug: "borrador-privado",
        content: "Este es un borrador.",
        status: "borrador",
      },
    });

    assert("crea un borrador con status borrador", draft.status === "borrador");
    assert("borrador no tiene publishedAt", draft.publishedAt === null);

    // 1d. Slug uniqueness — MUST reject duplicate slug
    let duplicateError: Error | null = null;
    try {
      await prisma.blogPost.create({
        data: {
          title: "Otro post",
          slug: "mi-primer-post-del-blog", // duplicate
          content: "Contenido duplicado.",
          status: "borrador",
        },
      });
    } catch (e) {
      duplicateError = e as Error;
    }
    assert("rechaza slug duplicado", duplicateError !== null);

    // 1e. BlogPostStatus values are accessible
    assert(
      "enum BlogPostStatus tiene valor borrador",
      post.status === "borrador" || post.status === "publicado"
    );

    // Clean up section 1 data
    await prisma.blogPost.deleteMany();

    // ================================================================
    // Section 2: Blog Post Validation — Pure Functions (Task 1.2)
    // ================================================================
    section("2. Validación de posts del blog");

    // 2a. Constants are exported
    assert("BLOG_POST_STATUS_BORRADOR es string", typeof BLOG_POST_STATUS_BORRADOR === "string");
    assert("BLOG_POST_STATUS_PUBLICADO es string", typeof BLOG_POST_STATUS_PUBLICADO === "string");
    assert("BLOG_POST_STATUSES es array", Array.isArray(BLOG_POST_STATUSES));
    assert(
      "BLOG_POST_STATUSES contiene ambos valores",
      BLOG_POST_STATUSES.includes(BLOG_POST_STATUS_BORRADOR) &&
        BLOG_POST_STATUSES.includes(BLOG_POST_STATUS_PUBLICADO)
    );

    // 2b. normalizeSlug — pure function
    assertEqual(
      "normalizeSlug convierte a minúsculas y guiones",
      normalizeSlug("Mi Primer Post del Blog"),
      "mi-primer-post-del-blog"
    );
    assertEqual(
      "normalizeSlug elimina caracteres especiales",
      normalizeSlug("¡Hola! ¿Cómo estás? — Post #1"),
      "hola-como-estas-post-1"
    );
    assertEqual(
      "normalizeSlug colapsa guiones múltiples",
      normalizeSlug("  post   con   espacios  "),
      "post-con-espacios"
    );
    assertEqual(
      "normalizeSlug recorta guiones al inicio y final",
      normalizeSlug("--post de prueba--"),
      "post-de-prueba"
    );
    assertEqual(
      "normalizeSlug maneja string vacío",
      normalizeSlug(""),
      ""
    );

    // 2c. validateBlogPost — rejects missing required fields
    const emptyResult = validateBlogPost({});
    assert("rechaza objeto vacío", emptyResult.valid === false);
    assert("objeto vacío tiene error", typeof emptyResult.error === "string");

    const noTitle = validateBlogPost({ content: "Contenido", status: "borrador" });
    assert("rechaza sin título", noTitle.valid === false);

    const noContent = validateBlogPost({ title: "Título", status: "borrador" });
    assert("rechaza sin contenido", noContent.valid === false);

    const noStatus = validateBlogPost({ title: "Título", content: "Contenido" });
    assert("rechaza sin status", noStatus.valid === false);

    // 2d. validateBlogPost — rejects invalid status
    const invalidStatus = validateBlogPost({
      title: "Título",
      content: "Contenido",
      status: "invalido",
    });
    assert("rechaza status inválido", invalidStatus.valid === false);

    // 2e. validateBlogPost — accepts valid data
    const validInput = validateBlogPost({
      title: "Mi Post de Prueba",
      content: "Contenido del post.",
      status: "borrador",
    });
    assert("acepta datos válidos con status borrador", validInput.valid === true);

    const validPublished = validateBlogPost({
      title: "Post Publicado",
      content: "Contenido publicado.",
      status: "publicado",
      slug: "post-publicado",
    });
    assert("acepta datos válidos con status publicado", validPublished.valid === true);

    // 2f. validateBlogPost — SEO limits
    const longSeoTitle = validateBlogPost({
      title: "Título",
      content: "Contenido",
      status: "borrador",
      seoTitle: "A".repeat(71),
    });
    assert(
      "rechaza seoTitle demasiado largo (>70 chars)",
      longSeoTitle.valid === false
    );

    const longSeoDesc = validateBlogPost({
      title: "Título",
      content: "Contenido",
      status: "borrador",
      seoDescription: "B".repeat(161),
    });
    assert(
      "rechaza seoDescription demasiado larga (>160 chars)",
      longSeoDesc.valid === false
    );

    const validSeoLimits = validateBlogPost({
      title: "Título",
      content: "Contenido",
      status: "borrador",
      seoTitle: "A".repeat(70),
      seoDescription: "B".repeat(160),
    });
    assert(
      "acepta SEO dentro de límites",
      validSeoLimits.valid === true
    );

    // 2g. validateBlogPost — slug format validation
    const invalidSlug = validateBlogPost({
      title: "Título",
      content: "Contenido",
      status: "borrador",
      slug: "SLUG CON ESPACIOS!!!",
    });
    assert("rechaza slug con formato inválido", invalidSlug.valid === false);

    // ================================================================
    // Section 3: Blog Post Service Queries (Task 1.3)
    // ================================================================
    section("3. Servicio de posts del blog");

    // Ensure clean state
    await prisma.blogPost.deleteMany();

    // 3a. createBlogPost
    const created = await createBlogPost({
      title: "Post desde el servicio",
      content: "Contenido creado por el servicio.",
      status: "borrador",
    });
    assert("createBlogPost retorna objeto con id", Boolean(created) && typeof created.id === "string");
    assert(
      "createBlogPost genera slug automáticamente",
      typeof created.slug === "string" && created.slug.length > 0
    );
    assert("createBlogPost establece status borrador", created.status === "borrador");

    // 3b. createBlogPost with explicit slug
    const withSlug = await createBlogPost({
      title: "Post con slug explícito",
      content: "Contenido con slug.",
      status: "publicado",
      slug: "post-con-slug-explicito",
    });
    assert("createBlogPost respeta slug explícito", withSlug.slug === "post-con-slug-explicito");
    assert("createBlogPost publicado tiene status", withSlug.status === "publicado");

    // 3c. Create a few more posts for filtering tests
    await createBlogPost({
      title: "Borrador número dos",
      content: "Segundo borrador.",
      status: "borrador",
    });

    const published2 = await createBlogPost({
      title: "Segundo post publicado",
      content: "Otro publicado.",
      status: "publicado",
      slug: "segundo-post-publicado",
    });

    // 3d. getPublishedPosts — filters drafts
    const published = await getPublishedPosts();
    assert("getPublishedPosts retorna array", Array.isArray(published));
    assert(
      "getPublishedPosts solo contiene publicados",
      published.every((p: { status: string }) => p.status === "publicado")
    );
    assert(
      "getPublishedPosts tiene al menos 2 posts publicados",
      published.length >= 2
    );
    assert(
      "getPublishedPosts excluye borradores",
      published.length >= 2
    );
    // Verify drafts are NOT in published results
    const publishedSlugs = published.map((p: { slug: string }) => p.slug);
    assert(
      "borrador no aparece en publicados",
      !publishedSlugs.includes("post-desde-el-servicio")
    );

    // 3e. getPublishedPosts — empty when no published posts
    // Unpublish all posts to test empty case
    const allPosts = await getAllPosts();
    for (const p of allPosts) {
      if (p.status === "publicado") {
        await unpublishBlogPost(p.id);
      }
    }
    const emptyPublished = await getPublishedPosts();
    assert(
      "getPublishedPosts retorna array vacío sin publicados",
      Array.isArray(emptyPublished) && emptyPublished.length === 0
    );

    // Re-publish one for detail tests
    await publishBlogPost(withSlug.id);

    // 3f. getPublishedPostBySlug — returns published post
    const found = await getPublishedPostBySlug("post-con-slug-explicito");
    assert(
      "getPublishedPostBySlug encuentra post publicado",
      Boolean(found)
    );
    assert(
      "getPublishedPostBySlug retorna título correcto",
      found && found.title === "Post con slug explícito"
    );

    // 3g. getPublishedPostBySlug — returns null for draft
    const draftBySlug = await getPublishedPostBySlug("post-desde-el-servicio");
    assert(
      "getPublishedPostBySlug retorna null para borrador",
      draftBySlug === null
    );

    // 3h. getPublishedPostBySlug — returns null for missing slug
    const missing = await getPublishedPostBySlug("slug-que-no-existe");
    assert(
      "getPublishedPostBySlug retorna null para slug inexistente",
      missing === null
    );

    // 3i. getPostById
    const byId = await getPostById(created.id);
    assert("getPostById encuentra post", Boolean(byId));
    assert(
      "getPostById retorna datos correctos",
      byId && byId.title === "Post desde el servicio"
    );

    // 3j. getAllPosts — returns all regardless of status
    const all = await getAllPosts();
    assert("getAllPosts retorna array", Array.isArray(all));
    const statuses = all.map((p: { status: string }) => p.status);
    assert(
      "getAllPosts incluye borradores y publicados",
      statuses.includes("borrador") && statuses.includes("publicado")
    );

    // 3k. updateBlogPost
    const updated = await updateBlogPost(created.id, {
      title: "Título actualizado",
      excerpt: "Nuevo excerpt",
    });
    assert(
      "updateBlogPost modifica título",
      updated && updated.title === "Título actualizado"
    );
    assert(
      "updateBlogPost modifica excerpt",
      updated && updated.excerpt === "Nuevo excerpt"
    );
    assert(
      "updateBlogPost conserva campos no modificados",
      updated && updated.status === "borrador"
    );

    // 3l. publishBlogPost
    const published3 = await publishBlogPost(created.id);
    assert(
      "publishBlogPost cambia status a publicado",
      published3 && published3.status === "publicado"
    );
    assert(
      "publishBlogPost establece publishedAt",
      published3 && published3.publishedAt instanceof Date
    );

    // 3m. unpublishBlogPost
    const unpublished = await unpublishBlogPost(published2.id);
    assert(
      "unpublishBlogPost cambia status a borrador",
      unpublished && unpublished.status === "borrador"
    );

    // 3n. deleteBlogPost
    const deleted = await deleteBlogPost(created.id);
    assert(
      "deleteBlogPost retorna el post eliminado",
      Boolean(deleted) && deleted.id === created.id
    );
    const afterDelete = await getPostById(created.id);
    assert(
      "el post ya no existe después de eliminar",
      afterDelete === null
    );

    // Clean up
    await prisma.blogPost.deleteMany();

  } finally {
    await prisma.$disconnect();
  }

  printSummaryAndExit();
}

main().catch((error: Error) => {
  console.error("Error ejecutando pruebas blog foundation:", error.message);
  console.error(error.stack);
  process.exit(1);
});
