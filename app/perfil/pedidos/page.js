import Link from "next/link";
import { AlertTriangle, ClipboardList, Shield } from "lucide-react";
import { PageStateCard } from "@/components/auth/page-state-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolvePageAuthContext } from "@/lib/server/session";
import { getCustomerOrderSummaries } from "@/lib/server/store/orders.js";

export const metadata = {
  title: "Mis pedidos",
  description: "Historial de pedidos de tu cuenta.",
};

function AccessState({ type }) {
  const states = {
    error: {
      Icon: AlertTriangle,
      iconTone: "destructive",
      cardTitle: "No se pudieron cargar tus pedidos",
      cardDescription: "Ocurrió un problema al validar tu sesión.",
      body: "Intenta nuevamente en unos instantes.",
      ctaLabel: "Volver al perfil",
      ctaHref: "/perfil",
      ctaVariant: "outline",
    },
    login: {
      Icon: Shield,
      cardTitle: "Acceso restringido",
      cardDescription: "Necesitas iniciar sesión para ver tus pedidos.",
      ctaLabel: "Iniciar sesión",
      ctaHref: "/login",
    },
  };

  return <PageStateCard heading="Mis pedidos" {...states[type]} />;
}

function StatusBadge({ order }) {
  return order.status === "confirmed" ? (
    <Badge>{order.statusLabel}</Badge>
  ) : (
    <Badge variant="secondary">{order.statusLabel}</Badge>
  );
}

export default async function CustomerOrdersPage() {
  const { user, isAuthenticated, hasAuthError } =
    await resolvePageAuthContext();

  if (hasAuthError) return <AccessState type="error" />;
  if (!isAuthenticated) return <AccessState type="login" />;

  const orders = await getCustomerOrderSummaries(user.id);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-primary">
              <ClipboardList className="h-7 w-7" aria-hidden="true" />
              Mis pedidos
            </h1>
            <p className="text-sm text-muted-foreground">
              Historial de compras asociadas a {user?.email}.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/perfil">Volver al perfil</Link>
          </Button>
        </header>

        <p className="mb-4 text-sm text-muted-foreground">
          {orders.length} pedido{orders.length === 1 ? "" : "s"} encontrado
          {orders.length === 1 ? "" : "s"}
        </p>

        {orders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-14 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No hay pedidos para mostrar.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Cuando compres con tu sesión iniciada, tus pedidos aparecerán
                acá.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/tienda">Ir a la tienda</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">Pedido {order.id}</h2>
                      <StatusBadge order={order} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Creado: {order.createdAtLabel}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 text-left sm:items-end sm:text-right">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg font-semibold">{order.totalLabel}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={order.detailPath}>Ver detalle</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
