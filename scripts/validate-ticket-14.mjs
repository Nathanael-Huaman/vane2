/**
 * Validacion de contratos del Ticket 14 — Cambio de vista admin
 *
 * Ejecutar: node scripts/validate-ticket-14.mjs
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
  "components/admin-view-mode-switcher.jsx",
  "lib/actions/view-mode.js",
  "lib/server/view-mode.js",
  "app/tienda/page.js",
  "app/perfil/page.js",
  "prisma/schema.prisma",
];

for (const file of requiredFiles) {
  assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const switcher = readFileSync(
  join(rootDir, "components/admin-view-mode-switcher.jsx"),
  "utf-8"
);
const action = readFileSync(join(rootDir, "lib/actions/view-mode.js"), "utf-8");
const serverViewMode = readFileSync(
  join(rootDir, "lib/server/view-mode.js"),
  "utf-8"
);
const tiendaPage = readFileSync(join(rootDir, "app/tienda/page.js"), "utf-8");
const perfilPage = readFileSync(join(rootDir, "app/perfil/page.js"), "utf-8");
const prismaSchema = readFileSync(join(rootDir, "prisma/schema.prisma"), "utf-8");

section("2. Persistencia por sesion actual");

assert("schema agrega enum ViewMode", prismaSchema.includes("enum ViewMode"));
assert("schema agrega viewMode en Sesion", prismaSchema.includes("viewMode     ViewMode?"));
assert(
  "action actualiza viewMode de la sesion actual",
  action.includes("updateSessionViewMode(")
);
assert(
  "action exige permisos admin reales",
  action.includes("const accessResult = await requireAdminAccess()")
);

section("3. Resolucion de vista efectiva");

assert(
  "resolveSessionViewMode existe",
  serverViewMode.includes("export async function resolveSessionViewMode")
);
assert(
  "clientes quedan en vista cliente",
  serverViewMode.includes("viewMode: VIEW_MODE_CLIENTE")
);
assert(
  "admin sin valor persistido vuelve a vista administrador",
  serverViewMode.includes("viewMode: VIEW_MODE_ADMINISTRADOR")
);

section("4. Selector visible solo para admins");

assert(
  "tienda renderiza selector de vista admin",
  tiendaPage.includes("<AdminViewModeSwitcher currentViewMode={sessionView.viewMode} />")
);
assert(
  "perfil renderiza selector de vista admin",
  perfilPage.includes("<AdminViewModeSwitcher currentViewMode={sessionView.viewMode} />")
);
assert(
  "switcher permite vista cliente",
  switcher.includes("Vista cliente")
);
assert(
  "switcher permite vista administrador",
  switcher.includes("Vista administrador")
);

section("5. Cambio temporal sin perder permisos reales");

assert(
  "tienda calcula experiencia admin por viewMode",
  tiendaPage.includes("const isAdminView = isAdmin && sessionView.viewMode === VIEW_MODE_ADMINISTRADOR")
);
assert(
  "perfil calcula experiencia cliente por viewMode",
  perfilPage.includes("const isClientView = !isAdmin || sessionView.viewMode === VIEW_MODE_CLIENTE")
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
  console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32mTicket 14 validado (selector de vista y persistencia por sesion).\x1b[0m");
