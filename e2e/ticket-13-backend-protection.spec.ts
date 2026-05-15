import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

const TEST_CLIENTE_EMAIL = (
  process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
  .trim()
  .toLowerCase();
const TEST_ADMIN_EMAIL = (process.env.TEST_ADMIN_EMAIL || "admin.prueba@obstedesign.local")
  .trim()
  .toLowerCase();
const SESSION_COOKIE_NAME = "authjs.session-token";

const prisma = createRuntimePrismaClient();

async function seedAuthenticatedSession(
  page: import("@playwright/test").Page,
  email: string
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

test.describe("Ticket 13 - Proteccion backend", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("cliente recibe fallback neutro al entrar por acceso directo a setup", async ({ page }) => {
    await seedAuthenticatedSession(page, TEST_CLIENTE_EMAIL);

    await page.goto("/setup");

    await expect(page.getByText("Acceso restringido")).toBeVisible();
    await expect(page.getByText("No puedes acceder a esta seccion")).toBeVisible();
    await expect(page.getByText("Diagnostico de conexion")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reintentar verificacion" })).toHaveCount(0);
  });

  test("administrador puede entrar a la experiencia protegida de setup", async ({ page }) => {
    await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL);

    await page.goto("/setup");

    await expect(page.getByText("Estado de la base de datos")).toBeVisible();
    await expect(page.getByText("Diagnostico de conexion")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar verificacion" })).toBeVisible();
    await expect(page.getByText("Acceso restringido")).toHaveCount(0);
  });
});
