import { createHash, randomBytes } from "node:crypto";
import prisma from "../../prisma.js";
import { formatSolesPrice } from "./formatting.js";
import {
	getOrderListQueryWindow,
	toOrderListPageResult,
} from "./order-pagination.js";
import {
	CartDomainError,
	assertPurchasableProduct,
	assertQuantityWithinStock,
} from "./cart-validation.js";

const ORDER_TOKEN_BYTES = 32;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUS_LABELS = {
	pending: "Pendiente",
	confirmed: "Confirmado",
};

export class OrderDomainError extends Error {
	constructor(message) {
		super(message);
		this.name = "OrderDomainError";
	}
}

export function isOrderDomainError(error) {
	return error instanceof OrderDomainError || error instanceof CartDomainError;
}

function orderError(message) {
	return new OrderDomainError(message);
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
	if (normalized.anonymousToken) return { anonymousToken: normalized.anonymousToken };
	return null;
}

function parseCustomerName(value) {
	const name = String(value ?? "").trim();
	if (!name) throw orderError("El nombre del cliente es requerido");
	if (name.length > 120) throw orderError("El nombre del cliente es demasiado largo");
	return name;
}

function parseCustomerEmail(value) {
	const email = String(value ?? "").trim().toLowerCase();
	if (!email) throw orderError("El correo del cliente es requerido");
	if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
		throw orderError("El correo del cliente no es valido");
	}
	return email;
}

function createOrderConfirmationToken() {
	return randomBytes(ORDER_TOKEN_BYTES).toString("hex");
}

function hashOrderConfirmationToken(token) {
	return createHash("sha256").update(token).digest("hex");
}

function normalizeCustomerOrderId(value) {
	return typeof value === "string" ? value.trim() : "";
}

function formatDateTime(value) {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(value);
}

function toCustomerOrderBase(order) {
	return {
		id: order.id,
		status: order.status,
		statusLabel: STATUS_LABELS[order.status] ?? order.status,
		createdAtLabel: formatDateTime(order.createdAt),
		detailPath: `/perfil/pedidos/${order.id}`,
	};
}

function toCustomerOrderSummary(order) {
	return {
		...toCustomerOrderBase(order),
		totalLabel: formatSolesPrice(order.totalMinorUnits),
	};
}

function toCustomerOrderItem(item) {
	return {
		productId: item.productId,
		productName: item.productName,
		productSlug: item.productSlug,
		unitPriceMinorUnits: item.unitPriceMinorUnits,
		unitPriceLabel: formatSolesPrice(item.unitPriceMinorUnits),
		quantity: item.quantity,
		lineTotalMinorUnits: item.lineTotalMinorUnits,
		lineTotalLabel: formatSolesPrice(item.lineTotalMinorUnits),
	};
}

function toCustomerOrderDetail(order) {
	return {
		...toCustomerOrderSummary(order),
		customerName: order.customerName,
		customerEmail: order.customerEmail,
		subtotalLabel: formatSolesPrice(order.subtotalMinorUnits),
		items: order.items.map(toCustomerOrderItem),
	};
}

function parseConfirmationToken(token) {
	const text = String(token ?? "").trim().toLowerCase();
	return /^[a-f0-9]{64}$/.test(text) ? text : null;
}

async function findCartForContext(tx, context) {
	const where = cartWhereForContext(context);
	if (!where) return null;

	return tx.cart.findFirst({
		where,
		include: {
			items: {
				include: { product: true },
				orderBy: [{ createdAt: "asc" }],
			},
		},
		orderBy: [{ updatedAt: "desc" }],
	});
}

export async function createOrderFromCart(context = {}, input = {}) {
	const customerName = parseCustomerName(input.customerName);
	const customerEmail = parseCustomerEmail(input.customerEmail);
	const normalizedContext = normalizeContext(context);
	const confirmationToken = createOrderConfirmationToken();
	const confirmationTokenHash = hashOrderConfirmationToken(confirmationToken);

	const result = await prisma.$transaction(async (tx) => {
		const cart = await findCartForContext(tx, normalizedContext);
		if (!cart || cart.items.length === 0) {
			throw orderError("El carrito esta vacio");
		}

		const snapshots = [];
		for (const item of cart.items) {
			const product = item.product;
			assertPurchasableProduct(product);
			assertQuantityWithinStock(item.quantity, product);

			const updated = await tx.product.updateMany({
				where: {
					id: product.id,
					status: "active",
					stockQuantity: { gte: item.quantity },
				},
				data: { stockQuantity: { decrement: item.quantity } },
			});
			if (updated.count !== 1) {
				throw orderError("La cantidad supera el stock disponible");
			}

			const lineTotalMinorUnits = product.priceMinorUnits * item.quantity;
			snapshots.push({
				productId: product.id,
				productName: product.name,
				productSlug: product.slug,
				unitPriceMinorUnits: product.priceMinorUnits,
				quantity: item.quantity,
				lineTotalMinorUnits,
			});
		}

		const subtotalMinorUnits = snapshots.reduce(
			(total, item) => total + item.lineTotalMinorUnits,
			0,
		);
		const order = await tx.order.create({
			data: {
				userId: normalizedContext.userId || null,
				customerName,
				customerEmail,
				status: "pending",
				subtotalMinorUnits,
				totalMinorUnits: subtotalMinorUnits,
				confirmationTokenHash,
				items: { create: snapshots },
			},
			select: { id: true },
		});

		await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
		return { orderId: order.id };
	});

	return {
		...result,
		confirmationToken,
		confirmationPath: `/pedido/confirmacion/${confirmationToken}`,
	};
}

export async function getOrderByConfirmationToken(token) {
	const confirmationToken = parseConfirmationToken(token);
	if (!confirmationToken) return null;

	return prisma.order.findUnique({
		where: { confirmationTokenHash: hashOrderConfirmationToken(confirmationToken) },
		select: {
			id: true,
			userId: true,
			customerName: true,
			customerEmail: true,
			status: true,
			subtotalMinorUnits: true,
			totalMinorUnits: true,
			createdAt: true,
			updatedAt: true,
			items: { orderBy: [{ createdAt: "asc" }] },
		},
	});
}

export async function getCustomerOrderSummaries(userId, options = {}) {
	const customerUserId = normalizeCustomerOrderId(userId);
	const { page, skip, take } = getOrderListQueryWindow(options.page);
	if (!customerUserId) return toOrderListPageResult([], page);

	const orders = await prisma.order.findMany({
		where: { userId: customerUserId },
		select: {
			id: true,
			status: true,
			totalMinorUnits: true,
			createdAt: true,
		},
		orderBy: [{ createdAt: "desc" }, { id: "asc" }],
		skip,
		take,
	});

	return toOrderListPageResult(orders, page, toCustomerOrderSummary);
}

export async function getCustomerOrderDetailById(userId, orderId) {
	const customerUserId = normalizeCustomerOrderId(userId);
	const customerOrderId = normalizeCustomerOrderId(orderId);
	if (!customerUserId || !customerOrderId) return null;

	const order = await prisma.order.findFirst({
		where: { id: customerOrderId, userId: customerUserId },
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			status: true,
			subtotalMinorUnits: true,
			totalMinorUnits: true,
			createdAt: true,
			items: {
				select: {
					productId: true,
					productName: true,
					productSlug: true,
					unitPriceMinorUnits: true,
					quantity: true,
					lineTotalMinorUnits: true,
				},
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			},
		},
	});

	return order ? toCustomerOrderDetail(order) : null;
}
