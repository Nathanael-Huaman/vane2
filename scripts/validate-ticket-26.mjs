/**
 * Validacion de contratos del Ticket 26 - Navegacion Condicional por Rol y Estado de Sesion
 *
 * Ejecutar: node scripts/validate-ticket-26.mjs
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

const requiredFiles = [
  "components/navbar.jsx",
  "components/auth-buttons.jsx",
  "components/user-menu.jsx",
  "components/ui/dropdown-menu.jsx",
  "hooks/use-view-mode.js",
  "app/api/session/view-mode/route.js",
];
for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

section("2. Componente AuthButtons");

const authButtonsContent = readFileSync(join(rootDir, "components/auth-buttons.jsx"), "utf-8");

assert("auth-buttons.jsx es client component", authButtonsContent.includes('"use client"'));
assert("auth-buttons.jsx tiene boton Iniciar sesion", authButtonsContent.includes("Iniciar sesion"));
assert("auth-buttons.jsx tiene boton Registrarse", authButtonsContent.includes("Registrarse"));
assert("auth-buttons.jsx enlaza a /login", authButtonsContent.includes('href="/login"'));
assert("auth-buttons.jsx enlaza a /registro", authButtonsContent.includes('href="/registro"'));

section("3. Componente UserMenu");

const userMenuContent = readFileSync(join(rootDir, "components/user-menu.jsx"), "utf-8");

assert("user-menu.jsx es client component", userMenuContent.includes('"use client"'));
assert("user-menu.jsx usa useAuth hook", userMenuContent.includes("useAuth"));
assert("user-menu.jsx usa signOut de next-auth", userMenuContent.includes("signOut"));
assert("user-menu.jsx usa DropdownMenu", userMenuContent.includes("DropdownMenu"));
assert("user-menu.jsx tiene opcion Mi cuenta", userMenuContent.includes("Mi cuenta"));
assert("user-menu.jsx tiene opcion Cerrar sesion", userMenuContent.includes("Cerrar sesion"));
assert("user-menu.jsx maneja cambio de vista", userMenuContent.includes("VIEW_MODE_ADMINISTRADOR"));
assert("user-menu.jsx muestra skeleton cuando loading", userMenuContent.includes("Skeleton"));
assert("user-menu.jsx usa setCurrentViewMode", userMenuContent.includes("setCurrentViewMode"));

section("4. Componente DropdownMenu");

const dropdownMenuContent = readFileSync(join(rootDir, "components/ui/dropdown-menu.jsx"), "utf-8");

assert("dropdown-menu.jsx usa radix-ui", dropdownMenuContent.includes("@radix-ui/react-dropdown-menu"));
assert("dropdownMenu exports principales", dropdownMenuContent.includes("export {"));
assert("DropdownMenu exportado", dropdownMenuContent.includes("DropdownMenu"));
assert("DropdownMenuTrigger exportado", dropdownMenuContent.includes("DropdownMenuTrigger"));
assert("DropdownMenuContent exportado", dropdownMenuContent.includes("DropdownMenuContent"));
assert("DropdownMenuItem exportado", dropdownMenuContent.includes("DropdownMenuItem"));

section("5. Hook useViewMode");

const useViewModeContent = readFileSync(join(rootDir, "hooks/use-view-mode.js"), "utf-8");

assert("use-view-mode.js es client component", useViewModeContent.includes('"use client"'));
assert("use-view-mode.js tiene estado viewMode", useViewModeContent.includes("useState"));
assert("use-view-mode.js usa useEffect", useViewModeContent.includes("useEffect"));
assert("use-view-mode.js consume API", useViewModeContent.includes("/api/session/view-mode"));

section("6. API route view-mode");

const apiRouteContent = readFileSync(join(rootDir, "app/api/session/view-mode/route.js"), "utf-8");

assert(
  "API route usa sesion autenticada",
  apiRouteContent.includes("auth()") ||
    apiRouteContent.includes("getCurrentPersistedSession")
);
assert("API route retorna viewMode", apiRouteContent.includes("viewMode"));
assert("API route usa NextResponse", apiRouteContent.includes("NextResponse"));

section("7. Navbar integrado con navegacion condicional");

const navbarContent = readFileSync(join(rootDir, "components/navbar.jsx"), "utf-8");

assert("navbar.jsx usa useAuth", navbarContent.includes("useAuth"));
assert("navbar.jsx usa useViewMode", navbarContent.includes("useViewMode"));
assert("navbar.jsx usa AuthButtons", navbarContent.includes("AuthButtons"));
assert("navbar.jsx usa UserMenu", navbarContent.includes("UserMenu"));
assert("navbar.jsx tiene link Panel Admin", navbarContent.includes("Panel Admin"));
assert("navbar.jsx tiene adminNavLinks", navbarContent.includes("adminNavLinks"));
assert("navbar.jsx determina isAdminView", navbarContent.includes("isAdminView"));
assert("navbar.jsx muestra skeleton durante carga", navbarContent.includes("Skeleton"));
assert("navbar.jsx renderiza AuthButtons para no autenticados", navbarContent.includes("user ?"));
assert("navbar.jsx usa LinkLayoutDashboard para admin", navbarContent.includes("LayoutDashboard"));

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 26 validado (navegacion condicional por rol implementada).\x1b[0m");
