import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Página no encontrada | Obstedesign",
  description: "La página que buscas no existe o fue movida.",
};

export default function NotFound() {
  return (
    <div className="bg-background text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl items-center px-4 py-16">
        <Card className="w-full overflow-hidden">
          <CardContent className="flex flex-col items-center gap-6 p-8 text-center md:p-12">
            <p className="rounded-full border px-3 py-1 text-sm font-medium text-muted-foreground">
              Error 404
            </p>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Página no encontrada
              </h1>
              <p className="mx-auto max-w-xl text-muted-foreground md:text-lg">
                La página que buscas no existe, fue movida o el enlace está incompleto.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/">Volver al inicio</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/tienda">Ir a la tienda</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
