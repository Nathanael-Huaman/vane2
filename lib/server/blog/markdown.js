/**
 * Renderizador seguro de Markdown mínimo para posts del blog.
 *
 * Contratos:
 *   - parseMarkdownToHtml(content) → string HTML seguro
 *   - isSafeMarkdown(content) → boolean
 *   - extractProductLinks(content) → string[] (URLs de /tienda)
 *   - sanitizeHtml(html) → string (sin tags peligrosos)
 *
 * Allowlist de Markdown:
 *   - Párrafos (doble newline)
 *   - Encabezados h1-h3
 *   - Negrita (**text**) y cursiva (*text*)
 *   - Links [text](url)
 *   - NO HTML crudo (se strippea)
 *   - NO javascript: en URLs
 */

// Not exported — used internally by sanitizeHtml
const ALLOWED_TAGS = new Set([
  "p", "h1", "h2", "h3",
  "strong", "em", "b", "i",
  "a", "br",
]);

const BLOCKED_TAGS = /<\/?(script|iframe|object|embed|form|input|button|select|textarea|style|link|meta|applet|frame|frameset|ilayer|layer|bgsound|title|base|head|body|html)[^>]*>/gi;

const DANGEROUS_HTML_PATTERN = /<(script|iframe|object|embed|form|input|button|select|textarea)/i;

/**
 * Sanitiza HTML eliminando tags peligrosos.
 * Solo permite tags de la allowlist: p, h1-h3, strong, em, a, br.
 *
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";

  // Remove blocked tags and their content
  let cleaned = html.replace(BLOCKED_TAGS, "");

  // Remove any remaining < or > that aren't part of allowed tags
  // but preserve allowed tags and their closing counterparts
  const allowedPattern = /<\/?(p|h[1-3]|strong|em|b|i|a|br)(\s[^>]*)?>/gi;

  // Extract allowed tags
  const allowedParts = [];
  let lastIndex = 0;
  let match;

  // Reset lastIndex since we used gi flags above
  const re = new RegExp(allowedPattern.source, "gi");
  while ((match = re.exec(cleaned)) !== null) {
    // Add text between matches (strip any raw HTML brackets)
    const textBetween = cleaned.slice(lastIndex, match.index)
      .replace(/<[^>]*>/g, "") // strip any remaining HTML tags
      .replace(/>/g, "&gt;")
      .replace(/</g, "&lt;");
    allowedParts.push(textBetween);
    allowedParts.push(match[0]);
    lastIndex = re.lastIndex;
  }

  // Add trailing text
  const tail = cleaned.slice(lastIndex)
    .replace(/<[^>]*>/g, "")
    .replace(/>/g, "&gt;")
    .replace(/</g, "&lt;");
  allowedParts.push(tail);

  let result = allowedParts.join("");

  // Remove javascript: from href attributes
  result = result.replace(/href=["']javascript:[^"']*["']/gi, 'href="#"');

  return result;
}

/**
 * Verifica si el contenido markdown es seguro (no contiene HTML peligroso).
 *
 * @param {string} markdown
 * @returns {boolean}
 */
export function isSafeMarkdown(markdown) {
  if (!markdown || typeof markdown !== "string") return true;
  return !DANGEROUS_HTML_PATTERN.test(markdown);
}

/**
 * Extrae todas las URLs de productos (/tienda/...) de un contenido markdown.
 *
 * @param {string} markdown
 * @returns {string[]} Lista de URLs de tienda encontradas
 */
export function extractProductLinks(markdown) {
  if (!markdown || typeof markdown !== "string") return [];

  const productLinks = [];
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(markdown)) !== null) {
    const url = match[2].trim();
    if (url.startsWith("/tienda")) {
      productLinks.push(url);
    }
  }

  return productLinks;
}

/**
 * Convierte contenido Markdown mínimo a HTML seguro.
 *
 * Allowlist:
 *   - Párrafos (separados por doble newline)
 *   - Encabezados h1-h3
 *   - Negrita **text** y cursiva *text*
 *   - Links [text](url)
 *   - NO HTML crudo, NO javascript: URLs
 *
 * @param {string} markdown
 * @returns {string} HTML seguro
 */
export function parseMarkdownToHtml(markdown) {
  if (!markdown || typeof markdown !== "string") return "";

  // Step 1: Escapar cualquier HTML crudo
  let text = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Step 2: Procesar bloques (párrafos y headings)
  const lines = text.split("\n");
  const blocks = [];
  let currentParagraph = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Heading detection (# ## ###)
    if (/^#{1,3}\s/.test(line)) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        blocks.push({ type: "paragraph", content: currentParagraph.join(" ") });
        currentParagraph = [];
      }
      const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
      if (headingMatch) {
        blocks.push({
          type: "heading",
          level: headingMatch[1].length,
          content: headingMatch[2],
        });
      }
    } else if (line === "") {
      // Empty line: flush current paragraph
      if (currentParagraph.length > 0) {
        blocks.push({ type: "paragraph", content: currentParagraph.join(" ") });
        currentParagraph = [];
      }
    } else {
      currentParagraph.push(line);
    }
  }

  // Flush remaining paragraph
  if (currentParagraph.length > 0) {
    blocks.push({ type: "paragraph", content: currentParagraph.join(" ") });
  }

  // Step 3: Convert blocks to HTML with inline formatting
  const html = blocks.map((block) => {
    let content = block.content;

    // Inline formatting: links [text](url)
    content = content.replace(
      /\[([^\]]*)\]\(([^)]+)\)/g,
      (_match, linkText, url) => {
        // Strip javascript: URLs
        const trimmedUrl = url.trim();
        if (/^javascript:/i.test(trimmedUrl)) {
          return linkText;
        }
        const safeUrl = trimmedUrl
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return `<a href="${safeUrl}">${linkText}</a>`;
      }
    );

    // Bold and italic
    content = content.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    content = content.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    if (block.type === "heading") {
      return `<h${block.level}>${content}</h${block.level}>`;
    }

    return `<p>${content}</p>`;
  });

  return html.join("\n");
}
