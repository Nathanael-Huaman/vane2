import "dotenv/config";
import assert from "node:assert/strict";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";
import {
	getAdminOrderDetailById,
	getAdminOrderSummaries,
	parseAdminOrderStatus,
	parseAdminOrderFilters,
	updateAdminOrderStatus,
} from "../lib/server/store/admin-orders.js";
import { updateOrderStatusAction } from "../lib/actions/store-admin-orders.js";
import {
	__resetAdminOrdersActionTestDependencies,
	__setAdminOrdersActionTestDependencies,
} from "../lib/actions/store-admin-orders-dependencies.js";

const DOMAIN = "admin-orders-view.test";

type RuntimePrisma = ReturnType<typeof createRuntimePrismaClient>;

function order(customerName: string, email: string, status: "pending" | "confirmed", total: number, token: string) {
	return {
		customerName,
		customerEmail: `${email}@${DOMAIN}`,
		status,
		subtotalMinorUnits: total,
		totalMinorUnits: total,
		confirmationTokenHash: token,
	};
}

async function resetOrders(prisma: RuntimePrisma) {
	await prisma.orderItem.deleteMany({ where: { order: { customerEmail: { contains: DOMAIN } } } });
	await prisma.order.deleteMany({ where: { customerEmail: { contains: DOMAIN } } });
}

async function firstActiveProduct(prisma: RuntimePrisma) {
	const product = await prisma.product.findFirst({ where: { status: "active" }, orderBy: { createdAt: "asc" } });
	assert.ok(product, "Expected at least one active seeded product");
	return product;
}

async function seedOrders(prisma: RuntimePrisma) {
	await prisma.order.createMany({
		data: [
			order("Ana Pending", "ana", "pending", 12500, "admin-orders-view-token-1"),
			order("Bruno Confirmado", "bruno", "confirmed", 9900, "admin-orders-view-token-2"),
			order("Carla Search", "lookup", "pending", 5000, "admin-orders-view-token-3"),
		],
	});

	const product = await firstActiveProduct(prisma);
	const detailOrder = await prisma.order.create({
		data: {
			...order("Detalle Snapshot", "detalle", "pending", product.priceMinorUnits * 2, "admin-orders-view-token-detail"),
			items: {
				create: [{
					productId: product.id,
					productName: product.name,
					productSlug: product.slug,
					unitPriceMinorUnits: product.priceMinorUnits,
					quantity: 2,
					lineTotalMinorUnits: product.priceMinorUnits * 2,
				}],
			},
		},
		include: { items: true },
	});

	return { detailOrder, product };
}

function assertFilter(input: unknown, expected: unknown) {
	assert.deepEqual(parseAdminOrderFilters(input), expected);
}

function testFilterParsing() {
	const longQuery = `  ${"cliente ".repeat(30)}  `;
	assertFilter({ status: "pending", q: " Ana " }, { status: "pending", q: "Ana", invalidStatus: false });
	assertFilter({ status: "confirmed", q: "bruno@example.com" }, { status: "confirmed", q: "bruno@example.com", invalidStatus: false });
	assertFilter({ status: "", q: "" }, { status: null, q: "", invalidStatus: false });
	assert.equal(parseAdminOrderFilters({ q: longQuery }).q.length, 120);
	assertFilter({ status: "paid", q: "Ana" }, { status: null, q: "Ana", invalidStatus: true });
	assertFilter(new URLSearchParams("status=pending&q=lookup"), { status: "pending", q: "lookup", invalidStatus: false });
}

function testStatusParsing() {
	assert.equal(parseAdminOrderStatus("pending"), "pending");
	assert.equal(parseAdminOrderStatus("confirmed"), "confirmed");
	assert.equal(parseAdminOrderStatus(" paid "), null);
	assert.equal(parseAdminOrderStatus(""), null);
	assert.equal(parseAdminOrderStatus(null), null);
}

async function testOrderSummaries(prisma: RuntimePrisma) {
	const all = await getAdminOrderSummaries(parseAdminOrderFilters({}));
	const testOrders = all.filter((summary) => summary.customerEmail.endsWith(DOMAIN));
	assert.equal(testOrders.length, 4);
	for (const summary of testOrders) {
		assert.equal(Object.hasOwn(summary, "confirmationTokenHash"), false);
		assert.match(summary.totalLabel, /^S\/\. \d+\.\d{2}$/);
		assert.match(summary.createdAtLabel, /\d/);
	}

	const pending = await getAdminOrderSummaries(parseAdminOrderFilters({ status: "pending" }));
	const pendingTestOrders = pending.filter((summary) => summary.customerEmail.endsWith(DOMAIN));
	assert.equal(pendingTestOrders.length, 3);
	assert.ok(pendingTestOrders.every((summary) => summary.status === "pending"));
	assert.equal(pendingTestOrders.some((summary) => summary.customerName === "Bruno Confirmado"), false);

	const confirmed = await getAdminOrderSummaries(parseAdminOrderFilters({ status: "confirmed" }));
	assert.deepEqual(
		confirmed.filter((summary) => summary.customerEmail.endsWith(DOMAIN)).map((summary) => summary.customerName),
		["Bruno Confirmado"],
	);
	assert.deepEqual((await getAdminOrderSummaries(parseAdminOrderFilters({ q: "Carla" }))).map((summary) => summary.customerEmail), [`lookup@${DOMAIN}`]);
	assert.deepEqual((await getAdminOrderSummaries(parseAdminOrderFilters({ q: "bruno@" }))).map((summary) => summary.customerName), ["Bruno Confirmado"]);
	assert.deepEqual(await getAdminOrderSummaries(parseAdminOrderFilters({ status: "paid" })), []);
}

async function testOrderDetail(prisma: RuntimePrisma, detailOrderId: string, product: Awaited<ReturnType<typeof firstActiveProduct>>) {
	let detail = await getAdminOrderDetailById(detailOrderId);
	assert.ok(detail);
	assert.equal(detail.id, detailOrderId);
	assert.equal(detail.customerName, "Detalle Snapshot");
	assert.equal(detail.customerEmail, `detalle@${DOMAIN}`);
	assert.equal(detail.status, "pending");
	assert.match(detail.subtotalLabel, /^S\/\. \d+\.\d{2}$/);
	assert.match(detail.totalLabel, /^S\/\. \d+\.\d{2}$/);
	assert.equal(Object.hasOwn(detail, "confirmationTokenHash"), false);
	assert.equal(detail.items.length, 1);
	assert.equal(detail.items[0]?.productId, product.id);
	assert.equal(detail.items[0]?.productName, product.name);
	assert.equal(detail.items[0]?.productSlug, product.slug);
	assert.equal(detail.items[0]?.unitPriceMinorUnits, product.priceMinorUnits);
	assert.equal(detail.items[0]?.unitPriceLabel, `S/. ${Math.trunc(product.priceMinorUnits / 100)}.${String(product.priceMinorUnits % 100).padStart(2, "0")}`);
	assert.equal(detail.items[0]?.quantity, 2);
	assert.equal(detail.items[0]?.lineTotalMinorUnits, product.priceMinorUnits * 2);
	assert.equal(Object.hasOwn(detail.items[0] ?? {}, "product"), false);
	assert.equal(Object.hasOwn(detail.items[0] ?? {}, "confirmationTokenHash"), false);

	assert.equal(await getAdminOrderDetailById(""), null);
	assert.equal(await getAdminOrderDetailById("missing-admin-order-id"), null);

	await prisma.product.update({
		where: { id: product.id },
		data: {
			name: "Producto mutado despues del pedido",
			slug: `mutado-${Date.now()}`,
			priceMinorUnits: product.priceMinorUnits + 777,
			status: "archived",
		},
	});
	detail = await getAdminOrderDetailById(detailOrderId);
	assert.equal(detail?.items[0]?.productName, product.name);
	assert.equal(detail?.items[0]?.productSlug, product.slug);
	assert.equal(detail?.items[0]?.unitPriceMinorUnits, product.priceMinorUnits);
	assert.equal(detail?.items[0]?.lineTotalMinorUnits, product.priceMinorUnits * 2);
}

async function testStatusUpdate(prisma: RuntimePrisma, detailOrderId: string) {
	let updated = await updateAdminOrderStatus(detailOrderId, "confirmed");
	assert.equal(updated.status, "confirmed");
	assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: detailOrderId } })).status, "confirmed");

	updated = await updateAdminOrderStatus(detailOrderId, "pending");
	assert.equal(updated.status, "pending");
	const beforeInvalid = await prisma.order.findUniqueOrThrow({ where: { id: detailOrderId } });
	await assert.rejects(() => updateAdminOrderStatus(detailOrderId, "paid"), /Estado de pedido no valido/);
	await assert.rejects(() => updateAdminOrderStatus("", "confirmed"), /Se requiere el ID del pedido/);
	await assert.rejects(() => updateAdminOrderStatus("missing-admin-order-id", "confirmed"), /Pedido no encontrado/);
	const afterInvalid = await prisma.order.findUniqueOrThrow({ where: { id: detailOrderId } });
	assert.equal(afterInvalid.status, beforeInvalid.status);
	assert.equal(afterInvalid.customerName, beforeInvalid.customerName);
	assert.equal(afterInvalid.totalMinorUnits, beforeInvalid.totalMinorUnits);
}

async function testUnauthorizedStatusAction(prisma: RuntimePrisma, detailOrderId: string) {
	const before = await prisma.order.findUniqueOrThrow({ where: { id: detailOrderId } });
	const formData = new FormData();
	formData.set("id", detailOrderId);
	formData.set("status", "confirmed");
	formData.set("returnTo", `/admin/tienda/pedidos/${detailOrderId}`);
	__setAdminOrdersActionTestDependencies({
		requireAdminAccess: async () => ({ ok: false, error: { message: "No autorizado", status: 401 } }),
		updateAdminOrderStatus: async () => { throw new Error("Should not mutate without auth"); },
	});
	const result = await updateOrderStatusAction(null, formData);
	assert.equal(result.ok, false);
	assert.equal(result.error.status, 401);

	__setAdminOrdersActionTestDependencies({
		requireAdminAccess: async () => ({ ok: true, data: { id: "admin-user" } }),
		resolvePageAuthContext: async () => ({ isAdmin: true, isAdminView: false }),
		updateAdminOrderStatus: async () => { throw new Error("Should not mutate in client view"); },
	});
	const clientViewResult = await updateOrderStatusAction(null, formData);
	assert.equal(clientViewResult.ok, false);
	assert.equal(clientViewResult.error.status, 403);
	__resetAdminOrdersActionTestDependencies();

	const after = await prisma.order.findUniqueOrThrow({ where: { id: detailOrderId } });
	assert.equal(after.status, before.status);
}

async function testAuthorizedStatusAction(prisma: RuntimePrisma, detailOrderId: string) {
	const revalidated: string[] = [];
	const redirects: string[] = [];
	__setAdminOrdersActionTestDependencies({
		requireAdminAccess: async () => ({ ok: true, data: { id: "admin-user" } }),
		resolvePageAuthContext: async () => ({ isAdmin: true, isAdminView: true }),
		revalidatePath: (path: string) => { revalidated.push(path); },
		redirect: (path: string) => { redirects.push(path); throw new Error("NEXT_REDIRECT_TEST"); },
	});

	const listForm = new FormData();
	listForm.set("id", detailOrderId);
	listForm.set("status", "confirmed");
	listForm.set("returnTo", "/admin/tienda/pedidos?status=pending&q=Detalle");
	await assert.rejects(() => updateOrderStatusAction(null, listForm), /NEXT_REDIRECT_TEST/);
	assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: detailOrderId } })).status, "confirmed");
	assert.deepEqual(revalidated, ["/admin/tienda/pedidos", `/admin/tienda/pedidos/${detailOrderId}`]);
	assert.equal(redirects[0], "/admin/tienda/pedidos?status=pending&q=Detalle");

	const detailForm = new FormData();
	detailForm.set("id", detailOrderId);
	detailForm.set("status", "pending");
	detailForm.set("returnTo", "https://evil.example/admin/tienda/pedidos");
	await assert.rejects(() => updateOrderStatusAction(null, detailForm), /NEXT_REDIRECT_TEST/);
	assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: detailOrderId } })).status, "pending");
	assert.equal(redirects[1], `/admin/tienda/pedidos/${detailOrderId}`);

	const directForm = new FormData();
	directForm.set("id", detailOrderId);
	directForm.set("status", "confirmed");
	directForm.set("returnTo", `/admin/tienda/pedidos/${detailOrderId}`);
	await assert.rejects(() => updateOrderStatusAction(directForm), /NEXT_REDIRECT_TEST/);
	assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: detailOrderId } })).status, "confirmed");
	assert.equal(redirects[2], `/admin/tienda/pedidos/${detailOrderId}`);
	__resetAdminOrdersActionTestDependencies();
}

async function main() {
	testFilterParsing();
	testStatusParsing();
	const prisma = createRuntimePrismaClient();
	let mutatedProduct: Awaited<ReturnType<typeof firstActiveProduct>> | null = null;
	try {
		await resetOrders(prisma);
		const { detailOrder, product } = await seedOrders(prisma);
		mutatedProduct = product;
		await testOrderSummaries(prisma);
		await testOrderDetail(prisma, detailOrder.id, product);
		await testStatusUpdate(prisma, detailOrder.id);
		await testUnauthorizedStatusAction(prisma, detailOrder.id);
		await testAuthorizedStatusAction(prisma, detailOrder.id);
	} finally {
		__resetAdminOrdersActionTestDependencies();
		if (mutatedProduct) {
			await prisma.product.update({
				where: { id: mutatedProduct.id },
				data: {
					name: mutatedProduct.name,
					slug: mutatedProduct.slug,
					priceMinorUnits: mutatedProduct.priceMinorUnits,
					status: mutatedProduct.status,
				},
			}).catch(() => undefined);
		}
		await resetOrders(prisma).catch(() => undefined);
		await prisma.$disconnect();
	}
	console.log("Store admin orders view runtime tests passed.");
}

main().catch((error) => {
	console.error("Store admin orders view runtime tests failed:", error);
	process.exit(1);
});
