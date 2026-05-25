#!/usr/bin/env node
import fs from "node:fs";

function readIfExists(path) {
	return fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const helper = readIfExists("lib/server/store/admin-orders.js");
const listUrlHelper = readIfExists("lib/server/store/admin-order-list-url.js");
const paginationHelper = readIfExists("lib/server/store/order-pagination.js");
const action = readIfExists("lib/actions/store-admin-orders.js");
const actionDeps = readIfExists("lib/actions/store-admin-orders-dependencies.js");
const listPage = readIfExists("app/admin/tienda/pedidos/page.js");
const detailPage = readIfExists("app/admin/tienda/pedidos/[id]/page.js");
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

function namesInForms(source) {
	return [...source.matchAll(/name="([^"]+)"/g)].map((match) => match[1]);
}

function getFilterFormNames(source) {
	const match = source.match(/<form\s+method="GET"[\s\S]*?<\/form>/);
	return match ? namesInForms(match[0]) : [];
}

function omitsForbiddenTokenMaterial(source) {
	return !/(confirmationTokenHash|getOrderByConfirmationToken|store_cart_token|\/pedido\/confirmacion)/.test(source);
}

function containsInOrder(source, before, after) {
	const beforeIndex = source.indexOf(before);
	const afterIndex = source.indexOf(after);
	return beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex;
}

function defaultFunctionSlice(source, functionName) {
	const marker = `export default async function ${functionName}`;
	const start = source.indexOf(marker);
	return start >= 0 ? source.slice(start) : "";
}

function exportedFunctionSlice(source, functionName) {
	const marker = `export async function ${functionName}`;
	const start = source.indexOf(marker);
	if (start < 0) return "";
	const nextExport = source.indexOf("\nexport ", start + marker.length);
	return nextExport >= 0 ? source.slice(start, nextExport) : source.slice(start);
}

function defaultFunctionContainsInOrder(source, functionName, before, after) {
	const body = defaultFunctionSlice(source, functionName);
	const beforeIndex = body.indexOf(before);
	const afterIndex = body.indexOf(after);
	return beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex;
}

console.log("\nStore admin orders view — PR A list and filters");
check("package exposes admin orders validator", () => pkg.scripts?.["validate:store-admin-orders-view"] === "node scripts/validate-store-admin-orders-view.mjs");
check("package exposes admin orders runtime test", () => pkg.scripts?.["test:store-admin-orders-view"] === "pnpm seed:store && tsx scripts/test-store-admin-orders-view.ts");
check("full validation includes admin orders validator", () => pkg.scripts?.["test:validation"]?.includes("validate:store-admin-orders-view"));
check("full runtime includes admin orders runtime test", () => pkg.scripts?.["test:runtime"]?.includes("test:store-admin-orders-view"));
check("admin orders helper exports PR A functions", () => /export\s+function\s+parseAdminOrderFilters\s*\(/.test(helper) && /export\s+async\s+function\s+getAdminOrderSummaries\s*\(/.test(helper));
check("admin order list URL helper exports sanitized builder", () => /export\s+function\s+buildAdminOrderListPath\s*\(/.test(listUrlHelper) && /filters\.status/.test(listUrlHelper) && /filters\.q/.test(listUrlHelper) && /parseOrderListPage/.test(listUrlHelper) && !/Not implemented/.test(listUrlHelper));
check("order pagination helper exports fixed parser and page result helpers", () => /export\s+const\s+ORDER_LIST_PAGE_SIZE\s*=\s*10/.test(paginationHelper) && /export\s+function\s+parseOrderListPage\s*\(/.test(paginationHelper) && /export\s+function\s+getOrderListQueryWindow\s*\(/.test(paginationHelper) && /export\s+function\s+toOrderListPageResult\s*\(/.test(paginationHelper) && !/Not implemented/.test(paginationHelper));
check("list route exists at app/admin/tienda/pedidos/page.js", () => fs.existsSync("app/admin/tienda/pedidos/page.js"));
check("list page enforces server-side admin gate", () => /resolvePageAuthContext/.test(listPage) && /isAuthenticated/.test(listPage) && /isAdmin/.test(listPage) && /isAdminView/.test(listPage) && defaultFunctionContainsInOrder(listPage, "AdminStoreOrdersPage", "resolvePageAuthContext", "getAdminOrderSummaries") && defaultFunctionContainsInOrder(listPage, "AdminStoreOrdersPage", "!isAdmin || !isAdminView", "getAdminOrderSummaries"));
check("list page awaits searchParams", () => /await\s+searchParams/.test(listPage));
check("list page uses parsed status and q filters", () => /parseAdminOrderFilters/.test(listPage) && /name="status"/.test(listPage) && /name="q"/.test(listPage));
check("list page parses sanitized page and passes it to admin summaries", () => /parseOrderListPage/.test(listPage) && /const\s+page\s*=\s*parseOrderListPage\(resolvedSearchParams\)/.test(listPage) && /getAdminOrderSummaries\(filters,\s*\{\s*page\s*\}\)/.test(listPage));
check("list page exposes only status and q filter fields", () => {
	const names = getFilterFormNames(listPage);
	return names.length > 0 && names.every((name) => ["status", "q"].includes(name));
});
check("list page renders invalid status filter state", () => /invalidStatus/.test(listPage) && /filtro de estado no es valido|filtro de estado no es válido/i.test(listPage));
check("helper uses explicit safe list order select", () => ["id", "customerName", "customerEmail", "status", "subtotalMinorUnits", "totalMinorUnits", "createdAt", "updatedAt"].every((field) => new RegExp(`${field}\\s*:\\s*true`).test(helper)));
check("helper applies bounded skip/take after approved filters", () => {
	const summaryHelper = exportedFunctionSlice(helper, "getAdminOrderSummaries");
	return /getOrderListQueryWindow/.test(summaryHelper) && /where/.test(summaryHelper) && /skip\s*,[\s\S]*take\s*,/.test(summaryHelper) && /toOrderListPageResult/.test(summaryHelper) && /orderBy\s*:\s*\[\s*\{\s*createdAt\s*:\s*"desc"\s*\}\s*,\s*\{\s*id\s*:\s*"asc"\s*\}\s*\]/.test(summaryHelper);
});
check("helper returns paginated empty result for invalid status without querying", () => {
	const summaryHelper = exportedFunctionSlice(helper, "getAdminOrderSummaries");
	return /if\s*\(filters\.invalidStatus\)\s*return\s+toOrderListPageResult\(\[\],\s*page\)/.test(summaryHelper) && containsInOrder(summaryHelper, "filters.invalidStatus", "prisma.order.findMany");
});
check("helper and list page omit private token material", () => omitsForbiddenTokenMaterial(`${helper}\n${listPage}`));
check("list UI omits date/sort fields while rendering pagination controls", () => !/name="(date|from|to|page|sort)"/i.test(listPage) && /pagination\.hasPrevious/.test(listPage) && /pagination\.hasNext/.test(listPage) && /Anterior/.test(listPage) && /Siguiente/.test(listPage));
check("pagination and status return navigation use sanitized filters and current page", () => /buildAdminOrderListPath/.test(listPage) && /const\s+returnTo\s*=\s*buildAdminOrderListPath\(filters,\s*pagination\.page\)/.test(listPage) && /buildAdminOrderListPath\(filters,\s*previousPage\)/.test(listPage) && /buildAdminOrderListPath\(filters,\s*nextPage\)/.test(listPage) && !/toReturnPath\(resolvedSearchParams/.test(listPage) && !/appendAdminOrderFilterQuery/.test(listPage));
check("list UI omits exports, bulk actions, and order-content editing", () => !/(exportar|csv|bulk|lote|editar pedido|editar cliente|editar total|editar stock)/i.test(listPage));
check("list UI omits payment, shipping, invoice, and fulfillment controls", () => !/(pago|payment|env[ií]o|shipping|factura|invoice|fulfillment|despacho)/i.test(listPage));

console.log("\nStore admin orders view — PR B detail and snapshots");
check("admin orders helper exports detail lookup", () => /export\s+async\s+function\s+getAdminOrderDetailById\s*\(/.test(helper));
check("detail route exists at app/admin/tienda/pedidos/[id]/page.js", () => fs.existsSync("app/admin/tienda/pedidos/[id]/page.js"));
check("detail page awaits params", () => /await\s+params/.test(detailPage));
check("detail page enforces server-side admin gate before data access", () => /resolvePageAuthContext/.test(detailPage) && /isAuthenticated/.test(detailPage) && /isAdmin/.test(detailPage) && /isAdminView/.test(detailPage) && defaultFunctionContainsInOrder(detailPage, "AdminStoreOrderDetailPage", "resolvePageAuthContext", "getAdminOrderDetailById") && defaultFunctionContainsInOrder(detailPage, "AdminStoreOrderDetailPage", "!isAdmin || !isAdminView", "getAdminOrderDetailById"));
check("detail page uses notFound for missing orders", () => /import\s+\{\s*notFound\s*\}\s+from\s+"next\/navigation"/.test(detailPage) && /notFound\s*\(\s*\)/.test(detailPage));
check("detail page renders persisted customer, totals, and item snapshots", () => /customerName/.test(detailPage) && /customerEmail/.test(detailPage) && /subtotalLabel/.test(detailPage) && /totalLabel/.test(detailPage) && /items\.map/.test(detailPage) && /productName/.test(detailPage) && /productSlug/.test(detailPage) && /unitPriceLabel/.test(detailPage) && /lineTotalLabel/.test(detailPage));
check("detail helper uses explicit safe item snapshot select", () => ["productId", "productName", "productSlug", "unitPriceMinorUnits", "quantity", "lineTotalMinorUnits"].every((field) => new RegExp(`${field}\\s*:\\s*true`).test(helper)) && !/product\s*:\s*\{\s*select|include\s*:\s*\{\s*product/.test(helper));
check("detail route links back to admin orders list", () => /href="\/admin\/tienda\/pedidos"/.test(detailPage));
check("detail UI omits out-of-scope mutation controls", () => !/(editar pedido|editar cliente|editar total|editar stock|name="customerName"|name="customerEmail"|name="quantity"|name="price")/i.test(detailPage));
check("detail helper and page omit private token material", () => omitsForbiddenTokenMaterial(`${helper}\n${detailPage}`));
check("detail UI omits payment, shipping, invoice, fulfillment, exports, and editing", () => !/(pago|payment|env[ií]o|shipping|factura|invoice|fulfillment|despacho|exportar|csv|editar pedido|editar cliente|editar total|editar stock)/i.test(detailPage));

console.log("\nStore admin orders view — PR C status mutation");
check("status action module exists and starts with use server", () => /^"use server";/.test(action));
check("status action exports updateOrderStatusAction", () => /export\s+async\s+function\s+updateOrderStatusAction\s*\(/.test(action));
check("status action supports direct form action invocation", () => /updateOrderStatusAction\s*\(\s*prevStateOrFormData\s*,\s*maybeFormData\s*\)/.test(action) && /maybeFormData\s*\?\?\s*prevStateOrFormData/.test(action));
check("status action enforces admin access before update", () => /requireAdminAccess/.test(actionDeps) && /resolvePageAuthContext/.test(actionDeps) && /enforceStoreAdminAccess/.test(action) && containsInOrder(action, "requireStoreOrderAdminAccess", "updateAdminOrderStatus"));
check("status action revalidates list and detail paths", () => /revalidatePath/.test(actionDeps) && /revalidatePath\(\s*"\/admin\/tienda\/pedidos"\s*\)/.test(action) && /revalidatePath\(\s*`\/admin\/tienda\/pedidos\/\$\{id\}`\s*\)/.test(action));
check("status action redirects outside caught mutation block", () => /redirect/.test(actionDeps) && /redirect\(redirectTo\)/.test(action) && containsInOrder(action, "catch", "redirect(redirectTo)"));
check("status action sanitizes returnTo to admin order paths", () => /sanitizeOrderReturnTo/.test(action) && !/new URL\(.*returnTo/.test(action));
check("admin orders helper exports status parse and update", () => /export\s+function\s+parseAdminOrderStatus\s*\(/.test(helper) && /export\s+async\s+function\s+updateAdminOrderStatus\s*\(/.test(helper));
check("status update helper only writes Order.status", () => {
	const updateSlice = exportedFunctionSlice(helper, "updateAdminOrderStatus");
	const dataMatch = updateSlice.match(/data\s*:\s*\{([\s\S]*?)\}/);
	return /order\.update/.test(updateSlice) && dataMatch && /^\s*status\s*:\s*nextStatus,?\s*$/.test(dataMatch[1]);
});
check("list page renders inline status forms", () => /updateOrderStatusAction/.test(listPage) && /<form\s+action=\{updateOrderStatusAction\}/.test(listPage) && /name="id"/.test(listPage) && /name="status"/.test(listPage) && /name="returnTo"/.test(listPage));
check("detail page renders inline status form", () => /updateOrderStatusAction/.test(detailPage) && /<form\s+action=\{updateOrderStatusAction\}/.test(detailPage) && /name="id"/.test(detailPage) && /name="status"/.test(detailPage) && /name="returnTo"/.test(detailPage));
check("status controls only expose pending and confirmed", () => !/value="(paid|cancelled|shipped|delivered|refunded|draft|archived)"/.test(`${listPage}\n${detailPage}`));
check("status action and pages omit private token material", () => omitsForbiddenTokenMaterial(`${action}\n${actionDeps}\n${listPage}\n${detailPage}`));

const failed = checks.filter((check) => !check.ok);
console.log(`\nResults: ${checks.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) process.exitCode = 1;
