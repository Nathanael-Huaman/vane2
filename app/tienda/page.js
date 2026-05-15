import Image from "next/image";
import Link from "next/link";
import { getPublicCatalogProducts } from "@/lib/server/store/catalog";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

function ProductImage({ product }) {
	if (product.hasImage) {
		return (
			<Image
				src={product.imageUrl}
				alt={product.name}
				width={640}
				height={440}
				unoptimized
				className="h-44 w-full rounded-md object-cover"
			/>
		);
	}

	return (
		<div
			className="flex h-44 w-full items-center justify-center rounded-md border border-dashed bg-muted/40 text-sm text-muted-foreground"
			aria-label={product.imageFallbackLabel || "Imagen no disponible"}
		>
			{product.imageFallbackLabel || "Imagen no disponible"}
		</div>
	);
}

export default async function TiendaPage() {
	const products = await getPublicCatalogProducts();

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-6xl space-y-6">
				<header className="space-y-2">
					<h1 className="text-3xl font-bold tracking-tight text-primary">
						Tienda Obstedesign
					</h1>
					<p className="text-sm text-muted-foreground">
						Explora nuestro catálogo público de productos activos.
					</p>
				</header>

				{products.length === 0 ? (
					<Card>
						<CardHeader>
							<CardTitle>Sin productos publicados</CardTitle>
							<CardDescription>
								Todavía no hay productos activos para mostrar en la tienda.
							</CardDescription>
						</CardHeader>
					</Card>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{products.map((product) => (
							<Card key={product.id} className="overflow-hidden">
								<CardContent className="space-y-3 p-4">
									<ProductImage product={product} />
									<div className="space-y-1">
										<p className="text-xs uppercase tracking-wide text-muted-foreground">
											{product.category.name}
										</p>
										<h2 className="text-lg font-semibold text-foreground">
											{product.name}
										</h2>
										<p className="line-clamp-2 text-sm text-muted-foreground">
											{product.summary}
										</p>
									</div>
									<div className="flex items-center justify-between gap-2">
										<span className="font-medium text-primary">
											{product.priceLabel}
										</span>
										<Badge
											variant={product.isOutOfStock ? "secondary" : "default"}
										>
											{product.availabilityLabel}
										</Badge>
									</div>
									<Link
										href={`/tienda/${product.slug}`}
										className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
									>
										Ver detalle
									</Link>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
