#!/usr/bin/env node
import fs from "node:fs";

function readIfExists(path) {
	return fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const helper = readIfExists("lib/server/store/orders.js");
const paginationHelper = readIfExists("lib/server/store/order-pagination.js");
const listPage = readIfExists("app/perfil/pedidos/page.js");
const detailPage = readIfExists("app/perfil/pedidos/[id]/page.js");
const userMenu = readIfExists("components/user-menu.jsx");
const profilePage = readIfExists("app/perfil/page.js");
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

function exportedFunctionSlice(source, functionName) {
	const marker = `export async function ${functionName}`;
	const start = source.indexOf(marker);
	if (start < 0) return "";
	const nextExport = source.indexOf("\nexport ", start + marker.length);
	return nextExport >= 0 ? source.slice(start, nextExport) : source.slice(start);
}

function omitsTokenMaterial(source) {
	return !/(confirmationTokenHash|confirmationToken|anonymousToken|store_cart_token|getOrderByConfirmationToken)/.test(source);
}

function containsInOrder(source, before, after) {
	const beforeIndex = source.indexOf(before);
	const afterIndex = source.indexOf(after);
	return beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex;
}

const summaryHelper = exportedFunctionSlice(helper, "getCustomerOrderSummaries");
const detailHelper = exportedFunctionSlice(helper, "getCustomerOrderDetailById");
const listPageExists = fs.existsSync("app/perfil/pedidos/page.js");
const detailPageExists = fs.existsSync("app/perfil/pedidos/[id]/page.js");

console.log("\nStore customer order history — PR 1 server helper contracts");
check("package exposes customer-history validator", () => pkg.scripts?.["validate:store-customer-order-history"] === "node scripts/validate-store-customer-order-history.mjs");
check("package exposes customer-history runtime test", () => pkg.scripts?.["test:store-customer-order-history"] === "pnpm seed:store && tsx scripts/test-store-customer-order-history.ts");
check("full validation includes customer-history validator", () => pkg.scripts?.["test:validation"]?.includes("validate:store-customer-order-history"));
check("full runtime includes customer-history runtime test", () => pkg.scripts?.["test:runtime"]?.includes("test:store-customer-order-history"));
check("orders helper exports customer summary and detail lookups", () => /export\s+async\s+function\s+getCustomerOrderSummaries\s*\(/.test(helper) && /export\s+async\s+function\s+getCustomerOrderDetailById\s*\(/.test(helper));
check("order pagination helper exports fixed parser and page result helpers", () => /export\s+const\s+ORDER_LIST_PAGE_SIZE\s*=\s*10/.test(paginationHelper) && /export\s+function\s+parseOrderListPage\s*\(/.test(paginationHelper) && /export\s+function\s+getOrderListQueryWindow\s*\(/.test(paginationHelper) && /export\s+function\s+toOrderListPageResult\s*\(/.test(paginationHelper) && !/Not implemented/.test(paginationHelper));
check("summary helper rejects blank user ids with a paginated empty list", () => /if\s*\([^)]*!customerUserId[^)]*\)\s*return\s+toOrderListPageResult\(\[\],\s*page\)/.test(summaryHelper));
check("summary helper scopes query by Order.userId", () => /findMany\s*\([\s\S]*where\s*:\s*\{\s*userId\s*:\s*customerUserId\s*\}/.test(summaryHelper));
check("summary helper orders newest first with stable id tie-breaker", () => /orderBy\s*:\s*\[\s*\{\s*createdAt\s*:\s*"desc"\s*\}\s*,\s*\{\s*id\s*:\s*"asc"\s*\}\s*\]/.test(summaryHelper));
check("summary helper applies bounded skip/take after ownership scope", () => /getOrderListQueryWindow/.test(summaryHelper) && /where\s*:\s*\{\s*userId\s*:\s*customerUserId\s*\}/.test(summaryHelper) && /skip\s*,[\s\S]*take\s*,/.test(summaryHelper) && /toOrderListPageResult/.test(summaryHelper));
check("summary helper maps S/. totals and customer detail paths", () => /formatSolesPrice\(order\.totalMinorUnits\)/.test(helper) && /`\/perfil\/pedidos\/\$\{order\.id\}`/.test(helper));
check("detail helper rejects blank user or order ids with null", () => /if\s*\([^)]*!customerUserId[\s\S]*!customerOrderId[^)]*\)\s*return\s+null/.test(detailHelper));
check("detail helper enforces ownership in the query boundary", () => /findFirst\s*\([\s\S]*where\s*:\s*\{\s*id\s*:\s*customerOrderId\s*,\s*userId\s*:\s*customerUserId\s*\}/.test(detailHelper));
check("detail helper uses explicit safe item snapshot select", () => ["productId", "productName", "productSlug", "unitPriceMinorUnits", "quantity", "lineTotalMinorUnits"].every((field) => new RegExp(`${field}\\s*:\\s*true`).test(detailHelper)) && !/product\s*:\s*\{\s*select|include\s*:\s*\{\s*product/.test(detailHelper));
check("customer helper slices omit private token material", () => omitsTokenMaterial(`${summaryHelper}\n${detailHelper}`));

console.log("\nStore customer order history — PR 2 list route and navigation contracts");
check("list route exists at app/perfil/pedidos/page.js", () => listPageExists);
check("list route enforces auth before customer order access", () => /resolvePageAuthContext/.test(listPage) && containsInOrder(listPage, "await resolvePageAuthContext", "await getCustomerOrderSummaries"));
check("list route handles auth errors and unauthenticated users before loading orders", () => containsInOrder(listPage, "if (hasAuthError)", "await getCustomerOrderSummaries") && containsInOrder(listPage, "if (!isAuthenticated)", "await getCustomerOrderSummaries"));
check("list route awaits searchParams and passes sanitized page", () => /CustomerOrdersPage\(\{\s*searchParams\s*\}\)/.test(listPage) && /await\s+searchParams/.test(listPage) && /const\s+page\s*=\s*parseOrderListPage\(resolvedSearchParams\)/.test(listPage) && /getCustomerOrderSummaries\(user\.id,\s*\{\s*page\s*\}\)/.test(listPage));
check("list route renders owned order summaries and empty-history state", () => /orders\.map\(\s*\(?order/.test(listPage) && /order\.statusLabel/.test(listPage) && /order\.totalLabel/.test(listPage) && /No hay pedidos/.test(listPage));
check("list route renders bounded previous and next pagination links", () => /pagination\.hasPrevious/.test(listPage) && /pagination\.hasNext/.test(listPage) && /query\.set\("page"/.test(listPage) && /Anterior/.test(listPage) && /Siguiente/.test(listPage));
check("list route links each order summary to its detail route", () => /href=\{order\.detailPath\}/.test(listPage) && /Ver detalle/.test(listPage));
check("user menu exposes Mis pedidos navigation", () => /href="\/perfil\/pedidos"/.test(userMenu) && /Mis pedidos/.test(userMenu));
check("profile page exposes Mis pedidos entry point", () => /href="\/perfil\/pedidos"/.test(profilePage) && /Mis pedidos/.test(profilePage));
check("list route and navigation omit private token material", () => omitsTokenMaterial(`${listPage}\n${userMenu}\n${profilePage}`));

console.log("\nStore customer order history — PR 3 detail route contracts");
check("detail route exists at app/perfil/pedidos/[id]/page.js", () => detailPageExists);
check("detail route enforces auth before customer order access", () => /resolvePageAuthContext/.test(detailPage) && containsInOrder(detailPage, "await resolvePageAuthContext", "await getCustomerOrderDetailById"));
check("detail route handles auth errors and unauthenticated users before loading orders", () => containsInOrder(detailPage, "if (hasAuthError)", "await getCustomerOrderDetailById") && containsInOrder(detailPage, "if (!isAuthenticated)", "await getCustomerOrderDetailById"));
check("detail route awaits params and passes route id with user id", () => /const\s*\{\s*id\s*\}\s*=\s*await\s+params/.test(detailPage) && /getCustomerOrderDetailById\(user\.id,\s*id\)/.test(detailPage));
check("detail route uses notFound for missing or non-owned orders", () => /if\s*\([^)]*!order[^)]*\)\s*notFound\(\)/.test(detailPage));
check("detail route renders snapshot customer, status, totals, and items", () => /order\.customerName/.test(detailPage) && /order\.customerEmail/.test(detailPage) && /order\.statusLabel/.test(detailPage) && /order\.subtotalLabel/.test(detailPage) && /order\.totalLabel/.test(detailPage) && /order\.items\.map\(\s*\(?item/.test(detailPage) && /item\.productName/.test(detailPage) && /item\.quantity/.test(detailPage) && /item\.unitPriceLabel/.test(detailPage) && /item\.lineTotalLabel/.test(detailPage));
check("detail route omits private token material", () => omitsTokenMaterial(detailPage));

const failed = checks.filter((check) => !check.ok);
console.log(`\nResults: ${checks.length - failed.length} passed, ${failed.length} failed`);
if (failed.length) process.exitCode = 1;
