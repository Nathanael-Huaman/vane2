"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBlogPostAction } from "@/lib/actions/blog";
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
import { ArrowLeft, Save, FileText } from "lucide-react";

const initialState = { ok: false, data: null, error: null };

export default function NewBlogPostPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createBlogPostAction,
    initialState
  );

  // Redirect on success
  if (state?.ok && state?.data?.id) {
    router.push("/admin/blog");
    return null;
  }

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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Nuevo post</CardTitle>
            </div>
            <CardDescription>
              Completa los campos para crear un nuevo post del blog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Ej: Cómo elegir el mejor diseño para tu proyecto"
                  required
                  disabled={pending}
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug{" "}
                  <span className="text-xs text-muted-foreground">
                    (opcional — se genera automáticamente)
                  </span>
                </Label>
                <Input
                  id="slug"
                  name="slug"
                  type="text"
                  placeholder="como-elegir-el-mejor-diseno"
                  disabled={pending}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="borrador"
                      defaultChecked
                      disabled={pending}
                      className="h-4 w-4"
                    />
                    <Badge variant="secondary">Borrador</Badge>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="publicado"
                      disabled={pending}
                      className="h-4 w-4"
                    />
                    <Badge variant="default">Publicado</Badge>
                  </label>
                </div>
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
                  placeholder="Un breve resumen del post..."
                  disabled={pending}
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
                  placeholder={`Escribe el contenido en Markdown...

# Título principal
Párrafo con **negrita** y *cursiva*.
[Link a un producto](/tienda/producto-ejemplo)`}
                  disabled={pending}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Usa Markdown para dar formato. Links a productos:{" "}
                  <code>[texto](/tienda/ruta-del-producto)</code>
                </p>
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
                      placeholder="Título para buscadores (máx. 70 caracteres)"
                      maxLength={70}
                      disabled={pending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seoDescription">Descripción SEO</Label>
                    <textarea
                      id="seoDescription"
                      name="seoDescription"
                      rows={2}
                      placeholder="Descripción para buscadores (máx. 160 caracteres)"
                      maxLength={160}
                      disabled={pending}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              </details>

              {/* Error message */}
              {state?.error?.message && (
                <div className="rounded-md bg-destructive/10 border border-destructive/50 px-4 py-3 text-sm text-destructive">
                  {state.error.message}
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button type="submit" disabled={pending} className="gap-2">
                  <Save className="h-4 w-4" />
                  {pending ? "Guardando..." : "Guardar post"}
                </Button>
                <Link href="/admin/blog" className="inline-flex cursor-pointer">
                  <Button variant="outline" type="button" disabled={pending}>
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
