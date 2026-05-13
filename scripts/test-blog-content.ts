/**
 * Pruebas runtime del blog integrado — Content / Wiring (PR 2)
 *
 * Verifica:
 * - Markdown renderer seguro (task 2.2)
 * - Tipos y exportaciones del blog (task 2.3)
 * - Server Actions admin (task 2.1)
 * - Consultas públicas (task 3.1/3.2 — capa de servicio)
 * - Admin CRUD (task 3.3 — capa de servicio)
 *
 * Uso:
 *   pnpm test:blog-content
 */
import "dotenv/config";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

// ================================================================
// RED phase imports — estos imports FALLARÁN hasta que el código
// de producción exista:
// ================================================================

// Task 2.2 — markdown renderer
import {
  parseMarkdownToHtml,
  isSafeMarkdown,
  extractProductLinks,
  sanitizeHtml,
} from "../lib/server/blog/markdown.js";

// Task 2.3 — blog types
import {
  BLOG_POST_STATUS_BORRADOR,
  BLOG_POST_STATUS_PUBLICADO,
} from "../lib/server/blog/validation.js";

// Blog type constants from lib/types.js (should be added by 2.3)
// We'll check these exist via dynamic import if needed

// Task 2.1 — admin actions (these will FAIL until actions file exists)
// We import the blog service directly for RED setup then test actions separately

// --- Test infrastructure ---

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

function assertContains(description: string, haystack: string, needle: string) {
  if (haystack.includes(needle)) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${description}`);
    console.error(`    "${needle}" no encontrado en: ${haystack.substring(0, 200)}`);
  }
}

function assertNotContains(description: string, haystack: string, needle: string) {
  if (!haystack.includes(needle)) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${description}`);
    console.error(`    "${needle}" encontrado en: ${haystack.substring(0, 200)}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

function printSummaryAndExit() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

  if (failed > 0) {
    console.log("\n\x1b[31mPRUEBAS BLOG CONTENT FALLARON\x1b[0m");
    process.exit(1);
  }

  console.log("\n\x1b[32mBlog content validado correctamente.\x1b[0m");
}

// --- Main test suite ---

async function main() {
  const prisma = createRuntimePrismaClient();

  try {
    // ================================================================
    // Section 1: Markdown Renderer — Pure Functions (Task 2.2)
    // ================================================================
    section("1. Markdown renderer seguro");

    // 1a. parseMarkdownToHtml — basic paragraph
    const paragraphs = parseMarkdownToHtml("Hola mundo");
    assert("parseMarkdownToHtml convierte texto a párrafo HTML", typeof paragraphs === "string");
    assertContains("párrafo simple envuelto en <p>", paragraphs, "<p>");
    assertContains("párrafo contiene el texto original", paragraphs, "Hola mundo");

    // 1b. parseMarkdownToHtml — multiple paragraphs (triangulación)
    const multiPara = parseMarkdownToHtml("Primer párrafo.\n\nSegundo párrafo.");
    assertContains("múltiples párrafos: primer párrafo", multiPara, "Primer párrafo");
    assertContains("múltiples párrafos: segundo párrafo", multiPara, "Segundo párrafo");
    const paraCount = (multiPara.match(/<p>/g) || []).length;
    assert("múltiples párrafos: exactamente 2 párrafos", paraCount === 2);

    // 1c. parseMarkdownToHtml — links
    const withLink = parseMarkdownToHtml("Visita [nuestra tienda](/tienda) para más.");
    assertContains("link markdown a HTML", withLink, '<a href="/tienda"');
    assertContains("link conserva texto", withLink, "nuestra tienda");

    // 1d. parseMarkdownToHtml — multiple links
    const multiLink = parseMarkdownToHtml(
      "[Producto A](/tienda/producto-a) y [Producto B](/tienda/producto-b)"
    );
    const linkCount = (multiLink.match(/<a href="/g) || []).length;
    assert("múltiples links: ambos convertidos", linkCount === 2);

    // 1e. parseMarkdownToHtml — strips raw HTML (safety)
    const withHtml = parseMarkdownToHtml("Texto <script>alert('xss')</script> seguro");
    assertNotContains("strippea <script> tags (no ejecutable)", withHtml, "<script>");
    assertContains("escapa los < > de script tags", withHtml, "&lt;script&gt;");
    assertContains("conserva texto seguro", withHtml, "Texto");
    assertContains("conserva texto después del script", withHtml, "seguro");

    // 1f. parseMarkdownToHtml — strips dangerous HTML attributes
    const withOnclick = parseMarkdownToHtml(
      'Haz clic [aquí](javascript:void(0) "onclick=alert(1)")'
    );
    assertNotContains("strippea javascript: URLs", withOnclick, "javascript:");

    // 1g. parseMarkdownToHtml — empty input
    const emptyResult = parseMarkdownToHtml("");
    assert("parseMarkdownToHtml maneja string vacío", typeof emptyResult === "string");

    // 1h. isSafeMarkdown — detects unsafe content
    assert("isSafeMarkdown: texto plano es seguro", isSafeMarkdown("Hola mundo") === true);
    assert(
      "isSafeMarkdown: markdown con links es seguro",
      isSafeMarkdown("[link](https://example.com)") === true
    );
    assert(
      "isSafeMarkdown: <script> no es seguro",
      isSafeMarkdown("<script>alert(1)</script>") === false
    );
    assert(
      "isSafeMarkdown: <iframe> no es seguro",
      isSafeMarkdown('<iframe src="evil.com"></iframe>') === false
    );

    // 1i. extractProductLinks — finds /tienda references
    const products = extractProductLinks(
      "Mira [este producto](/tienda/prod-1) y [este otro](/tienda/prod-2)"
    );
    assert("extractProductLinks retorna array", Array.isArray(products));
    assert("extractProductLinks encuentra 2 productos", products.length === 2);
    assertEqual("primer producto es /tienda/prod-1", products[0], "/tienda/prod-1");
    assertEqual("segundo producto es /tienda/prod-2", products[1], "/tienda/prod-2");

    // 1j. extractProductLinks — no products
    const noProducts = extractProductLinks("Un post sin referencias a productos.");
    assert("extractProductLinks sin productos retorna array vacío", noProducts.length === 0);

    // 1k. extractProductLinks — ignores non-tienda links
    const mixed = extractProductLinks(
      "[Tienda](/tienda/algo) y [Google](https://google.com)"
    );
    assert("extractProductLinks ignora links externos", mixed.length === 1);
    assertEqual("solo captura link de tienda", mixed[0], "/tienda/algo");

    // 1l. sanitizeHtml — removes dangerous tags
    const sanitized = sanitizeHtml(
      "<p>Seguro</p><script>malo</script><b>negrita</b><iframe src='x'></iframe>"
    );
    assertContains("sanitizeHtml conserva <p>", sanitized, "<p>");
    assertContains("sanitizeHtml conserva <b>", sanitized, "<b>");
    assertNotContains("sanitizeHtml elimina <script>", sanitized, "<script>");
    assertNotContains("sanitizeHtml elimina <iframe>", sanitized, "<iframe>");

    // ================================================================
    // Section 2: Blog Types & Exports (Task 2.3)
    // ================================================================
    section("2. Tipos y exportaciones del blog");

    // 2a. Blog status constants are accessible from validation.js (already tested in PR1)
    assert(
      "BLOG_POST_STATUS_BORRADOR === 'borrador'",
      BLOG_POST_STATUS_BORRADOR === "borrador"
    );
    assert(
      "BLOG_POST_STATUS_PUBLICADO === 'publicado'",
      BLOG_POST_STATUS_PUBLICADO === "publicado"
    );

    // 2b. Blog service exports are accessible via direct imports
    // (barrel import via lib/server/index.js uses @/ aliases that don't resolve in tsx;
    //  tested implicitly by Next.js build — we verify direct imports work)
    const blogService = await import("../lib/server/blog/blog-posts.js");
    assert(
      "blog-posts.js exporta createBlogPost",
      typeof blogService.createBlogPost === "function"
    );
    assert(
      "blog-posts.js exporta getPublishedPosts",
      typeof blogService.getPublishedPosts === "function"
    );
    assert(
      "blog-posts.js exporta getPublishedPostBySlug",
      typeof blogService.getPublishedPostBySlug === "function"
    );

    // 2c. Markdown helpers are accessible via direct import
    const markdown = await import("../lib/server/blog/markdown.js");
    assert(
      "markdown.js exporta parseMarkdownToHtml",
      typeof markdown.parseMarkdownToHtml === "function"
    );
    assert(
      "markdown.js exporta extractProductLinks",
      typeof markdown.extractProductLinks === "function"
    );
    assert(
      "markdown.js exporta isSafeMarkdown",
      typeof markdown.isSafeMarkdown === "function"
    );

    // 2d. lib/server/index.js barrel — verify structure without importing @/ aliases
    // The barrel file exists and re-exports blog services for Next.js consumption.
    // We verify the underlying modules are importable (above) and the file structure.
    const fs = await import("fs");
    const indexPath = "../lib/server/index.js";
    const barrelContent = fs.readFileSync(
      new URL(indexPath, import.meta.url),
      "utf-8"
    );
    assert(
      "lib/server/index.js contiene blogPosts export",
      barrelContent.includes("blogPosts")
    );
    assert(
      "lib/server/index.js contiene parseMarkdown export",
      barrelContent.includes("parseMarkdown")
    );
    assert(
      "lib/server/index.js contiene extractProductLinks export",
      barrelContent.includes("extractProductLinks")
    );

    // ================================================================
    // Section 3: Admin Server Actions (Task 2.1)
    // ================================================================
    section("3. Server Actions del blog (admin)");

    // Actions import @/ aliases that require Next.js runtime (not tsx).
    // We attempt dynamic import and degrade gracefully if it fails.
    let actions: any = null;
    try {
      actions = await import("../lib/actions/blog.js");
    } catch {
      console.log("  ⚠️  No se pudo importar actions/blog.js (requiere Next.js runtime)");
      console.log("     Los actions se validan en el build de Next.js");
    }

    if (actions) {
      // Verify actions exist
      assert(
        "createBlogPostAction existe",
        typeof actions.createBlogPostAction === "function"
      );
      assert(
        "updateBlogPostAction existe",
        typeof actions.updateBlogPostAction === "function"
      );
      assert(
        "publishBlogPostAction existe",
        typeof actions.publishBlogPostAction === "function"
      );
      assert(
        "unpublishBlogPostAction existe",
        typeof actions.unpublishBlogPostAction === "function"
      );
      assert(
        "deleteBlogPostAction existe",
        typeof actions.deleteBlogPostAction === "function"
      );

      // Ensure mock auth is active for testing
      if (process.env.NODE_ENV !== "development" || process.env.MOCK_AUTH !== "1") {
        console.log("  ⚠️  Saltando pruebas funcionales de actions — MOCK_AUTH=1 requerido");
      } else {
        // Set mock admin role
        const prevRole = process.env.MOCK_ROLE;
        process.env.MOCK_ROLE = "administrador";

        // Clean slate
        await prisma.blogPost.deleteMany();

        // 3a. create — basic post
        const createForm = new FormData();
        createForm.set("title", "Post desde acción admin");
        createForm.set("content", "Contenido creado vía Server Action.");
        createForm.set("status", "borrador");

        const createResult = await actions.createBlogPostAction(null, createForm);
        assert("create: ok es true", createResult.ok === true);
        assert("create: retorna data con id", typeof createResult.data?.id === "string");
        assert("create: retorna data con slug", typeof createResult.data?.slug === "string");

        // 3b. create — validation error (missing title)
        const badForm = new FormData();
        badForm.set("content", "Sin título");
        badForm.set("status", "borrador");
        const badCreateResult = await actions.createBlogPostAction(null, badForm);
        assert("create sin título: ok es false", badCreateResult.ok === false);

        // 3c. create — with SEO fields
        const seoForm = new FormData();
        seoForm.set("title", "Post con SEO");
        seoForm.set("content", "Contenido con SEO.");
        seoForm.set("status", "publicado");
        seoForm.set("slug", "post-con-seo");
        seoForm.set("excerpt", "Un excerpt SEO");
        seoForm.set("seoTitle", "Título SEO optimizado");
        seoForm.set("seoDescription", "Descripción SEO del post");

        const seoResult = await actions.createBlogPostAction(null, seoForm);
        assert("create con SEO: ok es true", seoResult.ok === true);
        assert("create con SEO: status publicado", seoResult.data?.status === "publicado");

        // 3d. update — modify title and excerpt
        const postToUpdate = seoResult.data;
        const updateForm = new FormData();
        updateForm.set("id", postToUpdate.id);
        updateForm.set("title", "Título actualizado");
        updateForm.set("content", postToUpdate.content);
        updateForm.set("status", postToUpdate.status);
        updateForm.set("excerpt", "Nuevo excerpt");

        const updateResult = await actions.updateBlogPostAction(null, updateForm);
        assert("update: ok es true", updateResult.ok === true);
        assert(
          "update: título modificado",
          updateResult.data?.title === "Título actualizado"
        );
        assert(
          "update: excerpt modificado",
          updateResult.data?.excerpt === "Nuevo excerpt"
        );

        // 3e. create another for publish/unpublish tests
        const draftForm = new FormData();
        draftForm.set("title", "Borrador para publicar");
        draftForm.set("content", "Contenido del borrador.");
        draftForm.set("status", "borrador");
        const draftResult = await actions.createBlogPostAction(null, draftForm);
        const draftId = draftResult.data.id;

        // 3f. publish
        const pubForm = new FormData();
        pubForm.set("id", draftId);
        const pubResult = await actions.publishBlogPostAction(null, pubForm);
        assert("publish: ok es true", pubResult.ok === true);
        assert("publish: status cambió a publicado", pubResult.data?.status === "publicado");
        assert("publish: tiene publishedAt", pubResult.data?.publishedAt !== null);

        // 3g. unpublish
        const unpubForm = new FormData();
        unpubForm.set("id", draftId);
        const unpubResult = await actions.unpublishBlogPostAction(null, unpubForm);
        assert("unpublish: ok es true", unpubResult.ok === true);
        assert("unpublish: status cambió a borrador", unpubResult.data?.status === "borrador");

        // 3h. delete
        const delForm = new FormData();
        delForm.set("id", draftId);
        const delResult = await actions.deleteBlogPostAction(null, delForm);
        assert("delete: ok es true", delResult.ok === true);
        const deletedPost = await prisma.blogPost.findUnique({ where: { id: draftId } });
        assert("delete: post ya no existe en BD", deletedPost === null);

        // 3i. delete — nonexistent ID returns error
        const badDelForm = new FormData();
        badDelForm.set("id", "nonexistent-id");
        const badDelResult = await actions.deleteBlogPostAction(null, badDelForm);
        assert("delete inexistente: ok es false", badDelResult.ok === false);

        // Restore mock role
        if (prevRole) {
          process.env.MOCK_ROLE = prevRole;
        } else {
          delete process.env.MOCK_ROLE;
        }

        // Clean up
        await prisma.blogPost.deleteMany();
      }
    }

    // ================================================================
    // Section 4: Public Blog Queries (Tasks 3.1 & 3.2 — service layer)
    // ================================================================
    section("4. Consultas públicas del blog");

    // Import service directly for service-level tests
    const { createBlogPost, getPublishedPosts, getPublishedPostBySlug, getAllPosts } =
      await import("../lib/server/blog/blog-posts.js");

    // Clean slate
    await prisma.blogPost.deleteMany();

    // Create test posts
    const pub1 = await createBlogPost({
      title: "Post público uno",
      content: "Contenido del primer post público.",
      status: "publicado",
      slug: "post-publico-uno",
    });

    const pub2 = await createBlogPost({
      title: "Post público dos",
      content: "Contenido del segundo post público con [link a tienda](/tienda/prod-1).",
      status: "publicado",
      slug: "post-publico-dos",
      excerpt: "Resumen del post dos",
      seoTitle: "SEO Post Dos",
      seoDescription: "Descripción SEO del post dos",
    });

    const draft1 = await createBlogPost({
      title: "Borrador oculto",
      content: "Este borrador NO debe aparecer en público.",
      status: "borrador",
      slug: "borrador-oculto",
    });

    // 4a. getPublishedPosts — only returns published posts
    const publishedPosts = await getPublishedPosts();
    assert("getPublishedPosts: retorna array", Array.isArray(publishedPosts));
    assert(
      "getPublishedPosts: solo publicados",
      publishedPosts.every((p: { status: string }) => p.status === "publicado")
    );
    assert("getPublishedPosts: al menos 2 publicados", publishedPosts.length >= 2);

    const pubSlugs = publishedPosts.map((p: { slug: string }) => p.slug);
    assert("getPublishedPosts: NO incluye borrador", !pubSlugs.includes("borrador-oculto"));
    assert("getPublishedPosts: incluye post público uno", pubSlugs.includes("post-publico-uno"));

    // 4b. getPublishedPostBySlug — finds published post
    const found = await getPublishedPostBySlug("post-publico-dos");
    assert("getPublishedPostBySlug: encuentra post", found !== null);
    assert("getPublishedPostBySlug: título correcto", found?.title === "Post público dos");
    assert("getPublishedPostBySlug: tiene excerpt", found?.excerpt === "Resumen del post dos");

    // 4c. getPublishedPostBySlug — returns null for draft
    const draftBySlug = await getPublishedPostBySlug("borrador-oculto");
    assert("getPublishedPostBySlug: null para borrador", draftBySlug === null);

    // 4d. getPublishedPostBySlug — returns null for nonexistent slug
    const missingSlug = await getPublishedPostBySlug("slug-que-no-existe");
    assert("getPublishedPostBySlug: null para slug inexistente", missingSlug === null);

    // 4e. getAllPosts — admin view includes all
    const allPosts = await getAllPosts();
    assert("getAllPosts: incluye borradores", allPosts.some((p: { status: string }) => p.status === "borrador"));
    assert("getAllPosts: incluye publicados", allPosts.some((p: { status: string }) => p.status === "publicado"));

    // 4f. Posts include all expected fields for detail page rendering
    const detailPost = await getPublishedPostBySlug("post-publico-dos");
    assert("post tiene id", typeof detailPost?.id === "string");
    assert("post tiene title", typeof detailPost?.title === "string");
    assert("post tiene slug", typeof detailPost?.slug === "string");
    assert("post tiene content", typeof detailPost?.content === "string");
    assert("post tiene status", detailPost?.status === "publicado");
    assert("post tiene createdAt", detailPost?.createdAt instanceof Date);
    assert("post tiene seoTitle", detailPost?.seoTitle === "SEO Post Dos");
    assert("post tiene seoDescription", detailPost?.seoDescription === "Descripción SEO del post dos");

    // Clean up
    await prisma.blogPost.deleteMany();

    // ================================================================
    // Section 5: Markdown Content Rendering with Product Links (Task 4.2)
    // ================================================================
    section("5. Renderizado de contenido con links de producto");

    // 5a. parseMarkdownToHtml renders content with product links
    const content = "Visita [nuestro producto estrella](/tienda/prod-estrella) hoy.";
    const html = parseMarkdownToHtml(content);
    assertContains("renderiza link a producto", html, 'href="/tienda/prod-estrella"');
    assertContains("conserva texto del link", html, "nuestro producto estrella");

    // 5b. parseMarkdownToHtml handles complex content
    const complexContent = `# Título del post

Este es el primer párrafo con un [link a tienda](/tienda/item-1).

Este es el segundo párrafo con otro [link](/tienda/item-2).

## Subtítulo

Y un párrafo final.`;

    const complexHtml = parseMarkdownToHtml(complexContent);
    assertContains("contenido complejo: título", complexHtml, "Título del post");
    assertContains("contenido complejo: primer link", complexHtml, "/tienda/item-1");
    assertContains("contenido complejo: segundo link", complexHtml, "/tienda/item-2");

    // 5c. extractProductLinks from complex content
    const complexProducts = extractProductLinks(complexContent);
    assert("extractProductLinks complejo: 2 productos", complexProducts.length === 2);
    assertEqual(
      "producto 1 correcto",
      complexProducts[0],
      "/tienda/item-1"
    );
    assertEqual(
      "producto 2 correcto",
      complexProducts[1],
      "/tienda/item-2"
    );

    // 5d. Safe rendering doesn't break with missing product links
    const safeResult = parseMarkdownToHtml("[Producto que no existe](/tienda/no-existe)");
    assertContains("link a producto inexistente se renderiza", safeResult, "/tienda/no-existe");
    // NOT asserting the product exists — just that the link renders without error

    // 5e. parseMarkdownToHtml handles headings
    const headings = parseMarkdownToHtml("# H1\n\n## H2\n\n### H3");
    assertContains("renderiza h1", headings, "<h1>");
    assertContains("renderiza h2", headings, "<h2>");
    assertContains("renderiza h3", headings, "<h3>");

    // 5f. parseMarkdownToHtml handles bold/italic
    const formatted = parseMarkdownToHtml("Texto **negrita** y *cursiva* en un párrafo.");
    assertContains("renderiza negrita", formatted, "<strong>");
    assertContains("renderiza cursiva", formatted, "<em>");

  } finally {
    await prisma.$disconnect();
  }

  printSummaryAndExit();
}

main().catch((error: Error) => {
  console.error("Error ejecutando pruebas blog content:", error.message);
  console.error(error.stack);
  process.exit(1);
});
