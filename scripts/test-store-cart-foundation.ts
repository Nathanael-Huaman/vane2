import "dotenv/config";
import assert from "node:assert/strict";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";
import { formatSolesPrice } from "../lib/server/store/formatting.js";
import {
	addCartItem,
	clearCart,
	getCurrentCartSummary,
	removeCartItem,
	updateCartItemQuantity,
} from "../lib/server/store/cart.js";

const TEST_USER_EMAIL = "cart.user@obstedesign.local";

async function getProductBySlug(prisma: ReturnType<typeof createRuntimePrismaClient>, slug: string) {
	const product = await prisma.product.findUnique({ where: { slug } });
	assert.ok(product, `Expected seeded product ${slug}`);
	return product;
}

async function getOrCreateCartUser(prisma: ReturnType<typeof createRuntimePrismaClient>) {
	return prisma.usuario.upsert({
		where: { email: TEST_USER_EMAIL },
		update: {},
		create: {
			email: TEST_USER_EMAIL,
			role: "cliente",
			emailVerificado: true,
		},
	});
}

async function assertRejectsWithMessage(action: () => Promise<unknown>, pattern: RegExp) {
	await assert.rejects(action, pattern);
}

async function main() {
	assert.equal(formatSolesPrice(24000), "S/. 240.00");

	const prisma = createRuntimePrismaClient();
	try {
		await prisma.cartItem.deleteMany();
		await prisma.cart.deleteMany();

		const inStock = await getProductBySlug(prisma, "jarron-ceramico-nube");
		const secondProduct = await getProductBySlug(prisma, "cojin-minimalista");
		const outOfStock = await getProductBySlug(prisma, "manta-andina-sin-stock");
		const draft = await getProductBySlug(prisma, "producto-borrador-tienda");
		const archived = await getProductBySlug(prisma, "producto-archivado-tienda");
		const user = await getOrCreateCartUser(prisma);

		const emptySummary = await getCurrentCartSummary({});
		assert.equal(emptySummary.items.length, 0);
		assert.equal(emptySummary.subtotalMinorUnits, 0);
		assert.equal(emptySummary.subtotalLabel, "S/. 0.00");

		const anonymous = await addCartItem(
			{ anonymousToken: "anon-cart-token" },
			{ productId: inStock.id, quantity: 1 },
		);
		assert.equal(anonymous.items.length, 1);
		assert.equal(anonymous.items[0]?.productId, inStock.id);
		assert.equal(anonymous.items[0]?.quantity, 1);
		assert.equal(anonymous.itemCount, 1);
		assert.equal(anonymous.subtotalMinorUnits, inStock.priceMinorUnits);

		const incremented = await addCartItem(
			{ anonymousToken: "anon-cart-token" },
			{ productId: inStock.id, quantity: 2 },
		);
		assert.equal(incremented.items.length, 1);
		assert.equal(incremented.items[0]?.quantity, 3);
		assert.equal(incremented.itemCount, 3);
		assert.equal(
			incremented.subtotalMinorUnits,
			inStock.priceMinorUnits * 3,
		);

		const userCart = await addCartItem(
			{ userId: user.id },
			{ productId: secondProduct.id, quantity: 2 },
		);
		assert.equal(userCart.items.length, 1);
		assert.equal(userCart.items[0]?.productId, secondProduct.id);
		assert.equal(userCart.items[0]?.quantity, 2);
		assert.equal(userCart.subtotalLabel, formatSolesPrice(secondProduct.priceMinorUnits * 2));

		await assertRejectsWithMessage(
			() => addCartItem({ anonymousToken: "reject-draft" }, { productId: draft.id, quantity: 1 }),
			/no esta disponible/i,
		);
		await assertRejectsWithMessage(
			() => addCartItem({ anonymousToken: "reject-archived" }, { productId: archived.id, quantity: 1 }),
			/no esta disponible/i,
		);
		await assertRejectsWithMessage(
			() => addCartItem({ anonymousToken: "reject-stock" }, { productId: outOfStock.id, quantity: 1 }),
			/sin stock/i,
		);
		await assertRejectsWithMessage(
			() => addCartItem({ anonymousToken: "reject-quantity" }, { productId: inStock.id, quantity: inStock.stockQuantity + 1 }),
			/stock disponible/i,
		);
		await assertRejectsWithMessage(
			() => addCartItem({}, { productId: inStock.id, quantity: inStock.stockQuantity + 1 }),
			/stock disponible/i,
		);
		const cartsAfterRejectedAnonymousAdd = await prisma.cart.count();
		assert.equal(cartsAfterRejectedAnonymousAdd, 2);

		const newAnonymous = await addCartItem(
			{},
			{ productId: inStock.id, quantity: 1 },
		);
		assert.ok(newAnonymous.createdAnonymousToken);
		assert.equal(typeof newAnonymous.createdAnonymousToken, "string");
		assert.equal(newAnonymous.createdAnonymousToken.length, 64);
		assert.equal(newAnonymous.items[0]?.productId, inStock.id);
		assert.equal(newAnonymous.items[0]?.quantity, 1);

		await assertRejectsWithMessage(
			() => addCartItem({ anonymousToken: "reject-zero" }, { productId: inStock.id, quantity: 0 }),
			/entero positivo/i,
		);
		await assertRejectsWithMessage(
			() => addCartItem({ anonymousToken: "reject-id" }, { productId: "", quantity: 1 }),
			/producto es requerido/i,
		);

		await assertRejectsWithMessage(
			() => addCartItem({ anonymousToken: "anon-cart-token" }, { productId: inStock.id, quantity: inStock.stockQuantity }),
			/stock disponible/i,
		);

		await assertRejectsWithMessage(
			() => updateCartItemQuantity(
				{ anonymousToken: "anon-cart-token" },
				{ productId: secondProduct.id, quantity: 1 },
			),
			/no esta en el carrito/i,
		);

		const updated = await updateCartItemQuantity(
			{ anonymousToken: "anon-cart-token" },
			{ productId: inStock.id, quantity: 2 },
		);
		assert.equal(updated.items[0]?.quantity, 2);
		assert.equal(updated.subtotalMinorUnits, inStock.priceMinorUnits * 2);

		const withSecondLine = await addCartItem(
			{ anonymousToken: "anon-cart-token" },
			{ productId: secondProduct.id, quantity: 1 },
		);
		assert.equal(withSecondLine.items.length, 2);

		const removed = await removeCartItem(
			{ anonymousToken: "anon-cart-token" },
			{ productId: inStock.id },
		);
		assert.equal(removed.items.length, 1);
		assert.equal(removed.items[0]?.productId, secondProduct.id);

		const cleared = await clearCart({ anonymousToken: "anon-cart-token" });
		assert.equal(cleared.items.length, 0);
		assert.equal(cleared.itemCount, 0);
		assert.equal(cleared.subtotalLabel, "S/. 0.00");

		await addCartItem(
			{ anonymousToken: "stale-cart-token" },
			{ productId: secondProduct.id, quantity: 1 },
		);
		await prisma.product.update({
			where: { id: secondProduct.id },
			data: { status: "draft" },
		});
		const staleSummary = await getCurrentCartSummary({ anonymousToken: "stale-cart-token" });
		assert.equal(staleSummary.items[0]?.isPurchasable, false);
		assert.match(staleSummary.items[0]?.unavailableReason ?? "", /no esta disponible/i);
		await prisma.product.update({
			where: { id: secondProduct.id },
			data: { status: "active" },
		});
	} finally {
		await prisma.cartItem.deleteMany().catch(() => undefined);
		await prisma.cart.deleteMany().catch(() => undefined);
		await prisma.$disconnect();
	}

	console.log("Store cart foundation runtime tests passed.");
}

main().catch((error) => {
	console.error("Store cart foundation runtime tests failed:", error);
	process.exit(1);
});
