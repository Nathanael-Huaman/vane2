import Link from "next/link";
import { resolvePageAuthContext } from "@/lib/server/session";
import { getAllPosts } from "@/lib/server/blog/blog-posts.js";
import { PageStateCard } from "@/components/auth/page-state-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Plus,
  Shield,
  AlertTriangle,
  Calendar,
  Pencil,
} from "lucide-react";

export const metadata = {
  title: "Blog — Panel Admin",
  description: "Administra los posts del blog.",
};

/**
 * Formatea una fecha a formato legible en español.
 */
function formatDate(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Etiqueta de estado del post */
function StatusBadge({ status }) {
  const isPublished = status === "publicado";
  return (
    <Badge variant={isPublished ? "default" : "secondary"} className="text-xs">
      {isPublished ? "Publicado" : "Borrador"}
    </Badge>
  );
}

export default async function AdminBlogPage() {
  const {
    user,
    isAuthenticated,
    isAdmin,
    hasAuthError,
    isAdminView,
  } = await resolvePageAuthContext();

  // Error de sesión
  if (hasAuthError) {
    return (
      <PageStateCard
        heading="Blog Admin"
        Icon={AlertTriangle}
        iconTone="destructive"
        cardTitle="No se pudo cargar el panel"
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
        heading="Blog Admin"
        Icon={Shield}
        cardTitle="Acceso restringido"
        cardDescription="Necesitas iniciar sesión para acceder al panel de administración."
        ctaLabel="Iniciar sesión"
        ctaHref="/login"
      />
    );
  }

  // No es admin o no está en vista admin
  if (!isAdmin || !isAdminView) {
    return (
      <PageStateCard
        heading="Blog Admin"
        Icon={Shield}
        iconTone="destructive"
        cardTitle="Acceso denegado"
        cardDescription="No tienes permisos para administrar el blog."
        body="Solo los administradores en vista administrador pueden acceder a esta sección."
        ctaLabel="Volver al inicio"
        ctaHref="/"
        ctaVariant="outline"
      />
    );
  }

  const posts = await getAllPosts();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <FileText className="h-7 w-7" />
              Blog
            </h1>
            <p className="text-sm text-muted-foreground">
              Administra los posts del blog — {user?.email}
            </p>
          </div>
          <Link href="/admin/blog/nuevo" className="inline-flex cursor-pointer">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo post
            </Button>
          </Link>
        </header>

        {/* Posts list */}
        {posts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No hay posts todavía
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Crea tu primer post para empezar.
              </p>
              <Link href="/admin/blog/nuevo" className="inline-flex cursor-pointer">
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear primer post
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/admin/blog/${post.id}`}
                className="block cursor-pointer"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between py-5">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base truncate">
                          {post.title}
                        </h3>
                        <StatusBadge status={post.status} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.createdAt)}
                        </span>
                        {post.slug && (
                          <span className="truncate hidden sm:inline">
                            /blog/{post.slug}
                          </span>
                        )}
                      </div>
                    </div>
                    <Pencil className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
