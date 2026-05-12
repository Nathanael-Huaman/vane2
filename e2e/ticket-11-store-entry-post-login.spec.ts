import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { createRuntimePrismaClient } from "../lib/testing/prisma-runtime";

const TEST_CLIENTE_EMAIL = (
  process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
  .trim()
  .toLowerCase();
const TEST_CLIENTE_PASSWORD = String(process.env.TEST_CLIENTE_PASSWORD || "Cliente123!");
const TEST_ADMIN_EMAIL = (process.env.TEST_ADMIN_EMAIL || "admin.prueba@obstedesign.local")
  .trim()
  .toLowerCase();
const TEST_ADMIN_PASSWORD = String(process.env.TEST_ADMIN_PASSWORD || "Admin12345!");
const SESSION_COOKIE_NAME = "authjs.session-token";

const prisma = createRuntimePrismaClient();

async function loginWithCredentials(
  page: import("@playwright/test").Page,
  email: string,
  password: string
) {
  await page.goto("/");
  await page.getByLabel("Correo electronico").fill(email);
  await page.getByLabel("Contrasena").fill(password);
  await page.getByRole("button", { name: "Iniciar sesion con correo" }).click();
}

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

test.describe("Ticket 11 - Redireccionamiento y entrada a la tienda", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("cliente por credenciales redirige a /tienda", async ({
    page,
  }) => {
    await loginWithCredentials(page, TEST_CLIENTE_EMAIL, TEST_CLIENTE_PASSWORD);

    await expect(page).toHaveURL(/\/tienda$/, { timeout: 20_000 });
    await expect(page.getByText("Tienda Obstedesign")).toBeVisible();
    await expect(page.getByText("Credenciales invalidas")).toHaveCount(0);
  });

  test("administrador por credenciales redirige a /tienda", async ({
    page,
  }) => {
    await loginWithCredentials(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);

    await expect(page).toHaveURL(/\/tienda$/, { timeout: 20_000 });
    await expect(page.getByText("Tienda Obstedesign")).toBeVisible();
    await expect(page.getByText("Credenciales invalidas")).toHaveCount(0);
  });

  test("acceso directo a /tienda sin sesion muestra estado controlado", async ({ page }) => {
    await page.goto("/tienda");

    await expect(page.getByText("Sesion no iniciada")).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Iniciar sesion" })
    ).toBeVisible();
    await expect(page.getByText("Opciones extra de administrador")).toHaveCount(0);
  });

  test("sesion persistida admin entra a tienda sin pasar por formulario", async ({ page }) => {
    await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL);
    await page.goto("/tienda");

    await expect(page.getByText("Tienda Obstedesign")).toBeVisible();
    await expect(page.getByText("Opciones extra de administrador")).toBeVisible();
  });

  test("al cambiar sesion en mismo navegador se actualiza vista de tienda por rol", async ({
    page,
  }) => {
    await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL);
    await page.goto("/tienda");
    await expect(page.getByText("Opciones extra de administrador")).toBeVisible();

    await page.context().clearCookies();
    await seedAuthenticatedSession(page, TEST_CLIENTE_EMAIL);
    await page.goto("/tienda");
    await expect(page.getByText("Experiencia cliente activa")).toBeVisible();
    await expect(page.getByText("Opciones extra de administrador")).toHaveCount(0);
  });
});
