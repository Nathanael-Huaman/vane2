import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ClipboardList, Package, Shield } from "lucide-react";
import { PageStateCard } from "@/components/auth/page-state-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolvePageAuthContext } from "@/lib/server/session";
import { getCustomerOrderDetailById } from "@/lib/server/store/orders.js";

export const metadata = {
  title: "Detalle de pedido",
  description: "Detalle de un pedido asociado a tu cuenta.",
};

function AccessState({ type }) {
  const states = {
    error: {
      Icon: AlertTriangle,
      iconTone: "destructive",
      cardTitle: "No se pudo cargar el pedido",
      cardDescription: "Ocurrió un problema al validar tu sesión.",
      body: "Intenta nuevamente en unos instantes.",
      ctaLabel: "Volver a pedidos",
      ctaHref: "/perfil/pedidos",
      ctaVariant: "outline",
    },
    login: {
      Icon: Shield,
      cardTitle: "Acceso restringido",
      cardDescription: "Necesitas iniciar sesión para ver este pedido.",
      ctaLabel: "Iniciar sesión",
      ctaHref: "/login",
    },
  };

  return <PageStateCard heading="Detalle de pedido" {...states[type]} />;
}

function StatusBadge({ order }) {
  return order.status === "confirmed" ? (
    <Badge>{order.statusLabel}</Badge>
  ) : (
    <Badge variant="secondary">{order.statusLabel}</Badge>
  );
}

export default async function CustomerOrderDetailPage({ params }) {
  const { user, isAuthenticated, hasAuthError } =
    await resolvePageAuthContext();

  if (hasAuthError) return <AccessState type="error" />;
  if (!isAuthenticated) return <AccessState type="login" />;

  const { id } = await params;
  const order = await getCustomerOrderDetailById(user.id, id);
  if (!order) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-primary">
              <ClipboardList className="h-7 w-7" aria-hidden="true" />
              Pedido {order.id}
            </h1>
            <p className="text-sm text-muted-foreground">
              Detalle asociado a {user?.email}.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/perfil/pedidos">Volver a pedidos</Link>
          </Button>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customerName}</p>
              <p className="text-muted-foreground">{order.customerEmail}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <StatusBadge order={order} />
              <p className="text-muted-foreground">
                Creado: {order.createdAtLabel}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Subtotal: <span className="font-medium">{order.subtotalLabel}</span>
              </p>
              <p>
                Total: <span className="font-semibold">{order.totalLabel}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" aria-hidden="true" />
              Items guardados
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {order.items.map((item) => (
              <div key={item.productId} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      Slug: {item.productSlug}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Producto original: {item.productId}
                    </p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p>Cantidad: {item.quantity}</p>
                    <p>Unitario: {item.unitPriceLabel}</p>
                    <p className="font-semibold">Línea: {item.lineTotalLabel}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
