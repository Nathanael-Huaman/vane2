import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

const TEST_CLIENTE_EMAIL = (
	process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
	.trim()
	.toLowerCase();
const TEST_ADMIN_EMAIL = (
	process.env.TEST_ADMIN_EMAIL || "admin.prueba@obstedesign.local"
)
	.trim()
	.toLowerCase();
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

test.describe("Store admin products - route access", () => {
	test.afterAll(async () => {
		await prisma.$disconnect();
	});

	test("visitante sin sesión ve acceso restringido", async ({ page }) => {
		await page.goto("/admin/tienda");
		await expect(page.getByText("Acceso restringido")).toBeVisible();
		await expect(
			page.getByText("Necesitas iniciar sesión para administrar productos."),
		).toBeVisible();
	});

	test("cliente autenticado queda denegado en rutas admin de tienda", async ({
		page,
	}) => {
		await seedAuthenticatedSession(page, TEST_CLIENTE_EMAIL, "cliente");

		await page.goto("/admin/tienda");
		await expect(page.getByText("Acceso denegado")).toBeVisible();

		await page.goto("/admin/tienda/nuevo");
		await expect(page.getByText("Acceso denegado")).toBeVisible();
	});

	test("admin en vista cliente queda denegado", async ({ page }) => {
		await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL, "cliente");

		await page.goto("/admin/tienda");
		await expect(page.getByText("Acceso denegado")).toBeVisible();
	});

	test("admin en vista administrador accede a inventario", async ({ page }) => {
		await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL, "administrador");

		await page.goto("/admin/tienda");
		await expect(
			page.getByRole("heading", { name: "Tienda Admin" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Nuevo producto" }),
		).toBeVisible();
	});
});
