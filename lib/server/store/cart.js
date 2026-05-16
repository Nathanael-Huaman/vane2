import { randomBytes } from "node:crypto";
import prisma from "../../prisma.js";
import { formatSolesPrice } from "./formatting.js";
import {
	CartDomainError,
	assertPurchasableProduct,
	assertQuantityWithinStock,
	getProductUnavailableReason,
	parseCartLineProductId,
	parseCartProductId,
	parseCartQuantity,
} from "./cart-validation.js";

const TOKEN_BYTES = 32;

export function createAnonymousCartToken() {
	return randomBytes(TOKEN_BYTES).toString("hex");
}

function emptyCartSummary() {
	return {
		id: null,
		items: [],
		subtotalMinorUnits: 0,
		subtotalLabel: formatSolesPrice(0),
		itemCount: 0,
		createdAnonymousToken: null,
	};
}

function normalizeContext(context = {}) {
	return {
		userId: typeof context.userId === "string" ? context.userId.trim() : "",
		anonymousToken:
			typeof context.anonymousToken === "string"
				? context.anonymousToken.trim()
				: "",
	};
}

function cartWhereForContext(context) {
	const normalized = normalizeContext(context);
	if (normalized.userId) return { userId: normalized.userId };
	if (normalized.anonymousToken) {
		return { anonymousToken: normalized.anonymousToken };
	}
	return null;
}

async function findCart(context) {
	const where = cartWhereForContext(context);
	if (!where) return null;

	return prisma.cart.findFirst({
		where,
		orderBy: [{ updatedAt: "desc" }],
	});
}

async function findOrCreateCart(context) {
	const normalized = normalizeContext(context);
	const existing = await findCart(normalized);
	if (existing) return { cart: existing, createdAnonymousToken: null };

	if (normalized.userId) {
		const cart = await prisma.cart.create({
			data: { userId: normalized.userId },
		});
		return { cart, createdAnonymousToken: null };
	}

	const anonymousToken = normalized.anonymousToken || createAnonymousCartToken();
	const cart = await prisma.cart.create({
		data: { anonymousToken },
	});
	return {
		cart,
		createdAnonymousToken: normalized.anonymousToken ? null : anonymousToken,
	};
}

async function readCartSummary(cartId, createdAnonymousToken = null) {
	if (!cartId) return emptyCartSummary();

	const cart = await prisma.cart.findUnique({
		where: { id: cartId },
		include: {
			items: {
				include: { product: { include: { category: true } } },
				orderBy: [{ createdAt: "asc" }],
			},
		},
	});

	if (!cart) return emptyCartSummary();

	const items = cart.items.map((item) => {
		const unavailableReason = getProductUnavailableReason(item.product);
		const lineTotalMinorUnits = item.product.priceMinorUnits * item.quantity;
		return {
			id: item.id,
			productId: item.productId,
			productName: item.product.name,
			productSlug: item.product.slug,
			quantity: item.quantity,
			stockQuantity: item.product.stockQuantity,
			unitPriceMinorUnits: item.product.priceMinorUnits,
			unitPriceLabel: formatSolesPrice(item.product.priceMinorUnits),
			lineTotalMinorUnits,
			lineTotalLabel: formatSolesPrice(lineTotalMinorUnits),
			isPurchasable: unavailableReason == null,
			unavailableReason,
		};
	});

	const subtotalMinorUnits = items.reduce(
		(total, item) => total + item.lineTotalMinorUnits,
		0,
	);
	const itemCount = items.reduce((total, item) => total + item.quantity, 0);

	return {
		id: cart.id,
		items,
		subtotalMinorUnits,
		subtotalLabel: formatSolesPrice(subtotalMinorUnits),
		itemCount,
		createdAnonymousToken,
	};
}

export async function getCurrentCartSummary(context = {}) {
	const cart = await findCart(context);
	if (!cart) return emptyCartSummary();
	return readCartSummary(cart.id);
}

export async function addCartItem(context, input) {
	const productId = parseCartProductId(input?.productId);
	const quantity = parseCartQuantity(input?.quantity);
	const product = await prisma.product.findUnique({ where: { id: productId } });

	assertPurchasableProduct(product);

	const existingCart = await findCart(context);
	const existing = existingCart
		? await prisma.cartItem.findUnique({
				where: { cartId_productId: { cartId: existingCart.id, productId } },
			})
		: null;
	const nextQuantity = (existing?.quantity ?? 0) + quantity;
	assertQuantityWithinStock(nextQuantity, product);

	const { cart, createdAnonymousToken } = existingCart
		? { cart: existingCart, createdAnonymousToken: null }
		: await findOrCreateCart(context);

	await prisma.cartItem.upsert({
		where: { cartId_productId: { cartId: cart.id, productId } },
		update: { quantity: nextQuantity },
		create: { cartId: cart.id, productId, quantity },
	});

	return readCartSummary(cart.id, createdAnonymousToken);
}

export async function updateCartItemQuantity(context, input) {
	const productId = parseCartLineProductId(input?.productId);
	const quantity = parseCartQuantity(input?.quantity);
	const cart = await findCart(context);
	if (!cart) return emptyCartSummary();

	const product = await prisma.product.findUnique({ where: { id: productId } });
	assertPurchasableProduct(product);
	assertQuantityWithinStock(quantity, product);

	const existing = await prisma.cartItem.findUnique({
		where: { cartId_productId: { cartId: cart.id, productId } },
	});
	if (!existing) {
		throw new CartDomainError("El producto no esta en el carrito");
	}

	await prisma.cartItem.update({
		where: { cartId_productId: { cartId: cart.id, productId } },
		data: { quantity },
	});

	return readCartSummary(cart.id);
}

export async function removeCartItem(context, input) {
	const productId = parseCartLineProductId(input?.productId);
	const cart = await findCart(context);
	if (!cart) return emptyCartSummary();

	await prisma.cartItem.deleteMany({
		where: { cartId: cart.id, productId },
	});

	return readCartSummary(cart.id);
}

export async function clearCart(context) {
	const cart = await findCart(context);
	if (!cart) return emptyCartSummary();

	await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
	return readCartSummary(cart.id);
}
