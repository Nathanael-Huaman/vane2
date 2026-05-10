/**
 * Validacion de contratos del Ticket 27 - Navbar Responsive y Menu Movil
 *
 * Ejecutar: node scripts/validate-ticket-27.mjs
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

section("1. Estructura de archivos");

const navbarContent = readFileSync(join(rootDir, "components/navbar.jsx"), "utf-8");

assert("navbar.jsx existe", existsSync(join(rootDir, "components/navbar.jsx")));

section("2. Menu hamburguesa en movil");

assert("usa breakpoint md:hidden", navbarContent.includes("md:hidden"));
assert("tiene boton hamburguesa", navbarContent.includes("hamburger-button"));
assert("iconos Menu y X", navbarContent.includes("Menu") && navbarContent.includes("X"));
assert("toggle isOpen", navbarContent.includes("setIsOpen(!isOpen)"));

section("3. Atributos de accesibilidad");

assert("aria-expanded en boton", navbarContent.includes("aria-expanded"));
assert("aria-controls en boton", navbarContent.includes("aria-controls"));
assert("aria-label descriptivo", navbarContent.includes("Cerrar menu") && navbarContent.includes("Abrir menu"));
assert("aria-hidden en iconos", navbarContent.includes('aria-hidden="true"'));
assert("role en header", navbarContent.includes('role="banner"'));
assert("aria-label en nav", navbarContent.includes('aria-label="Navegacion principal"'));
assert("aria-hidden en menu movil", navbarContent.includes("aria-hidden={!isOpen}"));

section("4. Cierre del menu con Escape");

assert("listener keydown para Escape", navbarContent.includes("key === \"Escape\""));
assert("useEffect para Escape", navbarContent.includes("handleKeyDown"));

section("5. Cierre del menu con clic externo");

assert("listener mousedown", navbarContent.includes("handleClickOutside"));
assert("verifica click fuera del menu", navbarContent.includes("!nav.contains"));

section("6. Cierre del menu al navegar");

assert("useEffect para pathname", navbarContent.includes("pathname"));
assert("cierra menu al cambiar ruta", navbarContent.includes("setIsOpen(false)"));

section("7. Animacion y transiciones");

assert("transition en menu", navbarContent.includes("transition-all"));
assert("duration-200 para animacion suave", navbarContent.includes("duration-200"));
assert("max-h para animacion", navbarContent.includes("max-h"));

section("8. Overlay para mejor UX");

assert("overlay semi-transparente", navbarContent.includes("bg-black/50"));
assert("overlay cierra menu", navbarContent.includes("onClick={() => setIsOpen(false)}"));

section("9. Contenido del menu movil");

assert("muestra links en movil", navbarContent.includes("renderNavLinks(navLinks, true)"));
assert("muestra botones auth en movil", navbarContent.includes("hidden md:block"));
assert("cierra menu al hacer clic en link", navbarContent.includes("isMobile && setIsOpen"));

section("10. Bloqueo de scroll cuando menu abierto");

assert("body overflow hidden cuando abierto", navbarContent.includes('document.body.style.overflow = "hidden"'));
assert("body overflow reset cuando cerrado", navbarContent.includes('document.body.style.overflow = ""'));

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 27 validado (navbar responsive para movil implementado).\x1b[0m");
