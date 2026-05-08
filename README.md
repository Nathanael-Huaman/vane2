# Frontend Obstedesign

## Desarrollo

Ejecuta el proyecto con:

```bash
pnpm dev
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).

## Email Transaccional

El proyecto usa Brevo como proveedor de email transaccional a traves de su API HTTP.

Variables requeridas:

```bash
BREVO_API_KEY="xkeysib-tu-api-key-de-brevo"
EMAIL_FROM="noreply@obsedesign.com"
EMAIL_FROM_NAME="Obstedesign"
APP_URL="http://localhost:3000"
```

Notas:

- `BREVO_API_KEY` es obligatoria en produccion para enviar correos reales.
- `EMAIL_FROM` debe existir y estar verificado en Brevo.
- `EMAIL_FROM_NAME` es opcional, pero se recomienda para el remitente visible.
- `APP_URL` se usa para construir enlaces absolutos de recuperacion; si falta, el sistema intenta usar `NEXTAUTH_URL` o `AUTH_URL`.
- En desarrollo, si no configuras Brevo, el mailer deja una vista previa local en logs en lugar de fallar el flujo.

## Cobertura Actual

Hoy el unico flujo de email transaccional implementado en el repositorio es la recuperacion de contrasena.

El servicio `sendTransactionalEmail()` ya queda preparado para:

- correos HTML y texto plano
- envio mediante plantillas de Brevo con `templateId`
- parametros dinamicos con `params`
- manejo de errores sanitizado y logs seguros

No existen aun implementaciones activas de correos de registro ni de notificaciones dentro del proyecto actual; cuando se agreguen, deben reutilizar el mismo servicio de email.

## Pruebas

Validacion del flujo de recuperacion:

```bash
pnpm test:ticket-15
```

Pruebas especificas del servicio de email Brevo:

```bash
pnpm test:email:unit
pnpm test:email:integration
```
