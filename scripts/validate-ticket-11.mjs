/**
 * Validacion de contratos del Ticket 11 — Redireccionamiento y entrada a la tienda
 *
 * Ejecutar: node scripts/validate-ticket-11.mjs
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
	"app/page.js",
	"app/login/page.js",
	"app/tienda/page.js",
	"app/tienda/[slug]/page.js",
	"lib/auth/auth-client.js",
];
for (const file of requiredFiles) {
	assert(`archivo existe: ${file}`, existsSync(join(rootDir, file)));
}

const loginPage = readFileSync(join(rootDir, "app/page.js"), "utf-8");
const tiendaPage = readFileSync(join(rootDir, "app/tienda/page.js"), "utf-8");
const authClient = readFileSync(
	join(rootDir, "lib/auth/auth-client.js"),
	"utf-8",
);

section("2. Redireccionamiento post-login");

assert(
	"login redirige a /tienda al detectar sesion activa",
	loginPage.includes('router.replace("/tienda")'),
);
assert(
	"Google login define callback por defecto a /tienda",
	authClient.includes("DEFAULT_POST_LOGIN_URL") &&
		authClient.includes(
			"callbackUrl: options.callbackUrl || DEFAULT_POST_LOGIN_URL",
		),
);

section("3. Entrada compartida a la tienda");

assert(
	"la vista de tienda existe y renderiza encabezado principal",
	tiendaPage.includes("Tienda Obstedesign"),
);
assert(
	"la vista usa servicio publico del catalogo",
	tiendaPage.includes("getPublicCatalogProducts"),
);
assert(
	"si no hay sesion, no exige iniciar sesion",
	!tiendaPage.includes("Sesion no iniciada"),
);
assert(
	"la tienda no ofrece CTA de compra en este slice",
	!tiendaPage.includes("Agregar al carrito"),
);

section("4. Contrato de detalle y control admin");

const detailPagePath = join(rootDir, "app/tienda/[slug]/page.js");
const tiendaDetailPage = existsSync(detailPagePath)
	? readFileSync(detailPagePath, "utf-8")
	: "";
assert(
	"detalle usa servicio publico por slug",
	tiendaDetailPage.includes("getPublicProductBySlug"),
);
assert(
	"detalle usa notFound para productos no publicos",
	tiendaDetailPage.includes("notFound("),
);
assert(
	"la tienda no muestra bloque admin legacy",
	!tiendaPage.includes("Opciones extra de administrador"),
);
assert(
	"la tienda no muestra bloque cliente legacy",
	!tiendaPage.includes("Experiencia cliente activa"),
);

console.log(`\n${"=".repeat(50)}`);
console.log(`Resultados: ${passed} pasaron, ${failed} fallaron`);

if (failed > 0) {
	console.log("\n\x1b[31mALGUNAS PRUEBAS FALLARON\x1b[0m");
	process.exit(1);
}

console.log(
	"\n\x1b[32mTicket 11 validado (post-login y entrada a tienda listos).\x1b[0m",
);
