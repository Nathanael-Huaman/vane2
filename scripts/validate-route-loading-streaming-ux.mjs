#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const legacyHelperPath = "components/store/route-loading-skeletons.jsx";
const packageJson = JSON.parse(readIfExists("package.json") || "{}");
const routeLoadingValidationScriptName = "validate:route-loading-streaming-ux";
const routeLoadingValidationCommand = "node scripts/validate-route-loading-streaming-ux.mjs";

const primitiveHelperModule = {
	label: "shared route loading primitives",
	path: "components/store/route-loading-primitives.jsx",
	importPath: "@/components/store/route-loading-primitives",
	exports: ["LoadingShell", "SkeletonBlock"],
};

const helperModules = [
	primitiveHelperModule,
	{
		label: "store/cart/checkout route loading helpers",
		path: "components/store/route-loading-store-skeletons.jsx",
		importPath: "@/components/store/route-loading-store-skeletons",
		exports: [
			"CatalogLoadingSkeleton",
			"ProductDetailLoadingSkeleton",
			"CartLoadingSkeleton",
			"CheckoutLoadingSkeleton",
		],
		usesPrimitives: true,
	},
	{
		label: "order/customer route loading helpers",
		path: "components/store/route-loading-order-skeletons.jsx",
		importPath: "@/components/store/route-loading-order-skeletons",
		exports: [
			"OrderConfirmationLoadingSkeleton",
			"CustomerOrdersLoadingSkeleton",
			"CustomerOrderDetailLoadingSkeleton",
		],
		usesPrimitives: true,
	},
	{
		label: "admin route loading helpers",
		path: "components/store/route-loading-admin-skeletons.jsx",
		importPath: "@/components/store/route-loading-admin-skeletons",
		exports: [
			"AdminProductListLoadingSkeleton",
			"AdminProductFormLoadingSkeleton",
			"AdminOrderListLoadingSkeleton",
			"AdminOrderDetailLoadingSkeleton",
		],
		usesPrimitives: true,
	},
];

const routeLoadingFiles = [
	{
		path: "app/tienda/loading.js",
		helper: "CatalogLoadingSkeleton",
		importPath: "@/components/store/route-loading-store-skeletons",
	},
	{
		path: "app/tienda/[slug]/loading.js",
		helper: "ProductDetailLoadingSkeleton",
		importPath: "@/components/store/route-loading-store-skeletons",
	},
	{
		path: "app/carrito/loading.js",
		helper: "CartLoadingSkeleton",
		importPath: "@/components/store/route-loading-store-skeletons",
	},
	{
		path: "app/checkout/loading.js",
		helper: "CheckoutLoadingSkeleton",
		importPath: "@/components/store/route-loading-store-skeletons",
	},
	{
		path: "app/pedido/confirmacion/[token]/loading.js",
		helper: "OrderConfirmationLoadingSkeleton",
		importPath: "@/components/store/route-loading-order-skeletons",
	},
	{
		path: "app/perfil/pedidos/loading.js",
		helper: "CustomerOrdersLoadingSkeleton",
		importPath: "@/components/store/route-loading-order-skeletons",
	},
	{
		path: "app/perfil/pedidos/[id]/loading.js",
		helper: "CustomerOrderDetailLoadingSkeleton",
		importPath: "@/components/store/route-loading-order-skeletons",
	},
	{
		path: "app/admin/tienda/loading.js",
		helper: "AdminProductListLoadingSkeleton",
		importPath: "@/components/store/route-loading-admin-skeletons",
	},
	{
		path: "app/admin/tienda/nuevo/loading.js",
		helper: "AdminProductFormLoadingSkeleton",
		importPath: "@/components/store/route-loading-admin-skeletons",
	},
	{
		path: "app/admin/tienda/[id]/loading.js",
		helper: "AdminProductFormLoadingSkeleton",
		importPath: "@/components/store/route-loading-admin-skeletons",
	},
	{
		path: "app/admin/tienda/pedidos/loading.js",
		helper: "AdminOrderListLoadingSkeleton",
		importPath: "@/components/store/route-loading-admin-skeletons",
	},
	{
		path: "app/admin/tienda/pedidos/[id]/loading.js",
		helper: "AdminOrderDetailLoadingSkeleton",
		importPath: "@/components/store/route-loading-admin-skeletons",
	},
];

const forbiddenImportPatterns = [
	{
		label: "server data modules",
		pattern: /from\s+["']@\/lib\/server\b|from\s+["']@\/lib\/server\//,
	},
	{
		label: "server actions",
		pattern: /from\s+["']@\/lib\/actions\b|from\s+["']@\/lib\/actions\//,
	},
	{
		label: "auth modules",
		pattern: /from\s+["']@\/auth["']|from\s+["']@\/lib\/auth\b|from\s+["']@\/lib\/auth\/|from\s+["']@\/lib\/server\/auth\b|from\s+["']@\/lib\/server\/auth\/|from\s+["']next-auth\b/,
	},
	{
		label: "request headers or cookies",
		pattern: /from\s+["']next\/headers["']/,
	},
	{
		label: "navigation side effects",
		pattern: /from\s+["']next\/navigation["']/,
	},
];

const checks = [];

function fullPath(path) {
	return join(rootDir, path);
}

function exists(path) {
	return existsSync(fullPath(path));
}

function readIfExists(path) {
	return exists(path) ? readFileSync(fullPath(path), "utf8") : "";
}

function check(label, predicate) {
	let ok = false;

	try {
		ok = Boolean(predicate());
	} catch {
		ok = false;
	}

	checks.push({ label, ok });
	console.log(`${ok ? "✓" : "✗"} ${label}`);
}

function omitsClientDirective(source) {
	return !/^\s*["']use client["'];?/m.test(source);
}

function omitsForbiddenImports(source) {
	return forbiddenImportPatterns.every(({ pattern }) => !pattern.test(source));
}

function escapesRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function importsFromModule(source, importName, importPath) {
	return new RegExp(
		`import\\s+\\{\\s*${importName}\\s*\\}\\s+from\\s+["']${escapesRegex(importPath)}["'];?`,
	).test(source);
}

function routeUsesHelper(source, helper, importPath) {
	return (
		importsFromModule(source, helper, importPath) &&
		new RegExp(`<${helper}\\s*/>`).test(source)
	);
}

console.log("\nRoute loading streaming UX — static validation");

console.log("\nPackage scripts");
check("package exposes route loading validator script", () =>
	packageJson.scripts?.[routeLoadingValidationScriptName] === routeLoadingValidationCommand,
);
check("full validation includes route loading validator", () =>
	packageJson.scripts?.["test:validation"]?.includes(routeLoadingValidationScriptName),
);

console.log("\nHelper modules");

check("legacy route loading skeleton monolith is removed", () => !exists(legacyHelperPath));

for (const helperModule of helperModules) {
	const source = readIfExists(helperModule.path);
	check(`${helperModule.label} exists`, () => exists(helperModule.path));
	check(`${helperModule.label} stays a Server Component`, () => source && omitsClientDirective(source));
	check(`${helperModule.label} omits data, auth, action, and navigation imports`, () => source && omitsForbiddenImports(source));
	check(`${helperModule.label} exports expected helpers`, () =>
		helperModule.exports.every((name) =>
			new RegExp(`export\\s+function\\s+${name}\\s*\\(`).test(source),
		),
	);

	if (helperModule.usesPrimitives) {
		check(`${helperModule.label} imports shared primitives`, () =>
			source.includes(`from "${primitiveHelperModule.importPath}"`) ||
			source.includes(`from '${primitiveHelperModule.importPath}'`),
		);
	}
}

const primitiveSource = readIfExists(primitiveHelperModule.path);

check("shared primitives expose an accessible loading status", () =>
	/role="status"/.test(primitiveSource) && /aria-busy="true"/.test(primitiveSource) && /aria-live="polite"/.test(primitiveSource),
);
check("shared primitives hide decorative skeleton blocks", () => /aria-hidden="true"/.test(primitiveSource));

console.log("\nRoute loading files");

for (const route of routeLoadingFiles) {
	const source = readIfExists(route.path);
	check(`${route.path} exists`, () => exists(route.path));
	check(`${route.path} exports parameterless Loading component`, () => /export\s+default\s+function\s+Loading\s*\(\s*\)/.test(source));
	check(`${route.path} uses ${route.helper} from ${route.importPath}`, () =>
		routeUsesHelper(source, route.helper, route.importPath),
	);
	check(`${route.path} stays a Server Component`, () => source && omitsClientDirective(source));
	check(`${route.path} omits data, auth, action, and navigation imports`, () => source && omitsForbiddenImports(source));
}

const failed = checks.filter((check) => !check.ok);
console.log(`\nResults: ${checks.length - failed.length} passed, ${failed.length} failed`);

if (failed.length > 0) {
	process.exitCode = 1;
}
