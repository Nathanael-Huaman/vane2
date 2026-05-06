"use server";

import { prisma } from "@/lib/server";
import { successResponse, serverErrorResponse } from "@/lib/server/response";
import { logInfo, logError } from "@/lib/server/logger";

/**
 * Verifica la conectividad con la base de datos y detecta el motor activo.
 *
 * Contrato de salida (exito):
 *   { ok: true, data: { connected: boolean, engine: "sqlite" | "postgresql" } }
 *
 * Contrato de salida (error):
 *   { ok: false, error: { message: string, status: 500 } }
 *
 * La URL de conexion NUNCA se expone al cliente.
 */
export async function checkDatabaseStatus() {
  try {
    // Verificar conectividad con una query minima
    await prisma.$queryRaw`SELECT 1`;

    // Detectar motor de forma segura sin exponer la URL completa
    const databaseUrl = process.env.DATABASE_URL || "";
    const engine = databaseUrl.toLowerCase().includes("postgres")
      ? "postgresql"
      : "sqlite";

    logInfo("Verificacion de base de datos exitosa", { engine });

    return successResponse({ connected: true, engine });
  } catch (error) {
    logError("Fallo la verificacion de conexion a la base de datos", {
      message: error?.message,
    });

    return serverErrorResponse(
      "No se pudo conectar con la base de datos. Intenta nuevamente mas tarde.",
      { message: error?.message }
    );
  }
}
