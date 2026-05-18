import "dotenv/config";
import assert from "node:assert/strict";
import {
	__resetCheckoutActionTestDependencies,
	__setCheckoutActionTestDependencies,
} from "../lib/actions/store-checkout-dependencies.js";
import { checkoutAction } from "../lib/actions/store-checkout.js";
import { buildOrderConfirmationViewModel } from "../app/pedido/confirmacion/[token]/confirmation-view-model.js";
import { addCartItem } from "../lib/server/store/cart.js";
import {
	createOrderFromCart,
	getOrderByConfirmationToken,
} from "../lib/server/store/orders.js";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

async function getProductBySlug(
	prisma: ReturnType<typeof createRuntimePrismaClient>,
	slug: string,
) {
	const product = await prisma.product.findUnique({ where: { slug } });
	assert.ok(product, `Expected seeded product ${slug}`);
	return product;
}

async function assertRejectsWithMessage(
	action: () => Promise<unknown>,
	pattern: RegExp,
) {
	await assert.rejects(action, pattern);
}

async function resetCheckoutData(prisma: ReturnType<typeof createRuntimePrismaClient>) {
	await prisma.orderItem.deleteMany();
	await prisma.order.deleteMany();
	await prisma.cartItem.deleteMany();
	await prisma.cart.deleteMany();
}

async function restoreSeededProductState(
	prisma: ReturnType<typeof createRuntimePrismaClient>,
) {
	await prisma.product.update({
		where: { slug: "jarron-ceramico-nube" },
		data: {
			name: "Jarrón cerámico Nube",
			slug: "jarron-ceramico-nube",
			priceMinorUnits: 12000,
			stockQuantity: 8,
			status: "active",
		},
	});
	await prisma.product.update({
		where: { slug: "cojin-minimalista" },
		data: {
			name: "Cojín minimalista",
			slug: "cojin-minimalista",
			priceMinorUnits: 6900,
			stockQuantity: 12,
			status: "active",
		},
	});
}

function formData(input: Record<string, string>) {
	const data = new FormData();
	for (const [key, value] of Object.entries(input)) data.set(key, value);
	return data;
}

async function installCheckoutActionTestDeps(token: string, redirects: string[], revalidated: string[]) {
	await __setCheckoutActionTestDependencies({
		cookies: async () => ({ get: (name: string) => (name === "store_cart_token" ? { value: token } : undefined) }),
		getOptionalAuthenticatedSession: async () => null,
		revalidatePath: (path: string) => revalidated.push(path),
		redirect: (path: string) => {
			redirects.push(path);
			throw Object.assign(new Error("NEXT_REDIRECT"), { path });
		},
	});
}

async function main() {
	const prisma = createRuntimePrismaClient();
	try {
		await resetCheckoutData(prisma);

		const vase = await getProductBySlug(prisma, "jarron-ceramico-nube");
		const cushion = await getProductBySlug(prisma, "cojin-minimalista");
		const draft = await getProductBySlug(prisma, "producto-borrador-tienda");

		await addCartItem(
			{ anonymousToken: "checkout-success-cart" },
			{ productId: vase.id, quantity: 2 },
		);
		const success = await createOrderFromCart(
			{ anonymousToken: "checkout-success-cart" },
			{ customerName: "Cliente Checkout", customerEmail: "CLIENTE@EXAMPLE.COM" },
		);
		assert.ok(success.orderId);
		assert.match(success.confirmationToken, /^[a-f0-9]{64}$/);
		assert.equal(
			success.confirmationPath,
			`/pedido/confirmacion/${success.confirmationToken}`,
		);

		const order = await prisma.order.findUnique({
			where: { id: success.orderId },
			include: { items: true },
		});
		assert.ok(order);
		assert.equal(order.customerName, "Cliente Checkout");
		assert.equal(order.customerEmail, "cliente@example.com");
		assert.equal(order.status, "pending");
		assert.equal(order.subtotalMinorUnits, vase.priceMinorUnits * 2);
		assert.equal(order.totalMinorUnits, vase.priceMinorUnits * 2);
		assert.notEqual(order.confirmationTokenHash, success.confirmationToken);
		assert.equal(order.items.length, 1);
		assert.equal(order.items[0]?.productId, vase.id);
		assert.equal(order.items[0]?.productName, vase.name);
		assert.equal(order.items[0]?.productSlug, vase.slug);
		assert.equal(order.items[0]?.unitPriceMinorUnits, vase.priceMinorUnits);
		assert.equal(order.items[0]?.quantity, 2);
		assert.equal(order.items[0]?.lineTotalMinorUnits, vase.priceMinorUnits * 2);

		const decremented = await prisma.product.findUnique({ where: { id: vase.id } });
		assert.equal(decremented?.stockQuantity, vase.stockQuantity - 2);
		assert.equal(
			await prisma.cartItem.count({
				where: { cart: { anonymousToken: "checkout-success-cart" } },
			}),
			0,
		);
		let lookup = await getOrderByConfirmationToken(success.confirmationToken);
		assert.equal(lookup?.id, success.orderId);
		assert.equal(
			Object.hasOwn(lookup ?? {}, "confirmationTokenHash"),
			false,
			"Confirmation lookup must not expose the stored token hash",
		);
		await prisma.product.update({
			where: { id: vase.id },
			data: {
				name: "Jarrón renombrado",
				priceMinorUnits: vase.priceMinorUnits + 1000,
				status: "archived",
			},
		});
		lookup = await getOrderByConfirmationToken(success.confirmationToken);
		assert.equal(lookup?.items[0]?.productName, vase.name);
		assert.equal(lookup?.items[0]?.productSlug, vase.slug);
		assert.equal(lookup?.items[0]?.unitPriceMinorUnits, vase.priceMinorUnits);
		const confirmationView = buildOrderConfirmationViewModel(lookup);
		assert.equal(confirmationView.heading, "Pedido confirmado");
		assert.equal(confirmationView.customerName, "Cliente Checkout");
		assert.equal(confirmationView.customerEmail, "cliente@example.com");
		assert.equal(confirmationView.status, "pending");
		assert.equal(confirmationView.items[0]?.productName, vase.name);
		assert.equal(confirmationView.items[0]?.productSlug, vase.slug);
		assert.equal(confirmationView.items[0]?.quantity, 2);
		assert.equal(confirmationView.items[0]?.unitPriceLabel, "S/. 120.00");
		assert.equal(confirmationView.items[0]?.lineTotalLabel, "S/. 240.00");
		assert.equal(confirmationView.subtotalLabel, "S/. 240.00");
		assert.equal(confirmationView.totalLabel, "S/. 240.00");
		assert.equal(Object.hasOwn(confirmationView, "confirmationTokenHash"), false);
		assert.equal(await getOrderByConfirmationToken("checkout-success-cart"), null);
		assert.equal(await getOrderByConfirmationToken("not-a-token"), null);
		await restoreSeededProductState(prisma);

		await addCartItem(
			{ anonymousToken: "invalid-contact-cart" },
			{ productId: cushion.id, quantity: 1 },
		);
		await assertRejectsWithMessage(
			() =>
				createOrderFromCart(
					{ anonymousToken: "invalid-contact-cart" },
					{ customerName: "", customerEmail: "bad-email" },
				),
			/nombre/i,
		);
		assert.equal(
			await prisma.cartItem.count({
				where: { cart: { anonymousToken: "invalid-contact-cart" } },
			}),
			1,
		);

		await assertRejectsWithMessage(
			() =>
				createOrderFromCart(
					{ anonymousToken: "empty-checkout-cart" },
					{ customerName: "Cliente", customerEmail: "cliente@example.com" },
				),
			/vacio/i,
		);

		await addCartItem(
			{ anonymousToken: "stale-stock-cart" },
			{ productId: cushion.id, quantity: 2 },
		);
		await prisma.product.update({
			where: { id: cushion.id },
			data: { stockQuantity: 1 },
		});
		await assertRejectsWithMessage(
			() =>
				createOrderFromCart(
					{ anonymousToken: "stale-stock-cart" },
					{ customerName: "Cliente", customerEmail: "cliente@example.com" },
				),
			/stock disponible/i,
		);
		assert.equal(
			(await prisma.product.findUnique({ where: { id: cushion.id } }))?.stockQuantity,
			1,
		);
		assert.equal(
			await prisma.cartItem.count({
				where: { cart: { anonymousToken: "stale-stock-cart" } },
			}),
			1,
		);
		await prisma.product.update({
			where: { id: cushion.id },
			data: { stockQuantity: cushion.stockQuantity },
		});

		await addCartItem(
			{ anonymousToken: "rollback-cart" },
			{ productId: vase.id, quantity: 1 },
		);
		await addCartItem(
			{ anonymousToken: "rollback-cart" },
			{ productId: cushion.id, quantity: 1 },
		);
		const vaseBeforeRollback = await prisma.product.findUnique({ where: { id: vase.id } });
		await prisma.product.update({
			where: { id: cushion.id },
			data: { status: "draft" },
		});
		await assertRejectsWithMessage(
			() =>
				createOrderFromCart(
					{ anonymousToken: "rollback-cart" },
					{ customerName: "Cliente", customerEmail: "cliente@example.com" },
				),
			/no esta disponible/i,
		);
		assert.equal(
			(await prisma.product.findUnique({ where: { id: vase.id } }))?.stockQuantity,
			vaseBeforeRollback?.stockQuantity,
		);
		assert.equal(
			await prisma.cartItem.count({
				where: { cart: { anonymousToken: "rollback-cart" } },
			}),
			2,
		);
		await prisma.product.update({
			where: { id: cushion.id },
			data: { status: "active" },
		});

		await assertRejectsWithMessage(
			() => addCartItem({ anonymousToken: "draft-cart" }, { productId: draft.id, quantity: 1 }),
			/no esta disponible/i,
		);

		await addCartItem({ anonymousToken: "action-invalid-contact-cart" }, { productId: cushion.id, quantity: 1 });
		let redirects: string[] = [];
		let revalidated: string[] = [];
		await installCheckoutActionTestDeps("action-invalid-contact-cart", redirects, revalidated);
		const invalidContact = await checkoutAction(
			{ ok: false, data: null, error: null },
			formData({ customerName: "", customerEmail: "bad-email" }),
		);
		assert.equal(invalidContact.ok, false);
		assert.equal(invalidContact.error.status, 400);
		assert.match(invalidContact.error.message, /nombre/i);
		assert.equal(
			await prisma.cartItem.count({ where: { cart: { anonymousToken: "action-invalid-contact-cart" } } }),
			1,
		);

		await addCartItem({ anonymousToken: "action-stale-cart" }, { productId: cushion.id, quantity: 2 });
		await prisma.product.update({ where: { id: cushion.id }, data: { stockQuantity: 1 } });
		redirects = [];
		revalidated = [];
		await installCheckoutActionTestDeps("action-stale-cart", redirects, revalidated);
		const stale = await checkoutAction(
			{ ok: false, data: null, error: null },
			formData({ customerName: "Cliente", customerEmail: "cliente@example.com" }),
		);
		assert.equal(stale.ok, false);
		assert.equal(stale.error.status, 400);
		assert.match(stale.error.message, /stock disponible/i);
		assert.equal(
			await prisma.cartItem.count({ where: { cart: { anonymousToken: "action-stale-cart" } } }),
			1,
		);
		await prisma.product.update({ where: { id: cushion.id }, data: { stockQuantity: cushion.stockQuantity } });

		await addCartItem({ anonymousToken: "action-success-cart" }, { productId: cushion.id, quantity: 1 });
		redirects = [];
		revalidated = [];
		await installCheckoutActionTestDeps("action-success-cart", redirects, revalidated);
		await assert.rejects(
			() =>
				checkoutAction(
					{ ok: false, data: null, error: null },
					formData({ customerName: "Cliente Action", customerEmail: "ACTION@EXAMPLE.COM" }),
				),
			(error: Error & { path?: string }) => {
				assert.match(error.path ?? "", /^\/pedido\/confirmacion\/[a-f0-9]{64}$/);
				return true;
			},
		);
		assert.deepEqual(revalidated, ["/carrito", "/checkout"]);
		assert.equal(redirects.length, 1);
		assert.equal(
			await prisma.cartItem.count({ where: { cart: { anonymousToken: "action-success-cart" } } }),
			0,
		);
	} finally {
		await __resetCheckoutActionTestDependencies();
		await resetCheckoutData(prisma).catch(() => undefined);
		await restoreSeededProductState(prisma).catch(() => undefined);
		await prisma.$disconnect();
	}

	console.log("Store checkout order foundation runtime tests passed.");
}

main().catch((error) => {
	console.error("Store checkout order foundation runtime tests failed:", error);
	process.exit(1);
});
