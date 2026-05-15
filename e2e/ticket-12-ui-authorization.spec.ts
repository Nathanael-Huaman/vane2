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

test.describe("Ticket 12 - Autorizacion en UI", () => {
	test.afterAll(async () => {
		await prisma.$disconnect();
	});

	test("cliente no ve bloques administrativos en tienda ni perfil", async ({
		page,
	}) => {
		await seedAuthenticatedSession(page, TEST_CLIENTE_EMAIL);

		await page.goto("/tienda");
		await expect(page.getByText("Tienda Obstedesign")).toBeVisible();
		await expect(page.getByText("Opciones extra de administrador")).toHaveCount(
			0,
		);

		await page.goto("/perfil");
		await expect(page.getByText("Panel de cliente")).toBeVisible();
		await expect(page.getByText("Panel de administrador")).toHaveCount(0);
	});

	test("administrador no expone bloques admin en tienda publica y mantiene perfil admin", async ({
		page,
	}) => {
		await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL);

		await page.goto("/tienda");
		await expect(page.getByText("Tienda Obstedesign")).toBeVisible();
		await expect(page.getByText("Opciones extra de administrador")).toHaveCount(
			0,
		);
		await expect(page.getByText("Experiencia cliente activa")).toHaveCount(0);

		await page.goto("/perfil");
		await expect(page.getByText("Panel de administrador")).toBeVisible();
		await expect(page.getByText("Panel de cliente")).toHaveCount(0);
	});
});
