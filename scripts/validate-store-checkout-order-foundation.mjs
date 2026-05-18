#!/usr/bin/env node
import fs from "node:fs";

function readIfExists(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
}

const schema = readIfExists("prisma/schema.prisma");
const migration = readIfExists("prisma/migrations/20260518020000_add_store_orders/migration.sql");
const checkoutAction = readIfExists("lib/actions/store-checkout.js");
const checkoutPage = readIfExists("app/checkout/page.js");
const checkoutForm = readIfExists("app/checkout/checkout-form.js") || checkoutPage;
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
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

function model(name) {
  const match = schema.match(new RegExp(`model\\s+${name}\\s*{[\\s\\S]*?\\n}`));
  return match?.[0] ?? "";
}

const usuario = model("Usuario");
const product = model("Product");
const order = model("Order");
const item = model("OrderItem");

console.log("\nStore checkout order foundation schema");
check("package exposes schema validator", () => pkg.scripts?.["validate:store-checkout-order-foundation"] === "node scripts/validate-store-checkout-order-foundation.mjs");
check("OrderStatus enum has pending and confirmed only", () => /enum\s+OrderStatus\s*{\s*pending\s+confirmed\s*}/.test(schema));
check("Usuario has orders relation", () => /\borders\s+Order\[\]/.test(usuario));
check("Product has orderItems relation", () => /\borderItems\s+OrderItem\[\]/.test(product));
check("Order model maps to store_orders", () => /@@map\("store_orders"\)/.test(order));
check("Order stores required contact fields", () => /customerName\s+String/.test(order) && /customerEmail\s+String/.test(order));
check("Order stores integer totals and pending default", () => /subtotalMinorUnits\s+Int/.test(order) && /totalMinorUnits\s+Int/.test(order) && /status\s+OrderStatus\s+@default\(pending\)/.test(order));
check("Order stores unique confirmationTokenHash", () => /confirmationTokenHash\s+String\s+@unique/.test(order));
check("Order links optional user with SetNull", () => /userId\s+String\?/.test(order) && /@relation\(fields:\s*\[userId\],\s*references:\s*\[id\],\s*onDelete:\s*SetNull\)/.test(order));
check("OrderItem model maps to store_order_items", () => /@@map\("store_order_items"\)/.test(item));
check("OrderItem stores immutable product snapshots", () => ["productName", "productSlug", "unitPriceMinorUnits", "quantity", "lineTotalMinorUnits"].every((field) => new RegExp(`\\b${field}\\b`).test(item)));
check("OrderItem cascades from order and restricts product delete", () => /order\s+Order\s+@relation\(fields:\s*\[orderId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/.test(item) && /product\s+Product\s+@relation\(fields:\s*\[productId\],\s*references:\s*\[id\],\s*onDelete:\s*Restrict\)/.test(item));
check("migration creates order tables", () => /CREATE TABLE "store_orders"/.test(migration) && /CREATE TABLE "store_order_items"/.test(migration));
check("migration creates token and relation indexes", () => /store_orders_confirmationTokenHash_key/.test(migration) && /store_orders_userId_createdAt_idx/.test(migration) && /store_order_items_productId_idx/.test(migration));

console.log("\nStore checkout action and page");
check("checkout action module uses Server Action conventions", () => /^"use server";/.test(checkoutAction) && /export\s+async\s+function\s+checkoutAction\s*\(/.test(checkoutAction));
check("checkout action module does not export test-only dependency hooks", () => !/export\s+(async\s+)?function\s+__\w*CheckoutActionTestDependencies/.test(checkoutAction));
check("checkout action resolves existing cart cookie and session context", () => /store_cart_token/.test(checkoutAction) && /cookies\s*\(/.test(checkoutAction) && /getOptionalAuthenticatedSession/.test(checkoutAction));
check("checkout action creates orders and handles domain failures", () => /createOrderFromCart/.test(checkoutAction) && /isOrderDomainError/.test(checkoutAction) && /errorResponse\([^\n]*400/.test(checkoutAction));
check("checkout action revalidates cart and checkout before redirect", () => /revalidatePath\("\/carrito"\)/.test(checkoutAction) && /revalidatePath\("\/checkout"\)/.test(checkoutAction) && /redirect\(redirectTo\)/.test(checkoutAction));
check("checkout page reads current cart with existing context", () => /cookies\s*\(/.test(checkoutPage) && /getOptionalAuthenticatedSession/.test(checkoutPage) && /getCurrentCartSummary/.test(checkoutPage));
check("checkout page renders empty cart guidance and subtotal", () => /Tu carrito está vacío|Tu carrito esta vacío|carrito está vacío/.test(checkoutPage) && /subtotalLabel/.test(checkoutPage));
check("checkout form requires only customer name and email", () => /name="customerName"/.test(checkoutForm) && /name="customerEmail"/.test(checkoutForm) && /required/.test(checkoutForm));
check("checkout form omits phone, shipping, tax, and payment fields", () => !/name="(phone|telefono|teléfono|shipping|address|direccion|dirección|tax|ruc|dni|payment|card|tarjeta)"/i.test(checkoutForm));

const failed = checks.filter((check) => !check.ok);
console.log(`\nResults: ${checks.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) process.exitCode = 1;
