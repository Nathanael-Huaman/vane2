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

test.describe("Ticket 14 - Cambio entre vista cliente y administrador", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("solo admins ven el selector de vista", async ({ page }) => {
    await seedAuthenticatedSession(page, TEST_CLIENTE_EMAIL);

    await page.goto("/tienda");

    await expect(page.getByText("Experiencia cliente activa")).toBeVisible();
    await expect(page.getByText("Selector de vista del administrador")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Vista administrador" })).toHaveCount(0);
  });

  test("admin cambia de vista y el modo persiste durante la sesion actual", async ({ page }) => {
    await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL);

    await page.goto("/tienda");
    await expect(page.getByText("Opciones extra de administrador")).toBeVisible();
    await expect(page.getByText("Modo actual: vista administrador")).toBeVisible();

    await page.getByRole("button", { name: "Vista cliente" }).click();

    await expect(page.getByText("Experiencia cliente activa")).toBeVisible();
    await expect(
      page.getByText("Estas navegando como cliente dentro de tu sesion de administrador.")
    ).toBeVisible();
    await expect(page.getByText("Opciones extra de administrador")).toHaveCount(0);
    await expect(page.getByText("Modo actual: vista cliente")).toBeVisible();

    await page.goto("/perfil");
    await expect(page.getByText("Panel de cliente")).toBeVisible();
    await expect(page.getByText("Panel de administrador")).toHaveCount(0);
    await expect(page.getByText("Vista actual")).toBeVisible();

    await page.getByRole("button", { name: "Vista administrador" }).click();

    await expect(page.getByText("Panel de administrador")).toBeVisible();
    await expect(page.getByText("Panel de cliente")).toHaveCount(0);
  });

  test("una nueva sesion de admin reinicia la vista por defecto", async ({ page }) => {
    await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL);

    await page.goto("/tienda");
    await page.getByRole("button", { name: "Vista cliente" }).click();
    await expect(page.getByText("Modo actual: vista cliente")).toBeVisible();

    await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL);
    await page.goto("/tienda");

    await expect(page.getByText("Modo actual: vista administrador")).toBeVisible();
    await expect(page.getByText("Opciones extra de administrador")).toBeVisible();
    await expect(page.getByText("Experiencia cliente activa")).toHaveCount(0);
  });
});
