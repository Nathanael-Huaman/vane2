/**
 * Cliente Prisma centralizado para acceso a la base de datos.
 *
 * Proporciona una instancia singleton de PrismaClient que puede ser
 * consumida por Server Actions, API Routes y modulos del servidor.
 *
 * Configuracion:
 *   - Desarrollo: SQLite con adapter-libsql (archivo local dev.db)
 *   - Produccion: PostgreSQL con adapter-pg
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
 */

import { PrismaClient } from "./generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let prismaInstance = null;

function createAdapter(databaseUrl) {
  const lower = databaseUrl.toLowerCase();

  if (lower.startsWith("postgres://") || lower.startsWith("postgresql://")) {
    const pool = new Pool({ connectionString: databaseUrl });
    return new PrismaPg(pool);
  }

  if (lower.startsWith("file:") || lower.startsWith("libsql:")) {
    return new PrismaLibSql({ url: databaseUrl });
  }

  throw new Error(
    "DATABASE_URL no soportada. Usa file:/libsql: para SQLite o postgres:/postgresql: para PostgreSQL."
  );
}

function getPrismaClient() {
  if (prismaInstance) return prismaInstance;

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL no esta definida en las variables de entorno");
  }

  const adapter = createAdapter(databaseUrl);
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
