/**
 * Cliente Prisma centralizado para acceso a la base de datos.
 *
 * Proporciona una instancia singleton de PrismaClient que puede ser
 * consumida por Server Actions, API Routes y modulos del servidor.
 *
 * Configuracion:
 *   - Desarrollo: SQLite con adapter-libsql (archivo local dev.db)
 *   - Produccion: cambiar adapter por @prisma/adapter-pg + PostgreSQL
 *
 * La URL de conexion se toma de la variable de entorno DATABASE_URL.
 *
 * Contratos de modelos expuestos por PrismaClient:
 *
 *   prisma.usuario
 *     findUnique, findFirst, findMany, create, update, delete, upsert, count
 *     Campos: id, email, passwordHash, role, createdAt, updatedAt
 *     Relaciones: sesiones (Sesion[])
 *
 *   prisma.sesion
 *     findUnique, findFirst, findMany, create, update, delete, upsert, count
 *     Campos: id, userId, sessionToken, expiresAt, userAgent, ip, createdAt
 *     Relaciones: usuario (Usuario)
 *
 *   Reglas de negocio (desde la arquitectura):
 *     - role solo acepta "cliente" o "administrador"
 *     - email es unico en la tabla usuarios
 *     - sessionToken es unico en la tabla sesiones
 *     - Borrar un usuario elimina sus sesiones en cascada (onDelete: Cascade)
 *
 * Para PostgreSQL en produccion:
 *   1. Instalar: pnpm add @prisma/adapter-pg
 *   2. Cambiar adapter en createPrismaClient()
 *   3. Actualizar DATABASE_URL en .env a la cadena de conexion PostgreSQL
 */

import { PrismaClient } from "./generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL no esta definida en las variables de entorno");
  }

  // SQLite: usa @prisma/adapter-libsql con archivo local
  // Para PostgreSQL en produccion, cambiar a:
  //   import { PrismaPg } from "@prisma/adapter-pg";
  //   const adapter = new PrismaPg({ connectionString: databaseUrl });
  const libsql = createClient({ url: databaseUrl });
  const adapter = new PrismaLibSql(libsql);

  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
