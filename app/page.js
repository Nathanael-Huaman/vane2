import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const featuredCategories = [
  {
    name: "Fajas y soporte",
    description: "Contención cómoda para embarazo y postparto.",
  },
  {
    name: "Lactancia",
    description: "Accesorios prácticos para una lactancia más simple.",
  },
  {
    name: "Higiene y cuidado",
    description: "Productos seguros para mamá y recién nacido.",
  },
];

const featuredProducts = [
  "Kit postparto esencial",
  "Almohadón ergonómico de lactancia",
  "Bolso maternal hospitalario",
];

export default function HomePage() {
  return (
    <div className="bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
        <p className="inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          Tienda obstetrica especializada
        </p>
        <div className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Todo lo que necesitás para acompañar el embarazo, parto y postparto.
          </h1>
          <p className="text-lg text-muted-foreground">
            En Obstedesign seleccionamos productos obstétricos confiables para profesionales, maternidades y familias.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/tienda">Ver tienda</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Ingresar a mi cuenta</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-14 md:grid-cols-3">
        {featuredCategories.map((category) => (
          <Card key={category.name}>
            <CardHeader>
              <CardTitle className="text-xl">{category.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div className="rounded-2xl border bg-card p-6 md:p-8">
          <h2 className="text-2xl font-semibold">Productos destacados de la semana</h2>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            {featuredProducts.map((product) => (
              <li key={product} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                <span>{product}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/tienda">Explorar catálogo</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/login">Soy cliente registrado</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
