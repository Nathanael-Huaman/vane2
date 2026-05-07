/**
 * Configuracion central de Auth.js (NextAuth v5) para el proyecto.
 *
 * Expone:
 *   - auth(): Resuelve la sesion autenticada en Server Components y Server Actions.
 *   - signIn(): Inicia sesion con un provider (credenciales o Google).
 *   - signOut(): Cierra la sesion actual.
 *   - handlers: GET y POST para el route handler de API.
 *
 * Proveedores configurados:
 *   - Credentials: Valida email y contrasena contra la base de datos.
 *     La verificacion real de contrasena se completa en ticket 08.
 *   - Google: Placeholder listo para configuracion de OAuth (ticket 09).
 *
 * Adaptador:
 *   - PrismaCustomAdapter: Mapea Auth.js a modelos Prisma del proyecto
 *     (Usuario, Sesion, Account, VerificationToken).
 *
 * Callbacks:
 *   - jwt: Incluye el rol del usuario en el token JWT.
 *   - session: Propaga el rol desde el token a la sesion visible al cliente.
 *   - signIn: Hook para logica de autorizacion previa al inicio de sesion.
 *
 * Seguridad:
 *   - AUTH_SECRET es requerido y se valida al iniciar.
 *   - No se exponen detalles internos del proveedor de auth ni de la BD.
 *   - Los errores se registran via logger seguro (sin datos sensibles).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaCustomAdapter } from "@/lib/auth/adapter";
import { validateEmail, validatePassword } from "@/lib/server/validation";
import { getUsuarioByEmailForAuth } from "@/lib/server/usuario";
import { logError, logInfo } from "@/lib/server/logger";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const hasGoogleOAuthConfig = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

/**
 * Seguridad OAuth:
 * Solo permitimos vinculacion por email cuando Google confirma
 * que el correo del perfil esta verificado por el proveedor.
 */
function isGoogleEmailVerified(profile) {
  return Boolean(profile?.email_verified === true || profile?.verified_email === true);
}

if (!process.env.AUTH_SECRET) {
  logError("AUTH_SECRET no esta definido. La autenticacion no funcionara correctamente.");
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET es obligatorio en produccion");
  }
}

const providers = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Correo electronico", type: "email" },
      password: { label: "Contrasena", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const email = String(credentials.email).trim().toLowerCase();
      const password = String(credentials.password);

      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        logError("authorize: email invalido", { action: "authorize" });
        return null;
      }

      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        logError("authorize: contrasena invalida", { action: "authorize" });
        return null;
      }

      const userResult = await getUsuarioByEmailForAuth(email);
      if (!userResult.ok) {
        logError("authorize: credenciales invalidas", { action: "authorize" });
        return null;
      }

      const user = userResult.data;

      if (!user.passwordHash) {
        logError("authorize: usuario sin contrasena configurada", {
          action: "authorize",
        });
        return null;
      }

      const bcrypt = await import("bcryptjs");
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        logError("authorize: contrasena incorrecta", { action: "authorize" });
        return null;
      }

      logInfo("authorize: inicio de sesion exitoso", {
        action: "authorize",
        userId: user.id,
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      };
    },
  }),
];

if (hasGoogleOAuthConfig) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
} else {
  // Evita romper el arranque cuando Google OAuth aun no esta configurado.
  logInfo("Auth.js: provider Google deshabilitado por variables faltantes", {
    action: "auth.config",
  });
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  adapter: PrismaCustomAdapter(),

  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE,
  },

  pages: {
    signIn: "/",
    error: "/",
  },

  providers,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },

    async session({ session, user }) {
      if (user) {
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.name = user.name;
        session.user.image = user.image;
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const normalizedEmail = user?.email?.trim().toLowerCase();
        if (!normalizedEmail) {
          logError("signIn: Google sin correo valido", {
            action: "signIn",
            provider: account.provider,
          });
          return false;
        }

        if (!isGoogleEmailVerified(profile)) {
          logError("signIn: Google con correo no verificado", {
            action: "signIn",
            provider: account.provider,
          });
          return false;
        }

        const existingUserResult = await getUsuarioByEmailForAuth(normalizedEmail);
        if (existingUserResult.ok) {
          logInfo("signIn: Google vinculado a cuenta existente por email", {
            action: "signIn",
            provider: account.provider,
            userId: existingUserResult.data.id,
          });
        }
      }

      logInfo("signIn: intento de inicio de sesion", {
        action: "signIn",
        provider: account?.provider,
        userId: user?.id,
      });

      return true;
    },
  },

  debug: process.env.NODE_ENV === "development",
});
