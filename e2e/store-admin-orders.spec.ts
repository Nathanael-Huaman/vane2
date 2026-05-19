import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

const TEST_ADMIN_EMAIL = (
	process.env.TEST_ADMIN_EMAIL || "admin.prueba@obstedesign.local"
)
	.trim()
	.toLowerCase();
const TEST_DOMAIN = "admin-orders-e2e.test";
const SESSION_COOKIE_NAME = "authjs.session-token";

const prisma = createRuntimePrismaClient();

async function seedAuthenticatedSession(
	page: import("@playwright/test").Page,
	email: string,
	viewMode: "cliente" | "administrador",
) {
	const user = await prisma.usuario.findUnique({
		where: { email },
		select: { id: true },
	});
	if (!user) {
		throw new Error(`Usuario de prueba no encontrado para ${email}`);
	}

	const sessionToken = randomBytes(32).toString("hex");
	const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
	await prisma.sesion.create({
		data: {
			userId: user.id,
			sessionToken,
			expiresAt,
			viewMode,
		},
	});

	await page.context().addCookies([
		{
			name: SESSION_COOKIE_NAME,
			value: sessionToken,
			domain: "localhost",
			path: "/",
			httpOnly: true,
			sameSite: "Lax",
			expires: Math.floor(expiresAt.getTime() / 1000),
		},
	]);
}

async function resetOrdersByDomain(domain: string) {
	await prisma.orderItem.deleteMany({
		where: { order: { customerEmail: { contains: domain } } },
	});
	await prisma.order.deleteMany({
		where: { customerEmail: { contains: domain } },
	});
}

async function seedOrder(input: {
	customerName: string;
	customerEmail: string;
	status: "pending" | "confirmed";
}) {
	const product = await prisma.product.findFirst({
		where: { status: "active" },
		orderBy: { createdAt: "asc" },
	});
	if (!product) {
		throw new Error("Expected at least one active seeded product");
	}

	return prisma.order.create({
		data: {
			customerName: input.customerName,
			customerEmail: input.customerEmail,
			status: input.status,
			subtotalMinorUnits: product.priceMinorUnits * 2,
			totalMinorUnits: product.priceMinorUnits * 2,
			confirmationTokenHash: `admin-orders-e2e-${randomBytes(16).toString("hex")}`,
			items: {
				create: [
					{
						productId: product.id,
						productName: product.name,
						productSlug: product.slug,
						unitPriceMinorUnits: product.priceMinorUnits,
						quantity: 2,
						lineTotalMinorUnits: product.priceMinorUnits * 2,
					},
				],
			},
		},
	});
}

test.describe("Store admin orders", () => {
	test.afterAll(async () => {
		await resetOrdersByDomain(TEST_DOMAIN).catch(() => undefined);
		await prisma.$disconnect();
	});

	test.beforeEach(async () => {
		await resetOrdersByDomain(TEST_DOMAIN);
	});

	test.afterEach(async () => {
		await resetOrdersByDomain(TEST_DOMAIN);
	});

	test("admin sees list, opens detail, and confirms a pending order", async ({
		page,
	}) => {
		await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL, "administrador");
		const order = await seedOrder({
			customerName: "María E2E Pendiente",
			customerEmail: `maria@${TEST_DOMAIN}`,
			status: "pending",
		});

		await page.goto("/admin/tienda/pedidos");

		await expect(page.getByRole("heading", { name: "Pedidos — Tienda Admin" })).toBeVisible();
		await expect(page.getByText("María E2E Pendiente")).toBeVisible();
		await expect(page.getByText(`maria@${TEST_DOMAIN}`)).toBeVisible();
		await expect(
			page.locator('span[data-slot="badge"]', { hasText: "Pendiente" }),
		).toBeVisible();

		await page.getByRole("link", { name: "Ver detalle" }).first().click();
		await expect(page).toHaveURL(new RegExp(`/admin/tienda/pedidos/${order.id}$`));
		await expect(page.getByRole("heading", { name: `Pedido ${order.id}` })).toBeVisible();
		await expect(page.getByText("María E2E Pendiente")).toBeVisible();
		await expect(page.getByText(`maria@${TEST_DOMAIN}`)).toBeVisible();

		await page.getByLabel("Cambiar estado").selectOption("confirmed");
		await page.getByRole("button", { name: "Actualizar estado" }).click();

		await expect(
			page.locator('span[data-slot="badge"]', { hasText: "Confirmado" }),
		).toBeVisible();
		await expect
			.poll(async () => {
				const persisted = await prisma.order.findUniqueOrThrow({
					where: { id: order.id },
					select: { status: true },
				});
				return persisted.status;
			})
			.toBe("confirmed");
	});

	test("admin in client view cannot see admin order data", async ({ page }) => {
		const order = await seedOrder({
			customerName: "Cliente Vista Admin Denegada",
			customerEmail: `denegado@${TEST_DOMAIN}`,
			status: "pending",
		});
		await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL, "cliente");

		await page.goto("/admin/tienda/pedidos");

		await expect(page.getByText("Acceso denegado")).toBeVisible();
		await expect(page.getByText("Cliente Vista Admin Denegada")).toHaveCount(0);

		await page.goto(`/admin/tienda/pedidos/${order.id}`);
		await expect(page.getByText("Acceso denegado")).toBeVisible();
		await expect(page.getByText(`denegado@${TEST_DOMAIN}`)).toHaveCount(0);
	});
});
