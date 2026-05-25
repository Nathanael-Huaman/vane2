import { parseAdminOrderFilters } from "./admin-orders.js";
import { parseOrderListPage } from "./order-pagination.js";

export function buildAdminOrderListPath(input = {}, page = 1) {
	const filters = parseAdminOrderFilters(input);
	const query = new URLSearchParams();
	if (filters.status) query.set("status", filters.status);
	if (filters.q) query.set("q", filters.q);
	const currentPage = parseOrderListPage(page);
	if (currentPage > 1) query.set("page", String(currentPage));
	const suffix = query.toString();
	return suffix ? `/admin/tienda/pedidos?${suffix}` : "/admin/tienda/pedidos";
}
