#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const checks = [];

function check(label, predicate) {
	const ok = Boolean(predicate());
	checks.push({ label, ok });
	console.log(`${ok ? "✓" : "✗"} ${label}`);
}

function read(filePath) {
	return fs.readFileSync(path.resolve(filePath), "utf8");
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
	console.log("\n4. Server action contracts");
	check("uses store_cart_token cookie name", () => actions.includes("store_cart_token"));
	check("imports async cookies helper", () => actions.includes('from "next/headers"') && actions.includes("cookies"));
	check("revalidates /carrito", () => actions.includes('revalidatePath("/carrito")'));
	check("exports addToCartAction", () => /export\s+async\s+function\s+addToCartAction/.test(actions));
	check("exports updateCartItemAction", () => /export\s+async\s+function\s+updateCartItemAction/.test(actions));
	check("exports removeCartItemAction", () => /export\s+async\s+function\s+removeCartItemAction/.test(actions));
	check("exports clearCartAction", () => /export\s+async\s+function\s+clearCartAction/.test(actions));
}

const failed = checks.filter((item) => !item.ok);
console.log(`\nResults: ${checks.length - failed.length} passed, ${failed.length} failed`);

if (failed.length > 0) {
	process.exitCode = 1;
}
