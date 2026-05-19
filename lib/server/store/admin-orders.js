import prisma from "../../prisma.js";
import { formatSolesPrice } from "./formatting.js";

export const ADMIN_ORDER_STATUSES = ["pending", "confirmed"];
export const MAX_ADMIN_ORDER_SEARCH_LENGTH = 120;

const STATUS_LABELS = {
	pending: "Pendiente",
	confirmed: "Confirmado",
};

function firstValue(input, key) {
	if (input && typeof input.get === "function") return input.get(key) ?? "";
	const value = input?.[key];
	return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function normalizeSearch(value) {
	return String(value ?? "")
		.trim()
		.replace(/\s+/g, " ")
		.slice(0, MAX_ADMIN_ORDER_SEARCH_LENGTH);
}

function formatDateTime(value) {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(value);
}

function toAdminOrderSummary(order) {
	return {
		id: order.id,
		customerName: order.customerName,
		customerEmail: order.customerEmail,
		status: order.status,
		statusLabel: STATUS_LABELS[order.status] ?? order.status,
		subtotalLabel: formatSolesPrice(order.subtotalMinorUnits),
		totalLabel: formatSolesPrice(order.totalMinorUnits),
		createdAtLabel: formatDateTime(order.createdAt),
		updatedAtLabel: formatDateTime(order.updatedAt),
		detailPath: `/admin/tienda/pedidos/${order.id}`,
	};
}

function toAdminOrderItem(item) {
	return {
		id: item.id,
		productId: item.productId,
		productName: item.productName,
		productSlug: item.productSlug,
		unitPriceMinorUnits: item.unitPriceMinorUnits,
		unitPriceLabel: formatSolesPrice(item.unitPriceMinorUnits),
		quantity: item.quantity,
		lineTotalMinorUnits: item.lineTotalMinorUnits,
		lineTotalLabel: formatSolesPrice(item.lineTotalMinorUnits),
		createdAtLabel: formatDateTime(item.createdAt),
	};
}

function toAdminOrderDetail(order) {
	return {
		...toAdminOrderSummary(order),
		items: order.items.map(toAdminOrderItem),
	};
}

export function parseAdminOrderFilters(input = {}) {
	const rawStatus = String(firstValue(input, "status") ?? "").trim();
	const status = ADMIN_ORDER_STATUSES.includes(rawStatus) ? rawStatus : null;
	const invalidStatus = rawStatus.length > 0 && status === null;

	return {
		status,
		q: normalizeSearch(firstValue(input, "q")),
		invalidStatus,
	};
}

export function parseAdminOrderStatus(value) {
	const status = String(value ?? "").trim();
	return ADMIN_ORDER_STATUSES.includes(status) ? status : null;
}

export async function getAdminOrderSummaries(filters = {}) {
	if (filters.invalidStatus) return [];

	const where = {};
	if (filters.status) where.status = filters.status;
	if (filters.q) {
		where.OR = [
			{ customerName: { contains: filters.q } },
			{ customerEmail: { contains: filters.q } },
		];
	}

	const orders = await prisma.order.findMany({
		where,
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			status: true,
			subtotalMinorUnits: true,
			totalMinorUnits: true,
			createdAt: true,
			updatedAt: true,
		},
		orderBy: [{ createdAt: "desc" }, { id: "asc" }],
	});

	return orders.map(toAdminOrderSummary);
}

export async function getAdminOrderDetailById(id) {
	const orderId = typeof id === "string" ? id.trim() : "";
	if (!orderId) return null;

	const order = await prisma.order.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			status: true,
			subtotalMinorUnits: true,
			totalMinorUnits: true,
			createdAt: true,
			updatedAt: true,
			items: {
				select: {
					id: true,
					productId: true,
					productName: true,
					productSlug: true,
					unitPriceMinorUnits: true,
					quantity: true,
					lineTotalMinorUnits: true,
					createdAt: true,
				},
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			},
		},
	});

	return order ? toAdminOrderDetail(order) : null;
}

export async function updateAdminOrderStatus(id, status) {
	const orderId = typeof id === "string" ? id.trim() : "";
	if (!orderId) throw new Error("Se requiere el ID del pedido");

	const nextStatus = parseAdminOrderStatus(status);
	if (!nextStatus) throw new Error("Estado de pedido no valido");

	const existing = await prisma.order.findUnique({
		where: { id: orderId },
		select: { id: true },
	});
	if (!existing) throw new Error("Pedido no encontrado");

	const order = await prisma.order.update({
		where: { id: orderId },
		data: { status: nextStatus },
		select: {
			id: true,
			customerName: true,
			customerEmail: true,
			status: true,
			subtotalMinorUnits: true,
			totalMinorUnits: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return toAdminOrderSummary(order);
}
