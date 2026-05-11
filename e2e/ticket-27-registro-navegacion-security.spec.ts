import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const TEST_CLIENTE_EMAIL = (
  process.env.TEST_CLIENTE_EMAIL || "cliente.prueba@obstedesign.local"
)
  .trim()
  .toLowerCase();
const TEST_PASSWORD = String(process.env.TEST_CLIENTE_PASSWORD || "Cliente123!");
const SESSION_COOKIE_NAME = "authjs.session-token";

function createAdapter(databaseUrl: string) {
  const lower = databaseUrl.toLowerCase();
  if (lower.startsWith("postgres://") || lower.startsWith("postgresql://")) {
    return new PrismaPg(new Pool({ connectionString: databaseUrl }));
  }
  if (lower.startsWith("file:") || lower.startsWith("libsql:")) {
    return new PrismaLibSql({ url: databaseUrl });
  }
  throw new Error("DATABASE_URL no soportada para tests de seguridad");
}

const prisma = new PrismaClient({
  adapter: createAdapter(process.env.DATABASE_URL || "file:./dev.db"),
});

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${randomBytes(4).toString("hex")}@obstedesign.local`;
}

async function seedAuthenticatedSession(
  page: import("@playwright/test").Page,
  email: string
) {
  const user = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) throw new Error(`Usuario no encontrado: ${email}`);

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

test.describe("Ticket 27 - Registro y navegacion (Seguridad)", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  // Spec: Reglas de negocio > error generico sin revelar metodo de autenticacion
  test("registro duplicado devuelve mensaje neutro sin filtrar proveedor", async ({ page }) => {
    const email = uniqueEmail("security.duplicate");
    await prisma.usuario.create({
      data: {
        email,
        role: "cliente",
        emailVerificado: false,
        passwordHash: await bcrypt.hash(TEST_PASSWORD, 12),
      },
    });

    await page.goto("/registro");
    await page.getByLabel("Correo electronico").fill(email);
    await page.getByLabel("Contrasena", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Confirmar contrasena").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    const errorText = await page.getByText("Ya existe una cuenta con ese correo electronico.").textContent();
    expect(errorText || "").not.toContain("Google");
    expect(errorText || "").not.toContain("contrasena");
  });

  // Spec: Reglas de negocio > rol administrador no asignable en registro publico
  test("registro publico no asigna rol administrador", async ({ page }) => {
    const email = uniqueEmail("security.role");
    await page.goto("/registro");
    await page.getByLabel("Correo electronico").fill(email);
    await page.getByLabel("Contrasena", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Confirmar contrasena").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/registro\/confirmacion/, { timeout: 20_000 });

    const user = await prisma.usuario.findUnique({
      where: { email },
      select: { role: true },
    });
    expect(user?.role).toBe("cliente");
  });

  // Spec: Seguridad y validaciones > visitante no debe ver links admin
  test("visitante no visualiza rutas de administrador en navbar", async ({ page }) => {
    await page.goto("/tienda");
    await expect(page.getByText("Panel Admin")).toHaveCount(0);
    await expect(page.getByText("Cambiar a vista admin")).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel("Abrir menu de navegacion").click();
    await expect(page.getByText("Panel Admin")).toHaveCount(0);
  });

  // Spec: Seguridad y validaciones > cliente no visualiza acciones admin
  test("cliente autenticado no visualiza acciones admin", async ({ page }) => {
    await seedAuthenticatedSession(page, TEST_CLIENTE_EMAIL);
    await page.goto("/tienda");
    await expect(page.getByText("Panel Admin")).toHaveCount(0);
    await expect(page.getByText("Cambiar a vista admin")).toHaveCount(0);
  });

  // Spec: Seguridad y validaciones > token ausente no expone detalles
  test("verificar-email sin token redirige a inicio", async ({ page }) => {
    await page.goto("/verificar-email");
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
  });
});
