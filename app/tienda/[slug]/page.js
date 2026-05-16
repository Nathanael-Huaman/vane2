import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicProductBySlug } from "@/lib/server/store/catalog";
import { AddToCartForm } from "./add-to-cart-form";

function ProductImage({ product }) {
	if (product.hasImage) {
		return (
			<Image
				src={product.imageUrl}
				alt={product.name}
				width={1200}
				height={720}
				unoptimized
				className="h-72 w-full rounded-md object-cover"
			/>
		);
	}

	return (
		<div
			className="flex h-72 w-full items-center justify-center rounded-md border border-dashed bg-muted/40 text-sm text-muted-foreground"
			aria-label={product.imageFallbackLabel || "Imagen no disponible"}
		>
			{product.imageFallbackLabel || "Imagen no disponible"}
		</div>
	);
}

export default async function TiendaDetallePage({ params }) {
	const { slug } = await params;
	const product = await getPublicProductBySlug(slug);

	if (!product) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-4xl">
				<Card>
					<CardContent className="space-y-6 p-6">
						<ProductImage product={product} />

						<div className="space-y-2">
							<p className="text-xs uppercase tracking-wide text-muted-foreground">
								{product.category.name}
							</p>
							<h1 className="text-3xl font-bold tracking-tight text-primary">
								{product.name}
							</h1>
							<p className="text-sm text-muted-foreground">{product.summary}</p>
							{product.description ? (
								<p className="text-sm text-foreground">{product.description}</p>
							) : null}
						</div>

						<div className="flex items-center justify-between gap-3">
							<span className="text-2xl font-semibold text-primary">
								{product.priceLabel}
							</span>
							<Badge variant={product.isOutOfStock ? "secondary" : "default"}>
								{product.stockQuantity > 0 ? "Disponible" : "Sin stock"}
							</Badge>
						</div>

						{product.stockQuantity > 0 ? (
							<AddToCartForm product={product} />
						) : (
							<div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
								<p className="font-medium text-foreground">
									Producto sin stock para carrito
								</p>
								<p>
									Este producto sigue visible en la tienda, pero no se puede
									agregar al carrito hasta reponer stock.
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
