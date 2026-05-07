/**
 * Re-exportaciones publicas del modulo de autenticacion Auth.js.
 *
 * Contratos:
 *
 *   auth(): Promise<Session | null>
 *     Resuelve la sesion autenticada actual.
 *     Retorna null si no hay sesion activa.
 *     Usar en Server Components y Server Actions.
 *
 *   signIn(provider, options?): Promise<never | undefined>
 *     Inicia sesion con un provider ("credentials" o "google").
 *     En Server Actions, redirige automaticamente al callback.
 *
 *   signOut(options?): Promise<never | undefined>
 *     Cierra la sesion actual del usuario.
 *
 *   handlers: { GET: Function, POST: Function }
 *     Manejadores HTTP para el route handler de API de Auth.js.
 *
 *   PrismaCustomAdapter(): Adapter
 *     Adaptador Prisma personalizado para Auth.js.
 *     Mapea a los modelos Usuario, Sesion, Account, VerificationToken.
 */

export { auth, signIn, signOut, handlers } from "./config";
export { PrismaCustomAdapter } from "./adapter";