import { notFound } from "next/navigation";
import { resolvePageAuthContext } from "@/lib/server/session";
import {
	getAdminProductById,
	getAdminProductFormOptions,
} from "@/lib/server/store/admin-products.js";
import { PageStateCard } from "@/components/auth/page-state-card";
import { Shield, AlertTriangle } from "lucide-react";
import { EditStoreProductForm } from "./product-form-client";

export const metadata = {
	title: "Editar producto — Tienda Admin",
};

export default async function EditStoreProductPage({ params }) {
	const { id } = await params;

	const { isAuthenticated, isAdmin, hasAuthError, isAdminView } =
		await resolvePageAuthContext();

	if (hasAuthError) {
		return (
			<PageStateCard
				heading="Editar producto"
				Icon={AlertTriangle}
				iconTone="destructive"
				cardTitle="No se pudo cargar el editor"
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
				heading="Editar producto"
				Icon={Shield}
				cardTitle="Acceso restringido"
				cardDescription="Necesitas iniciar sesión para editar productos."
				ctaLabel="Iniciar sesión"
				ctaHref="/login"
			/>
		);
	}

	if (!isAdmin || !isAdminView) {
		return (
			<PageStateCard
				heading="Editar producto"
				Icon={Shield}
				iconTone="destructive"
				cardTitle="Acceso denegado"
				cardDescription="Solo administradores en vista administrador pueden editar productos."
				ctaLabel="Volver al inicio"
				ctaHref="/"
				ctaVariant="outline"
			/>
		);
	}

	const [product, { categories }] = await Promise.all([
		getAdminProductById(id),
		getAdminProductFormOptions(),
	]);

	if (!product) {
		notFound();
	}

	return <EditStoreProductForm product={product} categories={categories} />;
}
