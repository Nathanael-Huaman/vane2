/**
 * Flags de rol cliente-safe.
 *
 * Estas funciones son puras y no dependen de Prisma ni de modulos
 * del servidor, por lo que pueden importarse tanto en cliente como
 * en servidor sin riesgo de fugas de infraestructura.
 *
 * Contratos:
 *
 *   isAdmin(role) → boolean
 *   isCliente(role) → boolean
 */

import { ROLE_ADMINISTRADOR, ROLE_CLIENTE } from "@/lib/types";

export function isAdmin(role) {
  return role === ROLE_ADMINISTRADOR;
}

export function isCliente(role) {
  return role === ROLE_CLIENTE;
}
