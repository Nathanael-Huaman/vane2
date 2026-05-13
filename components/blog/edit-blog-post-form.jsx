"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateBlogPostAction,
  publishBlogPostAction,
  unpublishBlogPostAction,
  deleteBlogPostAction,
} from "@/lib/actions/blog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  FileText,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

const initialState = { ok: false, data: null, error: null };

/**
 * Formatea una fecha en español.
 */
function formatDate(date) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EditBlogPostForm({ post }) {
  const router = useRouter();
  const [updateState, updateAction, updatePending] = useActionState(
    updateBlogPostAction,
    initialState
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishBlogPostAction,
    initialState
  );
  const [unpublishState, unpublishAction, unpublishPending] = useActionState(
    unpublishBlogPostAction,
    initialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteBlogPostAction,
    initialState
  );

  // Redirect after delete
  if (deleteState?.ok && !deletePending) {
    router.push("/admin/blog");
    return null;
  }

  const isPublished = post.status === "publicado";
  const isAnyPending =
    updatePending || publishPending || unpublishPending || deletePending;

  /**
   * Crea un FormData con el ID y ejecuta la acción.
   */
  function handlePublish() {
    const fd = new FormData();
    fd.set("id", post.id);
    publishAction(fd);
  }

  function handleUnpublish() {
    const fd = new FormData();
    fd.set("id", post.id);
    unpublishAction(fd);
  }

  function handleDelete() {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este post? Esta acción no se puede deshacer.")) {
      return;
    }
    const fd = new FormData();
    fd.set("id", post.id);
    deleteAction(fd);
  }

  const latestState = updateState || publishState || unpublishState || deleteState;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <div className="mb-8">
          <Link href="/admin/blog" className="inline-flex cursor-pointer">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al panel
            </Button>
          </Link>
        </div>

        {/* Post info bar */}
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <Badge variant={isPublished ? "default" : "secondary"}>
                {isPublished ? "Publicado" : "Borrador"}
              </Badge>
              {post.publishedAt && (
                <span className="text-xs text-muted-foreground">
                  Publicado: {formatDate(post.publishedAt)}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                Creado: {formatDate(post.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isPublished ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnpublish}
                  disabled={isAnyPending}
                  className="gap-1"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Despublicar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePublish}
                  disabled={isAnyPending}
                  className="gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Publicar
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isAnyPending}
                className="gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Edit form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Editar post</CardTitle>
            </div>
            <CardDescription>
              Modifica los campos del post. Usa Markdown para el contenido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateAction} className="space-y-6">
              <input type="hidden" name="id" value={post.id} />
              <input type="hidden" name="status" value={post.status} />

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  defaultValue={post.title}
                  required
                  disabled={isAnyPending}
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug{" "}
                  <span className="text-xs text-muted-foreground">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="slug"
                  name="slug"
                  type="text"
                  defaultValue={post.slug}
                  disabled={isAnyPending}
                />
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <Label htmlFor="excerpt">
                  Extracto{" "}
                  <span className="text-xs text-muted-foreground">
                    (opcional)
                  </span>
                </Label>
                <textarea
                  id="excerpt"
                  name="excerpt"
                  rows={3}
                  defaultValue={post.excerpt || ""}
                  disabled={isAnyPending}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Contenido (Markdown) *</Label>
                <textarea
                  id="content"
                  name="content"
                  rows={12}
                  required
                  defaultValue={post.content}
                  disabled={isAnyPending}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                />
              </div>

              {/* SEO fields */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Opciones SEO (opcional)
                </summary>
                <div className="mt-4 space-y-4 pl-2 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="seoTitle">Título SEO</Label>
                    <Input
                      id="seoTitle"
                      name="seoTitle"
                      type="text"
                      defaultValue={post.seoTitle || ""}
                      placeholder="Título para buscadores (máx. 70 caracteres)"
                      maxLength={70}
                      disabled={isAnyPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seoDescription">Descripción SEO</Label>
                    <textarea
                      id="seoDescription"
                      name="seoDescription"
                      rows={2}
                      defaultValue={post.seoDescription || ""}
                      placeholder="Descripción para buscadores (máx. 160 caracteres)"
                      maxLength={160}
                      disabled={isAnyPending}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              </details>

              {/* Preview link */}
              {isPublished && post.slug && (
                <div className="rounded-md bg-primary/5 border border-primary/20 px-4 py-3">
                  <p className="text-sm">
                    <span className="font-medium">Vista pública: </span>
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      /blog/{post.slug}
                    </Link>
                  </p>
                </div>
              )}

              {/* Error message */}
              {latestState?.error?.message && (
                <div className="rounded-md bg-destructive/10 border border-destructive/50 px-4 py-3 text-sm text-destructive">
                  {latestState.error.message}
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button type="submit" disabled={isAnyPending} className="gap-2">
                  <Save className="h-4 w-4" />
                  {updatePending ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Link href="/admin/blog" className="inline-flex cursor-pointer">
                  <Button variant="outline" type="button" disabled={isAnyPending}>
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
