# Frontend Obstedesign

## Proposito actual

Frontend Next.js 16 de Obstedesign con base operativa de tienda y administracion:

- autenticacion y acceso con credenciales y Google
- roles `cliente` / `administrador` con `viewMode` por sesion
- admin de productos para crear, editar, publicar y archivar catalogo
- carrito persistente para usuarios anonimos y autenticados
- checkout base con creacion de orden y snapshot inmutable de compra
- panel admin de pedidos con listado, detalle, filtros y cambio de estado `pending|confirmed`
- historial de pedidos del cliente autenticado con detalle de compra

## Estado actual del producto

### Implementado

- login con credenciales en `/`
- registro en `/registro`
- login/registro con Google cuando el provider esta configurado
- verificacion de email post-registro
- recuperacion y restablecimiento de contrasena
- resolucion de rol (`cliente` / `administrador`)
- `viewMode` por sesion para que administradores alternen entre vista cliente y admin
- CRUD admin de productos con validaciones y revalidacion
- add-to-cart desde detalle de producto y vista `/carrito`
- carrito persistente con soporte anonimo/autenticado
- checkout base con creacion de orden
- confirmacion publica de orden por token
- admin de pedidos con filtros por estado y busqueda
- historial de pedidos en `/perfil/pedidos` y detalle en `/perfil/pedidos/[id]`

### Fuera de alcance actual

- pagos online
- envio, impuestos y facturacion
- historial de pedidos para compras invitadas/no autenticadas
- fulfillment/logistica
- analytics, exportaciones y operaciones bulk de pedidos

## Setup local

1. Instalar dependencias:

   ```bash
   pnpm install
   ```

2. Crear variables locales:

   ```bash
   cp .env.example .env
   ```

3. Preparar base local:

   ```bash
   pnpm prisma migrate dev
   ```

4. Crear usuarios de prueba:

   ```bash
   pnpm seed:test-auth-users
   ```

5. Levantar la app:

   ```bash
   pnpm dev
   ```

App local: `http://localhost:3000`

## Variables de entorno

### Requeridas

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="genera-un-secreto-largo-y-seguro"
AUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
```

### Google OAuth

```bash
AUTH_GOOGLE_ID="tu-google-client-id"
AUTH_GOOGLE_SECRET="tu-google-client-secret"
```

Si faltan, el boton de Google se muestra deshabilitado y Auth.js no registra el provider.

### Email transaccional / Brevo

```bash
BREVO_API_KEY="xkeysib-tu-api-key-de-brevo"
EMAIL_FROM="noreply@obsedesign.com"
EMAIL_FROM_NAME="Obstedesign"
```

- en produccion, Brevo debe estar configurado para envio real
- en desarrollo, si Brevo no esta disponible, el flujo no se rompe: queda preview/log seguro

### URL publica cliente

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Usuarios de prueba

```bash
TEST_CLIENTE_EMAIL="cliente.prueba@obstedesign.local"
TEST_CLIENTE_PASSWORD="Cliente123!"
TEST_ADMIN_EMAIL="admin.prueba@obstedesign.local"
TEST_ADMIN_PASSWORD="Admin12345!"
```

### Variables de verificacion manual

```bash
VERIFY_PASSWORD_RESET_EMAIL="usuario@dominio.com"
VERIFY_PASSWORD_RESET_NEW_PASSWORD="NuevaClave123!"
VERIFY_PASSWORD_RESET_APP_URL="http://localhost:3000"
VERIFY_PASSWORD_RESET_ALLOW_LOG_PREVIEW="1"
```

## Auth actual

### Credenciales

- el login principal vive en `/`
- valida formato de email/password en cliente y servidor
- Auth.js usa provider `credentials`
- al autenticar, el rol real se resuelve desde BD

### Google

- usa Auth.js + Google provider
- solo se habilita con `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`
- exige email verificado por Google antes de permitir el acceso
- si existe una cuenta previa por credenciales con el mismo email, permite linking seguro

### Verificacion de email

- el registro genera token de verificacion y envia correo
- la confirmacion se consume en `/verificar-email`
- existe reenvio de verificacion con limite por ventana

### Recuperacion de contrasena

- solicitud en `/recuperar-contrasena`
- consumo del token en `/restablecer-contrasena`
- respuesta publica neutra para no filtrar existencia de cuentas
- el token se persiste hasheado y vence automaticamente

## Roles y view mode

- `cliente`: experiencia cliente fija
- `administrador`: conserva rol admin real y puede alternar `viewMode`
- `viewMode` se persiste por sesion; no cambia el rol real, solo la experiencia visible

## Scripts principales

### Desarrollo

```bash
pnpm dev
pnpm build
pnpm lint
```

### Seeds

```bash
pnpm seed:test-cliente
pnpm seed:test-auth-users
```

### Validaciones agrupadas

```bash
pnpm test
pnpm test:validation
pnpm test:runtime
pnpm test:e2e
```

### Tickets / checks utiles

```bash
pnpm test:ticket-08
pnpm test:ticket-10
pnpm test:ticket-11
pnpm test:ticket-15
pnpm test:email
pnpm test:email:unit
pnpm test:email:integration
pnpm verify:password-reset:user
```

## Reportes generados

- `reports/*.md` contiene documentacion viva de validacion
- `reports/*.json` y `test-results/` son outputs generados y quedan ignorados por git
