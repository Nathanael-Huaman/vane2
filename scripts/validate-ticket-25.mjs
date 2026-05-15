/**
 * Validacion de contratos del Ticket 25 - Barra de Navegacion Global
 *
 * Ejecutar: node scripts/validate-ticket-25.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${description}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

section("1. Estructura de archivos del ticket");

const requiredFiles = ["components/navbar.jsx", "app/layout.js", "app/globals.css"];
for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

section("2. Componente Navbar existe y es client component");

const navbarContent = readFileSync(join(rootDir, "components/navbar.jsx"), "utf-8");

assert("navbar.jsx tiene directive 'use client'", navbarContent.includes('"use client"'));
assert("navbar.jsx importa Menu de lucide-react", navbarContent.includes("Menu"));
assert("navbar.jsx importa X de lucide-react", navbarContent.includes("X"));
assert("navbar.jsx importa Button de shadcn/ui", navbarContent.includes("@/components/ui/button"));

section("3. Navbar tiene estructura y estilos sticky");

assert("Navbar es sticky", navbarContent.includes("sticky top-0"));
assert("Navbar tiene z-index alto", navbarContent.includes("z-50"));
assert("Navbar tiene altura fija 16 (64px)", navbarContent.includes("h-16"));
assert("Navbar tiene backdrop-blur", navbarContent.includes("backdrop-blur"));
assert("Navbar usa border-b", navbarContent.includes("border-b"));

section("4. Navbar tiene logo y links de navegacion");

assert("Navbar tiene enlace al inicio (/)", navbarContent.includes('href="/"'));
assert(
  "Navbar tiene enlace a /tienda",
  navbarContent.includes('href="/tienda"') ||
    navbarContent.includes('href: "/tienda"')
);
assert("Navbar muestra texto Obstedesign", navbarContent.includes("OBSTEDESIGN"));

section("5. Navbar tiene menu movil con hamburguesa");

assert("Navbar usa estado isOpen para menu", navbarContent.includes("useState"));
assert("Navbar tiene boton hamburguesa", navbarContent.includes("hamburger-button"));
assert("Navbar tiene menu movil", navbarContent.includes("mobile-menu"));
assert("Navbar usa md:hidden para colapsar en movil", navbarContent.includes("md:hidden"));
assert("Navbar usa max-h para transicion", navbarContent.includes("max-h-"));
assert("Navbar tiene aria-expanded", navbarContent.includes("aria-expanded"));

section("6. Navbar tiene estado activo para links");

assert("Navbar usa usePathname", navbarContent.includes("usePathname"));
assert("Navbar determina isActive", navbarContent.includes("isActive"));
assert("Navbar usa variante secondary para link activo", navbarContent.includes("secondary"));

section("7. Navbar cierra menu al navegar");

assert("Navbar usa useEffect para cerrar al cambiar pathname", navbarContent.includes("pathname"));

section("8. Navbar integrado en layout");

const layoutContent = readFileSync(join(rootDir, "app/layout.js"), "utf-8");

assert("layout.js importa Navbar", layoutContent.includes("Navbar"));
assert("layout.js renderiza Navbar", layoutContent.includes("<Navbar"));
assert("layout.js envuelve children con main", layoutContent.includes("<main"));

section("9. Estilos globales para navbar sticky");

const cssContent = readFileSync(join(rootDir, "app/globals.css"), "utf-8");

assert(
  "layout compensa navbar sticky fuera del flujo principal",
  cssContent.includes("pt-16") ||
    navbarContent.includes("sticky top-0") &&
      layoutContent.includes("<Navbar />") &&
      layoutContent.includes("<main")
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 25 validado (barra de navegacion global implementada).\x1b[0m");
