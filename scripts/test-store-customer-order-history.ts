import "dotenv/config";
import assert from "node:assert/strict";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";
import { addCartItem } from "../lib/server/store/cart.js";
import * as orderHelpers from "../lib/server/store/orders.js";

const DOMAIN = "customer-order-history.test";

type RuntimePrisma = ReturnType<typeof createRuntimePrismaClient>;

const helpers = orderHelpers as typeof orderHelpers & {
	getCustomerOrderSummaries?: (userId: string) => Promise<Record<string, unknown>[]>;
	getCustomerOrderDetailById?: (userId: string, orderId: string) => Promise<Record<string, unknown> | null>;
};

function requiredHelper<T extends keyof typeof helpers>(name: T) {
	assert.equal(typeof helpers[name], "function", `orders.js must export ${String(name)}`);
	return helpers[name] as NonNullable<(typeof helpers)[T]>;
}

function soles(minorUnits: number) {
	return `S/. ${Math.trunc(minorUnits / 100)}.${String(minorUnits % 100).padStart(2, "0")}`;
}

function assertNoTokenMaterial(value: Record<string, unknown>) {
	for (const key of ["confirmationTokenHash", "confirmationToken", "anonymousToken"]) {
		assert.equal(Object.hasOwn(value, key), false, `${key} must not be exposed`);
	}
}

function order(id: string, userId: string | null, status: "pending" | "confirmed", total: number, createdAt: string) {
	return {
		id,
		userId,
		customerName: id,
		customerEmail: `${id}@${DOMAIN}`,
		status,
		subtotalMinorUnits: total,
		totalMinorUnits: total,
		confirmationTokenHash: `${id}-token-hash`,
		createdAt: new Date(createdAt),
	};
}

async function resetCustomerHistoryData(prisma: RuntimePrisma) {
	await prisma.orderItem.deleteMany({ where: { order: { customerEmail: { contains: DOMAIN } } } });
	await prisma.order.deleteMany({ where: { customerEmail: { contains: DOMAIN } } });
	await prisma.cartItem.deleteMany({ where: { cart: { user: { email: { contains: DOMAIN } } } } });
	await prisma.cart.deleteMany({ where: { user: { email: { contains: DOMAIN } } } });
	await prisma.usuario.deleteMany({ where: { email: { contains: DOMAIN } } });
}

async function main() {
	const prisma = createRuntimePrismaClient();
	let product = null;
	try {
		await resetCustomerHistoryData(prisma);
		const [owner, other, empty] = await Promise.all(
			["owner", "other", "empty"].map((name) =>
				prisma.usuario.create({
					data: { email: `${name}@${DOMAIN}`, name, emailVerificado: true },
				}),
			),
		);
		product = await prisma.product.findFirst({ where: { status: "active" }, orderBy: { createdAt: "asc" } });
		assert.ok(product, "Expected at least one active seeded product");

		await prisma.order.createMany({
			data: [
				order("coh-owner-older", owner.id, "pending", 12000, "2026-02-01T10:00:00.000Z"),
				order("coh-owner-alpha", owner.id, "confirmed", 2500, "2026-02-02T10:00:00.000Z"),
				order("coh-owner-beta", owner.id, "pending", 9900, "2026-02-02T10:00:00.000Z"),
				order("coh-owner-newer", owner.id, "confirmed", 5000, "2026-02-03T10:00:00.000Z"),
				order("coh-other-newer", other.id, "confirmed", 3333, "2026-02-04T10:00:00.000Z"),
				order("coh-guest-newer", null, "pending", 4444, "2026-02-05T10:00:00.000Z"),
			],
		});
		const detailOrder = await prisma.order.create({
			data: {
				...order("coh-owner-detail", owner.id, "pending", product.priceMinorUnits * 2, "2026-02-01T12:00:00.000Z"),
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
		});

		const getSummaries = requiredHelper("getCustomerOrderSummaries");
		const summaries = (await getSummaries(owner.id)).filter((summary) => String(summary.id).startsWith("coh-"));
		assert.deepEqual(summaries.map((summary) => summary.id), [
			"coh-owner-newer",
			"coh-owner-alpha",
			"coh-owner-beta",
			"coh-owner-detail",
			"coh-owner-older",
		]);
		assert.equal(summaries.some((summary) => String(summary.id).includes("other") || String(summary.id).includes("guest")), false);
		assert.equal(summaries[0]?.statusLabel, "Confirmado");
		assert.equal(summaries[0]?.totalLabel, "S/. 50.00");
		assert.equal(summaries[0]?.detailPath, "/perfil/pedidos/coh-owner-newer");
		assert.match(String(summaries[0]?.createdAtLabel), /\d/);
		for (const summary of summaries) assertNoTokenMaterial(summary);
		assert.deepEqual(await getSummaries(empty.id), []);
		assert.deepEqual(await getSummaries("   "), []);

		const getDetail = requiredHelper("getCustomerOrderDetailById");
		await addCartItem({ userId: owner.id }, { productId: product.id, quantity: 1 });
		const created = await orderHelpers.createOrderFromCart(
			{ userId: owner.id },
			{ customerName: "Cliente Con Sesion", customerEmail: `SIGNED-IN@${DOMAIN}` },
		);
		const stored = await prisma.order.findUniqueOrThrow({
			where: { id: created.orderId },
			select: { userId: true, confirmationTokenHash: true },
		});
		assert.equal(stored.userId, owner.id);
		assert.notEqual(stored.confirmationTokenHash, created.confirmationToken);
		const checkoutDetail = await getDetail(owner.id, created.orderId);
		assert.ok(checkoutDetail);
		assert.equal(checkoutDetail.customerEmail, `signed-in@${DOMAIN}`);
		assert.equal((checkoutDetail.items as Record<string, unknown>[])[0]?.productName, product.name);
		assertNoTokenMaterial(checkoutDetail);
		assert.equal(await getDetail(other.id, created.orderId), null);

		let detail = await getDetail(owner.id, detailOrder.id);
		assert.ok(detail);
		const items = detail.items as Record<string, unknown>[];
		assert.equal(detail.customerEmail, `coh-owner-detail@${DOMAIN}`);
		assert.equal(detail.statusLabel, "Pendiente");
		assert.equal(detail.subtotalLabel, soles(product.priceMinorUnits * 2));
		assert.equal(detail.totalLabel, detail.subtotalLabel);
		assert.equal(detail.detailPath, `/perfil/pedidos/${detailOrder.id}`);
		assert.equal(items.length, 1);
		assert.equal(items[0]?.productId, product.id);
		assert.equal(items[0]?.productName, product.name);
		assert.equal(items[0]?.productSlug, product.slug);
		assert.equal(items[0]?.unitPriceMinorUnits, product.priceMinorUnits);
		assert.equal(items[0]?.unitPriceLabel, soles(product.priceMinorUnits));
		assert.equal(items[0]?.quantity, 2);
		assert.equal(items[0]?.lineTotalMinorUnits, product.priceMinorUnits * 2);
		assertNoTokenMaterial(detail);
		assertNoTokenMaterial(items[0] ?? {});

		await prisma.product.update({
			where: { id: product.id },
			data: { name: "Producto mutado para historial", slug: `historial-mutado-${Date.now()}`, priceMinorUnits: product.priceMinorUnits + 999 },
		});
		detail = await getDetail(owner.id, detailOrder.id);
		const stableItems = detail?.items as Record<string, unknown>[];
		assert.equal(stableItems[0]?.productName, product.name);
		assert.equal(stableItems[0]?.productSlug, product.slug);
		assert.equal(stableItems[0]?.unitPriceMinorUnits, product.priceMinorUnits);
		assert.equal(await getDetail(other.id, detailOrder.id), null);
		assert.equal(await getDetail(owner.id, "coh-other-newer"), null);
		assert.equal(await getDetail(owner.id, ""), null);
		assert.equal(await getDetail("", detailOrder.id), null);
		assert.equal(await getDetail(owner.id, "checkout-success-cart"), null);
	} finally {
		if (product) {
			await prisma.product.update({
				where: { id: product.id },
				data: {
					name: product.name,
					slug: product.slug,
					priceMinorUnits: product.priceMinorUnits,
					stockQuantity: product.stockQuantity,
					status: product.status,
				},
			}).catch(() => undefined);
		}
		await resetCustomerHistoryData(prisma).catch(() => undefined);
		await prisma.$disconnect();
	}

	console.log("Store customer order history runtime tests passed.");
}

main().catch((error) => {
	console.error("Store customer order history runtime tests failed:", error);
	process.exit(1);
});
