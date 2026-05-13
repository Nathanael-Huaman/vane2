import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublishedPostBySlug } from "@/lib/server/blog/blog-posts.js";
import { parseMarkdownToHtml } from "@/lib/server/blog/markdown.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft, ShoppingBag } from "lucide-react";

/**
 * Genera metadata dinámica para la página de detalle del post.
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return {
      title: "Post no encontrado — Obstedesign",
      description: "El post que buscas no existe o no está disponible.",
    };
  }

  return {
    title: post.seoTitle || `${post.title} — Blog Obstedesign`,
    description:
      post.seoDescription || post.excerpt || `Lee "${post.title}" en el blog.`,
  };
}

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

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);

  // Draft or nonexistent → not found (safe for public)
  if (!post) {
    notFound();
  }

  const contentHtml = parseMarkdownToHtml(post.content);

  return (
    <div className="min-h-screen bg-background">
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <div className="mb-8">
          <Link href="/blog" className="inline-flex cursor-pointer">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al blog
            </Button>
          </Link>
        </div>

        {/* Post header */}
        <header className="mb-10 space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              {post.status}
            </Badge>
            {post.publishedAt && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(post.publishedAt)}
              </span>
            )}
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-primary">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-lg text-muted-foreground">{post.excerpt}</p>
          )}
        </header>

        {/* Post content */}
        <Card>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none pt-8 pb-8">
            <div
              className="space-y-4 text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </CardContent>
        </Card>

        {/* Product links CTA */}
        <div className="mt-10">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">
                  ¿Te interesó lo que leíste?
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Explora los productos mencionados y más en nuestra tienda.
              </p>
              <Link href="/tienda" className="inline-flex cursor-pointer">
                <Button variant="default" size="sm" className="gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Ir a la tienda
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </article>
    </div>
  );
}
