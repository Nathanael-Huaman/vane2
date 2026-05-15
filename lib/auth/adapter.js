/**
 * Adaptador Prisma personalizado para Auth.js.
 *
 * Mapea las llamadas del adapter de Auth.js a los modelos Prisma
 * existentes del proyecto (Usuario, Sesion, Account, VerificationToken),
 * respetando las convenciones de nombres en espanol y los campos
 * adicionales del modelo Sesion (userAgent, ip, createdAt).
 *
 * Este adapter desacopla Auth.js de la capa de acceso a datos,
 * permitiendo que la configuracion de autenticacion sea independiente
 * de los nombres de tabla o campo en la base de datos.
 *
 * Contratos principales:
 *   - createUser / getUser / getUserByEmail / getUserByAccount / updateUser / deleteUser
 *   - createSession / getSessionAndUser / updateSession / deleteSession
 *   - linkAccount / unlinkAccount / getAccount
 *   - createVerificationToken / useVerificationToken
 */

import prisma from "@/lib/prisma";
import { toUsuarioPublico } from "@/lib/types";
import { logError, logInfo } from "@/lib/server/shared";

function mapUsuarioToAuthUser(usuario) {
  if (!usuario) return null;
  return {
    id: usuario.id,
    email: usuario.email,
    name: usuario.name,
    image: usuario.image,
    emailVerified: usuario.emailVerified,
    emailVerificado: usuario.emailVerificado,
    role: usuario.role,
  };
}

function mapSesionToAuthSession(sesion) {
  if (!sesion) return null;
  return {
    id: sesion.id,
    sessionToken: sesion.sessionToken,
    userId: sesion.userId,
    expires: sesion.expiresAt,
  };
}

export function PrismaCustomAdapter() {
  return {
    async createUser({ id, ...data }) {
      try {
        const normalizedEmail = data.email?.trim().toLowerCase();
        if (!normalizedEmail) {
          throw new Error("createUser requiere email valido");
        }

        const isOAuthUser = !data.passwordHash;
        const emailVerifiedByOAuth = isOAuthUser ? new Date() : null;

        const usuario = await prisma.usuario.upsert({
          where: { email: normalizedEmail },
          update: {},
          create: {
            email: normalizedEmail,
            name: data.name ?? null,
            image: data.image ?? null,
            emailVerified: emailVerifiedByOAuth,
            emailVerificado: isOAuthUser,
            role: data.role ?? "cliente",
            passwordHash: data.passwordHash ?? null,
          },
        });

        logInfo("PrismaCustomAdapter: createUser reutilizo o creo usuario por email", {
          action: "createUser",
          email: normalizedEmail,
          userId: usuario.id,
          isOAuthUser,
        });

        return mapUsuarioToAuthUser(usuario);
      } catch (error) {
        logError("PrismaCustomAdapter: createUser", {
          action: "createUser",
          message: error.message,
        });
        throw error;
      }
    },

    async getUser(id) {
      try {
        const usuario = await prisma.usuario.findUnique({ where: { id } });
        return mapUsuarioToAuthUser(usuario);
      } catch (error) {
        logError("PrismaCustomAdapter: getUser", {
          action: "getUser",
          id,
          message: error.message,
        });
        return null;
      }
    },

    async getUserByEmail(email) {
      try {
        const usuario = await prisma.usuario.findUnique({
          where: { email: email?.trim().toLowerCase() },
        });
        return mapUsuarioToAuthUser(usuario);
      } catch (error) {
        logError("PrismaCustomAdapter: getUserByEmail", {
          action: "getUserByEmail",
          message: error.message,
        });
        return null;
      }
    },

    async getUserByAccount({ provider, providerAccountId }) {
      try {
        const account = await prisma.account.findUnique({
          where: { provider_providerAccountId: { provider, providerAccountId } },
          include: { usuario: true },
        });
        if (!account) return null;
        return mapUsuarioToAuthUser(account.usuario);
      } catch (error) {
        logError("PrismaCustomAdapter: getUserByAccount", {
          action: "getUserByAccount",
          provider,
          message: error.message,
        });
        return null;
      }
    },

    async updateUser({ id, ...data }) {
      try {
        const updateData = {};
        if (data.email !== undefined) {
          const normalizedEmail = data.email?.trim().toLowerCase();
          if (!normalizedEmail) {
            throw new Error("updateUser requiere email valido");
          }
          updateData.email = normalizedEmail;
        }
        if (data.name !== undefined) updateData.name = data.name;
        if (data.image !== undefined) updateData.image = data.image;
        if (data.emailVerified !== undefined) updateData.emailVerified = data.emailVerified;
        if (data.emailVerificado !== undefined) updateData.emailVerificado = data.emailVerificado;
        if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;
        if (data.role !== undefined) updateData.role = data.role;

        const usuario = await prisma.usuario.update({
          where: { id },
          data: updateData,
        });
        return mapUsuarioToAuthUser(usuario);
      } catch (error) {
        logError("PrismaCustomAdapter: updateUser", {
          action: "updateUser",
          id,
          message: error.message,
        });
        throw error;
      }
    },

    async deleteUser(id) {
      try {
        const usuario = await prisma.usuario.delete({ where: { id } });
        return mapUsuarioToAuthUser(usuario);
      } catch (error) {
        logError("PrismaCustomAdapter: deleteUser", {
          action: "deleteUser",
          id,
          message: error.message,
        });
        return null;
      }
    },

    async linkAccount(data) {
      try {
        const account = await prisma.account.create({
          data: {
            userId: data.userId,
            type: data.type,
            provider: data.provider,
            providerAccountId: data.providerAccountId,
            refresh_token: data.refresh_token ?? null,
            access_token: data.access_token ?? null,
            expires_at: data.expires_at ?? null,
            token_type: data.token_type ?? null,
            scope: data.scope ?? null,
            id_token: data.id_token ?? null,
            session_state: data.session_state ?? null,
          },
        });
        return account;
      } catch (error) {
        logError("PrismaCustomAdapter: linkAccount", {
          action: "linkAccount",
          provider: data.provider,
          message: error.message,
        });
        throw error;
      }
    },

    async unlinkAccount({ provider, providerAccountId }) {
      try {
        return await prisma.account.delete({
          where: { provider_providerAccountId: { provider, providerAccountId } },
        });
      } catch (error) {
        logError("PrismaCustomAdapter: unlinkAccount", {
          action: "unlinkAccount",
          provider,
          message: error.message,
        });
        return null;
      }
    },

    async getAccount(providerAccountId, provider) {
      try {
        return await prisma.account.findFirst({
          where: { providerAccountId, provider },
        });
      } catch (error) {
        logError("PrismaCustomAdapter: getAccount", {
          action: "getAccount",
          provider,
          message: error.message,
        });
        return null;
      }
    },

    async createSession({ sessionToken, userId, expires }) {
      try {
        const sesion = await prisma.sesion.create({
          data: {
            sessionToken,
            userId,
            expiresAt: expires,
          },
        });
        return mapSesionToAuthSession(sesion);
      } catch (error) {
        logError("PrismaCustomAdapter: createSession", {
          action: "createSession",
          userId,
          message: error.message,
        });
        throw error;
      }
    },

    async getSessionAndUser(sessionToken) {
      try {
        const result = await prisma.sesion.findUnique({
          where: { sessionToken },
          include: { usuario: true },
        });
        if (!result) return null;
        const { usuario, ...sesion } = result;
        return {
          session: mapSesionToAuthSession(sesion),
          user: mapUsuarioToAuthUser(usuario),
        };
      } catch (error) {
        logError("PrismaCustomAdapter: getSessionAndUser", {
          action: "getSessionAndUser",
          message: error.message,
        });
        return null;
      }
    },

    async updateSession({ sessionToken, ...data }) {
      try {
        const updateData = {};
        if (data.expires !== undefined) updateData.expiresAt = data.expires;

        const sesion = await prisma.sesion.update({
          where: { sessionToken },
          data: updateData,
        });
        return mapSesionToAuthSession(sesion);
      } catch (error) {
        logError("PrismaCustomAdapter: updateSession", {
          action: "updateSession",
          message: error.message,
        });
        return null;
      }
    },

    async deleteSession(sessionToken) {
      try {
        const sesion = await prisma.sesion.delete({
          where: { sessionToken },
        });
        return mapSesionToAuthSession(sesion);
      } catch (error) {
        logError("PrismaCustomAdapter: deleteSession", {
          action: "deleteSession",
          message: error.message,
        });
        return null;
      }
    },

    async createVerificationToken(data) {
      try {
        const verificationToken = await prisma.verificationToken.create({
          data: {
            identifier: data.identifier,
            token: data.token,
            expires: data.expires,
          },
        });
        return verificationToken;
      } catch (error) {
        logError("PrismaCustomAdapter: createVerificationToken", {
          action: "createVerificationToken",
          identifier: data.identifier,
          message: error.message,
        });
        throw error;
      }
    },

    async useVerificationToken({ identifier, token }) {
      try {
        const verificationToken = await prisma.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        });
        return verificationToken;
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2025"
        ) {
          return null;
        }
        logError("PrismaCustomAdapter: useVerificationToken", {
          action: "useVerificationToken",
          identifier,
          message: error.message,
        });
        return null;
      }
    },
  };
}
