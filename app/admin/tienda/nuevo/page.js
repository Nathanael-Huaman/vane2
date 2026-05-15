import { resolvePageAuthContext } from "@/lib/server/session";
import { getAdminProductFormOptions } from "@/lib/server/store/admin-products.js";
import { PageStateCard } from "@/components/auth/page-state-card";
import { Shield, AlertTriangle } from "lucide-react";
import { NewStoreProductForm } from "./product-form-client";

export const metadata = {
	title: "Nuevo producto — Tienda Admin",
};

export default async function NewStoreProductPage() {
	const { isAuthenticated, isAdmin, hasAuthError, isAdminView } =
		await resolvePageAuthContext();

	if (hasAuthError) {
		return (
			<PageStateCard
				heading="Nuevo producto"
				Icon={AlertTriangle}
				iconTone="destructive"
				cardTitle="No se pudo cargar el formulario"
				cardDescription="Ocurrió un problema al validar tu sesión."
				body="Intenta nuevamente en unos instantes."
				ctaLabel="Volver al inicio"
				ctaHref="/"
				ctaVariant="outline"
			/>
		);
	}

	if (!isAuthenticated) {
		return (
			<PageStateCard
				heading="Nuevo producto"
				Icon={Shield}
				cardTitle="Acceso restringido"
				cardDescription="Necesitas iniciar sesión para crear productos."
				ctaLabel="Iniciar sesión"
				ctaHref="/login"
			/>
		);
	}

	if (!isAdmin || !isAdminView) {
		return (
			<PageStateCard
				heading="Nuevo producto"
				Icon={Shield}
				iconTone="destructive"
				cardTitle="Acceso denegado"
				cardDescription="Solo administradores en vista administrador pueden crear productos."
				ctaLabel="Volver al inicio"
				ctaHref="/"
				ctaVariant="outline"
			/>
		);
	}

	const { categories } = await getAdminProductFormOptions();

	return <NewStoreProductForm categories={categories} />;
}
