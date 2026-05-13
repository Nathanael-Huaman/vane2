export { default as prisma } from "../prisma";
export * from "./shared";
export * from "./auth";
export * from "./session";
export {
  getUsuarioByEmail,
  getUsuarioByEmailForAuth,
  getUsuarioById,
  getCurrentUserFromDb,
} from "./user/usuario";
export { registrarUsuario } from "./user/registro";
export * from "./password";

// Blog service (blog-integrado-tienda)
import * as blogPosts from "./blog/blog-posts.js";
import {
  parseMarkdownToHtml,
  extractProductLinks,
  isSafeMarkdown,
} from "./blog/markdown.js";

export { blogPosts, parseMarkdownToHtml as parseMarkdown, extractProductLinks, isSafeMarkdown };
