# Ticket 19 - Validacion BDD

## Objetivo

Validar con escenarios Given/When/Then que los flujos visibles de autenticacion, autorizacion y cambio de vista cumplen la spec desde la UI y mantienen trazabilidad con la logica real del servidor.

## Escenarios BDD

| Escenario | Given | When | Then | Evidencia UI | Relacion tecnica |
| --- | --- | --- | --- | --- | --- |
| Cliente por credenciales | Existe un usuario cliente de prueba con password valido | Completa email y contrasena en `/` y envia el formulario | Llega a `/tienda`, ve experiencia cliente y no ve opciones admin | `e2e/ticket-19-bdd-validation.spec.ts` | `POST /api/auth/credentials-login` -> `authenticateUserWithCredentials()` -> `createAuthJsSessionForUser()` |
| Admin por credenciales | Existe un usuario admin de prueba con password valido | Completa email y contrasena en `/` y envia el formulario | Llega a `/tienda`, ve opciones admin y selector de vista | `e2e/ticket-19-bdd-validation.spec.ts` | Mismo flujo de credenciales + resolucion de `role` y `viewMode` |
| Error minimo en login | Existe un correo valido pero la contrasena no coincide | Intenta iniciar sesion con credenciales invalidas | Permanece fuera del flujo autenticado y ve mensaje minimo | `e2e/ticket-19-bdd-validation.spec.ts` | Validacion server-side + respuesta sanitizada de auth |
| Inicio OAuth con Google | El provider Google esta disponible | Pulsa `Iniciar sesion con Google` en `/` | Comienza la redireccion hacia Auth.js o Google | `e2e/ticket-19-bdd-validation.spec.ts` | `nextAuthSignIn("google")` + callback `signIn` |
| Cliente con Google vinculado | El usuario cliente tiene una cuenta `google` enlazada y una sesion activa | Navega a `/perfil` y luego a `/setup` | Ve solo el panel cliente y recibe fallback neutro en setup | `e2e/ticket-19-bdd-validation.spec.ts` | Sesion persistida + `requireAdminAccess()` en backend |
| Admin con Google vinculado | El usuario admin tiene una cuenta `google` enlazada y una sesion activa | Navega a `/tienda`, cambia la vista y luego abre `/setup` | El modo de sesion persiste y setup sigue disponible por rol real | `e2e/ticket-19-bdd-validation.spec.ts` | `resolveSessionViewMode()` + proteccion backend por `role` |

## Cobertura observable

- Cliente y admin por credenciales
- Inicio de login con Google
- Cliente y admin con cuenta Google vinculada y sesion activa
- Restriccion admin en `/setup`
- Cambio entre `vista cliente` y `vista administrador`
- Error minimo de autenticacion

## Ejecucion

1. `pnpm validate:ticket-19`
2. `pnpm test:ticket-19`

## Resultado esperado

La suite BDD deja evidencia reproducible de comportamiento observable y confirma que la UI no contradice las reglas de autenticacion, autorizacion y sesion resueltas en servidor.
