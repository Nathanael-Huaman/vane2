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

let prismaInstance = null;

function getPrismaClient() {
  if (prismaInstance) return prismaInstance;

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL no esta definida en las variables de entorno");
  }

  // SQLite: usa @prisma/adapter-libsql con archivo local
  // Para PostgreSQL en produccion, cambiar a:
  //   import { PrismaPg } from "@prisma/adapter-pg";
  //   const adapter = new PrismaPg({ connectionString: databaseUrl });
  const adapter = new PrismaLibSql({ url: databaseUrl });

  prismaInstance = new PrismaClient({ adapter });
  return prismaInstance;
}

const prisma = new Proxy(
  {},
  {
    get(_, prop) {
      const client = getPrismaClient();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);

export default prisma;
