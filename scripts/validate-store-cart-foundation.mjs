#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const checks = [];

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

function read(filePath) {
	return fs.readFileSync(path.resolve(filePath), "utf8");
}

function readIfExists(filePath) {
	return exists(filePath) ? read(filePath) : "";
}

function exists(filePath) {
	return fs.existsSync(path.resolve(filePath));
}

const schema = read("prisma/schema.prisma");
const packageJson = JSON.parse(read("package.json"));

console.log("\n1. Prisma cart schema");
check("Cart model exists", () => /model\s+Cart\s*{/.test(schema));
check("CartItem model exists", () => /model\s+CartItem\s*{/.test(schema));
check("Cart has anonymousToken unique field", () => /anonymousToken\s+String\?\s+@unique/.test(schema));
check("Cart maps to store_carts", () => /@@map\("store_carts"\)/.test(schema));
check("CartItem maps to store_cart_items", () => /@@map\("store_cart_items"\)/.test(schema));
check("CartItem enforces one line per product", () => /@@unique\(\[cartId,\s*productId\]\)/.test(schema));
check("Usuario has carts relation", () => /model\s+Usuario\s*{[\s\S]*\bcarts\s+Cart\[\]/.test(schema));
check("Product has cartItems relation", () => /model\s+Product\s*{[\s\S]*\bcartItems\s+CartItem\[\]/.test(schema));

console.log("\n2. Backend files");
check("cart service exists", () => exists("lib/server/store/cart.js"));
check("cart validation exists", () => exists("lib/server/store/cart-validation.js"));
check("cart server actions exist", () => exists("lib/actions/store-cart.js"));
check("runtime cart tests exist", () => exists("scripts/test-store-cart-foundation.ts"));

console.log("\n3. Scripts");
check("package exposes validate:store-cart-foundation", () => packageJson.scripts?.["validate:store-cart-foundation"] === "node scripts/validate-store-cart-foundation.mjs");
check("package exposes test:store-cart-foundation", () => packageJson.scripts?.["test:store-cart-foundation"] === "pnpm seed:store && tsx scripts/test-store-cart-foundation.ts");

if (exists("lib/actions/store-cart.js")) {
	const actions = read("lib/actions/store-cart.js");
	const authSession = read("lib/server/auth/auth-session.js");
	console.log("\n4. Server action contracts");
	check("uses store_cart_token cookie name", () => actions.includes("store_cart_token"));
	check("imports async cookies helper", () => actions.includes('from "next/headers"') && actions.includes("cookies"));
	check("auth-session exposes quiet optional auth helper", () => /export\s+async\s+function\s+getOptionalAuthenticatedSession/.test(authSession));
	check("auth-session exposes quiet optional persisted session helper", () => /export\s+async\s+function\s+getOptionalPersistedSession/.test(authSession));
	check("cart actions use quiet optional auth helper", () => actions.includes("getOptionalAuthenticatedSession") && !actions.includes("getAuthenticatedSession"));
	check("revalidates /carrito", () => actions.includes('revalidatePath("/carrito")'));
	check("exports addToCartAction", () => /export\s+async\s+function\s+addToCartAction/.test(actions));
	check("exports updateCartItemAction", () => /export\s+async\s+function\s+updateCartItemAction/.test(actions));
	check("exports removeCartItemAction", () => /export\s+async\s+function\s+removeCartItemAction/.test(actions));
	check("exports clearCartAction", () => /export\s+async\s+function\s+clearCartAction/.test(actions));
}

const detailPage = readIfExists("app/tienda/[slug]/page.js");
const addForm = readIfExists("app/tienda/[slug]/add-to-cart-form.js");
const cartPage = readIfExists("app/carrito/page.js");
const cartForms = readIfExists("app/carrito/cart-action-forms.js");
const e2eSpec = readIfExists("e2e/store-cart-foundation.spec.ts");
const viewModeRoute = readIfExists("app/api/session/view-mode/route.js");

console.log("\n5. PR B public cart UI");
check("product detail add-to-cart form exists", () => exists("app/tienda/[slug]/add-to-cart-form.js"));
check("add-to-cart form uses action state and addToCartAction", () => addForm.includes("useActionState") && addForm.includes("addToCartAction"));
check("add-to-cart form posts productId and quantity", () => addForm.includes('name="productId"') && addForm.includes('name="quantity"'));
check("product detail renders add-to-cart form", () => detailPage.includes("AddToCartForm") && detailPage.includes("stockQuantity"));
check("product detail renders out-of-stock cart messaging", () => detailPage.includes("Producto sin stock para carrito"));
check("cart page route exists", () => exists("app/carrito/page.js"));
check("cart page reads current cart summary", () => cartPage.includes("getCurrentCartSummary"));
check("cart page resolves async cookies without mutating cart", () => cartPage.includes('from "next/headers"') && cartPage.includes("cookies"));
check("cart page uses quiet optional auth helper", () => cartPage.includes("getOptionalAuthenticatedSession") && !cartPage.includes("getAuthenticatedSession"));
check("storefront view-mode probe uses quiet optional persisted session", () => viewModeRoute.includes("getOptionalPersistedSession") && !viewModeRoute.includes("getCurrentPersistedSession"));
check("cart page renders empty state and store link", () => cartPage.includes("Tu carrito está vacío") && cartPage.includes('href="/tienda"'));
check("cart page renders subtotal", () => cartPage.includes("subtotalLabel") && cartPage.includes("Subtotal"));
check("cart mutation forms exist", () => exists("app/carrito/cart-action-forms.js"));
check("cart mutation forms wire update/remove/clear actions", () => cartForms.includes("updateCartItemAction") && cartForms.includes("removeCartItemAction") && cartForms.includes("clearCartAction"));
check("cart mutation forms expose quantity max", () => cartForms.includes("max={item.stockQuantity}"));
check("cart E2E spec exists", () => exists("e2e/store-cart-foundation.spec.ts"));
check("cart E2E covers add/update/remove/out-of-stock", () => e2eSpec.includes("adds an in-stock product") && e2eSpec.includes("updates quantity") && e2eSpec.includes("removes the item") && e2eSpec.includes("out-of-stock"));

const failed = checks.filter((item) => !item.ok);
console.log(`\nResults: ${checks.length - failed.length} passed, ${failed.length} failed`);

if (failed.length > 0) {
	process.exitCode = 1;
}
