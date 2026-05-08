# Ticket 18 - Validacion funcional

## Objetivo

Consolidar una validacion funcional reproducible para login, roles, sesiones, autorizacion y recuperacion de contrasena, manteniendo trazabilidad entre criterio, evidencia y resultado visible.

## Checklist funcional

| Area | Flujo | Ruta o pantalla | Accion del usuario | Interaccion de servidor | Resultado visible | Evidencia reproducible |
| --- | --- | --- | --- | --- | --- | --- |
| Login | Login con credenciales | `/` -> `/tienda` | Completa correo y contrasena y envia el formulario | `POST /api/auth/credentials-login` -> `authenticateUserWithCredentials()` -> `createAuthJsSessionForUser()` | El acceso se valida con feedback minimo y la sesion puede redirigir a tienda | `pnpm test:ticket-08:runtime` |
| Login | Login con Google | `/` | Pulsa `Iniciar sesion con Google` | `nextAuthSignIn("google")` -> callback `signIn` en Auth.js | El boton aparece, queda habilitado y abre la redireccion OAuth | `pnpm test:ticket-09:e2e` |
| Roles | Roles post-login | `/tienda`, `/perfil` | Entra como cliente o administrador | Resolucion de rol desde usuario persistido y sesion | La UI puede diferenciar la experiencia por rol | `pnpm test:ticket-10:runtime` |
| Sesiones | Sesiones persistidas | `/tienda` | Inicia sesion y consume una cookie valida | Prisma persiste `Sesion` con `sessionToken` y `expiresAt` | La tienda recibe una sesion valida y consumible | `pnpm test:ticket-11:runtime` |
| Autorizacion | Autorizacion UI y backend | `/tienda`, `/perfil`, `/setup` | Navega como cliente o admin a pantallas compartidas y protegidas | `getAuthenticatedSession()`, `requireRole()`, `requireAdminAccess()` | Cliente no ve opciones admin, admin si; setup muestra fallback neutro o diagnostico segun rol | `pnpm test:ticket-12:e2e`, `pnpm test:ticket-13:e2e` |
| Sesiones | Cambio de vista por sesion | `/tienda`, `/perfil` | Admin alterna entre `Vista cliente` y `Vista administrador` | `resolveSessionViewMode()` y action `updateSessionViewMode()` | El modo visible cambia y persiste dentro de la sesion actual | `pnpm test:ticket-14:e2e` |
| Recuperacion | Recuperacion de contrasena | `/recuperar-contrasena`, `/restablecer-contrasena` | Solicita enlace y luego establece nueva contrasena | `requestPasswordReset()` -> `validatePasswordResetToken()` -> `resetPasswordWithToken()` | El flujo puede avanzar con mensajes minimos y token valido | `pnpm test:ticket-15:runtime` |
| Seguridad | Seguridad complementaria | Flujo de recuperacion | Repite acciones del flujo de recuperacion | Helpers de riesgo, backlog de rate limiting y auditoria | La UI y el backend quedan preparados para controles adicionales sin romper el flujo actual | `pnpm test:ticket-16` |
| Feedback | Feedback seguro y estados de carga | `/`, `/recuperar-contrasena`, `/restablecer-contrasena` | Intenta login, solicitud y restablecimiento | Respuestas seguras centralizadas y banners reutilizables | La interfaz muestra loading, error y exito de manera coherente | `pnpm test:ticket-17` |

## Evidencia tecnica base

- Login con credenciales: `app/page.js`, `app/api/auth/credentials-login/route.js`, `lib/server/credentials.js`
- Login con Google: `app/page.js`, `lib/auth/auth-client.js`, `lib/auth/config.js`
- Roles y sesiones: `lib/server/auth-session.js`, `lib/server/sesion.js`, `app/tienda/page.js`, `app/perfil/page.js`
- Autorizacion: `components/role-guard.jsx`, `lib/server/authorization.js`, `app/setup/page.js`
- Recuperacion: `lib/server/password-reset.js`, `lib/actions/password-reset.js`, `components/password-reset-request-form.jsx`, `components/password-reset-confirm-form.jsx`
- Feedback seguro y carga: `components/auth-feedback-banner.jsx`, `components/loading-button-content.jsx`, `lib/auth/feedback.js`, `lib/server/auth-response.js`

## Ejecucion

1. `pnpm validate:ticket-18`
2. `pnpm test:ticket-18`

## Reporte generado

La ejecucion de `pnpm test:ticket-18` genera `reports/ticket-18-functional-validation.json` con resultado por flujo, duracion y salida resumida para aprobacion tecnica.
