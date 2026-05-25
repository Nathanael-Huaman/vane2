export const ORDER_LIST_PAGE_SIZE = 10;
export const MAX_ORDER_LIST_PAGE = Math.floor(Number.MAX_SAFE_INTEGER / ORDER_LIST_PAGE_SIZE) + 1;

function firstPageValue(input) {
	if (input && typeof input.get === "function") return input.get("page") ?? "";
	if (input && typeof input === "object" && "page" in input) {
		const value = input.page;
		return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
	}
	return input ?? "";
}

export function parseOrderListPage(input) {
	const value = firstPageValue(input);
	if (typeof value === "number") {
		return Number.isSafeInteger(value) && value >= 1 ? Math.min(value, MAX_ORDER_LIST_PAGE) : 1;
	}

	const text = String(value ?? "").trim();
	if (!/^[1-9]\d*$/.test(text)) return 1;

	const page = Number(text);
	return Number.isSafeInteger(page) ? Math.min(page, MAX_ORDER_LIST_PAGE) : 1;
}

export function getOrderListQueryWindow(input) {
	const page = parseOrderListPage(input);
	return {
		page,
		pageSize: ORDER_LIST_PAGE_SIZE,
		skip: (page - 1) * ORDER_LIST_PAGE_SIZE,
		take: ORDER_LIST_PAGE_SIZE + 1,
	};
}

export function buildOrderListPagination(rows, input) {
	const page = parseOrderListPage(input);
	return {
		page,
		pageSize: ORDER_LIST_PAGE_SIZE,
		hasPrevious: page > 1,
		hasNext: rows.length > ORDER_LIST_PAGE_SIZE,
	};
}

export function toOrderListPageResult(rows, input, mapRow = (row) => row) {
	return {
		orders: rows.slice(0, ORDER_LIST_PAGE_SIZE).map(mapRow),
		pagination: buildOrderListPagination(rows, input),
	};
}
