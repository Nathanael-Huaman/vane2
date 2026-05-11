import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const TEST_CLIENTE_EMAIL = (
  process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
  .trim()
  .toLowerCase();
const TEST_CLIENTE_PASSWORD = String(process.env.TEST_CLIENTE_PASSWORD || "Cliente123!");
const TEST_ADMIN_EMAIL = (process.env.TEST_ADMIN_EMAIL || "admin.prueba@obstedesign.local")
  .trim()
  .toLowerCase();
const SESSION_COOKIE_NAME = "authjs.session-token";

function createAdapter(databaseUrl: string) {
  const lower = databaseUrl.toLowerCase();
  if (lower.startsWith("postgres://") || lower.startsWith("postgresql://")) {
    return new PrismaPg(new Pool({ connectionString: databaseUrl }));
  }
  if (lower.startsWith("file:") || lower.startsWith("libsql:")) {
    return new PrismaLibSql({ url: databaseUrl });
  }
  throw new Error(
    "DATABASE_URL no soportada. Usa file:/libsql: para SQLite o postgres:/postgresql: para PostgreSQL."
  );
}

const prisma = new PrismaClient({
  adapter: createAdapter(process.env.DATABASE_URL || "file:./dev.db"),
});

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

test.describe("Ticket 10 - Resolucion de rol post-login", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("cliente autenticado ve solo experiencia de cliente", async ({ page }) => {
    await seedAuthenticatedSession(page, TEST_CLIENTE_EMAIL);
    await page.goto("/perfil");

    await expect(page.getByText("Rol asignado")).toBeVisible();
    await expect(page.getByText("cliente", { exact: true })).toBeVisible();
    await expect(page.getByText("Panel de cliente")).toBeVisible();
    await expect(page.getByText("Panel de administrador")).toHaveCount(0);
  });

  test("administrador autenticado ve solo experiencia de administrador", async ({ page }) => {
    await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL);
    await page.goto("/perfil");

    await expect(page.getByText("Rol asignado")).toBeVisible();
    await expect(page.getByText("administrador", { exact: true })).toBeVisible();
    await expect(page.getByText("Panel de administrador")).toBeVisible();
    await expect(page.getByText("Panel de cliente")).toHaveCount(0);
  });

  test("sin sesion activa, /perfil no filtra paneles protegidos", async ({ page }) => {
    await page.goto("/perfil");

    await expect(page.getByText("Sesion no iniciada")).toBeVisible();
    await expect(page.getByText("Panel de administrador")).toHaveCount(0);
    await expect(page.getByText("Panel de cliente")).toHaveCount(0);
  });

  test("credenciales invalidas muestran error minimo y no navegan a /perfil", async ({ page }) => {
    await loginWithCredentials(page, TEST_CLIENTE_EMAIL, `${TEST_CLIENTE_PASSWORD}__bad`);

    await expect(page.getByText("Credenciales invalidas")).toBeVisible();
    await expect(page).toHaveURL(/\/\?error=CredentialsSignin/, { timeout: 15_000 });
  });

  test("mantiene integridad de rol tras cambio de usuario en la misma sesion de navegador", async ({
    page,
  }) => {
    await seedAuthenticatedSession(page, TEST_ADMIN_EMAIL);
    await page.goto("/perfil");
    await expect(page.getByText("Panel de administrador")).toBeVisible();

    await page.context().clearCookies();
    await seedAuthenticatedSession(page, TEST_CLIENTE_EMAIL);
    await page.goto("/perfil");
    await expect(page.getByText("Panel de cliente")).toBeVisible();
    await expect(page.getByText("Panel de administrador")).toHaveCount(0);
  });
});
