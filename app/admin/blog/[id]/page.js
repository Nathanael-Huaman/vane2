import { notFound } from "next/navigation";
import { resolvePageAuthContext } from "@/lib/server/session";
import { getPostById } from "@/lib/server/blog/blog-posts.js";
import { EditBlogPostForm } from "@/components/blog/edit-blog-post-form";
import { PageStateCard } from "@/components/auth/page-state-card";
import { Shield, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Editar Post — Panel Admin",
};

export default async function EditBlogPostPage({ params }) {
  const { id } = await params;

  const {
    isAuthenticated,
    isAdmin,
    hasAuthError,
    isAdminView,
  } = await resolvePageAuthContext();

  // Error de sesión
  if (hasAuthError) {
    return (
      <PageStateCard
        heading="Editar Post"
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

  // No autenticado
  if (!isAuthenticated) {
    return (
      <PageStateCard
        heading="Editar Post"
        Icon={Shield}
        cardTitle="Acceso restringido"
        cardDescription="Necesitas iniciar sesión para editar posts."
        ctaLabel="Iniciar sesión"
        ctaHref="/login"
      />
    );
  }

  // No es admin o no está en vista admin
  if (!isAdmin || !isAdminView) {
    return (
      <PageStateCard
        heading="Editar Post"
        Icon={Shield}
        iconTone="destructive"
        cardTitle="Acceso denegado"
        cardDescription="No tienes permisos para editar posts."
        ctaLabel="Volver al inicio"
        ctaHref="/"
        ctaVariant="outline"
      />
    );
  }

  const post = await getPostById(id);

  if (!post) {
    notFound();
  }

  return <EditBlogPostForm post={post} />;
}
