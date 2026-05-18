import { formatSolesPrice } from "../../../../lib/server/store/formatting.js";

export function buildOrderConfirmationViewModel(order) {
	return {
		heading: "Pedido confirmado",
		customerName: order.customerName,
		customerEmail: order.customerEmail,
		status: order.status,
		items: order.items.map((item) => ({
			id: item.id,
			productName: item.productName,
			productSlug: item.productSlug,
			quantity: item.quantity,
			unitPriceLabel: formatSolesPrice(item.unitPriceMinorUnits),
			lineTotalLabel: formatSolesPrice(item.lineTotalMinorUnits),
		})),
		subtotalLabel: formatSolesPrice(order.subtotalMinorUnits),
		totalLabel: formatSolesPrice(order.totalMinorUnits),
	};
}
